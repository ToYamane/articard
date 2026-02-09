/**
 * テスト用カード合成スクリプト
 *
 * 使い方: npx tsx scripts/test-card-compose.ts
 *
 * 処理内容:
 * Part 1: 本番 composeCardImage を使って全4レアリティでカード生成
 * Part 2: 10フォント個別にタイトルレンダリング検証
 *
 * 外部API不要（OpenAI/Firebase/GCS なし）
 */

// fontconfig キャッシュクリア & 設定（sharp import前に必要）
import path from 'path';
import fs from 'fs';

const cacheDir = path.join(process.cwd(), '.fontconfig-cache');
if (fs.existsSync(cacheDir)) {
  fs.rmSync(cacheDir, { recursive: true, force: true });
  console.log('[FontConfig] キャッシュクリア:', cacheDir);
}

process.env.FONTCONFIG_PATH = process.env.FONTCONFIG_PATH || path.join(process.cwd(), 'fonts');
console.log('[FontConfig] FONTCONFIG_PATH:', process.env.FONTCONFIG_PATH);

import sharp from 'sharp';
import { composeCardImage } from '@/lib/card/image-composer';
import type { CardCompositionInput } from '@/lib/card/image-composer';

// --- 定数 ---

const CARD_WIDTH = 512;
const CARD_HEIGHT = 768;

type Rarity = 'common' | 'rare' | 'super_rare' | 'legend';

const RARITIES: Rarity[] = ['common', 'rare', 'super_rare', 'legend'];

// image-composer.ts の CARD_FONTS と同じリスト（モジュール内プライベートのため再定義）
const CARD_FONTS = [
  { name: 'Noto Sans JP', family: "'Noto Sans JP', sans-serif" },
  { name: 'Noto Serif JP', family: "'Noto Serif JP', serif" },
  { name: 'Dela Gothic One', family: "'Dela Gothic One', sans-serif" },
  { name: 'Kaisei Tokumin', family: "'Kaisei Tokumin', serif" },
  { name: 'Reggae One', family: "'Reggae One', sans-serif" },
  { name: 'Yuji Syuku', family: "'Yuji Syuku', serif" },
  { name: 'Kiwi Maru', family: "'Kiwi Maru', sans-serif" },
  { name: 'Hachi Maru Pop', family: "'Hachi Maru Pop', sans-serif" },
  { name: 'DotGothic16', family: "'DotGothic16', sans-serif" },
  { name: 'Stick', family: "'Stick', sans-serif" },
];

// 本番と同一のタイトルパラメータ
const TITLE_FONT_SIZE = 36;
const TITLE_Y = 52;
const TITLE_STROKE_WIDTH = 4;
const TITLE_COLOR = '#D1D5DB'; // common のタイトルカラー

const OUTPUT_DIR = path.join(process.cwd(), 'tmp/card-test');

// --- ヘルパー ---

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// --- ダミーイラスト生成 ---

