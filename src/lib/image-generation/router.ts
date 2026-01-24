import type { Rarity } from '@/types/database';
import { generateWithDalle3HD, generateWithDalle3Standard } from '@/lib/openai/dalle';
import { generateWithNanoBanana, generateWithGeminiImagen3 } from '@/lib/gemini/client';
import {
  requestImageGeneration as requestFluxImageGeneration,
  getGenerationResult,
  downloadImage,
  type FluxModel,
} from '@/lib/flux/client';
import {
  type ImageGenerationInput,
  type ImageGenerationResult,
  type ModelConfig,
  RARITY_MODEL_CONFIG,
  FALLBACK_MODEL_CONFIG,
} from './types';

/**
 * FLUXモデルで画像を生成
 */
async function generateWithFlux(
  prompt: string,
  fluxModel: FluxModel,
  width?: number,
  height?: number
): Promise<Buffer> {
  const { pollingUrl } = await requestFluxImageGeneration({
    prompt,
    model: fluxModel,
    width: width || 512,
    height: height || 768,
  });

  const imageUrl = await getGenerationResult(pollingUrl);
  const imageBuffer = await downloadImage(imageUrl);

  return imageBuffer;
}

/**
 * モデル設定に基づいて画像を生成
 */
async function generateWithConfig(
  input: ImageGenerationInput,
  config: ModelConfig
): Promise<Buffer> {
  const { prompt, width, height } = input;

  switch (config.model) {
    // OpenAI DALL-E
    case 'dall-e-3-hd':
      return generateWithDalle3HD({ prompt, quality: 'hd' });
    case 'dall-e-3-standard':
      return generateWithDalle3Standard({ prompt, quality: 'standard' });

    // Google Gemini
    case 'nano-banana':
      return generateWithNanoBanana({ prompt, aspectRatio: '3:4' });
    case 'gemini-imagen-3':
      return generateWithGeminiImagen3({ prompt, aspectRatio: '3:4' });

    // FLUX
    case 'flux-pro-1.1':
    case 'flux-2-pro':
    case 'flux-2-dev':
    case 'flux-2-klein':
    case 'flux-schnell':
      return generateWithFlux(prompt, config.model as FluxModel, width, height);

    default:
      throw new Error(`未対応のモデル: ${config.model}`);
  }
}

/**
 * レアリティに基づいて最適なモデルで画像を生成
 *
 * - legend: DALL-E 3 HD (~$0.10) - 最高品質
 * - super_rare: FLUX.2 Pro (~$0.04) - 高品質FLUX
 * - rare: Nano Banana (~$0.03) - Google品質
 * - common: FLUX.2 Klein (~$0.005) - 最安・最速
 *
 * @param input - 画像生成入力パラメータ
 * @param rarity - カードのレアリティ
 * @returns 画像バッファとモデル情報
 */
export async function generateCardImageByRarity(
  input: ImageGenerationInput,
  rarity: Rarity
): Promise<ImageGenerationResult> {
  const primaryConfig = RARITY_MODEL_CONFIG[rarity];

  console.log(`Generating image for ${rarity} card using ${primaryConfig.model} (${primaryConfig.provider})...`);

  try {
    const imageBuffer = await generateWithConfig(input, primaryConfig);

    return {
      imageBuffer,
      model: primaryConfig.model,
      provider: primaryConfig.provider,
      estimatedCost: primaryConfig.estimatedCost,
    };
  } catch (primaryError) {
    console.error(
      `Primary model (${primaryConfig.model}) failed, trying fallback...`,
      primaryError
    );

    // フォールバック: FLUX 1.1 Pro
    try {
      const imageBuffer = await generateWithConfig(input, FALLBACK_MODEL_CONFIG);

      return {
        imageBuffer,
        model: FALLBACK_MODEL_CONFIG.model,
        provider: FALLBACK_MODEL_CONFIG.provider,
        estimatedCost: FALLBACK_MODEL_CONFIG.estimatedCost,
      };
    } catch (fallbackError) {
      console.error('Fallback model also failed:', fallbackError);
      throw new Error(
        `画像生成に失敗しました。プライマリ(${primaryConfig.model})とフォールバック(${FALLBACK_MODEL_CONFIG.model})の両方が失敗しました。`
      );
    }
  }
}

/**
 * 特定のモデルを指定して画像を生成
 * テストやデバッグ用
 */
export async function generateCardImageWithModel(
  input: ImageGenerationInput,
  config: ModelConfig
): Promise<ImageGenerationResult> {
  console.log(`Generating image using ${config.model} (${config.provider})...`);

  const imageBuffer = await generateWithConfig(input, config);

  return {
    imageBuffer,
    model: config.model,
    provider: config.provider,
    estimatedCost: config.estimatedCost,
  };
}

/**
 * 利用可能なAPIキーに基づいてモデルが使用可能かチェック
 */
export function isModelAvailable(config: ModelConfig): boolean {
  switch (config.provider) {
    case 'openai':
      return !!process.env.OPENAI_API_KEY;
    case 'gemini':
      return !!process.env.GOOGLE_GEMINI_API_KEY;
    case 'flux':
      return !!process.env.BFL_API_KEY;
    default:
      return false;
  }
}

/**
 * レアリティに対してプライマリモデルが使用可能かチェック
 */
export function isPrimaryModelAvailable(rarity: Rarity): boolean {
  const config = RARITY_MODEL_CONFIG[rarity];
  return isModelAvailable(config);
}

/**
 * 推定コストを計算
 */
export function getEstimatedCost(rarity: Rarity): number {
  return RARITY_MODEL_CONFIG[rarity].estimatedCost;
}

/**
 * 平均コストを計算（レアリティ分布に基づく）
 * - legend: 5%
 * - super_rare: 10%
 * - rare: 25%
 * - common: 60%
 */
export function getAverageEstimatedCost(): number {
  return (
    0.05 * RARITY_MODEL_CONFIG.legend.estimatedCost +
    0.10 * RARITY_MODEL_CONFIG.super_rare.estimatedCost +
    0.25 * RARITY_MODEL_CONFIG.rare.estimatedCost +
    0.60 * RARITY_MODEL_CONFIG.common.estimatedCost
  );
}
