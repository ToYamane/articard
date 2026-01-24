import type { Rarity, EmotionalTone } from '@/types/database';
import { generateCardImageByRarity, type ImageGenerationResult } from '@/lib/image-generation';

// レア度によるスタイル修飾子（簡略化）
const STYLE_MODIFIERS: Record<Rarity, string> = {
  common: 'clean illustration, bright colors',
  rare: 'detailed art, dramatic lighting',
  super_rare: 'epic fantasy art, cinematic lighting, masterpiece',
  legend: 'legendary masterpiece, divine lighting, ultra detailed, golden accents',
};

// トーンによるスタイル修飾子（簡略化）
const TONE_MODIFIERS: Record<EmotionalTone, string> = {
  epic: 'epic scale, heroic',
  mysterious: 'ethereal glow, mysterious',
  scientific: 'technical precision',
  warm: 'warm colors, friendly',
  dramatic: 'dramatic lighting, intense',
  neutral: 'balanced composition',
};

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
  const styleModifier = STYLE_MODIFIERS[input.rarity];
  const toneModifier = TONE_MODIFIERS[input.emotionalTone];

  // 記事内容を優先（約70%）、スタイル・固定部分を簡略化（約30%）
  return `${input.imageSubject}, ${input.imageScene}, ${input.imageDetails}, ${styleModifier}, ${toneModifier}, trading card illustration, centered, high quality`.trim();
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
