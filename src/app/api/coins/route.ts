import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getBalances, checkChallengeLimit } from '@/lib/services/coin-service';
import {
  SUBSCRIPTION_PLANS,
  COIN_PACKAGES,
  type SubscriptionTier,
} from '@/lib/constants/coins';

interface CoinBalanceResponse {
  freeCoins: number;
  permanentCoins: number;
  totalAvailable: number;
  challenge: {
    count: number;
    remainingFree: number;
    isFree: boolean;
    nextCost: number;
  };
  subscription: {
    tier: SubscriptionTier | null;
    expiresAt: string | null;
    bonusReceived: boolean;
    plan: {
      name: string;
      dailyFreeCoins: number;
      freeChallenges: number;
    } | null;
  };
  packages: Array<{
    id: string;
    name: string;
    coins: number;
    price: number;
  }>;
}

/**
 * GET /api/coins
 * コイン残高を取得（無料コイン・永続コイン・チャレンジ回数・サブスク情報）
 */
export const GET = withAuth<CoinBalanceResponse>(async (authUser) => {
  const [balances, challengeLimit, user] = await Promise.all([
    getBalances(authUser.uid),
    checkChallengeLimit(authUser.uid),
    prisma.user.findUnique({
      where: { id: authUser.uid },
      select: {
        subscriptionTier: true,
        premiumExpiresAt: true,
        subscriptionBonusReceived: true,
      },
    }),
  ]);

  const tier = user?.subscriptionTier ?? null;
  const plan = tier ? SUBSCRIPTION_PLANS[tier] : null;

  return {
    freeCoins: balances.freeCoins,
    permanentCoins: balances.permanentCoins,
    totalAvailable: balances.totalAvailable,
    challenge: {
      count: challengeLimit.count,
      remainingFree: challengeLimit.remainingFree === Infinity ? -1 : challengeLimit.remainingFree,
      isFree: challengeLimit.isFree,
      nextCost: challengeLimit.cost,
    },
    subscription: {
      tier,
      expiresAt: user?.premiumExpiresAt?.toISOString() ?? null,
      bonusReceived: user?.subscriptionBonusReceived ?? false,
      plan: plan
        ? {
            name: plan.name,
            dailyFreeCoins: plan.dailyFreeCoins,
            freeChallenges: plan.freeChallenges === Infinity ? -1 : plan.freeChallenges,
          }
        : null,
    },
    packages: Object.entries(COIN_PACKAGES).map(([id, pkg]) => ({
      id,
      name: pkg.name,
      coins: pkg.coins,
      price: pkg.price,
    })),
  };
});
