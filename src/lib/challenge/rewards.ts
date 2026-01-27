import { prisma } from '@/lib/prisma';
import { COIN_REWARDS, RANK_THRESHOLDS, type AchievementRank } from '@/lib/constants/coins';

/**
 * 達成報酬の結果
 */
export interface AchievementRewardResult {
  rank: AchievementRank;
  coins: number;
  isNew: boolean;
}

/**
 * 報酬処理の結果
 */
export interface ProcessRewardsResult {
  achievements: AchievementRewardResult[];
  totalCoinsAwarded: number;
}

/**
 * スコアから達成可能なランクを取得
 */
export function getAchievableRanks(score: number): AchievementRank[] {
  const ranks: AchievementRank[] = [];

  if (score >= RANK_THRESHOLDS.B) ranks.push('B');
  if (score >= RANK_THRESHOLDS.A) ranks.push('A');
  if (score >= RANK_THRESHOLDS.S) ranks.push('S');

  return ranks;
}

/**
 * ランクごとの報酬額を取得
 */
export function getRewardAmount(rank: AchievementRank): number {
  switch (rank) {
    case 'B':
      return COIN_REWARDS.CHALLENGE_RANK_B;
    case 'A':
      return COIN_REWARDS.CHALLENGE_RANK_A;
    case 'S':
      return COIN_REWARDS.CHALLENGE_RANK_S;
  }
}

/**
 * チャレンジ完了時の達成報酬を処理
 * - 各ランクの初回達成のみ報酬を付与
 * - 累積で獲得可能（B+A+S）
 * - トランザクションで整合性を保証
 */
export async function processAchievementRewards(
  userId: string,
  scenarioId: string,
  score: number
): Promise<ProcessRewardsResult> {
  const achievableRanks = getAchievableRanks(score);

  if (achievableRanks.length === 0) {
    return { achievements: [], totalCoinsAwarded: 0 };
  }

  // 既に獲得済みのランクを取得
  const existingAchievements = await prisma.challengeAchievement.findMany({
    where: {
      userId,
      scenarioId,
      rank: { in: achievableRanks },
    },
    select: { rank: true },
  });

  const existingRanks = new Set(existingAchievements.map((a) => a.rank));

  // 新規達成のランクを抽出
  const newRanks = achievableRanks.filter((r) => !existingRanks.has(r));

  const achievements: AchievementRewardResult[] = [];
  let totalCoinsAwarded = 0;

  // 新規達成がある場合、トランザクションで処理
  if (newRanks.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const rank of newRanks) {
        const coins = getRewardAmount(rank);

        // 達成記録を保存
        await tx.challengeAchievement.create({
          data: {
            userId,
            scenarioId,
            rank,
            coinsAwarded: coins,
          },
        });

        // 現在の残高を取得
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { knowledgeBalance: true },
        });

        const newBalance = (user?.knowledgeBalance || 0) + coins;

        // 永続コインを付与
        await tx.user.update({
          where: { id: userId },
          data: { knowledgeBalance: newBalance },
        });

        // トランザクション履歴を記録
        await tx.knowledgeTransaction.create({
          data: {
            userId,
            amount: coins,
            transactionType: 'bonus',
            description: `チャレンジ達成報酬: ${scenarioId} ${rank}ランク`,
            balanceAfter: newBalance,
          },
        });

        achievements.push({ rank, coins, isNew: true });
        totalCoinsAwarded += coins;
      }
    });
  }

  // 既存の達成も含めて返す（UIで表示用）
  for (const rank of achievableRanks) {
    if (existingRanks.has(rank)) {
      achievements.push({
        rank: rank as AchievementRank,
        coins: getRewardAmount(rank as AchievementRank),
        isNew: false,
      });
    }
  }

  // ランク順にソート (B < A < S)
  achievements.sort((a, b) => {
    const order = { B: 0, A: 1, S: 2 };
    return order[a.rank] - order[b.rank];
  });

  return { achievements, totalCoinsAwarded };
}

/**
 * ユーザーの特定シナリオの達成状況を取得
 */
export async function getScenarioAchievements(
  userId: string,
  scenarioId: string
): Promise<{ rank: string; coinsAwarded: number; createdAt: Date }[]> {
  return prisma.challengeAchievement.findMany({
    where: { userId, scenarioId },
    select: {
      rank: true,
      coinsAwarded: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * ユーザーの全達成を取得
 */
export async function getUserAchievements(
  userId: string
): Promise<{ scenarioId: string; rank: string; coinsAwarded: number; createdAt: Date }[]> {
  return prisma.challengeAchievement.findMany({
    where: { userId },
    select: {
      scenarioId: true,
      rank: true,
      coinsAwarded: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}
