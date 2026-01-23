import type { Rarity, ContextCategory } from '@/types/database';

export interface RarityInput {
  contextCategory: ContextCategory;
  uniquenessScore: number; // 1-10
  keywordFrequency?: number; // 一般的な出現頻度（デフォルト: 5）
}

// 文脈カテゴリによるボーナスポイント
const CATEGORY_BONUS: Record<ContextCategory, number> = {
  mythology: 40,
  historical_event: 35,
  biographical: 25,
  cultural: 20,
  metaphorical: 15,
  scientific: 10,
  general: 0,
};

/**
 * レア度を計算
 */
export function calculateRarity(input: RarityInput): Rarity {
  let score = 0;

  // 文脈カテゴリによる加点
  score += CATEGORY_BONUS[input.contextCategory];

  // ユニークネススコアによる加点 (0-30)
  score += input.uniquenessScore * 3;

  // キーワード頻度による加点 (0-30)
  // 頻度が低いほど高スコア（デフォルトは中間の5）
  const frequency = input.keywordFrequency ?? 5;
  score += Math.max(0, 30 - frequency * 3);

  // ランダム要素 (±10)
  score += Math.floor(Math.random() * 21) - 10;

  // レア度判定
  if (score >= 80) return 'legend';
  if (score >= 60) return 'super_rare';
  if (score >= 40) return 'rare';
  if (score >= 20) return 'uncommon';
  return 'common';
}

/**
 * レア度に応じた色を取得
 */
export function getRarityColor(rarity: Rarity): string {
  const colors: Record<Rarity, string> = {
    common: '#9CA3AF', // gray
    uncommon: '#10B981', // green
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
    uncommon: ['#10B981', '#059669'],
    rare: ['#3B82F6', '#2563EB'],
    super_rare: ['#8B5CF6', '#7C3AED'],
    legend: ['#F59E0B', '#D97706'],
  };
  return gradients[rarity];
}
