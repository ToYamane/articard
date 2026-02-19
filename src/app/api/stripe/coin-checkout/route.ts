import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { stripe, getPriceIdForCoinPackage } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';
import { parseBody } from '@/lib/api';
import { coinPurchaseSchema } from '@/lib/validations/subscription';
import { createRequestLogger } from '@/lib/logger';
import { COIN_PACKAGES } from '@/lib/constants/coins';
import type { ApiResponse } from '@/types/api';

interface CoinCheckoutResponse {
  sessionId: string;
  url: string;
}

// POST /api/stripe/coin-checkout - コイン購入Checkoutセッション作成
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<CoinCheckoutResponse>>> {
  try {
    const authUser = await verifyAuth(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      );
    }

    const requestId = req.headers.get('x-request-id') || '';
    const log = createRequestLogger(requestId, '/api/stripe/coin-checkout', authUser.uid);

    // Zodバリデーション
    const parsed = await parseBody(req, coinPurchaseSchema);
    if (parsed.error) return parsed.error;
    const { packageId } = parsed.data;

    const pkg = COIN_PACKAGES[packageId];
    if (!pkg) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '無効なパッケージIDです' } },
        { status: 400 }
      );
    }

    // ユーザー情報取得
    const user = await prisma.user.findUnique({
      where: { id: authUser.uid },
      select: {
        id: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'ユーザーが見つかりません' } },
        { status: 404 }
      );
    }

    // Stripeカスタマーを取得または作成
    let customerId = user.stripeCustomerId;

    // 既存の顧客IDの有効性を確認（テスト/ライブモード不一致等に対応）
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if (existing.deleted) {
          customerId = null;
        }
      } catch {
        log.warn('Stripe customer not found, will re-create', { oldCustomerId: customerId });
        customerId = null;
      }
    }

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
        log.error('Failed to save Stripe customer ID, rolling back', { error: dbError });
        await stripe.customers.del(customerId);
        throw dbError;
      }
    }

    const priceId = getPriceIdForCoinPackage(packageId);
    if (!priceId) {
      return NextResponse.json(
        { success: false, error: { code: 'PRICE_NOT_FOUND', message: '価格情報が見つかりません' } },
        { status: 500 }
      );
    }

    // Checkoutセッション作成（一回払い）
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?coins=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?coins=canceled`,
      metadata: {
        type: 'coin_purchase',
        packageId,
        userId: user.id,
      },
    });

    log.info(`Coin checkout session created: ${session.id}`, { packageId });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url || '',
      },
    });
  } catch (error) {
    const requestId = req.headers.get('x-request-id') || '';
    const log = createRequestLogger(requestId, '/api/stripe/coin-checkout');
    log.error('Stripe coin checkout error', { error });
    return handleApiError(error);
  }
}
