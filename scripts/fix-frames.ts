/**
 * フレームPNGの透明性を診断・修正するスクリプト
 *
 * 使い方: npx tsx scripts/fix-frames.ts
 *
 * 処理内容:
 * 1. public/frames/ の各フレームPNGを読み込み、アルファチャンネルを診断
 * 2. 不透明な内側を持つフレームを自動修正（白/黒ピクセル → 透明化）
 * 3. 修正済みフレームを上書き保存
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const FRAMES_DIR = path.join(process.cwd(), 'public/frames');

const FRAME_FILES = [
  'frame_common.png',
  'frame_rare.png',
  'frame_super_rare.png',
  'frame_legend.png',
];

interface DiagnosticResult {
  file: string;
  width: number;
  height: number;
  hasAlpha: boolean;
  centerAlpha: number[];
  opaqueWhiteCount: number;
  opaqueBlackCount: number;
  transparentCount: number;
  totalPixels: number;
  needsFix: boolean;
}

/**
 * フレーム画像を診断
 */
async function diagnoseFrame(filePath: string): Promise<DiagnosticResult> {
  const fileName = path.basename(filePath);
  const image = sharp(filePath);
  const metadata = await image.metadata();
  const { width = 0, height = 0, channels = 0 } = metadata;

  // RGBA形式で読み込み
  const { data } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 中心付近のピクセルをサンプリング（5x5グリッド）
  const centerAlpha: number[] = [];
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);

  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const px = centerX + dx * 10;
      const py = centerY + dy * 10;
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const idx = (py * width + px) * 4;
        centerAlpha.push(data[idx + 3]); // alpha channel
      }
    }
  }

  // ピクセル統計を計算
  let opaqueWhiteCount = 0;
  let opaqueBlackCount = 0;
  let transparentCount = 0;
  const totalPixels = width * height;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a < 10) {
      transparentCount++;
    } else if (r > 240 && g > 240 && b > 240) {
      opaqueWhiteCount++;
    } else if (r < 30 && g < 30 && b < 30) {
      opaqueBlackCount++;
    }
  }

  // 中心が不透明なら修正が必要
  const avgCenterAlpha = centerAlpha.reduce((a, b) => a + b, 0) / centerAlpha.length;
  const needsFix = avgCenterAlpha > 128;

  return {
    file: fileName,
    width,
    height,
    hasAlpha: channels === 4,
    centerAlpha,
    opaqueWhiteCount,
    opaqueBlackCount,
    transparentCount,
    totalPixels,
    needsFix,
  };
}

/**
 * フレームの内側を透明化
 * 白に近い or 黒に近いピクセルの alpha を 0 にする
 */
async function fixFrame(filePath: string): Promise<void> {
  const image = sharp(filePath);
  const metadata = await image.metadata();
  const { width = 0, height = 0 } = metadata;

  // RGBA形式で読み込み
  const { data } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // ピクセルを修正（白/黒 → 透明）
  const buffer = Buffer.from(data);
  let fixedCount = 0;

  for (let i = 0; i < buffer.length; i += 4) {
    const r = buffer[i];
    const g = buffer[i + 1];
    const b = buffer[i + 2];
    const a = buffer[i + 3];

    if (a === 0) continue; // 既に透明ならスキップ

    // 白に近いピクセル (R,G,B 各 > 240) → 透明化
    if (r > 240 && g > 240 && b > 240) {
      buffer[i + 3] = 0;
      fixedCount++;
      continue;
    }

    // 黒に近いピクセル (R,G,B 各 < 30) → 透明化
    if (r < 30 && g < 30 && b < 30) {
      buffer[i + 3] = 0;
      fixedCount++;
      continue;
    }
  }

  // 修正した画像を保存
  await sharp(buffer, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toFile(filePath);

  console.log(`  Fixed ${fixedCount} pixels → transparent`);
}

async function main() {
  console.log('=== フレーム透明性診断 ===\n');

  for (const frameFile of FRAME_FILES) {
    const filePath = path.join(FRAMES_DIR, frameFile);

    if (!fs.existsSync(filePath)) {
      console.log(`[SKIP] ${frameFile} — ファイルが見つかりません`);
      continue;
    }

    console.log(`--- ${frameFile} ---`);
    const result = await diagnoseFrame(filePath);

    console.log(`  サイズ: ${result.width}x${result.height}`);
    console.log(`  アルファチャンネル: ${result.hasAlpha ? 'あり' : 'なし（RGB のみ）'}`);
    console.log(`  中心付近 alpha 値: [${result.centerAlpha.slice(0, 5).join(', ')}...]`);
    console.log(`  透明ピクセル: ${result.transparentCount} / ${result.totalPixels} (${((result.transparentCount / result.totalPixels) * 100).toFixed(1)}%)`);
    console.log(`  不透明-白ピクセル: ${result.opaqueWhiteCount} (${((result.opaqueWhiteCount / result.totalPixels) * 100).toFixed(1)}%)`);
    console.log(`  不透明-黒ピクセル: ${result.opaqueBlackCount} (${((result.opaqueBlackCount / result.totalPixels) * 100).toFixed(1)}%)`);
    console.log(`  修正必要: ${result.needsFix ? 'はい ✗' : 'いいえ ✓'}`);

    if (result.needsFix) {
      console.log(`  → 修正中...`);
      await fixFrame(filePath);

      // 修正後の診断
      const afterResult = await diagnoseFrame(filePath);
      console.log(`  → 修正後: 透明ピクセル ${afterResult.transparentCount} / ${afterResult.totalPixels} (${((afterResult.transparentCount / afterResult.totalPixels) * 100).toFixed(1)}%)`);
      console.log(`  → 中心付近 alpha: [${afterResult.centerAlpha.slice(0, 5).join(', ')}...]`);
    }

    console.log('');
  }

  console.log('=== 完了 ===');
}

main().catch(console.error);
