/**
 * コイン消費量
 */
export const COIN_COSTS = {
  /** カード生成コスト */
  CARD_GENERATION: 30,
  /** チャレンジモード追加回数のコスト */
  CHALLENGE_EXTRA: 10,
} as const;

/**
 * コイン報酬量
 */
export const COIN_REWARDS = {
  /** 毎日の無料コイン（無料ユーザー） */
  DAILY_FREE: 90,
  /** チャレンジBランク達成報酬 */
  CHALLENGE_RANK_B: 30,
  /** チャレンジAランク達成報酬 */
  CHALLENGE_RANK_A: 30,
  /** チャレンジSランク達成報酬 */
  CHALLENGE_RANK_S: 30,
} as const;

/**
 * 日次制限（無料ユーザー）
 */
export const DAILY_LIMITS = {
  /** 無料チャレンジ回数 */
  FREE_CHALLENGES: 3,
} as const;

/**
 * ランク閾値（スコア）
 */
export const RANK_THRESHOLDS = {
  B: 250,
  A: 350,
  S: 450,
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

// ========================================
// サブスクリプション関連
// ========================================

/**
 * サブスクリプションプラン定義
 */
export const SUBSCRIPTION_PLANS = {
  plus: {
    id: 'plus',
    name: 'プラス',
    monthlyPrice: 980,
    dailyFreeCoins: 150,
    freeChallenges: 10,
    signupBonus: 300,
  },
  premium: {
    id: 'premium',
    name: 'プレミアム',
    monthlyPrice: 2980,
    dailyFreeCoins: 300,
    freeChallenges: Infinity,
    signupBonus: 900,
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_PLANS;

/**
 * コイン購入パッケージ定義
 */
export const COIN_PACKAGES = {
  standard: {
    id: 'standard',
    name: 'スタンダード',
    coins: 600,
    price: 980,
  },
  value: {
    id: 'value',
    name: 'バリュー',
    coins: 2100,
    price: 2980,
  },
  premium: {
    id: 'premium',
    name: 'プレミアム',
    coins: 6000,
    price: 6980,
  },
} as const;

export type CoinPackageId = keyof typeof COIN_PACKAGES;
