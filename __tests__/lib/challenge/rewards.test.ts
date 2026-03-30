// rewards.ts テスト（純粋関数 + DB関数）

import { COIN_REWARDS, RANK_THRESHOLDS } from '@/lib/constants/coins';

// Prismaモック
const mockFindMany = jest.fn();
const mockCreate = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockTxCreate = jest.fn();
const mockTxFindUnique = jest.fn();
const mockTxUpdate = jest.fn();
const mockTxCoinCreate = jest.fn();
const mockTransaction = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    challengeAchievement: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    coinTransaction: {
      create: (...args: unknown[]) => mockTxCoinCreate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

import {
  getAchievableRanks,
  getRewardAmount,
  processAchievementRewards,
  getScenarioAchievements,
  getUserAchievements,
} from '@/lib/challenge/rewards';

beforeEach(() => {
  jest.clearAllMocks();
  // $transaction: コールバックを実行する
  mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      challengeAchievement: {
        create: (...args: unknown[]) => mockTxCreate(...args),
      },
      user: {
        findUnique: (...args: unknown[]) => mockTxFindUnique(...args),
        update: (...args: unknown[]) => mockTxUpdate(...args),
      },
      coinTransaction: {
        create: (...args: unknown[]) => mockTxCoinCreate(...args),
      },
    };
    return callback(tx);
  });
});

