import { getOpenAIClient } from './client';

/**
 * 画像をURLからダウンロードしてBufferに変換
 */
async function downloadImageFromUrl(url: string): Promise<Buffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`画像のダウンロードに失敗しました (HTTP ${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export interface DalleGenerationParams {
  prompt: string;
  size?: '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
}

/**
 * DALL-E 3 HDで画像を生成（legend用）
 * 最高品質の画像生成モデル
 */
export async function generateWithDalle3HD(
  params: DalleGenerationParams
): Promise<Buffer> {
  const client = getOpenAIClient();

  console.log('DALL-E 3 HD generation starting...', {
    prompt: params.prompt.substring(0, 100),
    size: params.size || '1024x1792',
    quality: params.quality || 'hd',
  });

  const response = await client.images.generate({
    model: 'dall-e-3',
    prompt: params.prompt,
    size: params.size || '1024x1792', // 縦長カード向け
    quality: params.quality || 'hd',
    n: 1,
  });

  if (!response.data || response.data.length === 0) {
    throw new Error('DALL-E 3から画像データが取得できませんでした');
  }

  const imageUrl = response.data[0].url;
  if (!imageUrl) {
    throw new Error('DALL-E 3から画像URLが取得できませんでした');
  }

  console.log('DALL-E 3 HD generation complete, downloading image...');
  const imageBuffer = await downloadImageFromUrl(imageUrl);

  return imageBuffer;
}

/**
 * DALL-E 3 Standardで画像を生成
 * 標準品質・低コスト版
 */
export async function generateWithDalle3Standard(
  params: DalleGenerationParams
): Promise<Buffer> {
  const client = getOpenAIClient();

  console.log('DALL-E 3 Standard generation starting...', {
    prompt: params.prompt.substring(0, 100),
  });

  const response = await client.images.generate({
    model: 'dall-e-3',
    prompt: params.prompt,
    size: params.size || '1024x1792',
    quality: 'standard',
    n: 1,
  });

  if (!response.data || response.data.length === 0) {
    throw new Error('DALL-E 3から画像データが取得できませんでした');
  }

  const imageUrl = response.data[0].url;
  if (!imageUrl) {
    throw new Error('DALL-E 3から画像URLが取得できませんでした');
  }

  console.log('DALL-E 3 Standard generation complete, downloading image...');
  const imageBuffer = await downloadImageFromUrl(imageUrl);

  return imageBuffer;
}