async function createRainbowIllustration(): Promise<Buffer> {
  const svg = `
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rainbow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#FF0000"/>
          <stop offset="16%" style="stop-color:#FF8800"/>
          <stop offset="33%" style="stop-color:#FFFF00"/>
          <stop offset="50%" style="stop-color:#00FF00"/>
          <stop offset="66%" style="stop-color:#0088FF"/>
          <stop offset="83%" style="stop-color:#0000FF"/>
          <stop offset="100%" style="stop-color:#FF00FF"/>
        </linearGradient>
      </defs>
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#rainbow)"/>
      <text x="${CARD_WIDTH / 2}" y="${CARD_HEIGHT / 2}"
            font-family="sans-serif" font-size="40" font-weight="bold"
            fill="white" text-anchor="middle" dominant-baseline="middle"
            stroke="black" stroke-width="2" paint-order="stroke">
        TEST ILLUSTRATION
      </text>
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

// --- メイン ---

async function main() {
  // 出力ディレクトリ作成
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`出力先: ${OUTPUT_DIR}\n`);

  // ダミーイラスト生成
  console.log('虹色ダミーイラスト生成中...');
  const illustrationBuffer = await createRainbowIllustration();
  console.log('OK\n');

  // =============================================
  // Part 1: 本番 composeCardImage でレアリティ別テスト
  // =============================================
  console.log('========== Part 1: レアリティ別カード生成 (本番コード使用) ==========\n');

  for (const rarity of RARITIES) {
    console.log(`=== ${rarity.toUpperCase()} ===`);

    const input: CardCompositionInput = {
      illustrationBuffer,
      keyword: 'テストカード',
      cardNumber: 42,
      rarity,
      flavorText: '知識は力なり、カードは宝なり。',
      contextDescription: 'これはテスト用のカードです。虹色のグラデーションイラストが正しく表示されていることを確認してください。',
      createdAt: new Date(),
    };

    const result = await composeCardImage(input);

    // 表面
    const frontPath = path.join(OUTPUT_DIR, `card_front_${rarity}.jpg`);
    fs.writeFileSync(frontPath, result.cardImageBuffer);
    const frontSize = (fs.statSync(frontPath).size / 1024).toFixed(1);
    console.log(`  表面 → ${frontPath} (${frontSize} KB)`);

    // 裏面
    const backPath = path.join(OUTPUT_DIR, `card_back_${rarity}.jpg`);
    fs.writeFileSync(backPath, result.cardBackImageBuffer);
    const backSize = (fs.statSync(backPath).size / 1024).toFixed(1);
    console.log(`  裏面 → ${backPath} (${backSize} KB)`);

    // サムネイル
    const thumbPath = path.join(OUTPUT_DIR, `thumb_${rarity}.jpg`);
    fs.writeFileSync(thumbPath, result.thumbnailBuffer);
    const thumbSize = (fs.statSync(thumbPath).size / 1024).toFixed(1);
    console.log(`  サムネ → ${thumbPath} (${thumbSize} KB)`);

    console.log('');
  }

  // =============================================
  // Part 2: フォント個別レンダリング検証
  // =============================================
  console.log('========== Part 2: フォント個別レンダリング検証 ==========\n');

  // 暗い背景画像を一度だけ生成
  const darkBackground = await sharp({
    create: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      channels: 4,
      background: { r: 26, g: 26, b: 46, alpha: 1 }, // #1a1a2e
    },
  }).png().toBuffer();

  for (const font of CARD_FONTS) {
    const fontNameNoSpaces = font.name.replace(/\s+/g, '');
    console.log(`[Font] ${font.name} (family: ${font.family})`);

    try {
      // 本番と同一パラメータのタイトルSVG
      const titleSvg = `
        <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
          <text x="${CARD_WIDTH / 2}" y="${TITLE_Y}"
                font-family="${font.family}"
                font-size="${TITLE_FONT_SIZE}"
                fill="${TITLE_COLOR}"
                text-anchor="middle"
                stroke="#000000"
                stroke-width="${TITLE_STROKE_WIDTH}"
                paint-order="stroke">${escapeXml('フォントテスト')}</text>
          <text x="${CARD_WIDTH / 2}" y="${TITLE_Y + 50}"
                font-family="${font.family}"
                font-size="20"
                fill="#808080"
                text-anchor="middle">${escapeXml(font.name)}</text>
        </svg>
      `;

      const result = await sharp(darkBackground)
        .composite([
          { input: Buffer.from(titleSvg), top: 0, left: 0 },
        ])
        .jpeg({ quality: 90 })
        .toBuffer();

      const outputPath = path.join(OUTPUT_DIR, `font_${fontNameNoSpaces}.jpg`);
      fs.writeFileSync(outputPath, result);
      const stat = fs.statSync(outputPath);
      console.log(`  => ${outputPath} (${(stat.size / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`  => ERROR: ${err}`);
    }

    console.log('');
  }

  // =============================================
  // 完了サマリー
  // =============================================
  console.log('========== 全合成完了 ==========');
  console.log(`\n出力ファイル一覧:`);
  const files = fs.readdirSync(OUTPUT_DIR).sort();
  for (const file of files) {
    const filePath = path.join(OUTPUT_DIR, file);
    const stat = fs.statSync(filePath);
    console.log(`  ${file} (${(stat.size / 1024).toFixed(1)} KB)`);
  }
}

main().catch(console.error);
