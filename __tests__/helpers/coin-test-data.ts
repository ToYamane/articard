// コインシステム テスト用データファクトリ

// 基本的な無料ユーザー
export const mockCoinUser = {
  id: 'test-user-id-123',
  nickname: 'testuser',
  knowledgeBalance: 100,
  dailyFreeCoins: 90,
  dailyCoinsResetAt: new Date('2026-01-15T00:00:00Z'),
  dailyChallengeCount: 0,
  dailyChallengeResetAt: new Date('2026-01-15T00:00:00Z'),
  isPremium: false,
  isDeveloper: false,
  premiumExpiresAt: null,
  subscriptionTier: null,
  subscriptionBonusReceived: false,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  lastActiveAt: new Date('2026-01-15T00:00:00Z'),
};

// Plusプランユーザー
export const mockPlusUser = {
  ...mockCoinUser,
  id: 'test-plus-user-id',
  nickname: 'plususer',
  isPremium: true,
  subscriptionTier: 'plus' as const,
  subscriptionBonusReceived: true,
  dailyFreeCoins: 150,
  stripeCustomerId: 'cus_plus_test',
  stripeSubscriptionId: 'sub_plus_test',
  premiumExpiresAt: new Date('2026-12-31T23:59:59Z'),
};

// Premiumプランユーザー
export const mockPremiumUser = {
  ...mockCoinUser,
  id: 'test-premium-user-id',
  nickname: 'premiumuser',
  isPremium: true,
  subscriptionTier: 'premium' as const,
  subscriptionBonusReceived: true,
  dailyFreeCoins: 300,
  knowledgeBalance: 500,
  stripeCustomerId: 'cus_premium_test',
  stripeSubscriptionId: 'sub_premium_test',
  premiumExpiresAt: new Date('2026-12-31T23:59:59Z'),
};

// 開発者ユーザー
export const mockDeveloperUser = {
  ...mockCoinUser,
  id: 'test-developer-user-id',
  nickname: 'devuser',
  isDeveloper: true,
};

// コイン残高ゼロのユーザー
export const mockBrokeUser = {
  ...mockCoinUser,
  id: 'test-broke-user-id',
  nickname: 'brokeuser',
  knowledgeBalance: 0,
  dailyFreeCoins: 0,
};

// デイリーチャレンジ上限到達ユーザー
export const mockDailyLimitUser = {
  ...mockCoinUser,
  id: 'test-daily-limit-user-id',
  nickname: 'dailylimituser',
  dailyChallengeCount: 3,
  dailyChallengeResetAt: new Date(), // 今日
};

// モックトランザクションデータ
export const mockTransaction = {
  id: 'txn-1',
  userId: 'test-user-id-123',
  amount: 30,
  transactionType: 'consume',
  description: 'カード生成',
  balanceAfter: 70,
  createdAt: new Date('2026-01-15T10:00:00Z'),
};

export const mockBonusTransaction = {
  id: 'txn-bonus-1',
  userId: 'test-user-id-123',
  amount: 30,
  transactionType: 'bonus',
  description: 'チャレンジ達成報酬: space_exploration Bランク',
  balanceAfter: 130,
  createdAt: new Date('2026-01-15T12:00:00Z'),
};

export const mockPurchaseTransaction = {
  id: 'txn-purchase-1',
  userId: 'test-user-id-123',
  amount: 600,
  transactionType: 'purchase',
  description: 'コイン購入: スタンダード',
  balanceAfter: 700,
  createdAt: new Date('2026-01-15T14:00:00Z'),
};

// トランザクション一覧のモック
export const mockTransactionHistory = [
  mockTransaction,
  mockBonusTransaction,
  mockPurchaseTransaction,
];
