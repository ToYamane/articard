import { requestImageGeneration, getGenerationResult, downloadImage } from './client';
import type { Rarity, EmotionalTone } from '@/types/database';

// レア度によるスタイル修飾子
const STYLE_MODIFIERS: Record<Rarity, string> = {
  common: 'simple illustration, clean lines, bright colors',
  uncommon: 'detailed illustration, vibrant colors, dynamic composition',
  rare: 'highly detailed art, dramatic lighting, rich colors',
  super_rare: 'epic fantasy art, cinematic lighting, intricate details, masterpiece',
  legend:
    'legendary masterpiece, divine lighting, mythological atmosphere, ultra detailed, golden accents',
};

// トーンによるスタイル修飾子
const TONE_MODIFIERS: Record<EmotionalTone, string> = {
  epic: 'epic scale, heroic atmosphere',
  mysterious: 'mysterious atmosphere, ethereal glow',
  scientific: 'technical precision, educational style',
  warm: 'warm colors, friendly atmosphere',
  dramatic: 'dramatic lighting, intense mood',
  neutral: 'balanced composition, clear presentation',
};

export interface ImageGenerationInput {
  keyword: string;
  contextDescription: string;
  rarity: Rarity;
  emotionalTone: EmotionalTone;
}

/**
 * イラスト生成用プロンプトを生成
 */
export function generateImagePrompt(input: ImageGenerationInput): string {
  const styleModifier = STYLE_MODIFIERS[input.rarity];
  const toneModifier = TONE_MODIFIERS[input.emotionalTone];

  return `${input.keyword}, ${input.contextDescription}, ${styleModifier}, ${toneModifier}, trading card art style, centered composition, no text, no watermark, high quality`.trim();
}

/**
 * カードイラストを生成
 */
export async function generateCardIllustration(
  input: ImageGenerationInput
): Promise<{ imageBuffer: Buffer; prompt: string }> {
  const prompt = generateImagePrompt(input);

  // 生成リクエストを送信
  const taskId = await requestImageGeneration({
    prompt,
    width: 512,
    height: 768,
  });

  // 結果を取得（ポーリング）
  const imageUrl = await getGenerationResult(taskId);

  // 画像をダウンロード
  const imageBuffer = await downloadImage(imageUrl);

  return {
    imageBuffer,
    prompt,
  };
}
