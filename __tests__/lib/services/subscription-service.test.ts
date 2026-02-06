/**
 * subscription-service テスト
 */

import {
  activateSubscription,
  getSubscriptionStatus,
  cancelSubscription,
  canUseBatchGeneration,
} from '@/lib/services/subscription-service';

// モック関数
const mockUserFindUnique = jest.fn();
const mockUserUpdate = jest.fn();
const mockTxnCreate = jest.fn();
const mockTransaction = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    knowledgeTransaction: {
      create: (...args: unknown[]) => mockTxnCreate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

describe('subscription-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== activateSubscription ====================
  describe('activateSubscription', () => {
    const mockTx = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      knowledgeTransaction: { create: jest.fn() },
    };

    beforeEach(() => {
      mockTransaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));
      mockTx.user.findUnique.mockReset();
      mockTx.user.update.mockReset();
      mockTx.knowledgeTransaction.create.mockReset();
    });

    it('plusプランを有効化できる（初回ボーナスあり）', async () => {
      mockTx.user.findUnique.mockResolvedValue({
        subscriptionBonusReceived: false,
        knowledgeBalance: 100,
        dailyFreeCoins: 90,
      });

      const result = await activateSubscription('user-1', 'plus');

      expect(result.success).toBe(true);
      expect(result.tier).toBe('plus');
      expect(result.bonusCoins).toBe(300); // plus signup bonus
      expect(result.expiresAt).toBeInstanceOf(Date);

      // ユーザー更新を確認
      expect(mockTx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            subscriptionTier: 'plus',
            isPremium: true,
            subscriptionBonusReceived: true,
            knowledgeBalance: 400, // 100 + 300
            dailyFreeCoins: 150, // Math.max(90, 150)
          }),
        })
      );

      // ボーナストランザクション記録
      expect(mockTx.knowledgeTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            amount: 300,
            transactionType: 'bonus',
            balanceAfter: 400,
          }),
        })
      );
    });

    it('premiumプランを有効化できる（初回ボーナスあり）', async () => {
      mockTx.user.findUnique.mockResolvedValue({
        subscriptionBonusReceived: false,
        knowledgeBalance: 50,
        dailyFreeCoins: 90,
      });

      const result = await activateSubscription('user-1', 'premium');

      expect(result.success).toBe(true);
      expect(result.tier).toBe('premium');
      expect(result.bonusCoins).toBe(900); // premium signup bonus

      expect(mockTx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subscriptionTier: 'premium',
            knowledgeBalance: 950, // 50 + 900
            dailyFreeCoins: 300, // Math.max(90, 300)
          }),
        })
      );
    });

    it('2回目以降はボーナスが付与されない', async () => {
      mockTx.user.findUnique.mockResolvedValue({
        subscriptionBonusReceived: true,
        knowledgeBalance: 100,
        dailyFreeCoins: 90,
      });

      const result = await activateSubscription('user-1', 'plus');

      expect(result.success).toBe(true);
      expect(result.bonusCoins).toBe(0);

      expect(mockTx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            knowledgeBalance: 100, // unchanged
          }),
        })
      );

      // ボーナストランザクションは作成されない
      expect(mockTx.knowledgeTransaction.create).not.toHaveBeenCalled();
    });

    it('既存のdailyFreeCoinsがプランより多い場合は維持される', async () => {
      mockTx.user.findUnique.mockResolvedValue({
        subscriptionBonusReceived: true,
        knowledgeBalance: 100,
        dailyFreeCoins: 200, // plus plan's 150 より多い
      });

      await activateSubscription('user-1', 'plus');

      expect(mockTx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dailyFreeCoins: 200, // Math.max(200, 150) = 200
          }),
        })
      );
    });

    it('ユーザーが見つからない場合はエラーをスローする', async () => {
      mockTx.user.findUnique.mockResolvedValue(null);

      await expect(activateSubscription('non-existent', 'plus'))
        .rejects.toThrow('ユーザーが見つかりません');
    });

    it('無効なプランの場合はエラーをスローする', async () => {
      await expect(
        activateSubscription('user-1', 'invalid' as 'plus')
      ).rejects.toThrow('無効なプランです');

      // $transaction は呼ばれない
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('有効期限が約1ヶ月後に設定される', async () => {
      mockTx.user.findUnique.mockResolvedValue({
        subscriptionBonusReceived: true,
        knowledgeBalance: 100,
        dailyFreeCoins: 90,
      });

      const before = new Date();
      const result = await activateSubscription('user-1', 'plus');
      const after = new Date();

      // expiresAt should be ~1 month from now
      const expectedMin = new Date(before);
      expectedMin.setMonth(expectedMin.getMonth() + 1);
      const expectedMax = new Date(after);
      expectedMax.setMonth(expectedMax.getMonth() + 1);

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime() - 1000);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMax.getTime() + 1000);
    });
  });

  // ==================== getSubscriptionStatus ====================
  describe('getSubscriptionStatus', () => {
    it('plusプランのステータスを取得できる', async () => {
      const expiresAt = new Date('2026-03-01T00:00:00Z');
      mockUserFindUnique.mockResolvedValue({
        subscriptionTier: 'plus',
        premiumExpiresAt: expiresAt,
        subscriptionBonusReceived: true,
      });

      const result = await getSubscriptionStatus('user-1');

      expect(result.tier).toBe('plus');
      expect(result.expiresAt).toEqual(expiresAt);
      expect(result.bonusReceived).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.plan!.name).toBe('プラス');
      expect(result.plan!.dailyFreeCoins).toBe(150);
    });

    it('premiumプランのステータスを取得できる', async () => {
      mockUserFindUnique.mockResolvedValue({
        subscriptionTier: 'premium',
        premiumExpiresAt: new Date('2026-03-01T00:00:00Z'),
        subscriptionBonusReceived: true,
      });

      const result = await getSubscriptionStatus('user-1');

      expect(result.tier).toBe('premium');
      expect(result.plan!.name).toBe('プレミアム');
      expect(result.plan!.dailyFreeCoins).toBe(300);
    });

    it('サブスクなしのステータスを取得できる', async () => {
      mockUserFindUnique.mockResolvedValue({
        subscriptionTier: null,
        premiumExpiresAt: null,
        subscriptionBonusReceived: false,
      });

      const result = await getSubscriptionStatus('user-1');

      expect(result.tier).toBeNull();
      expect(result.expiresAt).toBeNull();
      expect(result.bonusReceived).toBe(false);
      expect(result.plan).toBeNull();
    });

    it('ユーザーが見つからない場合はエラーをスローする', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      await expect(getSubscriptionStatus('non-existent'))
        .rejects.toThrow('ユーザーが見つかりません');
    });
  });

  // ==================== cancelSubscription ====================
  describe('cancelSubscription', () => {
    it('サブスクリプションを解約できる', async () => {
      mockUserUpdate.mockResolvedValue({});

      await cancelSubscription('user-1');

      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          subscriptionTier: null,
          isPremium: false,
          premiumExpiresAt: null,
        },
      });
    });
  });

  // ==================== canUseBatchGeneration ====================
  describe('canUseBatchGeneration', () => {
    it('plusプランユーザーはバッチ生成を利用できる', async () => {
      mockUserFindUnique.mockResolvedValue({
        subscriptionTier: 'plus',
      });

      const result = await canUseBatchGeneration('user-1');
      expect(result).toBe(true);
    });

    it('premiumプランユーザーはバッチ生成を利用できる', async () => {
      mockUserFindUnique.mockResolvedValue({
        subscriptionTier: 'premium',
      });

      const result = await canUseBatchGeneration('user-1');
      expect(result).toBe(true);
    });

    it('サブスクなしユーザーはバッチ生成を利用できない', async () => {
      mockUserFindUnique.mockResolvedValue({
        subscriptionTier: null,
      });

      const result = await canUseBatchGeneration('user-1');
      expect(result).toBe(false);
    });

    it('ユーザーが見つからない場合はfalseを返す', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const result = await canUseBatchGeneration('non-existent');
      expect(result).toBe(false);
    });
  });
});
