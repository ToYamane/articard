/**
 * レア度設定の一元管理
 * 確率、色、スタイル修飾子などを集約
 */
import type { Rarity } from '@/types/database';

export interface RarityConfig {
  /** 出現確率の累積閾値（0-100） */
  threshold: number;
  /** メインカラー */
  color: string;
  /** グラデーション [開始, 終了] */
  gradient: [string, string];
  /** 日本語名 */
  japaneseName: string;
  /** カード枠線幅 */
  borderWidth: number;
}

/**
 * レア度設定マッピング
 *
 * 確率分布:
 * - legend: 0-5 = 5%
 * - super_rare: 5-15 = 10%
 * - rare: 15-40 = 25%
 * - common: 40-100 = 60%
 */
export const RARITY_CONFIG: Record<Rarity, RarityConfig> = {
  legend: {
    threshold: 5,
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706'],
    japaneseName: 'レジェンド',
    borderWidth: 6,
  },
  super_rare: {
    threshold: 15,
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#7C3AED'],
    japaneseName: 'スーパーレア',
    borderWidth: 5,
  },
  rare: {
    threshold: 40,
    color: '#3B82F6',
    gradient: ['#3B82F6', '#2563EB'],
    japaneseName: 'レア',
    borderWidth: 4,
  },
  common: {
    threshold: 100,
    color: '#9CA3AF',
    gradient: ['#9CA3AF', '#6B7280'],
    japaneseName: 'コモン',
    borderWidth: 4,
  },
};

/**
 * 確率判定用のレア度リスト（閾値昇順）
 */
export const RARITY_THRESHOLDS: { rarity: Rarity; threshold: number }[] = [
  { rarity: 'legend', threshold: RARITY_CONFIG.legend.threshold },
  { rarity: 'super_rare', threshold: RARITY_CONFIG.super_rare.threshold },
  { rarity: 'rare', threshold: RARITY_CONFIG.rare.threshold },
  { rarity: 'common', threshold: RARITY_CONFIG.common.threshold },
];

/**
 * レア度設定を取得
 */
export function getRarityConfig(rarity: Rarity): RarityConfig {
  return RARITY_CONFIG[rarity];
}
