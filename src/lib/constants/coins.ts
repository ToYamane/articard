/**
 * コイン消費量
 */
export const COIN_COSTS = {
  /** カード生成コスト */
  CARD_GENERATION: 30,
  /** チャレンジモード11回目以降のコスト */
  CHALLENGE_EXTRA: 10,
} as const;

/**
 * コイン報酬量
 */
export const COIN_REWARDS = {
  /** 毎日の無料コイン */
  DAILY_FREE: 90,
  /** チャレンジBランク達成報酬 */
  CHALLENGE_RANK_B: 30,
  /** チャレンジAランク達成報酬 */
  CHALLENGE_RANK_A: 30,
  /** チャレンジSランク達成報酬 */
  CHALLENGE_RANK_S: 30,
} as const;

/**
 * 日次制限
 */
export const DAILY_LIMITS = {
  /** 無料チャレンジ回数 */
  FREE_CHALLENGES: 10,
} as const;

/**
 * ランク閾値（スコア）
 */
export const RANK_THRESHOLDS = {
  B: 400,
  A: 600,
  S: 800,
} as const;

/**
 * ランク情報
 */
export const RANK_INFO = {
  S: { emoji: '🏆', color: 'text-yellow-500', label: 'Sランク' },
  A: { emoji: '🌟', color: 'text-purple-500', label: 'Aランク' },
  B: { emoji: '⭐', color: 'text-blue-500', label: 'Bランク' },
  C: { emoji: '✨', color: 'text-green-500', label: 'Cランク' },
  D: { emoji: '💫', color: 'text-gray-500', label: 'Dランク' },
} as const;

export type AchievementRank = 'B' | 'A' | 'S';
