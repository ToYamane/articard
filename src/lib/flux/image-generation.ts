import type { Rarity, EmotionalTone } from '@/types/database';
import { generateCardImageByRarity, type ImageGenerationResult } from '@/lib/image-generation';

// アートスタイルプール（ランダムに選択して視覚的多様性を注入）
const ART_STYLES = [
  'photorealistic, cinematic lighting',
  'oil painting, rich texture',
  'watercolor illustration, soft edges',
  'anime style, cel shading',
  'pixel art, 16-bit retro',
  'flat vector illustration, minimal',
  'pencil sketch, hand-drawn',
  'ukiyo-e style, Japanese woodblock print',
  'neon-lit illustration, high contrast glow',
  'fantasy concept art, epic lighting',
  'art nouveau, ornamental details',
  'low poly 3D render, geometric',
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
 * アートスタイルを先頭に置き、画風の違いを明確にする
 */
export function generateImagePrompt(input: ImageGenerationInput): string {
  const artStyle = pickRandom(ART_STYLES);
  return `${artStyle} of ${input.imageSubject}, ${input.imageScene}, ${input.imageDetails}`;
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
