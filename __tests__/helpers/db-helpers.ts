// Prisma モックヘルパー

import { PrismaClient } from '@prisma/client';

// モックPrismaクライアント
export const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  article: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  card: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  coinTransaction: {
    findMany: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  challengeSession: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  challengeHighScore: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  challengeAchievement: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrisma)),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
} as unknown as PrismaClient & {
  user: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  article: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
    count: jest.Mock;
  };
  card: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
    count: jest.Mock;
    groupBy: jest.Mock;
  };
  coinTransaction: {
    findMany: jest.Mock;
    create: jest.Mock;
    deleteMany: jest.Mock;
  };
  challengeSession: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
    count: jest.Mock;
  };
  challengeHighScore: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    upsert: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
  challengeAchievement: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

// モックユーザーデータ
export const mockUser = {
  id: 'test-user-id-123',
  nickname: 'testuser',
  coinBalance: 100,
  isPremium: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

// モック記事データ
export const mockArticle = {
  id: 'test-article-id-123',
  userId: 'test-user-id-123',
  theme: 'テストテーマ',
  content: 'これはテスト記事の内容です。AIによって生成された学習記事です。',
  openaiModel: 'gpt-4o-mini',
  tokenUsage: 500,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

// モックカードデータ
export const mockCard = {
  id: 'test-card-id-123',
  userId: 'test-user-id-123',
  articleId: 'test-article-id-123',
  keyword: 'テストキーワード',
  rarity: 'rare',
  flavorText: 'このカードは知識の結晶です。',
  contextCategory: 'technology',
  contextDescription: 'テストの文脈説明',
  illustrationUrl: 'https://storage.example.com/illustrations/test.jpg',
  cardImageUrl: 'https://storage.example.com/cards/test.jpg',
  thumbnailUrl: 'https://storage.example.com/thumbnails/test.jpg',
  fluxPrompt: 'test prompt for illustration',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

// モックチャレンジセッションデータ
export const mockChallengeSession = {
  id: 'test-session-id-123',
  userId: 'test-user-id-123',
  scenarioId: 'space_exploration',
  status: 'in_progress',
  currentPhase: 1,
  gameState: {
    deck: [
      {
        cardId: 'card-1',
        keyword: 'Quantum',
        rarity: 'rare',
        flavorText: 'A quantum leap',
        contextDescription: 'Quantum physics',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        cardImageUrl: 'https://example.com/card1.jpg',
        isUsed: false,
        usedInPhase: null,
      },
      {
        cardId: 'card-2',
        keyword: 'Gravity',
        rarity: 'common',
        flavorText: 'Pull of the universe',
        contextDescription: 'Gravitational force',
        thumbnailUrl: 'https://example.com/thumb2.jpg',
        cardImageUrl: 'https://example.com/card2.jpg',
        isUsed: false,
        usedInPhase: null,
      },
    ],
    phases: [],
    totalScore: 0,
  },
  startedAt: new Date('2026-01-15T10:00:00Z'),
  completedAt: null,
};

// モックハイスコアデータ
export const mockChallengeHighScore = {
  id: 'test-highscore-id-123',
  userId: 'test-user-id-123',
  scenarioId: 'space_exploration',
  highScore: 350,
  bestRank: 'A',
  playCount: 3,
  updatedAt: new Date('2026-01-15T12:00:00Z'),
};

// モック達成報酬データ
export const mockChallengeAchievement = {
  id: 'test-achievement-id-123',
  userId: 'test-user-id-123',
  scenarioId: 'space_exploration',
  rank: 'B',
  coinsAwarded: 30,
  createdAt: new Date('2026-01-15T12:00:00Z'),
};

// 別のユーザーのモックデータ
export const mockOtherUser = {
  id: 'other-user-id-456',
  nickname: 'otheruser',
  coinBalance: 50,
  isPremium: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

export const mockOtherArticle = {
  ...mockArticle,
  id: 'other-article-id-456',
  userId: 'other-user-id-456',
};

export const mockOtherCard = {
  ...mockCard,
  id: 'other-card-id-456',
  userId: 'other-user-id-456',
  articleId: 'other-article-id-456',
};

// Prismaモックをリセット
export function resetPrismaMock() {
  // User
  mockPrisma.user.findUnique.mockReset();
  mockPrisma.user.findFirst.mockReset();
  mockPrisma.user.findMany.mockReset();
  mockPrisma.user.create.mockReset();
  mockPrisma.user.update.mockReset();
  mockPrisma.user.delete.mockReset();
  mockPrisma.user.count.mockReset();

  // Article
  mockPrisma.article.findUnique.mockReset();
  mockPrisma.article.findFirst.mockReset();
  mockPrisma.article.findMany.mockReset();
  mockPrisma.article.create.mockReset();
  mockPrisma.article.update.mockReset();
  mockPrisma.article.delete.mockReset();
  mockPrisma.article.deleteMany.mockReset();
  mockPrisma.article.count.mockReset();

  // Card
  mockPrisma.card.findUnique.mockReset();
  mockPrisma.card.findFirst.mockReset();
  mockPrisma.card.findMany.mockReset();
  mockPrisma.card.create.mockReset();
  mockPrisma.card.update.mockReset();
  mockPrisma.card.delete.mockReset();
  mockPrisma.card.deleteMany.mockReset();
  mockPrisma.card.count.mockReset();
  mockPrisma.card.groupBy.mockReset();

  // CoinTransaction
  mockPrisma.coinTransaction.findMany.mockReset();
  mockPrisma.coinTransaction.create.mockReset();
  mockPrisma.coinTransaction.deleteMany.mockReset();

  // ChallengeSession
  mockPrisma.challengeSession.findUnique.mockReset();
  mockPrisma.challengeSession.findFirst.mockReset();
  mockPrisma.challengeSession.findMany.mockReset();
  mockPrisma.challengeSession.create.mockReset();
  mockPrisma.challengeSession.update.mockReset();
  mockPrisma.challengeSession.delete.mockReset();
  mockPrisma.challengeSession.deleteMany.mockReset();
  mockPrisma.challengeSession.count.mockReset();

  // ChallengeHighScore
  mockPrisma.challengeHighScore.findUnique.mockReset();
  mockPrisma.challengeHighScore.findFirst.mockReset();
  mockPrisma.challengeHighScore.findMany.mockReset();
  mockPrisma.challengeHighScore.create.mockReset();
  mockPrisma.challengeHighScore.update.mockReset();
  mockPrisma.challengeHighScore.upsert.mockReset();
  mockPrisma.challengeHighScore.delete.mockReset();
  mockPrisma.challengeHighScore.deleteMany.mockReset();

  // ChallengeAchievement
  mockPrisma.challengeAchievement.findUnique.mockReset();
  mockPrisma.challengeAchievement.findFirst.mockReset();
  mockPrisma.challengeAchievement.findMany.mockReset();
  mockPrisma.challengeAchievement.create.mockReset();
  mockPrisma.challengeAchievement.delete.mockReset();
  mockPrisma.challengeAchievement.deleteMany.mockReset();

  // Transaction
  mockPrisma.$transaction.mockReset();
  mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
}

// ユーザー検索成功をモック
export function mockUserFindSuccess(user = mockUser) {
  mockPrisma.user.findUnique.mockResolvedValue(user);
}

// ユーザー検索失敗をモック（ユーザーが見つからない）
export function mockUserFindNotFound() {
  mockPrisma.user.findUnique.mockResolvedValue(null);
}

// ユーザー作成成功をモック
export function mockUserCreateSuccess(user = mockUser) {
  mockPrisma.user.create.mockResolvedValue(user);
}

// 記事検索成功をモック
export function mockArticleFindSuccess(article = mockArticle) {
  mockPrisma.article.findUnique.mockResolvedValue(article);
}

// 記事一覧成功をモック
export function mockArticleFindManySuccess(articles = [mockArticle]) {
  mockPrisma.article.findMany.mockResolvedValue(articles);
}

// カード検索成功をモック
export function mockCardFindSuccess(card = mockCard) {
  mockPrisma.card.findUnique.mockResolvedValue(card);
}

// カード一覧成功をモック
export function mockCardFindManySuccess(cards = [mockCard]) {
  mockPrisma.card.findMany.mockResolvedValue(cards);
}

// カード統計をモック
export function mockCardStatsSuccess(total = 10) {
  mockPrisma.card.count.mockResolvedValue(total);
  mockPrisma.card.groupBy.mockResolvedValue([
    { rarity: 'common', _count: 5 },
    { rarity: 'rare', _count: 3 },
    { rarity: 'super_rare', _count: 2 },
  ]);
}

// チャレンジセッション検索成功をモック
export function mockSessionFindSuccess(session = mockChallengeSession) {
  mockPrisma.challengeSession.findUnique.mockResolvedValue(session);
}

// チャレンジセッション作成成功をモック
export function mockSessionCreateSuccess(session = mockChallengeSession) {
  mockPrisma.challengeSession.create.mockResolvedValue(session);
}

// ハイスコア検索成功をモック
export function mockHighScoreFindSuccess(highScore = mockChallengeHighScore) {
  mockPrisma.challengeHighScore.findUnique.mockResolvedValue(highScore);
}

// 達成報酬検索成功をモック
export function mockAchievementFindManySuccess(achievements = [mockChallengeAchievement]) {
  mockPrisma.challengeAchievement.findMany.mockResolvedValue(achievements);
}
