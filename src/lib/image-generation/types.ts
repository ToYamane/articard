import type { Rarity } from '@/types/database';

/**
 * 画像生成プロバイダー
 */
export type ImageProvider = 'openai' | 'gemini' | 'flux';

/**
 * 画像生成モデル
 */
export type ImageModel =
  // OpenAI DALL-E
  | 'dall-e-3-hd'
  | 'dall-e-3-standard'
  // Google Gemini
  | 'nano-banana'
  | 'gemini-imagen-3'
  // FLUX
  | 'flux-pro-1.1'
  | 'flux-2-pro'
  | 'flux-2-dev'
  | 'flux-2-klein'
  | 'flux-schnell';

/**
 * プロバイダーとモデルの設定
 */
export interface ModelConfig {
  provider: ImageProvider;
  model: ImageModel;
  estimatedCost: number; // USD per image
  description: string;
}

/**
 * 画像生成入力パラメータ
 */
export interface ImageGenerationInput {
  prompt: string;
  width?: number;
  height?: number;
}

/**
 * 画像生成結果
 */
export interface ImageGenerationResult {
  imageBuffer: Buffer;
  model: ImageModel;
  provider: ImageProvider;
  estimatedCost: number;
}

/**
 * レアリティ別モデル設定
 */
export const RARITY_MODEL_CONFIG: Record<Rarity, ModelConfig> = {
  legend: {
    provider: 'openai',
    model: 'dall-e-3-hd',
    estimatedCost: 0.10,
    description: 'DALL-E 3 HD - 最高品質、希少価値を最大化',
  },
  super_rare: {
    provider: 'flux',
    model: 'flux-2-pro',
    estimatedCost: 0.04,
    description: 'FLUX.2 Pro - 高品質FLUX',
  },
  rare: {
    provider: 'gemini',
    model: 'nano-banana',
    estimatedCost: 0.03,
    description: 'Nano Banana (Gemini 2.5 Flash) - Google品質、異なるスタイル',
  },
  common: {
    provider: 'flux',
    model: 'flux-2-klein',
    estimatedCost: 0.005,
    description: 'FLUX.2 Klein - 最安・最速',
  },
};

/**
 * フォールバックモデル設定
 * プライマリモデルが失敗した場合に使用
 */
export const FALLBACK_MODEL_CONFIG: ModelConfig = {
  provider: 'flux',
  model: 'flux-pro-1.1',
  estimatedCost: 0.04,
  description: 'FLUX 1.1 Pro - フォールバック用',
};
