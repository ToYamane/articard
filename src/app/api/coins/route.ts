import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getBalances, checkChallengeLimit } from '@/lib/services/coin-service';
import { handleApiError } from '@/lib/errors';
import {
  SUBSCRIPTION_PLANS,
  COIN_PACKAGES,
  type SubscriptionTier,
} from '@/lib/constants/coins';

/**
 * GET /api/coins
 * コイン残高を取得（無料コイン・永続コイン・チャレンジ回数・サブスク情報）
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '認証が必要です',
          },
        },
        { status: 401 }
      );
    }

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

    const tier = user?.subscriptionTier as SubscriptionTier | null;
    const plan = tier ? SUBSCRIPTION_PLANS[tier] : null;

    return NextResponse.json({
      success: true,
      data: {
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
          plan: plan ? {
            name: plan.name,
            dailyFreeCoins: plan.dailyFreeCoins,
            freeChallenges: plan.freeChallenges === Infinity ? -1 : plan.freeChallenges,
          } : null,
        },
        packages: Object.entries(COIN_PACKAGES).map(([id, pkg]) => ({
          id,
          name: pkg.name,
          coins: pkg.coins,
          price: pkg.price,
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
