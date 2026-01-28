import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { stripe, getPriceIdForTier } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { SubscriptionTier } from '@/lib/constants/coins';

interface CheckoutRequest {
  tier: SubscriptionTier;
}

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

    const body: CheckoutRequest = await req.json();
    const { tier } = body;

    if (!tier || (tier !== 'plus' && tier !== 'premium')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TIER', message: '無効なプランです' } },
        { status: 400 }
      );
    }

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

    // Stripeカスタマーを取得または作成
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
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
    console.error('Stripe checkout error:', error);
    return handleApiError(error);
  }
}