describe('rewards', () => {
  describe('getAchievableRanks（純粋関数）', () => {
    it('スコアがB閾値未満の場合、空配列を返す', () => {
      expect(getAchievableRanks(0)).toEqual([]);
      expect(getAchievableRanks(100)).toEqual([]);
      expect(getAchievableRanks(249)).toEqual([]);
    });

    it('Bランク閾値以上でBのみ返す', () => {
      expect(getAchievableRanks(RANK_THRESHOLDS.B)).toEqual(['B']);
      expect(getAchievableRanks(250)).toEqual(['B']);
      expect(getAchievableRanks(349)).toEqual(['B']);
    });

    it('Aランク閾値以上でB,Aを返す', () => {
      expect(getAchievableRanks(RANK_THRESHOLDS.A)).toEqual(['B', 'A']);
      expect(getAchievableRanks(350)).toEqual(['B', 'A']);
      expect(getAchievableRanks(449)).toEqual(['B', 'A']);
    });

    it('Sランク閾値以上でB,A,Sを返す', () => {
      expect(getAchievableRanks(RANK_THRESHOLDS.S)).toEqual(['B', 'A', 'S']);
      expect(getAchievableRanks(450)).toEqual(['B', 'A', 'S']);
      expect(getAchievableRanks(500)).toEqual(['B', 'A', 'S']);
    });

    it('ランクは累積的である（Sを達成するとB,Aも含まれる）', () => {
      const ranks = getAchievableRanks(500);
      expect(ranks).toContain('B');
      expect(ranks).toContain('A');
      expect(ranks).toContain('S');
    });
  });

  describe('getRewardAmount（純粋関数）', () => {
    it('Bランクの報酬額を返す', () => {
      expect(getRewardAmount('B')).toBe(COIN_REWARDS.CHALLENGE_RANK_B);
      expect(getRewardAmount('B')).toBe(30);
    });

    it('Aランクの報酬額を返す', () => {
      expect(getRewardAmount('A')).toBe(COIN_REWARDS.CHALLENGE_RANK_A);
      expect(getRewardAmount('A')).toBe(30);
    });

    it('Sランクの報酬額を返す', () => {
      expect(getRewardAmount('S')).toBe(COIN_REWARDS.CHALLENGE_RANK_S);
      expect(getRewardAmount('S')).toBe(30);
    });
  });

  describe('processAchievementRewards（DB連携）', () => {
    const userId = 'test-user-id-123';
    const scenarioId = 'space_exploration';

    it('スコアが閾値未満の場合、空の結果を返す', async () => {
      const result = await processAchievementRewards(userId, scenarioId, 100);

      expect(result.achievements).toEqual([]);
      expect(result.totalCoinsAwarded).toBe(0);
      expect(mockFindMany).not.toHaveBeenCalled();
    });

    it('新規Bランク達成時にコインを付与する', async () => {
      mockFindMany.mockResolvedValue([]); // 既存の達成なし
      mockTxFindUnique.mockResolvedValue({ coinBalance: 100 });

      const result = await processAchievementRewards(userId, scenarioId, 260);

      expect(result.achievements).toHaveLength(1);
      expect(result.achievements[0]).toEqual({
        rank: 'B',
        coins: 30,
        isNew: true,
      });
      expect(result.totalCoinsAwarded).toBe(30);
      expect(mockTxCreate).toHaveBeenCalledTimes(1);
    });

    it('既に達成済みのランクには報酬を付与しない', async () => {
      mockFindMany.mockResolvedValue([{ rank: 'B' }]); // B既に達成済み

      const result = await processAchievementRewards(userId, scenarioId, 260);

      // 既存のBランクはisNew: false
      expect(result.achievements).toHaveLength(1);
      expect(result.achievements[0].isNew).toBe(false);
      expect(result.totalCoinsAwarded).toBe(0);
      expect(mockTransaction).not.toHaveBeenCalled(); // トランザクション不要
    });

    it('複数ランクを同時に達成した場合、累積報酬を付与する', async () => {
      mockFindMany.mockResolvedValue([]); // 既存の達成なし
      mockTxFindUnique.mockResolvedValue({ coinBalance: 100 });

      const result = await processAchievementRewards(userId, scenarioId, 460);

      // B, A, S全て新規達成
      const newAchievements = result.achievements.filter((a) => a.isNew);
      expect(newAchievements).toHaveLength(3);
      expect(result.totalCoinsAwarded).toBe(90); // 30 + 30 + 30
    });

    it('一部のランクが既に達成済みの場合、新規のみ報酬付与', async () => {
      mockFindMany.mockResolvedValue([{ rank: 'B' }]); // Bのみ達成済み
      mockTxFindUnique.mockResolvedValue({ coinBalance: 100 });

      const result = await processAchievementRewards(userId, scenarioId, 460);

      const newAchievements = result.achievements.filter((a) => a.isNew);
      const existingAchievements = result.achievements.filter((a) => !a.isNew);
      expect(newAchievements).toHaveLength(2); // A, S
      expect(existingAchievements).toHaveLength(1); // B
      expect(result.totalCoinsAwarded).toBe(60); // A(30) + S(30)
    });

    it('ランク順にソートされる（B < A < S）', async () => {
      mockFindMany.mockResolvedValue([]); // 既存の達成なし
      mockTxFindUnique.mockResolvedValue({ coinBalance: 100 });

      const result = await processAchievementRewards(userId, scenarioId, 460);

      expect(result.achievements[0].rank).toBe('B');
      expect(result.achievements[1].rank).toBe('A');
      expect(result.achievements[2].rank).toBe('S');
    });

    it('ユーザーの残高が正しく更新される', async () => {
      mockFindMany.mockResolvedValue([]); // 既存の達成なし
      mockTxFindUnique.mockResolvedValue({ coinBalance: 100 });

      await processAchievementRewards(userId, scenarioId, 260);

      // user.updateが新しい残高で呼ばれる
      expect(mockTxUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: { coinBalance: 130 }, // 100 + 30
        })
      );
    });

    it('トランザクション履歴が記録される', async () => {
      mockFindMany.mockResolvedValue([]);
      mockTxFindUnique.mockResolvedValue({ coinBalance: 100 });

      await processAchievementRewards(userId, scenarioId, 260);

      expect(mockTxCoinCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            amount: 30,
            transactionType: 'bonus',
            balanceAfter: 130,
          }),
        })
      );
    });
  });

  describe('getScenarioAchievements（DB連携）', () => {
    it('ユーザーの特定シナリオの達成を取得する', async () => {
      const mockAchievements = [
        { rank: 'B', coinsAwarded: 30, createdAt: new Date('2026-01-15T10:00:00Z') },
        { rank: 'A', coinsAwarded: 30, createdAt: new Date('2026-01-15T12:00:00Z') },
      ];
      mockFindMany.mockResolvedValue(mockAchievements);

      const result = await getScenarioAchievements('user-1', 'space_exploration');

      expect(result).toEqual(mockAchievements);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', scenarioId: 'space_exploration' },
        select: { rank: true, coinsAwarded: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('達成がない場合は空配列を返す', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await getScenarioAchievements('user-1', 'space_exploration');

      expect(result).toEqual([]);
    });
  });

  describe('getUserAchievements（DB連携）', () => {
    it('ユーザーの全達成を取得する', async () => {
      const mockAchievements = [
        { scenarioId: 'space_exploration', rank: 'A', coinsAwarded: 30, createdAt: new Date() },
        { scenarioId: 'time_travel', rank: 'B', coinsAwarded: 30, createdAt: new Date() },
      ];
      mockFindMany.mockResolvedValue(mockAchievements);

      const result = await getUserAchievements('user-1');

      expect(result).toEqual(mockAchievements);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: { scenarioId: true, rank: true, coinsAwarded: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
