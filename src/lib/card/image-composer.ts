import sharp from 'sharp';
import path from 'path';
import type { Rarity } from '@/types/database';
import { getRarityColor } from './rarity';
import { RARITY_CONFIG } from '@/lib/constants/rarity-config';

// fontconfigの設定（ローカルフォントディレクトリを参照）
// 環境変数が未設定の場合はデフォルトパスを設定
if (!process.env.FONTCONFIG_PATH) {
  process.env.FONTCONFIG_PATH = path.join(process.cwd(), 'fonts');
}
console.log('[FontConfig] FONTCONFIG_PATH:', process.env.FONTCONFIG_PATH);

// フォント設定（ローカルインストールのGoogle Fontsを使用）
interface FontConfig {
  name: string;
  family: string;
  weight: number; // 出現重み
}

const CARD_FONTS: FontConfig[] = [
  // 高出現率 (weight: 2) - 標準的なフォント
  { name: 'Noto Sans JP', family: "'Noto Sans CJK JP', 'Noto Sans JP', sans-serif", weight: 2 },
  { name: 'Noto Serif JP', family: "'Noto Serif CJK JP', 'Noto Serif JP', serif", weight: 2 },
  { name: 'Dela Gothic One', family: "'Dela Gothic One', sans-serif", weight: 2 },
  { name: 'Kaisei Tokumin', family: "'Kaisei Tokumin', serif", weight: 2 },
  // 低出現率 (weight: 1) - 個性的なフォント
  { name: 'Reggae One', family: "'Reggae One', sans-serif", weight: 1 },
  { name: 'Yuji Syuku', family: "'Yuji Syuku', serif", weight: 1 },
  { name: 'Kiwi Maru', family: "'Kiwi Maru', sans-serif", weight: 1 },
  { name: 'Hachi Maru Pop', family: "'Hachi Maru Pop', sans-serif", weight: 1 },
  { name: 'DotGothic16', family: "'DotGothic16', sans-serif", weight: 1 },
  { name: 'Stick', family: "'Stick', sans-serif", weight: 1 },
];

/**
 * 重み付きランダムでフォントを選択
 */
function selectRandomFont(): FontConfig {
  const totalWeight = CARD_FONTS.reduce((sum, f) => sum + f.weight, 0);
  let random = Math.random() * totalWeight;

  for (const font of CARD_FONTS) {
    random -= font.weight;
    if (random <= 0) {
      console.log('[FontConfig] Selected font:', font.name);
      return font;
    }
  }
  console.log('[FontConfig] Fallback to:', CARD_FONTS[0].name);
  return CARD_FONTS[0]; // フォールバック
}

// カードサイズ
const CARD_WIDTH = 512;
const CARD_HEIGHT = 768;
const THUMBNAIL_WIDTH = 128;
const THUMBNAIL_HEIGHT = 192;

// レイアウト設定
const TITLE_HEIGHT = 60;

// 日本語フォント対応のため、テキストはSVGで描画
// sharp はSVGでフォントをサポートするが、システムフォントに依存

export interface CardCompositionInput {
  illustrationBuffer: Buffer;
  keyword: string;
  cardNumber: number;
  rarity: Rarity;
  flavorText: string;
  contextDescription: string;
  createdAt: Date;
}

export interface CardCompositionResult {
  cardImageBuffer: Buffer;
  cardBackImageBuffer: Buffer;
  thumbnailBuffer: Buffer;
}

/**
 * レア度に応じた星を生成
 */
function getRarityStars(rarity: Rarity): string {
  return RARITY_CONFIG[rarity].stars;
}

/**
 * レア度の日本語名を取得
 */
function getRarityName(rarity: Rarity): string {
  return RARITY_CONFIG[rarity].japaneseName;
}

/**
 * レア度に応じた枠線幅を取得
 */
function getRarityBorderWidth(rarity: Rarity): number {
  return RARITY_CONFIG[rarity].borderWidth;
}

