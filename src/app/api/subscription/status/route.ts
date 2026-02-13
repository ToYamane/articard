import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { handleApiError } from '@/lib/errors';
import { getSubscriptionStatus } from '@/lib/services/subscription-service';
import { createRequestLogger } from '@/lib/logger';
import type { ApiResponse } from '@/types/api';

// GET /api/subscription/status
export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{
  tier: string | null;
  expiresAt: string | null;
  bonusReceived: boolean;
  plan: { name: string; dailyFreeCoins: number; freeChallenges: number } | null;
}>>> {
  try {
    const authUser = await verifyAuth(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      );
    }

    const status = await getSubscriptionStatus(authUser.uid);

    return NextResponse.json({
      success: true,
      data: {
        tier: status.tier,
        expiresAt: status.expiresAt?.toISOString() ?? null,
        bonusReceived: status.bonusReceived,
        plan: status.plan ? {
          name: status.plan.name,
          dailyFreeCoins: status.plan.dailyFreeCoins,
          freeChallenges: status.plan.freeChallenges === Infinity ? -1 : status.plan.freeChallenges,
        } : null,
      },
    });
  } catch (error) {
    const requestId = req.headers.get('x-request-id') || '';
    const log = createRequestLogger(requestId, '/api/subscription/status');
    log.error('Get subscription status error', { error });
    return handleApiError(error);
  }
}
