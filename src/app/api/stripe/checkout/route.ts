import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { stripe, getPriceIdForTier } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';
import { parseBody } from '@/lib/api';
import { checkoutTierSchema } from '@/lib/validations/subscription';
import { createRequestLogger } from '@/lib/logger';
import type { ApiResponse } from '@/types/api';

interface CheckoutResponse {
  sessionId: string;
  url: string;
}

// POST /api/stripe/checkout - Checkoutセッション作成
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<CheckoutResponse>>> {
  try {
    const authUser = await verifyAuth(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      );
    }

    const requestId = req.headers.get('x-request-id') || '';
    const log = createRequestLogger(requestId, '/api/stripe/checkout', authUser.uid);

    // Zodバリデーション
    const parsed = await parseBody(req, checkoutTierSchema);
    if (parsed.error) return parsed.error;
    const { tier } = parsed.data;

    // ユーザー情報取得
    const user = await prisma.user.findUnique({
      where: { id: authUser.uid },
      select: {
        id: true,
        stripeCustomerId: true,
        subscriptionTier: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'ユーザーが見つかりません' } },
        { status: 404 }
      );
    }

    // 既にサブスク中の場合はエラー
    if (user.subscriptionTier) {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_SUBSCRIBED', message: '既にサブスクリプション中です' } },
        { status: 400 }
      );
    }

    // Stripeカスタマーを取得または作成（アトミック補償付き）
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customerId },
        });
      } catch (dbError) {
        // DB更新失敗時はStripe顧客を補償削除
        log.error('Failed to save Stripe customer ID, rolling back', { error: dbError });
        await stripe.customers.del(customerId);
        throw dbError;
      }
    }

    const priceId = getPriceIdForTier(tier);
    if (!priceId) {
      return NextResponse.json(
        { success: false, error: { code: 'PRICE_NOT_FOUND', message: '価格情報が見つかりません' } },
        { status: 500 }
      );
    }

    // Checkoutセッション作成
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?subscription=canceled`,
      metadata: {
        userId: user.id,
        tier,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url || '',
      },
    });
  } catch (error) {
    const requestId = req.headers.get('x-request-id') || '';
    const log = createRequestLogger(requestId, '/api/stripe/checkout');
    log.error('Stripe checkout error', { error });
    return handleApiError(error);
  }
}
