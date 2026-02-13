import path from 'path';
import opentype from 'opentype.js';
import sharp from 'sharp';
import type { Rarity } from '@/types/database';
import { getRarityColor } from './rarity';
import { RARITY_CONFIG } from '@/lib/constants/rarity-config';

// フォント設定（opentype.jsでTTFファイルを直接読み込み）
const FONTS_DIR = path.join(process.cwd(), 'fonts');

interface FontConfig {
  name: string;
  file: string; // TTFファイル名
  weight: number; // 出現重み
  font?: opentype.Font; // 遅延ロード
}

const CARD_FONTS: FontConfig[] = [
  // 高出現率 (weight: 2) - 標準的なフォント
  { name: 'Noto Sans JP', file: 'NotoSansJP-Bold.ttf', weight: 2 },
  { name: 'Noto Serif JP', file: 'NotoSerifJP-Bold.ttf', weight: 2 },
  { name: 'Dela Gothic One', file: 'DelaGothicOne-Regular.ttf', weight: 2 },
  { name: 'Kaisei Tokumin', file: 'KaiseiTokumin-Bold.ttf', weight: 2 },
  // 低出現率 (weight: 1) - 個性的なフォント
  { name: 'Reggae One', file: 'ReggaeOne-Regular.ttf', weight: 1 },
  { name: 'Yuji Syuku', file: 'YujiSyuku-Regular.ttf', weight: 1 },
  { name: 'Kiwi Maru', file: 'KiwiMaru-Medium.ttf', weight: 1 },
  { name: 'Hachi Maru Pop', file: 'HachiMaruPop-Regular.ttf', weight: 1 },
  { name: 'DotGothic16', file: 'DotGothic16-Regular.ttf', weight: 1 },
  { name: 'Stick', file: 'Stick-Regular.ttf', weight: 1 },
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

/**
 * フォントを遅延ロード
 */
function loadFont(config: FontConfig): opentype.Font {
  if (!config.font) {
    const fontPath = path.join(FONTS_DIR, config.file);
    config.font = opentype.loadSync(fontPath);
    console.log('[FontConfig] Loaded font:', config.name, 'from', fontPath);
  }
  return config.font;
}

/**
 * テキストをSVGパスに変換（中央揃え）
 */
function textToSvgPath(
  text: string,
  font: opentype.Font,
  fontSize: number,
  centerX: number,
  y: number
): string {
  // テキスト幅を計測してセンタリング
  const scale = fontSize / font.unitsPerEm;
  let totalWidth = 0;
  for (let i = 0; i < text.length; i++) {
    const glyph = font.charToGlyph(text[i]);
    totalWidth += (glyph.advanceWidth ?? 0) * scale;
  }
  const startX = centerX - totalWidth / 2;

  // パスを生成
  const svgPath = font.getPath(text, startX, y, fontSize);
  return svgPath.toSVG(2);
}

// カードサイズ
const CARD_WIDTH = 512;
const CARD_HEIGHT = 768;
const THUMBNAIL_WIDTH = 128;
const THUMBNAIL_HEIGHT = 192;

// タイトル設定（全レアリティ共通）
const TITLE_FONT_SIZE = 36;
const TITLE_Y = 52;

// カードデザイン設定（レアリティ別SVGパラメータ）
interface CardDesign {
  border: { width: number; color: string; rx: number };
  titleColor: string;
  topGradient: { height: number; opacity: number; tint?: string };
  innerLine?: { width: number; opacity: number; inset: number };
  cornerDecoration?: 'bracket' | 'bracket_dot' | 'diamond' | 'ornate';
  bottomGlow?: { color: string; height: number; opacity: number };
  topOrnament?: boolean;
  accentLine?: boolean;
}

const CARD_DESIGN: Record<Rarity, CardDesign> = {
  common: {
    border: { width: 6, color: '#9CA3AF', rx: 8 },
    titleColor: '#D1D5DB',
    topGradient: { height: 70, opacity: 0.6 },
    cornerDecoration: 'bracket',
  },
  rare: {
    border: { width: 8, color: '#3B82F6', rx: 10 },
    titleColor: '#93C5FD',
    topGradient: { height: 80, opacity: 0.65 },
    innerLine: { width: 1.5, opacity: 0.4, inset: 16 },
    cornerDecoration: 'bracket_dot',
    accentLine: true,
  },
  super_rare: {
    border: { width: 10, color: '#F59E0B', rx: 12 },
    titleColor: '#FDE68A',
    topGradient: { height: 85, opacity: 0.7, tint: '#F59E0B' },
    innerLine: { width: 2, opacity: 0.5, inset: 20 },
    cornerDecoration: 'diamond',
    accentLine: true,
  },
  legend: {
    border: { width: 12, color: '#F59E0B', rx: 14 },
    titleColor: '#FFFFFF',
    topGradient: { height: 90, opacity: 0.7 },
    innerLine: { width: 2.5, opacity: 0.6, inset: 24 },
    cornerDecoration: 'ornate',
    bottomGlow: { color: '#F59E0B', height: 30, opacity: 0.2 },
    topOrnament: true,
    accentLine: true,
  },
};

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
 * レアリティに応じたフレームSVGを動的生成
 */
function generateFrameSvg(rarity: Rarity): Buffer {
  const design = CARD_DESIGN[rarity];
  const { width: bw, rx } = design.border;
  const W = CARD_WIDTH;
  const H = CARD_HEIGHT;

  const defs: string[] = [];
  const elements: string[] = [];

  // ボーダーグラデーション（super_rare / legend）
  let strokeAttr: string;
  if (rarity === 'super_rare') {
    defs.push(`
      <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#F59E0B"/>
        <stop offset="50%" stop-color="#D97706"/>
        <stop offset="100%" stop-color="#F59E0B"/>
      </linearGradient>`);
    strokeAttr = 'url(#borderGrad)';
  } else if (rarity === 'legend') {
    defs.push(`
      <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FF6B6B"/>
        <stop offset="16%" stop-color="#F59E0B"/>
        <stop offset="33%" stop-color="#FBBF24"/>
        <stop offset="50%" stop-color="#34D399"/>
        <stop offset="66%" stop-color="#60A5FA"/>
        <stop offset="83%" stop-color="#A78BFA"/>
        <stop offset="100%" stop-color="#F472B6"/>
      </linearGradient>`);
    strokeAttr = 'url(#borderGrad)';
  } else {
    strokeAttr = design.border.color;
  }

  // 上部暗色グラデーション
  defs.push(`
    <linearGradient id="topDark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="${design.topGradient.opacity}"/>
      <stop offset="100%" stop-color="black" stop-opacity="0"/>
    </linearGradient>`);

  // 上部ティントグラデーション（super_rare / legend）
  if (design.topGradient.tint) {
    defs.push(`
      <linearGradient id="topTint" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${design.topGradient.tint}" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="${design.topGradient.tint}" stop-opacity="0"/>
      </linearGradient>`);
  }

  // 下部グローグラデーション（legend のみ）
  if (design.bottomGlow) {
    defs.push(`
      <linearGradient id="bottomGlow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${design.bottomGlow.color}" stop-opacity="0"/>
        <stop offset="100%" stop-color="${design.bottomGlow.color}" stop-opacity="${design.bottomGlow.opacity}"/>
      </linearGradient>`);
  }

  // クリップパス（内部要素をカード形状に制限）
  defs.push(`
    <clipPath id="cardClip">
      <rect x="${bw}" y="${bw}" width="${W - 2 * bw}" height="${H - 2 * bw}" rx="${Math.max(rx - 2, 0)}"/>
    </clipPath>`);

  // 外枠ボーダー
  elements.push(`
    <rect x="${bw / 2}" y="${bw / 2}" width="${W - bw}" height="${H - bw}"
          fill="none" stroke="${strokeAttr}" stroke-width="${bw}" rx="${rx}"/>`);

  // クリップされた内部要素（上部帯・下部グロー）
  const clipped: string[] = [];
  clipped.push(`
      <rect x="${bw}" y="${bw}" width="${W - 2 * bw}" height="${design.topGradient.height}"
            fill="url(#topDark)"/>`);

  if (design.topGradient.tint) {
    clipped.push(`
      <rect x="${bw}" y="${bw}" width="${W - 2 * bw}" height="${design.topGradient.height}"
            fill="url(#topTint)"/>`);
  }

  if (design.bottomGlow) {
    clipped.push(`
      <rect x="${bw}" y="${H - bw - design.bottomGlow.height}" width="${W - 2 * bw}" height="${design.bottomGlow.height}"
            fill="url(#bottomGlow)"/>`);
  }

  elements.push(`
    <g clip-path="url(#cardClip)">${clipped.join('')}
    </g>`);

  // インナーライン（rare 以上）
  if (design.innerLine) {
    const { width: lw, opacity: op, inset } = design.innerLine;
    elements.push(`
    <rect x="${inset}" y="${inset}" width="${W - 2 * inset}" height="${H - 2 * inset}"
          fill="none" stroke="${strokeAttr}" stroke-width="${lw}" opacity="${op}" rx="${Math.max(rx - 2, 0)}"/>`);
  }

  // コーナー装飾
  if (design.cornerDecoration === 'bracket') {
    // シンプルなL字コーナーマーク（Common用）
    const bracketLen = 16;
    const off = bw + 4;
    const c = design.border.color;
    elements.push(`
    <path d="M${off},${off + bracketLen} L${off},${off} L${off + bracketLen},${off}" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.5"/>
    <path d="M${W - off - bracketLen},${off} L${W - off},${off} L${W - off},${off + bracketLen}" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.5"/>
    <path d="M${off},${H - off - bracketLen} L${off},${H - off} L${off + bracketLen},${H - off}" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.5"/>
    <path d="M${W - off - bracketLen},${H - off} L${W - off},${H - off} L${W - off},${H - off - bracketLen}" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.5"/>`);
  } else if (design.cornerDecoration === 'bracket_dot') {
    // L字マーク＋ドットアクセント（Rare用）
    const bracketLen = 20;
    const off = bw + 4;
    const c = design.border.color;
    elements.push(`
    <path d="M${off},${off + bracketLen} L${off},${off} L${off + bracketLen},${off}" fill="none" stroke="${c}" stroke-width="2" opacity="0.6"/>
    <circle cx="${off + 2}" cy="${off + 2}" r="2.5" fill="${c}" opacity="0.5"/>
    <path d="M${W - off - bracketLen},${off} L${W - off},${off} L${W - off},${off + bracketLen}" fill="none" stroke="${c}" stroke-width="2" opacity="0.6"/>
    <circle cx="${W - off - 2}" cy="${off + 2}" r="2.5" fill="${c}" opacity="0.5"/>
    <path d="M${off},${H - off - bracketLen} L${off},${H - off} L${off + bracketLen},${H - off}" fill="none" stroke="${c}" stroke-width="2" opacity="0.6"/>
    <circle cx="${off + 2}" cy="${H - off - 2}" r="2.5" fill="${c}" opacity="0.5"/>
    <path d="M${W - off - bracketLen},${H - off} L${W - off},${H - off} L${W - off},${H - off - bracketLen}" fill="none" stroke="${c}" stroke-width="2" opacity="0.6"/>
    <circle cx="${W - off - 2}" cy="${H - off - 2}" r="2.5" fill="${c}" opacity="0.5"/>`);
  } else if (design.cornerDecoration === 'diamond') {
    // ダイヤ型ジェム＋装飾ライン（Super Rare用）
    const gemSize = 9;
    const off = bw + 10;
    const c = design.border.color;
    const corners = [
      [off, off],
      [W - off, off],
      [off, H - off],
      [W - off, H - off],
    ];
    for (const [cx, cy] of corners) {
      elements.push(`
    <polygon points="${cx},${cy - gemSize} ${cx + gemSize},${cy} ${cx},${cy + gemSize} ${cx - gemSize},${cy}"
             fill="${c}" opacity="0.6"/>
    <polygon points="${cx},${cy - gemSize + 2} ${cx + gemSize - 2},${cy} ${cx},${cy + gemSize - 2} ${cx - gemSize + 2},${cy}"
             fill="${c}" opacity="0.3"/>`);
    }
    // 上辺・下辺の装飾ライン
    const midX = W / 2;
    const lineLen = 40;
    elements.push(`
    <line x1="${midX - lineLen}" y1="${off}" x2="${midX + lineLen}" y2="${off}" stroke="${c}" stroke-width="1" opacity="0.35"/>
    <circle cx="${midX}" cy="${off}" r="2" fill="${c}" opacity="0.4"/>
    <line x1="${midX - lineLen}" y1="${H - off}" x2="${midX + lineLen}" y2="${H - off}" stroke="${c}" stroke-width="1" opacity="0.35"/>
    <circle cx="${midX}" cy="${H - off}" r="2" fill="${c}" opacity="0.4"/>`);
  } else if (design.cornerDecoration === 'ornate') {
    // 装飾的なコーナーピース＋スクロール（Legend用）
    const off = bw + 6;
    const size = 28;
    const c = '#F59E0B';
    // 四隅コーナーピース（L字＋カーブ＋ジェム）
    elements.push(`
    <path d="M${off},${off + size} L${off},${off} L${off + size},${off}" fill="none" stroke="${c}" stroke-width="2.5" opacity="0.8"/>
    <path d="M${off + 4},${off + size - 6} Q${off + 4},${off + 4} ${off + size - 6},${off + 4}" fill="none" stroke="${c}" stroke-width="1" opacity="0.4"/>
    <circle cx="${off + 3}" cy="${off + 3}" r="3" fill="${c}" opacity="0.7"/>
    <path d="M${W - off - size},${off} L${W - off},${off} L${W - off},${off + size}" fill="none" stroke="${c}" stroke-width="2.5" opacity="0.8"/>
    <path d="M${W - off - size + 6},${off + 4} Q${W - off - 4},${off + 4} ${W - off - 4},${off + size - 6}" fill="none" stroke="${c}" stroke-width="1" opacity="0.4"/>
    <circle cx="${W - off - 3}" cy="${off + 3}" r="3" fill="${c}" opacity="0.7"/>
    <path d="M${off},${H - off - size} L${off},${H - off} L${off + size},${H - off}" fill="none" stroke="${c}" stroke-width="2.5" opacity="0.8"/>
    <path d="M${off + 4},${H - off - size + 6} Q${off + 4},${H - off - 4} ${off + size - 6},${H - off - 4}" fill="none" stroke="${c}" stroke-width="1" opacity="0.4"/>
    <circle cx="${off + 3}" cy="${H - off - 3}" r="3" fill="${c}" opacity="0.7"/>
    <path d="M${W - off - size},${H - off} L${W - off},${H - off} L${W - off},${H - off - size}" fill="none" stroke="${c}" stroke-width="2.5" opacity="0.8"/>
    <path d="M${W - off - size + 6},${H - off - 4} Q${W - off - 4},${H - off - 4} ${W - off - 4},${H - off - size + 6}" fill="none" stroke="${c}" stroke-width="1" opacity="0.4"/>
    <circle cx="${W - off - 3}" cy="${H - off - 3}" r="3" fill="${c}" opacity="0.7"/>`);
    // 上辺・下辺の装飾ライン（中央にジェム）
    const midX = W / 2;
    const lineLen = 50;
    elements.push(`
    <line x1="${midX - lineLen}" y1="${off}" x2="${midX - 6}" y2="${off}" stroke="${c}" stroke-width="1" opacity="0.4"/>
    <polygon points="${midX},${off - 4} ${midX + 4},${off} ${midX},${off + 4} ${midX - 4},${off}" fill="${c}" opacity="0.5"/>
    <line x1="${midX + 6}" y1="${off}" x2="${midX + lineLen}" y2="${off}" stroke="${c}" stroke-width="1" opacity="0.4"/>
    <line x1="${midX - lineLen}" y1="${H - off}" x2="${midX - 6}" y2="${H - off}" stroke="${c}" stroke-width="1" opacity="0.4"/>
    <polygon points="${midX},${H - off - 4} ${midX + 4},${H - off} ${midX},${H - off + 4} ${midX - 4},${H - off}" fill="${c}" opacity="0.5"/>
    <line x1="${midX + 6}" y1="${H - off}" x2="${midX + lineLen}" y2="${H - off}" stroke="${c}" stroke-width="1" opacity="0.4"/>`);
  }

  // アクセントライン（rare 以上：下部の装飾ライン）
  if (design.accentLine) {
    const y = H - bw - 35;
    const x1 = bw + 30;
    const x2 = W - bw - 30;
    const midX = W / 2;
    elements.push(`
    <line x1="${x1}" y1="${y}" x2="${midX - 8}" y2="${y}" stroke="${design.border.color}" stroke-width="0.75" opacity="0.3"/>
    <circle cx="${midX}" cy="${y}" r="2" fill="${design.border.color}" opacity="0.3"/>
    <line x1="${midX + 8}" y1="${y}" x2="${x2}" y2="${y}" stroke="${design.border.color}" stroke-width="0.75" opacity="0.3"/>`);
  }

  // 上部オーナメント（legend のみ：クラウン型装飾）
  if (design.topOrnament) {
    const cx = W / 2;
    const ty = bw + 3;
    elements.push(`
    <path d="M${cx - 30},${ty + 12} L${cx - 18},${ty + 4} L${cx - 8},${ty + 10} L${cx},${ty - 2} L${cx + 8},${ty + 10} L${cx + 18},${ty + 4} L${cx + 30},${ty + 12}" fill="none" stroke="#F59E0B" stroke-width="1.5" opacity="0.7"/>
    <circle cx="${cx}" cy="${ty - 2}" r="3" fill="#FDE68A" opacity="0.85"/>
    <circle cx="${cx - 18}" cy="${ty + 4}" r="2" fill="#FDE68A" opacity="0.6"/>
    <circle cx="${cx + 18}" cy="${ty + 4}" r="2" fill="#FDE68A" opacity="0.6"/>`);
  }

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>${defs.join('')}
  </defs>${elements.join('')}
</svg>`;

  return Buffer.from(svg);
}

/**
 * 表面カード画像を生成
 * 合成フロー: 背景 → イラスト(全面) → フレームSVG → タイトルSVG
 */
async function createCardFront(
  illustrationBuffer: Buffer,
  keyword: string,
  rarity: Rarity
): Promise<Buffer> {
  // イラストをカード全体サイズにリサイズ
  const resizedIllustration = await sharp(illustrationBuffer)
    .resize(CARD_WIDTH, CARD_HEIGHT, {
      fit: 'cover',
      position: 'center',
    })
    .toBuffer();

  // ランダムでフォントを選択してロード
  const selectedFont = selectRandomFont();
  const font = loadFont(selectedFont);

  // フレームSVGを生成
  const frameSvg = generateFrameSvg(rarity);

  // タイトルSVG（opentype.jsでテキストをパスに変換）
  const titlePath = textToSvgPath(keyword, font, TITLE_FONT_SIZE, CARD_WIDTH / 2, TITLE_Y);
  const titleSvg = `
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <g fill="${CARD_DESIGN[rarity].titleColor}"
         stroke="#000000" stroke-width="4" paint-order="stroke">
        ${titlePath}
      </g>
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

  // 合成: 背景 → イラスト → フレームSVG → タイトルSVG
  const cardImage = await sharp(background)
    .composite([
      { input: resizedIllustration, top: 0, left: 0 },
      { input: frameSvg, top: 0, left: 0 },
      { input: Buffer.from(titleSvg), top: 0, left: 0 },
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

  // レアリティ別グラデーション設定
  const bgGradients: Record<Rarity, [string, string, string]> = {
    common: ['#1a1a2e', '#16162a', '#1a1a2e'],
    rare: ['#0f1a2e', '#0a1628', '#0f1a2e'],
    super_rare: ['#1a0f2e', '#140a28', '#1a0f2e'],
    legend: ['#1a1a2e', '#0f0f1a', '#1a1a2e'],
  };

  // レアリティ別パターン透明度
  const patternOpacity: Record<Rarity, number> = {
    common: 0.08,
    rare: 0.12,
    super_rare: 0.15,
    legend: 0.2,
  };

  const [bgStart, bgMid, bgEnd] = bgGradients[rarity];
  const pOpacity = patternOpacity[rarity];

  // コーナー装飾のサイズ
  const cornerSize = 30;
  const cornerInset = borderWidth + 8;

  // 裏面全体のSVG
  const backSvg = `
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="backGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${bgStart}"/>
          <stop offset="50%" style="stop-color:${bgMid}"/>
          <stop offset="100%" style="stop-color:${bgEnd}"/>
        </linearGradient>
        ${
          rarity === 'legend'
            ? `
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
        <!-- ひし形パターン -->
        <pattern id="diamondPattern" patternUnits="userSpaceOnUse" width="32" height="32">
          <rect width="32" height="32" fill="transparent"/>
          <path d="M16 0 L32 16 L16 32 L0 16 Z" fill="none" stroke="${color}" stroke-width="0.5" opacity="${pOpacity}"/>
        </pattern>
        <!-- 微細ラインテクスチャ -->
        <pattern id="lineTexture" patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(45)">
          <rect width="16" height="16" fill="transparent"/>
          <line x1="0" y1="8" x2="16" y2="8" stroke="${color}" stroke-width="0.3" opacity="${pOpacity * 0.5}"/>
        </pattern>
      </defs>

      <!-- 背景グラデーション -->
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#backGradient)" rx="12"/>
      <!-- ひし形パターン -->
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#diamondPattern)" rx="12"/>
      <!-- ラインテクスチャ -->
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#lineTexture)" rx="12"/>

      <!-- 中央ウォーターマーク（本+カード簡略形） -->
      <g transform="translate(${CARD_WIDTH / 2}, ${CARD_HEIGHT / 2})" opacity="${rarity === 'legend' ? 0.06 : 0.04}">
        <!-- 本のシルエット -->
        <path d="M-40,-50 L-5,-45 L-5,45 L-40,40 Z" fill="${color}"/>
        <path d="M40,-50 L5,-45 L5,45 L40,40 Z" fill="${color}"/>
        <!-- カードのシルエット（本の上に重ねて） -->
        <rect x="-18" y="-30" width="36" height="50" rx="3" fill="${color}" opacity="0.7"/>
        <line x1="-10" y1="-15" x2="10" y2="-15" stroke="${bgMid}" stroke-width="2"/>
        <line x1="-10" y1="-5" x2="10" y2="-5" stroke="${bgMid}" stroke-width="2"/>
        <line x1="-10" y1="5" x2="5" y2="5" stroke="${bgMid}" stroke-width="2"/>
      </g>

      <!-- 外枠 -->
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
      <!-- 内枠 -->
      <rect
        x="${borderWidth + 4}"
        y="${borderWidth + 4}"
        width="${CARD_WIDTH - (borderWidth + 4) * 2}"
        height="${CARD_HEIGHT - (borderWidth + 4) * 2}"
        fill="none"
        stroke="${color}"
        stroke-width="1"
        opacity="0.3"
        rx="8"
      />

      <!-- 四隅コーナー装飾 -->
      <!-- 左上 -->
      <path d="M${cornerInset},${cornerInset + cornerSize} L${cornerInset},${cornerInset} L${cornerInset + cornerSize},${cornerInset}"
            fill="none" stroke="${color}" stroke-width="2" opacity="0.6"/>
      <!-- 右上 -->
      <path d="M${CARD_WIDTH - cornerInset - cornerSize},${cornerInset} L${CARD_WIDTH - cornerInset},${cornerInset} L${CARD_WIDTH - cornerInset},${cornerInset + cornerSize}"
            fill="none" stroke="${color}" stroke-width="2" opacity="0.6"/>
      <!-- 左下 -->
      <path d="M${cornerInset},${CARD_HEIGHT - cornerInset - cornerSize} L${cornerInset},${CARD_HEIGHT - cornerInset} L${cornerInset + cornerSize},${CARD_HEIGHT - cornerInset}"
            fill="none" stroke="${color}" stroke-width="2" opacity="0.6"/>
      <!-- 右下 -->
      <path d="M${CARD_WIDTH - cornerInset - cornerSize},${CARD_HEIGHT - cornerInset} L${CARD_WIDTH - cornerInset},${CARD_HEIGHT - cornerInset} L${CARD_WIDTH - cornerInset},${CARD_HEIGHT - cornerInset - cornerSize}"
            fill="none" stroke="${color}" stroke-width="2" opacity="0.6"/>

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
            text-anchor="middle">${getRarityName(rarity)}</text>

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
  const cardBack = await sharp(Buffer.from(backSvg)).jpeg({ quality: 90 }).toBuffer();

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
