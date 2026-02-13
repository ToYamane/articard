import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { handleApiError } from '@/lib/errors';
import { parseBody } from '@/lib/api';
import { subscriptionTierSchema } from '@/lib/validations/subscription';
import { createRequestLogger } from '@/lib/logger';
import {
  activateSubscription,
  cancelSubscription,
} from '@/lib/services/subscription-service';
import type { ApiResponse } from '@/types/api';

// POST /api/subscription - サブスク有効化（開発者のみ）
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ tier: string; bonusCoins: number; expiresAt: string }>>> {
  try {
    const authUser = await verifyAuth(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      );
    }

    // 開発者チェック
    const user = await prisma.user.findUnique({
      where: { id: authUser.uid },
      select: { isDeveloper: true },
    });

    if (!user?.isDeveloper) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '開発者のみ利用可能です' } },
        { status: 403 }
      );
    }

    // Zodバリデーション
    const parsed = await parseBody(req, subscriptionTierSchema);
    if (parsed.error) return parsed.error;
    const { tier } = parsed.data;

    const result = await activateSubscription(authUser.uid, tier);

    return NextResponse.json({
      success: true,
      data: {
        tier: result.tier,
        bonusCoins: result.bonusCoins,
        expiresAt: result.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    const requestId = req.headers.get('x-request-id') || '';
    const log = createRequestLogger(requestId, '/api/subscription');
    log.error('Activate subscription error', { error });
    return handleApiError(error);
  }
}

// DELETE /api/subscription - サブスク解約
export async function DELETE(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ message: string }>>> {
  try {
    const authUser = await verifyAuth(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      );
    }

    // Stripe サブスクリプションがあればキャンセル
    const user = await prisma.user.findUnique({
      where: { id: authUser.uid },
      select: { stripeSubscriptionId: true },
    });

    if (user?.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      await prisma.user.update({
        where: { id: authUser.uid },
        data: { stripeSubscriptionId: null },
      });
    }

    await cancelSubscription(authUser.uid);

    return NextResponse.json({
      success: true,
      data: { message: 'サブスクリプションを解約しました' },
    });
  } catch (error) {
    const requestId = req.headers.get('x-request-id') || '';
    const log = createRequestLogger(requestId, '/api/subscription');
    log.error('Cancel subscription error', { error });
    return handleApiError(error);
  }
}