/**
 * テキストをエスケープ（SVG用）
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * テキストを指定幅で折り返し
 */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const lines: string[] = [];
  let currentLine = '';

  for (const char of text) {
    currentLine += char;
    if (currentLine.length >= maxCharsPerLine) {
      lines.push(currentLine);
      currentLine = '';
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * 表面カード画像を生成
 */
async function createCardFront(
  illustrationBuffer: Buffer,
  keyword: string,
  cardNumber: number,
  rarity: Rarity
): Promise<Buffer> {
  const color = getRarityColor(rarity);
  const borderWidth = getRarityBorderWidth(rarity);

  // イラスト領域のサイズ計算
  const illustrationWidth = CARD_WIDTH - borderWidth * 2;
  const illustrationHeight = CARD_HEIGHT - borderWidth * 2 - TITLE_HEIGHT;

  // イラストをリサイズ
  const resizedIllustration = await sharp(illustrationBuffer)
    .resize(illustrationWidth, illustrationHeight, {
      fit: 'cover',
      position: 'center',
    })
    .toBuffer();

  // ランダムでフォントを選択
  const selectedFont = selectRandomFont();

  // タイトルバーのSVG
  const titleBarSvg = `
    <svg width="${CARD_WIDTH}" height="${TITLE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${
          rarity === 'legend'
            ? `
          <linearGradient id="legendTitleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#1a1a2e"/>
            <stop offset="50%" style="stop-color:#16213e"/>
            <stop offset="100%" style="stop-color:#1a1a2e"/>
          </linearGradient>
        `
            : ''
        }
      </defs>
      <rect width="${CARD_WIDTH}" height="${TITLE_HEIGHT}" fill="${rarity === 'legend' ? 'url(#legendTitleGradient)' : '#1a1a2e'}"/>
      <text x="${CARD_WIDTH / 2}" y="${TITLE_HEIGHT / 2 + 8}"
            font-family="${selectedFont.family}"
            font-size="24"
            font-weight="bold"
            fill="${color}"
            text-anchor="middle">${escapeXml(keyword)} #${cardNumber}</text>
    </svg>
  `;

  // 枠のSVG
  const frameSvg = `
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${
          rarity === 'legend'
            ? `
          <linearGradient id="legendFrameGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#FFD700"/>
            <stop offset="25%" style="stop-color:#FFA500"/>
            <stop offset="50%" style="stop-color:#FFD700"/>
            <stop offset="75%" style="stop-color:#FFA500"/>
            <stop offset="100%" style="stop-color:#FFD700"/>
          </linearGradient>
        `
            : ''
        }
      </defs>
      <rect
        x="${borderWidth / 2}"
        y="${borderWidth / 2}"
        width="${CARD_WIDTH - borderWidth}"
        height="${CARD_HEIGHT - borderWidth}"
        fill="none"
        stroke="${rarity === 'legend' ? 'url(#legendFrameGradient)' : color}"
        stroke-width="${borderWidth}"
        rx="12"
      />
    </svg>
  `;

  // 背景を作成
  const background = await sharp({
    create: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      channels: 4,
      background: { r: 26, g: 26, b: 46, alpha: 1 }, // #1a1a2e
    },
  })
    .png()
    .toBuffer();

  // 合成
  const cardImage = await sharp(background)
    .composite([
      // タイトルバー
      {
        input: Buffer.from(titleBarSvg),
        top: borderWidth,
        left: 0,
      },
      // イラスト
      {
        input: resizedIllustration,
        top: borderWidth + TITLE_HEIGHT,
        left: borderWidth,
      },
      // 枠
      {
        input: Buffer.from(frameSvg),
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  return cardImage;
}

/**
 * 裏面カード画像を生成
 */
async function createCardBack(
  keyword: string,
  cardNumber: number,
  rarity: Rarity,
  contextDescription: string,
  flavorText: string,
  createdAt: Date
): Promise<Buffer> {
  const color = getRarityColor(rarity);
  const borderWidth = getRarityBorderWidth(rarity);

  // 日付フォーマット
  const dateStr = createdAt.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // テキストを折り返し
  const descriptionLines = wrapText(contextDescription, 20);
  const flavorLines = wrapText(flavorText, 22);

  // 説明テキストのSVG要素を生成
  const descriptionTextElements = descriptionLines
    .slice(0, 10) // 最大10行
    .map(
      (line, i) =>
        `<text x="${CARD_WIDTH / 2}" y="${280 + i * 32}"
              font-family="'Noto Sans JP', 'Yu Gothic', 'Meiryo', sans-serif"
              font-size="20"
              fill="#e0e0e0"
              text-anchor="middle">${escapeXml(line)}</text>`
    )
    .join('');

  // フレーバーテキストのY座標を計算
  const flavorStartY = 280 + Math.min(descriptionLines.length, 10) * 32 + 40;

  // フレーバーテキストのSVG要素を生成
  const flavorTextElements = flavorLines
    .slice(0, 3) // 最大3行
    .map(
      (line, i) =>
        `<text x="${CARD_WIDTH / 2}" y="${flavorStartY + i * 28}"
              font-family="'Noto Sans JP', 'Yu Gothic', 'Meiryo', sans-serif"
              font-size="16"
              font-style="italic"
              fill="#a0a0a0"
              text-anchor="middle">"${escapeXml(line)}"</text>`
    )
    .join('');

  // 裏面全体のSVG
  const backSvg = `
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${
          rarity === 'legend'
            ? `
          <linearGradient id="legendBackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a2e"/>
            <stop offset="50%" style="stop-color:#0f0f1a"/>
            <stop offset="100%" style="stop-color:#1a1a2e"/>
          </linearGradient>
          <linearGradient id="legendBorderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#FFD700"/>
            <stop offset="25%" style="stop-color:#FFA500"/>
            <stop offset="50%" style="stop-color:#FFD700"/>
            <stop offset="75%" style="stop-color:#FFA500"/>
            <stop offset="100%" style="stop-color:#FFD700"/>
          </linearGradient>
        `
            : ''
        }
        <pattern id="cardPattern" patternUnits="userSpaceOnUse" width="40" height="40">
          <rect width="40" height="40" fill="transparent"/>
          <circle cx="20" cy="20" r="1" fill="${color}" opacity="0.15"/>
        </pattern>
      </defs>

      <!-- 背景 -->
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${rarity === 'legend' ? 'url(#legendBackGradient)' : '#1a1a2e'}" rx="12"/>
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#cardPattern)" rx="12"/>

      <!-- 枠 -->
      <rect
        x="${borderWidth / 2}"
        y="${borderWidth / 2}"
        width="${CARD_WIDTH - borderWidth}"
        height="${CARD_HEIGHT - borderWidth}"
        fill="none"
        stroke="${rarity === 'legend' ? 'url(#legendBorderGradient)' : color}"
        stroke-width="${borderWidth}"
        rx="12"
      />

      <!-- ヘッダー区切り線 -->
      <line x1="40" y1="140" x2="${CARD_WIDTH - 40}" y2="140" stroke="${color}" stroke-width="1" opacity="0.5"/>

      <!-- キーワード名 -->
      <text x="${CARD_WIDTH / 2}" y="60"
            font-family="'Noto Sans JP', 'Yu Gothic', 'Meiryo', sans-serif"
            font-size="32"
            font-weight="bold"
            fill="${color}"
            text-anchor="middle">${escapeXml(keyword)} #${cardNumber}</text>

      <!-- レアリティ表示 -->
      <text x="${CARD_WIDTH / 2}" y="100"
            font-family="'Noto Sans JP', 'Yu Gothic', 'Meiryo', sans-serif"
            font-size="20"
            fill="${color}"
            text-anchor="middle">${getRarityStars(rarity)} ${getRarityName(rarity)}</text>

      <!-- セクションタイトル: 解説 -->
      <text x="${CARD_WIDTH / 2}" y="180"
            font-family="'Noto Sans JP', 'Yu Gothic', 'Meiryo', sans-serif"
            font-size="14"
            fill="#808080"
            text-anchor="middle">- DESCRIPTION -</text>

      <!-- 説明 -->
      <text x="${CARD_WIDTH / 2}" y="220"
            font-family="'Noto Sans JP', 'Yu Gothic', 'Meiryo', sans-serif"
            font-size="14"
            fill="#a0a0a0"
            text-anchor="middle">このキーワードの意味</text>

      ${descriptionTextElements}

      <!-- フレーバーテキスト区切り -->
      <line x1="80" y1="${flavorStartY - 20}" x2="${CARD_WIDTH - 80}" y2="${flavorStartY - 20}" stroke="#404040" stroke-width="1"/>

      ${flavorTextElements}

      <!-- フッター区切り線 -->
      <line x1="40" y1="${CARD_HEIGHT - 70}" x2="${CARD_WIDTH - 40}" y2="${CARD_HEIGHT - 70}" stroke="${color}" stroke-width="1" opacity="0.5"/>

      <!-- 生成日時 -->
      <text x="${CARD_WIDTH / 2}" y="${CARD_HEIGHT - 35}"
            font-family="'Noto Sans JP', 'Yu Gothic', 'Meiryo', sans-serif"
            font-size="16"
            fill="#606060"
            text-anchor="middle">${dateStr}</text>
    </svg>
  `;

  // SVGをJPEGに変換
  const cardBack = await sharp(Buffer.from(backSvg))
    .jpeg({ quality: 90 })
    .toBuffer();

  return cardBack;
}

/**
 * カード画像を合成（表面・裏面・サムネイル）
 */
export async function composeCardImage(
  input: CardCompositionInput
): Promise<CardCompositionResult> {
  // 表面を生成
  const cardImageBuffer = await createCardFront(
    input.illustrationBuffer,
    input.keyword,
    input.cardNumber,
    input.rarity
  );

  // 裏面を生成
  const cardBackImageBuffer = await createCardBack(
    input.keyword,
    input.cardNumber,
    input.rarity,
    input.contextDescription,
    input.flavorText,
    input.createdAt
  );

  // サムネイルを生成（表面から）
  const thumbnailBuffer = await sharp(cardImageBuffer)
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
      fit: 'cover',
    })
    .jpeg({ quality: 80 })
    .toBuffer();

  return {
    cardImageBuffer,
    cardBackImageBuffer,
    thumbnailBuffer,
  };
}

/**
 * イラストのみをリサイズ（テスト用）
 */
export async function resizeIllustration(
  imageBuffer: Buffer,
  width: number,
  height: number
): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(width, height, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 90 })
    .toBuffer();
}
