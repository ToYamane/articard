import type { Rarity, EmotionalTone } from '@/types/database';
import { generateCardImageByRarity, type ImageGenerationResult } from '@/lib/image-generation';
import { RARITY_CONFIG } from '@/lib/constants/rarity-config';

// トーンによるスタイル修飾子（各トーンに複数バリエーション）
const TONE_MODIFIERS: Record<EmotionalTone, string[]> = {
  epic: [
    'epic scale, heroic atmosphere',
    'grand vista, monumental presence',
    'sweeping panorama, awe-inspiring',
    'towering silhouette, legendary aura',
  ],
  mysterious: [
    'ethereal glow, mysterious ambiance',
    'shrouded in mist, enigmatic',
    'twilight shadows, arcane energy',
    'moonlit silhouette, otherworldly',
  ],
  scientific: [
    'technical precision, analytical clarity',
    'microscopic detail, clinical observation',
    'schematic elegance, data visualization',
    'laboratory atmosphere, empirical beauty',
  ],
  warm: [
    'warm colors, friendly atmosphere',
    'golden hour light, gentle radiance',
    'soft pastels, cozy intimacy',
    'sunlit warmth, nostalgic glow',
  ],
  dramatic: [
    'dramatic lighting, intense contrast',
    'chiaroscuro shadows, powerful tension',
    'storm-lit scene, raw energy',
    'bold contrasts, cinematic intensity',
  ],
  neutral: [
    'balanced composition, clean tones',
    'harmonious arrangement, subtle palette',
    'even lighting, understated elegance',
    'refined simplicity, measured balance',
  ],
};

// アートスタイルプール（ランダムに選択して視覚的多様性を注入）
const ART_STYLES = [
  'digital painting',
  'concept art',
  'watercolor illustration',
  'oil painting style',
  'cel-shaded art',
  'ink wash painting',
  'gouache illustration',
  'colored pencil art',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface ImageGenerationInput {
  imageSubject: string;
  imageScene: string;
  imageDetails: string;
  rarity: Rarity;
  emotionalTone: EmotionalTone;
}

export interface CardIllustrationResult {
  imageBuffer: Buffer;
  prompt: string;
  model: string;
  provider: string;
  estimatedCost: number;
}

/**
 * イラスト生成用プロンプトを生成
 * 記事内容（英語）を優先し、固定部分を簡略化
 */
export function generateImagePrompt(input: ImageGenerationInput): string {
  const styleModifier = RARITY_CONFIG[input.rarity].styleModifier;
  const toneModifier = pickRandom(TONE_MODIFIERS[input.emotionalTone]);
  const artStyle = pickRandom(ART_STYLES);

  return `${input.imageSubject}, ${input.imageScene}, ${input.imageDetails}, ${artStyle}, ${styleModifier}, ${toneModifier}, trading card illustration, high quality`.trim();
}

/**
 * カードイラストを生成
 * レアリティに応じて異なる画像生成モデルを使用
 *
 * - legend: DALL-E 3 HD (~$0.10)
 * - super_rare: FLUX.2 Pro (~$0.04)
 * - rare: Nano Banana (~$0.03)
 * - common: FLUX.2 Klein (~$0.005)
 */
export async function generateCardIllustration(
  input: ImageGenerationInput
): Promise<CardIllustrationResult> {
  const prompt = generateImagePrompt(input);

  // レアリティに基づいてモデルを選択し、画像を生成
  const result: ImageGenerationResult = await generateCardImageByRarity(
    {
      prompt,
      width: 512,
      height: 768,
    },
    input.rarity
  );

  return {
    imageBuffer: result.imageBuffer,
    prompt,
    model: result.model,
    provider: result.provider,
    estimatedCost: result.estimatedCost,
  };
}
