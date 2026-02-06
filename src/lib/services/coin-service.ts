import { prisma } from '@/lib/prisma';
import {
  COIN_REWARDS,
  DAILY_LIMITS,
  COIN_COSTS,
  SUBSCRIPTION_PLANS,
  type SubscriptionTier,
} from '@/lib/constants/coins';
import {
  processPaginationResult,
  buildCursorOptions,
  DEFAULT_PAGE_SIZE,
} from '@/lib/utils/pagination';

/**
 * ユーザーのサブスクリプションプラン設定を取得
 */
function getSubscriptionConfig(tier: string | null) {
  if (!tier || !(tier in SUBSCRIPTION_PLANS)) {
    return null;
  }
  return SUBSCRIPTION_PLANS[tier as SubscriptionTier];
}

/**
 * 日次無料コイン数を取得
 */
function getDailyFreeCoins(tier: string | null): number {
  const plan = getSubscriptionConfig(tier);
  return plan?.dailyFreeCoins ?? COIN_REWARDS.DAILY_FREE;
}

/**
 * 無料チャレンジ回数を取得
 */
function getFreeChallenges(tier: string | null): number {
  const plan = getSubscriptionConfig(tier);
  return plan?.freeChallenges ?? DAILY_LIMITS.FREE_CHALLENGES;
}

// TransactionType is re-exported from Prisma
import { type TransactionType } from '@prisma/client';
export { TransactionType } from '@prisma/client';

/**
 * トランザクション情報
 */
export interface CoinTransaction {
  id: string;
  amount: number;
  transactionType: TransactionType;
  description: string | null;
  balanceAfter: number;
  createdAt: Date;
}

/**
 * コイン残高情報
 */
export interface CoinBalances {
  freeCoins: number;
  permanentCoins: number;
  totalAvailable: number;
}

/**
 * 消費結果情報
 */
export interface ConsumeResult {
  freeCoinsUsed: number;
  permanentCoinsUsed: number;
  newFreeBalance: number;
  newPermanentBalance: number;
}

/**
 * チャレンジ制限情報
 */
export interface ChallengeLimitInfo {
  count: number;
  isFree: boolean;
  cost: number;
  remainingFree: number;
}

/**
 * 日本時間の日付の開始時刻を取得（00:00 JST）
 */
function getJSTDayStart(date: Date): Date {
  const jstOffset = 9 * 60 * 60 * 1000; // 9時間をミリ秒に変換
  const utcTime = date.getTime();
  const jstTime = new Date(utcTime + jstOffset);

  // JSTでの日付の開始時刻（00:00 JST）をUTCに変換
  const jstDayStart = new Date(
    Date.UTC(jstTime.getUTCFullYear(), jstTime.getUTCMonth(), jstTime.getUTCDate())
  );

  // JSTの00:00をUTCに戻す（-9時間）
  return new Date(jstDayStart.getTime() - jstOffset);
}

/**
 * 同じ日かどうかチェック（日本時間基準）
 */
function isSameJSTDay(date1: Date, date2: Date): boolean {
  const day1 = getJSTDayStart(date1);
  const day2 = getJSTDayStart(date2);
  return day1.getTime() === day2.getTime();
}

/**
 * 日次リセットが必要かチェックし、必要なら実行
 */
export async function checkAndResetDaily(userId: string): Promise<{
  coinsReset: boolean;
  challengeReset: boolean;
}> {
  const now = new Date();
  const todayStart = getJSTDayStart(now);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      dailyCoinsResetAt: true,
      dailyChallengeResetAt: true,
      subscriptionTier: true,
    },
  });

  if (!user) {
    throw new Error('ユーザーが見つかりません');
  }

  // リセットが必要かチェック
  const needsCoinsReset = !user.dailyCoinsResetAt || !isSameJSTDay(user.dailyCoinsResetAt, now);
  const needsChallengeReset = !user.dailyChallengeResetAt || !isSameJSTDay(user.dailyChallengeResetAt, now);

  // 必要な場合のみ1回のUPDATEで実行
  if (needsCoinsReset || needsChallengeReset) {
    // プランに応じた日次コイン数を取得
    const dailyCoins = getDailyFreeCoins(user.subscriptionTier);

    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(needsCoinsReset && {
          dailyFreeCoins: dailyCoins,
          dailyCoinsResetAt: todayStart,
        }),
        ...(needsChallengeReset && {
          dailyChallengeCount: 0,
          dailyChallengeResetAt: todayStart,
        }),
      },
    });
  }

  return { coinsReset: needsCoinsReset, challengeReset: needsChallengeReset };
}

/**
 * コイン残高を取得（両方）
 */
export async function getBalances(userId: string): Promise<CoinBalances> {
  // 日次リセットを先に実行
  await checkAndResetDaily(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      knowledgeBalance: true,
      dailyFreeCoins: true,
    },
  });

  if (!user) {
    throw new Error('ユーザーが見つかりません');
  }

  return {
    freeCoins: user.dailyFreeCoins,
    permanentCoins: user.knowledgeBalance,
    totalAvailable: user.dailyFreeCoins + user.knowledgeBalance,
  };
}

