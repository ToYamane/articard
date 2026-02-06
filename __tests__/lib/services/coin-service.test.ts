/**
 * coin-service テスト
 */

import {
  checkAndResetDaily,
  getBalances,
  getBalance,
  consumeCoins,
  addPermanentCoins,
  addCoins,
  hasEnoughCoins,
  checkChallengeLimit,
  incrementChallengeCount,
  getTransactions,
} from '@/lib/services/coin-service';
import {
  mockCoinUser,
  mockPlusUser,
  mockPremiumUser,
  mockBrokeUser,
  mockDailyLimitUser,
  mockTransactionHistory,
} from '@/__tests__/helpers';

// モック関数
const mockUserFindUnique = jest.fn();
const mockUserUpdate = jest.fn();
const mockTxnFindMany = jest.fn();
const mockTxnCreate = jest.fn();
const mockTransaction = jest.fn();

// Transaction内で使うモックPrisma
const mockTxPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  knowledgeTransaction: {
    create: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    knowledgeTransaction: {
      findMany: (...args: unknown[]) => mockTxnFindMany(...args),
      create: (...args: unknown[]) => mockTxnCreate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

describe('coin-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // $transaction はコールバックを受け取り、mockTxPrisma で実行
    mockTransaction.mockImplementation((cb: (tx: typeof mockTxPrisma) => unknown) =>
      cb(mockTxPrisma)
    );
  });

  // ==================== checkAndResetDaily ====================
  describe('checkAndResetDaily', () => {
    it('リセット不要の場合、更新せずに結果を返す', async () => {
      // 今日の日付（JST基準で同日）
      const now = new Date();
      mockUserFindUnique.mockResolvedValue({
        dailyCoinsResetAt: now,
        dailyChallengeResetAt: now,
        subscriptionTier: null,
      });

      const result = await checkAndResetDaily('test-user-id-123');

      expect(result.coinsReset).toBe(false);
      expect(result.challengeReset).toBe(false);
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it('コインリセットが必要な場合にリセットされる', async () => {
      const yesterday = new Date('2025-01-01T00:00:00Z');
      const now = new Date();
      mockUserFindUnique.mockResolvedValue({
        dailyCoinsResetAt: yesterday,
        dailyChallengeResetAt: now,
        subscriptionTier: null,
      });
      mockUserUpdate.mockResolvedValue({});

      const result = await checkAndResetDaily('test-user-id-123');

      expect(result.coinsReset).toBe(true);
      expect(result.challengeReset).toBe(false);
      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'test-user-id-123' },
          data: expect.objectContaining({
            dailyFreeCoins: 90,
          }),
        })
      );
    });

    it('チャレンジリセットが必要な場合にリセットされる', async () => {
      const yesterday = new Date('2025-01-01T00:00:00Z');
      const now = new Date();
      mockUserFindUnique.mockResolvedValue({
        dailyCoinsResetAt: now,
        dailyChallengeResetAt: yesterday,
        subscriptionTier: null,
      });
      mockUserUpdate.mockResolvedValue({});

      const result = await checkAndResetDaily('test-user-id-123');

      expect(result.coinsReset).toBe(false);
      expect(result.challengeReset).toBe(true);
      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dailyChallengeCount: 0,
          }),
        })
      );
    });

    it('両方リセットが必要な場合に両方リセットされる', async () => {
      const yesterday = new Date('2025-01-01T00:00:00Z');
      mockUserFindUnique.mockResolvedValue({
        dailyCoinsResetAt: yesterday,
        dailyChallengeResetAt: yesterday,
        subscriptionTier: null,
      });
      mockUserUpdate.mockResolvedValue({});

      const result = await checkAndResetDaily('test-user-id-123');

      expect(result.coinsReset).toBe(true);
      expect(result.challengeReset).toBe(true);
      expect(mockUserUpdate).toHaveBeenCalledTimes(1);
    });

    it('リセット日がnullの場合リセットされる', async () => {
      mockUserFindUnique.mockResolvedValue({
        dailyCoinsResetAt: null,
        dailyChallengeResetAt: null,
        subscriptionTier: null,
      });
      mockUserUpdate.mockResolvedValue({});

      const result = await checkAndResetDaily('test-user-id-123');

      expect(result.coinsReset).toBe(true);
      expect(result.challengeReset).toBe(true);
    });

    it('Plusプランのユーザーは日次コインが150になる', async () => {
      const yesterday = new Date('2025-01-01T00:00:00Z');
      mockUserFindUnique.mockResolvedValue({
        dailyCoinsResetAt: yesterday,
        dailyChallengeResetAt: new Date(),
        subscriptionTier: 'plus',
      });
      mockUserUpdate.mockResolvedValue({});

      await checkAndResetDaily('test-plus-user-id');

      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dailyFreeCoins: 150,
          }),
        })
      );
    });

    it('Premiumプランのユーザーは日次コインが300になる', async () => {
      const yesterday = new Date('2025-01-01T00:00:00Z');
      mockUserFindUnique.mockResolvedValue({
        dailyCoinsResetAt: yesterday,
        dailyChallengeResetAt: new Date(),
        subscriptionTier: 'premium',
      });
      mockUserUpdate.mockResolvedValue({});

      await checkAndResetDaily('test-premium-user-id');

      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dailyFreeCoins: 300,
          }),
        })
      );
    });

    it('ユーザーが見つからない場合エラーを投げる', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      await expect(checkAndResetDaily('nonexistent')).rejects.toThrow(
        'ユーザーが見つかりません'
      );
    });
  });

  // ==================== getBalances ====================
  describe('getBalances', () => {
    it('コイン残高を正しく返す', async () => {
      // checkAndResetDaily用（リセット不要）
      mockUserFindUnique
        .mockResolvedValueOnce({
          dailyCoinsResetAt: new Date(),
          dailyChallengeResetAt: new Date(),
          subscriptionTier: null,
        })
        // getBalances用
        .mockResolvedValueOnce({
          knowledgeBalance: 100,
          dailyFreeCoins: 90,
        });

      const result = await getBalances('test-user-id-123');

      expect(result).toEqual({
        freeCoins: 90,
        permanentCoins: 100,
        totalAvailable: 190,
      });
    });

    it('ユーザーが見つからない場合エラーを投げる', async () => {
      // checkAndResetDaily用
      mockUserFindUnique
        .mockResolvedValueOnce({
          dailyCoinsResetAt: new Date(),
          dailyChallengeResetAt: new Date(),
          subscriptionTier: null,
        })
        // getBalances用
        .mockResolvedValueOnce(null);

      await expect(getBalances('nonexistent')).rejects.toThrow(
        'ユーザーが見つかりません'
      );
    });
  });

  // ==================== getBalance ====================
  describe('getBalance', () => {
    it('合計残高を返す', async () => {
      mockUserFindUnique
        .mockResolvedValueOnce({
          dailyCoinsResetAt: new Date(),
          dailyChallengeResetAt: new Date(),
          subscriptionTier: null,
        })
        .mockResolvedValueOnce({
          knowledgeBalance: 100,
          dailyFreeCoins: 90,
        });

      const result = await getBalance('test-user-id-123');

      expect(result).toBe(190);
    });
  });

  // ==================== consumeCoins ====================
  describe('consumeCoins', () => {
    it('無料コインから優先的に消費する', async () => {
      // checkAndResetDaily用
      mockUserFindUnique.mockResolvedValueOnce({
        dailyCoinsResetAt: new Date(),
        dailyChallengeResetAt: new Date(),
        subscriptionTier: null,
      });

      // tx内のfindUnique
      mockTxPrisma.user.findUnique.mockResolvedValue({
        knowledgeBalance: 100,
        dailyFreeCoins: 90,
      });
      mockTxPrisma.user.update.mockResolvedValue({});
      mockTxPrisma.knowledgeTransaction.create.mockResolvedValue({});

      const result = await consumeCoins('test-user-id-123', 30, 'カード生成');

      expect(result).toEqual({
        freeCoinsUsed: 30,
        permanentCoinsUsed: 0,
        newFreeBalance: 60,
        newPermanentBalance: 100,
      });

      expect(mockTxPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            dailyFreeCoins: 60,
            knowledgeBalance: 100,
          },
        })
      );
    });

    it('無料コインが足りない場合は永続コインも使う', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        dailyCoinsResetAt: new Date(),
        dailyChallengeResetAt: new Date(),
        subscriptionTier: null,
      });

      mockTxPrisma.user.findUnique.mockResolvedValue({
        knowledgeBalance: 100,
        dailyFreeCoins: 20,
      });
      mockTxPrisma.user.update.mockResolvedValue({});
      mockTxPrisma.knowledgeTransaction.create.mockResolvedValue({});

      const result = await consumeCoins('test-user-id-123', 30, 'カード生成');

      expect(result).toEqual({
        freeCoinsUsed: 20,
        permanentCoinsUsed: 10,
        newFreeBalance: 0,
        newPermanentBalance: 90,
      });
    });

    it('残高不足の場合エラーを投げる', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        dailyCoinsResetAt: new Date(),
        dailyChallengeResetAt: new Date(),
        subscriptionTier: null,
      });

      mockTxPrisma.user.findUnique.mockResolvedValue({
        knowledgeBalance: 0,
        dailyFreeCoins: 10,
      });

      await expect(
        consumeCoins('test-user-id-123', 30, 'カード生成')
      ).rejects.toThrow('コインが不足しています');
    });

    it('消費額が0以下の場合エラーを投げる', async () => {
      await expect(
        consumeCoins('test-user-id-123', 0, 'テスト')
      ).rejects.toThrow('消費額は正の値である必要があります');
    });

    it('負の消費額の場合エラーを投げる', async () => {
      await expect(
        consumeCoins('test-user-id-123', -10, 'テスト')
      ).rejects.toThrow('消費額は正の値である必要があります');
    });

    it('トランザクション内でユーザーが見つからない場合エラーを投げる', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        dailyCoinsResetAt: new Date(),
        dailyChallengeResetAt: new Date(),
        subscriptionTier: null,
      });

      mockTxPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        consumeCoins('nonexistent', 30, 'テスト')
      ).rejects.toThrow('ユーザーが見つかりません');
    });

    it('トランザクション履歴が正しく記録される', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        dailyCoinsResetAt: new Date(),
        dailyChallengeResetAt: new Date(),
        subscriptionTier: null,
      });

      mockTxPrisma.user.findUnique.mockResolvedValue({
        knowledgeBalance: 100,
        dailyFreeCoins: 90,
      });
      mockTxPrisma.user.update.mockResolvedValue({});
      mockTxPrisma.knowledgeTransaction.create.mockResolvedValue({});

      await consumeCoins('test-user-id-123', 30, 'カード生成');

      expect(mockTxPrisma.knowledgeTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'test-user-id-123',
          amount: -30,
          transactionType: 'consume',
          description: 'カード生成',
          balanceAfter: 160, // 60 + 100
        },
      });
    });
  });

  // ==================== addPermanentCoins ====================
  describe('addPermanentCoins', () => {
    it('永続コインを正しく加算する', async () => {
      mockTxPrisma.user.findUnique.mockResolvedValue({
        knowledgeBalance: 100,
        dailyFreeCoins: 90,
      });
      mockTxPrisma.user.update.mockResolvedValue({});
      mockTxPrisma.knowledgeTransaction.create.mockResolvedValue({});

      const result = await addPermanentCoins(
        'test-user-id-123',
        30,
        'bonus',
        'チャレンジ報酬'
      );

      expect(result).toBe(130);

      expect(mockTxPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { knowledgeBalance: 130 },
        })
      );

      expect(mockTxPrisma.knowledgeTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'test-user-id-123',
          amount: 30,
          transactionType: 'bonus',
          description: 'チャレンジ報酬',
          balanceAfter: 220, // 90 + 130
        },
      });
    });

    it('加算額が0以下の場合エラーを投げる', async () => {
      await expect(
        addPermanentCoins('test-user-id-123', 0, 'bonus', 'テスト')
      ).rejects.toThrow('加算額は正の値である必要があります');
    });

    it('負の加算額の場合エラーを投げる', async () => {
      await expect(
        addPermanentCoins('test-user-id-123', -10, 'bonus', 'テスト')
      ).rejects.toThrow('加算額は正の値である必要があります');
    });

    it('ユーザーが見つからない場合エラーを投げる', async () => {
      mockTxPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        addPermanentCoins('nonexistent', 30, 'bonus', 'テスト')
      ).rejects.toThrow('ユーザーが見つかりません');
    });
  });

  // ==================== addCoins ====================
  describe('addCoins', () => {
    it('addPermanentCoinsのエイリアスとして機能する', async () => {
      mockTxPrisma.user.findUnique.mockResolvedValue({
        knowledgeBalance: 100,
        dailyFreeCoins: 90,
      });
      mockTxPrisma.user.update.mockResolvedValue({});
      mockTxPrisma.knowledgeTransaction.create.mockResolvedValue({});

      const result = await addCoins(
        'test-user-id-123',
        50,
        'purchase',
        'コイン購入'
      );

      expect(result).toBe(150);
    });
  });

  // ==================== hasEnoughCoins ====================
  describe('hasEnoughCoins', () => {
    it('残高が足りる場合trueを返す', async () => {
      mockUserFindUnique
        .mockResolvedValueOnce({
          dailyCoinsResetAt: new Date(),
          dailyChallengeResetAt: new Date(),
          subscriptionTier: null,
        })
        .mockResolvedValueOnce({
          knowledgeBalance: 100,
          dailyFreeCoins: 90,
        });

      const result = await hasEnoughCoins('test-user-id-123', 190);

      expect(result).toBe(true);
    });

    it('残高が足りない場合falseを返す', async () => {
      mockUserFindUnique
        .mockResolvedValueOnce({
          dailyCoinsResetAt: new Date(),
          dailyChallengeResetAt: new Date(),
          subscriptionTier: null,
        })
        .mockResolvedValueOnce({
          knowledgeBalance: 100,
          dailyFreeCoins: 90,
        });

      const result = await hasEnoughCoins('test-user-id-123', 191);

      expect(result).toBe(false);
    });
  });

  // ==================== checkChallengeLimit ====================
  describe('checkChallengeLimit', () => {
    it('無料ユーザーで回数が上限未満の場合、無料と返す', async () => {
      // checkAndResetDaily用
      mockUserFindUnique
        .mockResolvedValueOnce({
          dailyCoinsResetAt: new Date(),
          dailyChallengeResetAt: new Date(),
          subscriptionTier: null,
        })
        // checkChallengeLimit用
        .mockResolvedValueOnce({
          dailyChallengeCount: 1,
          subscriptionTier: null,
        });

      const result = await checkChallengeLimit('test-user-id-123');

      expect(result).toEqual({
        count: 1,
        isFree: true,
        cost: 0,
        remainingFree: 2,
      });
    });

    it('無料ユーザーで回数が上限に達した場合、有料と返す', async () => {
      mockUserFindUnique
        .mockResolvedValueOnce({
          dailyCoinsResetAt: new Date(),
          dailyChallengeResetAt: new Date(),
          subscriptionTier: null,
        })
        .mockResolvedValueOnce({
          dailyChallengeCount: 3,
          subscriptionTier: null,
        });

      const result = await checkChallengeLimit('test-user-id-123');

      expect(result).toEqual({
        count: 3,
        isFree: false,
        cost: 10,
        remainingFree: 0,
      });
    });

    it('Plusプランユーザーは無料回数が10回', async () => {
      mockUserFindUnique
        .mockResolvedValueOnce({
          dailyCoinsResetAt: new Date(),
          dailyChallengeResetAt: new Date(),
          subscriptionTier: 'plus',
        })
        .mockResolvedValueOnce({
          dailyChallengeCount: 5,
          subscriptionTier: 'plus',
        });

      const result = await checkChallengeLimit('test-plus-user-id');

      expect(result).toEqual({
        count: 5,
        isFree: true,
        cost: 0,
        remainingFree: 5,
      });
    });

    it('Premiumプランユーザーは無制限', async () => {
      mockUserFindUnique
        .mockResolvedValueOnce({
          dailyCoinsResetAt: new Date(),
          dailyChallengeResetAt: new Date(),
          subscriptionTier: 'premium',
        })
        .mockResolvedValueOnce({
          dailyChallengeCount: 100,
          subscriptionTier: 'premium',
        });

      const result = await checkChallengeLimit('test-premium-user-id');

      expect(result).toEqual({
        count: 100,
        isFree: true,
        cost: 0,
        remainingFree: Infinity,
      });
    });

    it('ユーザーが見つからない場合エラーを投げる', async () => {
      mockUserFindUnique
        .mockResolvedValueOnce({
          dailyCoinsResetAt: new Date(),
          dailyChallengeResetAt: new Date(),
          subscriptionTier: null,
        })
        .mockResolvedValueOnce(null);

      await expect(checkChallengeLimit('nonexistent')).rejects.toThrow(
        'ユーザーが見つかりません'
      );
    });
  });

  // ==================== incrementChallengeCount ====================
  describe('incrementChallengeCount', () => {
    it('チャレンジ回数をインクリメントする', async () => {
      mockUserUpdate.mockResolvedValue({
        dailyChallengeCount: 2,
      });

      const result = await incrementChallengeCount('test-user-id-123');

      expect(result).toBe(2);
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: 'test-user-id-123' },
        data: {
          dailyChallengeCount: { increment: 1 },
        },
        select: { dailyChallengeCount: true },
      });
    });
  });

  // ==================== getTransactions ====================
  describe('getTransactions', () => {
    it('トランザクション一覧を取得できる', async () => {
      const txns = [
        { id: 'txn-1', amount: -30, transactionType: 'consume', description: 'カード生成', balanceAfter: 70, createdAt: new Date() },
        { id: 'txn-2', amount: 30, transactionType: 'bonus', description: '報酬', balanceAfter: 100, createdAt: new Date() },
      ];
      mockTxnFindMany.mockResolvedValue(txns);

      const result = await getTransactions('test-user-id-123');

      expect(result.transactions).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('ページネーションが機能する', async () => {
      // limit + 1 件返す（hasMore判定用）
      const items = Array.from({ length: 21 }, (_, i) => ({
        id: `txn-${i}`,
        userId: 'test-user-id-123',
        amount: 30,
        transactionType: 'consume',
        description: `取引 ${i}`,
        balanceAfter: 70,
        createdAt: new Date(),
      }));
      mockTxnFindMany.mockResolvedValue(items);

      const result = await getTransactions('test-user-id-123', { limit: 20 });

      expect(result.transactions).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('txn-19');
    });

    it('カーソルを使ったページネーションが機能する', async () => {
      mockTxnFindMany.mockResolvedValue([]);

      await getTransactions('test-user-id-123', {
        limit: 10,
        cursor: 'txn-previous',
      });

      expect(mockTxnFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id-123' },
          orderBy: { createdAt: 'desc' },
          take: 11,
          cursor: { id: 'txn-previous' },
          skip: 1,
        })
      );
    });

    it('空の場合は空配列を返す', async () => {
      mockTxnFindMany.mockResolvedValue([]);

      const result = await getTransactions('test-user-id-123');

      expect(result.transactions).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });
  });
});
