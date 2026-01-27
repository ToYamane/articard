import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getBalances, checkChallengeLimit } from '@/lib/services/coin-service';
import { handleApiError } from '@/lib/errors';

/**
 * GET /api/coins
 * コイン残高を取得（無料コイン・永続コイン・チャレンジ回数）
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

    const [balances, challengeLimit] = await Promise.all([
      getBalances(authUser.uid),
      checkChallengeLimit(authUser.uid),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        freeCoins: balances.freeCoins,
        permanentCoins: balances.permanentCoins,
        totalAvailable: balances.totalAvailable,
        challenge: {
          count: challengeLimit.count,
          remainingFree: challengeLimit.remainingFree,
          isFree: challengeLimit.isFree,
          nextCost: challengeLimit.cost,
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