/**
 * 永続コイン残高のみを取得（後方互換用）
 */
export async function getBalance(userId: string): Promise<number> {
  const balances = await getBalances(userId);
  return balances.totalAvailable;
}

/**
 * コインを消費（無料コイン優先）
 */
export async function consumeCoins(
  userId: string,
  amount: number,
  description: string
): Promise<ConsumeResult> {
  if (amount <= 0) {
    throw new Error('消費額は正の値である必要があります');
  }

  // 日次リセットを先に実行
  await checkAndResetDaily(userId);

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        knowledgeBalance: true,
        dailyFreeCoins: true,
      },
    });

    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    const totalAvailable = user.dailyFreeCoins + user.knowledgeBalance;

    if (totalAvailable < amount) {
      throw new Error(
        `コインが不足しています（必要: ${amount}、所持: ${totalAvailable}）`
      );
    }

    // 無料コインから優先消費
    let freeCoinsUsed = 0;
    let permanentCoinsUsed = 0;

    if (user.dailyFreeCoins >= amount) {
      freeCoinsUsed = amount;
    } else {
      freeCoinsUsed = user.dailyFreeCoins;
      permanentCoinsUsed = amount - freeCoinsUsed;
    }

    const newFreeBalance = user.dailyFreeCoins - freeCoinsUsed;
    const newPermanentBalance = user.knowledgeBalance - permanentCoinsUsed;

    // 残高を更新
    await tx.user.update({
      where: { id: userId },
      data: {
        dailyFreeCoins: newFreeBalance,
        knowledgeBalance: newPermanentBalance,
      },
    });

    // トランザクション履歴を記録
    await tx.knowledgeTransaction.create({
      data: {
        userId,
        amount: -amount,
        transactionType: 'consume',
        description,
        balanceAfter: newFreeBalance + newPermanentBalance,
      },
    });

    return {
      freeCoinsUsed,
      permanentCoinsUsed,
      newFreeBalance,
      newPermanentBalance,
    };
  });
}

/**
 * 永続コインを加算（報酬付与用）
 */
export async function addPermanentCoins(
  userId: string,
  amount: number,
  transactionType: TransactionType,
  description: string
): Promise<number> {
  if (amount <= 0) {
    throw new Error('加算額は正の値である必要があります');
  }

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        knowledgeBalance: true,
        dailyFreeCoins: true,
      },
    });

    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    const newBalance = user.knowledgeBalance + amount;

    await tx.user.update({
      where: { id: userId },
      data: { knowledgeBalance: newBalance },
    });

    await tx.knowledgeTransaction.create({
      data: {
        userId,
        amount,
        transactionType,
        description,
        balanceAfter: user.dailyFreeCoins + newBalance,
      },
    });

    return newBalance;
  });
}

/**
 * コインを加算（後方互換用エイリアス）
 */
export async function addCoins(
  userId: string,
  amount: number,
  transactionType: TransactionType,
  description: string
): Promise<number> {
  return addPermanentCoins(userId, amount, transactionType, description);
}

/**
 * 残高が足りるかチェック
 */
export async function hasEnoughCoins(
  userId: string,
  amount: number
): Promise<boolean> {
  const balances = await getBalances(userId);
  return balances.totalAvailable >= amount;
}

/**
 * チャレンジ回数制限をチェック
 */
export async function checkChallengeLimit(
  userId: string
): Promise<ChallengeLimitInfo> {
  // 日次リセットを先に実行
  await checkAndResetDaily(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      dailyChallengeCount: true,
      subscriptionTier: true,
    },
  });

  if (!user) {
    throw new Error('ユーザーが見つかりません');
  }

  const count = user.dailyChallengeCount;
  const freeChallenges = getFreeChallenges(user.subscriptionTier);

  // プレミアムは無制限
  const isFree = freeChallenges === Infinity || count < freeChallenges;
  const cost = isFree ? 0 : COIN_COSTS.CHALLENGE_EXTRA;
  const remainingFree = freeChallenges === Infinity
    ? Infinity
    : Math.max(0, freeChallenges - count);

  return { count, isFree, cost, remainingFree };
}

/**
 * チャレンジ回数をインクリメント
 */
export async function incrementChallengeCount(userId: string): Promise<number> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      dailyChallengeCount: { increment: 1 },
    },
    select: { dailyChallengeCount: true },
  });

  return user.dailyChallengeCount;
}

/**
 * トランザクション履歴を取得
 */
export async function getTransactions(
  userId: string,
  options?: { limit?: number; cursor?: string }
): Promise<{
  transactions: CoinTransaction[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const limit = options?.limit ?? DEFAULT_PAGE_SIZE;
  const cursor = options?.cursor;

  const transactions = await prisma.knowledgeTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...buildCursorOptions(cursor),
    select: {
      id: true,
      amount: true,
      transactionType: true,
      description: true,
      balanceAfter: true,
      createdAt: true,
    },
  });

  const { items, nextCursor, hasMore } = processPaginationResult(transactions, limit);

  return {
    transactions: items.map((t) => ({
      ...t,
      transactionType: t.transactionType as TransactionType,
    })),
    nextCursor,
    hasMore,
  };
}
