import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { StorageError } from '@/lib/errors';

// 環境に応じてストレージ方式を切り替え
const USE_GCS = process.env.GCS_BUCKET_NAME && process.env.GOOGLE_APPLICATION_CREDENTIALS;

// ローカルストレージのベースパス
const LOCAL_STORAGE_PATH = join(process.cwd(), 'public', 'uploads');

// GCS設定
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || '';

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * ローカルストレージに保存
 */
async function uploadToLocal(
  buffer: Buffer,
  fileName: string,
  folder: string
): Promise<UploadResult> {
  const folderPath = join(LOCAL_STORAGE_PATH, folder);

  // フォルダが存在しない場合は作成
  if (!existsSync(folderPath)) {
    await mkdir(folderPath, { recursive: true });
  }

  const filePath = join(folderPath, fileName);
  await writeFile(filePath, buffer);

  // 公開URLを生成
  const url = `/uploads/${folder}/${fileName}`;

  return {
    url,
    path: filePath,
  };
}

/**
 * GCSに保存
 */
async function uploadToGCS(
  buffer: Buffer,
  fileName: string,
  folder: string
): Promise<UploadResult> {
  // 動的インポートでGCS SDKを読み込む（必要な場合のみ）
  const { Storage } = await import('@google-cloud/storage');
  const storage = new Storage();
  const bucket = storage.bucket(GCS_BUCKET_NAME);

  const path = `${folder}/${fileName}`;
  const file = bucket.file(path);

  await file.save(buffer, {
    contentType: 'image/jpeg',
    resumable: false,
  });

  // 公開URLを生成
  const url = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${path}`;

  return {
    url,
    path,
  };
}

/**
 * 画像をアップロード
 */
export async function uploadImage(
  buffer: Buffer,
  fileName: string,
  folder: string = 'cards'
): Promise<UploadResult> {
  if (USE_GCS) {
    return uploadToGCS(buffer, fileName, folder);
  }
  return uploadToLocal(buffer, fileName, folder);
}

/**
 * カードイラストをアップロード
 */
export async function uploadCardIllustration(
  buffer: Buffer,
  cardId: string
): Promise<UploadResult> {
  const fileName = `${cardId}_illustration.jpg`;
  return uploadImage(buffer, fileName, 'illustrations');
}

/**
 * カード画像をアップロード
 */
export async function uploadCardImage(
  buffer: Buffer,
  cardId: string
): Promise<UploadResult> {
  const fileName = `${cardId}_card.jpg`;
  return uploadImage(buffer, fileName, 'cards');
}

/**
 * サムネイルをアップロード
 */
export async function uploadThumbnail(
  buffer: Buffer,
  cardId: string
): Promise<UploadResult> {
  const fileName = `${cardId}_thumb.jpg`;
  return uploadImage(buffer, fileName, 'thumbnails');
}

/**
 * 画像を削除
 */
export async function deleteImage(path: string): Promise<void> {
  if (!USE_GCS) {
    // ローカルストレージから削除
    await deleteFromLocal(path);
    return;
  }

  await deleteFromGCS(path);
}

/**
 * ローカルストレージから画像を削除
 */
async function deleteFromLocal(relativePath: string): Promise<void> {
  try {
    // /uploads/cards/xxx.jpg 形式のパスを処理
    const cleanPath = relativePath.startsWith('/uploads/')
      ? relativePath.slice('/uploads/'.length)
      : relativePath;
    const fullPath = join(LOCAL_STORAGE_PATH, cleanPath);

    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }
  } catch (error) {
    console.warn('Local file deletion error:', error);
    // ローカルファイルの削除エラーは無視（ファイルが存在しない場合もある）
  }
}

/**
 * GCSから画像を削除
 */
async function deleteFromGCS(path: string): Promise<void> {
  const { Storage } = await import('@google-cloud/storage');
  const storage = new Storage();
  const bucket = storage.bucket(GCS_BUCKET_NAME);

  try {
    await bucket.file(path).delete();
  } catch (error) {
    // ファイルが存在しない場合のエラーは無視
    console.warn('GCS file deletion error:', error);
  }
}

/**
 * 複数画像を一括削除
 */
export async function batchDeleteImages(paths: string[]): Promise<{
  success: boolean;
  errors: string[]
}> {
  const errors: string[] = [];

  await Promise.all(
    paths.map(async (path) => {
      try {
        await deleteImage(path);
      } catch (error) {
        console.error(`Failed to delete image: ${path}`, error);
        errors.push(path);
      }
    })
  );

  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * カードに関連するすべての画像を削除
 */
export async function deleteCardImages(cardId: string): Promise<void> {
  const paths = [
    `illustrations/${cardId}_illustration.jpg`,
    `cards/${cardId}_card.jpg`,
    `thumbnails/${cardId}_thumb.jpg`,
  ];

  // ローカルストレージの場合はURLパス形式を使用
  const localPaths = paths.map((p) => `/uploads/${p}`);
  const pathsToDelete = USE_GCS ? paths : localPaths;

  const result = await batchDeleteImages(pathsToDelete);

  if (!result.success) {
    throw new StorageError(
      'カード画像の削除に失敗しました',
      result.errors
    );
  }
}

/**
 * 複数カードの画像を一括削除
 */
export async function batchDeleteCardImages(cardIds: string[]): Promise<{
  success: boolean;
  failedCardIds: string[];
}> {
  const failedCardIds: string[] = [];

  await Promise.all(
    cardIds.map(async (cardId) => {
      try {
        await deleteCardImages(cardId);
      } catch (error) {
        console.error(`Failed to delete images for card: ${cardId}`, error);
        failedCardIds.push(cardId);
      }
    })
  );

  return {
    success: failedCardIds.length === 0,
    failedCardIds,
  };
}
