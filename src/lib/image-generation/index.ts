/**
 * 画像生成統一インターフェース
 *
 * レアリティに応じて異なる画像生成モデルを使用し、
 * レアカードほど高品質な画像を生成する。
 *
 * | レアリティ | 出現率 | モデル | コスト |
 * |-----------|--------|--------|--------|
 * | legend | 5% | DALL-E 3 HD | ~$0.10 |
 * | super_rare | 10% | FLUX.2 Pro | ~$0.04 |
 * | rare | 25% | Nano Banana | ~$0.03 |
 * | common | 60% | FLUX.2 Klein | ~$0.005 |
 *
 * 平均コスト: ~$0.0195/カード
 */

export {
  generateCardImageByRarity,
  generateCardImageWithModel,
  isModelAvailable,
  isPrimaryModelAvailable,
  getEstimatedCost,
  getAverageEstimatedCost,
} from './router';

export {
  type ImageProvider,
  type ImageModel,
  type ModelConfig,
  type ImageGenerationInput,
  type ImageGenerationResult,
  RARITY_MODEL_CONFIG,
  FALLBACK_MODEL_CONFIG,
} from './types';
