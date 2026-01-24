import type { Rarity } from '@/types/database';

/**
 * レア度の出現確率（合計100%）
 * common: 60%, rare: 25%, super_rare: 10%, legend: 5%
 */
const RARITY_PROBABILITIES: { rarity: Rarity; threshold: number }[] = [
  { rarity: 'legend', threshold: 5 },       // 0-5: legend (5%)
  { rarity: 'super_rare', threshold: 15 },  // 5-15: super_rare (10%)
  { rarity: 'rare', threshold: 40 },        // 15-40: rare (25%)
  { rarity: 'common', threshold: 100 },     // 40-100: common (60%)
];

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

  for (const { rarity, threshold } of RARITY_PROBABILITIES) {
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
  const colors: Record<Rarity, string> = {
    common: '#9CA3AF', // gray
    rare: '#3B82F6', // blue
    super_rare: '#8B5CF6', // purple
    legend: '#F59E0B', // gold
  };
  return colors[rarity];
}

/**
 * レア度に応じたグラデーション色を取得
 */
export function getRarityGradient(rarity: Rarity): [string, string] {
  const gradients: Record<Rarity, [string, string]> = {
    common: ['#9CA3AF', '#6B7280'],
    rare: ['#3B82F6', '#2563EB'],
    super_rare: ['#8B5CF6', '#7C3AED'],
    legend: ['#F59E0B', '#D97706'],
  };
  return gradients[rarity];
}
