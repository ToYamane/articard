import sharp from 'sharp';
import type { Rarity } from '@/types/database';
import { getRarityColor } from './rarity';

// カードサイズ
const CARD_WIDTH = 512;
const CARD_HEIGHT = 768;
const THUMBNAIL_WIDTH = 128;
const THUMBNAIL_HEIGHT = 192;

// イラスト領域
const ILLUSTRATION_HEIGHT = 480;
const PADDING = 16;

export interface CardCompositionInput {
  illustrationBuffer: Buffer;
  keyword: string;
  rarity: Rarity;
  flavorText: string;
  createdAt: Date;
}

export interface CardCompositionResult {
  cardImageBuffer: Buffer;
  thumbnailBuffer: Buffer;
}

/**
 * レア度に応じた枠色のSVGを生成
 */
function createCardFrame(rarity: Rarity): Buffer {
  const color = getRarityColor(rarity);
  const borderWidth = rarity === 'legend' ? 4 : rarity === 'super_rare' ? 3 : 2;

  // シンプルな枠のSVG
  const svg = `
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${
          rarity === 'legend'
            ? `
          <linearGradient id="legendGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#FFD700"/>
            <stop offset="50%" style="stop-color:#FFA500"/>
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
        stroke="${rarity === 'legend' ? 'url(#legendGradient)' : color}"
        stroke-width="${borderWidth}"
        rx="8"
      />
    </svg>
  `;

  return Buffer.from(svg);
}

/**
 * カード背景を生成
 */
function createCardBackground(): Buffer {
  const svg = `
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="#1F2937" rx="8"/>
    </svg>
  `;

  return Buffer.from(svg);
}

/**
 * カード画像を合成
 */
export async function composeCardImage(
  input: CardCompositionInput
): Promise<CardCompositionResult> {
  // イラストをリサイズ
  const resizedIllustration = await sharp(input.illustrationBuffer)
    .resize(CARD_WIDTH - PADDING * 2, ILLUSTRATION_HEIGHT, {
      fit: 'cover',
      position: 'center',
    })
    .toBuffer();

  // 背景を作成
  const background = createCardBackground();

  // 枠を作成
  const frame = createCardFrame(input.rarity);

  // 合成
  const cardImage = await sharp(background)
    .composite([
      // イラストを配置
      {
        input: resizedIllustration,
        top: PADDING,
        left: PADDING,
      },
      // 枠を重ねる
      {
        input: frame,
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  // サムネイルを生成
  const thumbnail = await sharp(cardImage)
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
      fit: 'cover',
    })
    .jpeg({ quality: 80 })
    .toBuffer();

  return {
    cardImageBuffer: cardImage,
    thumbnailBuffer: thumbnail,
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
