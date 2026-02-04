import type { Rarity } from '@/types/database';
import { RARITY_CONFIG, RARITY_THRESHOLDS } from '@/lib/constants/rarity-config';

/**
 * 確率に基づいてレア度を決定
 * @param specifiedRarity 指定されたレア度（開発者モード用）
 */
export function calculateRarity(specifiedRarity?: Rarity): Rarity {
  // 指定されたレア度がある場合はそれを使用
  if (specifiedRarity) {
    return specifiedRarity;
  }

  const roll = Math.random() * 100;

  for (const { rarity, threshold } of RARITY_THRESHOLDS) {
    if (roll < threshold) {
      return rarity;
    }
  }

  return 'common';
}

/**
 * レア度に応じた色を取得
 */
export function getRarityColor(rarity: Rarity): string {
  return RARITY_CONFIG[rarity].color;
}

/**
 * レア度に応じたグラデーション色を取得
 */
export function getRarityGradient(rarity: Rarity): [string, string] {
  return RARITY_CONFIG[rarity].gradient;
}
