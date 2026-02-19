import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import type { SubscriptionTier } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { stripe, STRIPE_PRICE_TO_TIER } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { activateSubscription, cancelSubscription } from '@/lib/services/subscription-service';
import { createRequestLogger } from '@/lib/logger';
import { COIN_PACKAGES, type CoinPackageId } from '@/lib/constants/coins';

// Webhookのbodyを生で取得するために必要
export const dynamic = 'force-dynamic';

// POST /api/stripe/webhook - Stripe Webhook
export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const log = createRequestLogger(requestId, '/api/stripe/webhook');

  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    log.error('Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    log.error('Webhook signature verification failed', { error: err });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  log.info(`Stripe webhook received: ${event.type}`, { eventId: event.id });

  // 冪等性チェック: 処理済みイベントをスキップ
  const existingEvent = await prisma.stripeWebhookEvent.findUnique({
    where: { eventId: event.id },
  });
  if (existingEvent) {
    log.info(`Duplicate webhook event ignored: ${event.id}`);
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, log);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription, log);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, log);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice, log);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice, log);
        break;
      }

      default:
        log.info(`Unhandled event type: ${event.type}`);
    }

    // Record successful processing for idempotency
    try {
      await prisma.stripeWebhookEvent.create({
        data: { eventId: event.id, eventType: event.type },
      });
    } catch (dupError) {
      if (dupError instanceof Prisma.PrismaClientKnownRequestError && dupError.code === 'P2002') {
        log.info(`Event already processed by another instance: ${event.id}`);
      }
      // Other errors: log but still return success since processing completed
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    log.error('Webhook handler error', { error, eventType: event.type });
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

/**
 * Checkout完了時の処理
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  log: ReturnType<typeof createRequestLogger>
) {
  // コイン購入の場合
  if (session.metadata?.type === 'coin_purchase') {
    await handleCoinPurchaseCompleted(session, log);
    return;
  }

  // サブスクリプション購入の場合
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier as SubscriptionTier | undefined;

  if (!userId || !tier) {
    log.error('Missing metadata in checkout session', { sessionId: session.id });
    return;
  }

  // サブスクリプションIDを保存
  const subscriptionId = session.subscription as string;

  await prisma.user.update({
    where: { id: userId },
    data: { stripeSubscriptionId: subscriptionId },
  });

  // サブスクリプションを有効化
  await activateSubscription(userId, tier);

  log.info(`Subscription activated for user ${userId}: ${tier}`);
}

/**
 * コイン購入Checkout完了時の処理
 */
async function handleCoinPurchaseCompleted(
  session: Stripe.Checkout.Session,
  log: ReturnType<typeof createRequestLogger>
) {
  const userId = session.metadata?.userId;
  const packageId = session.metadata?.packageId as CoinPackageId | undefined;

  if (!userId || !packageId) {
    log.error('Missing metadata in coin purchase session', { sessionId: session.id });
    return;
  }

  const pkg = COIN_PACKAGES[packageId];
  if (!pkg) {
    log.error('Invalid packageId in coin purchase session', { sessionId: session.id, packageId });
    return;
  }

  // コイン付与（トランザクション）
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { knowledgeBalance: true, dailyFreeCoins: true },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const newBalance = user.knowledgeBalance + pkg.coins;

    await tx.user.update({
      where: { id: userId },
      data: { knowledgeBalance: newBalance },
    });

    await tx.knowledgeTransaction.create({
      data: {
        userId,
        amount: pkg.coins,
        transactionType: 'purchase',
        description: `${pkg.name}パッケージ購入（${pkg.coins}コイン）`,
        balanceAfter: user.dailyFreeCoins + newBalance,
      },
    });
  });

  log.info(`Coin purchase completed for user ${userId}: ${packageId} (${pkg.coins} coins)`);
}

/**
 * サブスクリプション更新時の処理
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  log: ReturnType<typeof createRequestLogger>
) {
  const customerId = subscription.customer as string;

  // カスタマーIDからユーザーを検索
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    log.error('User not found for customer', { customerId });
    return;
  }

  // サブスクリプションのステータスを確認
  if (subscription.status === 'active') {
    // プランを確認
    const priceId = subscription.items.data[0]?.price.id;
    const tier = STRIPE_PRICE_TO_TIER[priceId];

    if (tier && tier !== user.subscriptionTier) {
      // プラン変更があった場合
      await activateSubscription(user.id, tier);
      log.info(`Subscription updated for user ${user.id}: ${tier}`);
    }
  } else if (['canceled', 'unpaid', 'past_due'].includes(subscription.status)) {
    // サブスクが無効になった場合
    await cancelSubscription(user.id);
    log.info(`Subscription canceled for user ${user.id}`);
  }
}

/**
 * サブスクリプション削除時の処理
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  log: ReturnType<typeof createRequestLogger>
) {
  const customerId = subscription.customer as string;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    log.error('User not found for customer', { customerId });
    return;
  }

  await cancelSubscription(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeSubscriptionId: null },
  });

  log.info(`Subscription deleted for user ${user.id}`);
}

/**
 * 月次更新（renewal）時のボーナス付与
 */
async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  log: ReturnType<typeof createRequestLogger>
) {
  // renewalのみ処理（初回・プラン変更は別ハンドラで処理済み）
  if (invoice.billing_reason !== 'subscription_cycle') {
    log.info(`Skipping invoice.paid (billing_reason: ${invoice.billing_reason})`);
    return;
  }

  const customerId = invoice.customer as string;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    log.error('User not found for customer', { customerId });
    return;
  }

  // invoice.lines からtierを特定
  const priceRef = invoice.lines.data[0]?.pricing?.price_details?.price;
  const priceId = typeof priceRef === 'string' ? priceRef : priceRef?.id;
  if (!priceId) {
    log.error('No price found in invoice lines', { invoiceId: invoice.id });
    return;
  }

  const tier = STRIPE_PRICE_TO_TIER[priceId];
  if (!tier) {
    log.error('Unknown price ID in invoice', { priceId });
    return;
  }

  await activateSubscription(user.id, tier);
  log.info(`Subscription renewed for user ${user.id}: ${tier}`, { invoiceId: invoice.id });
}

/**
 * 支払い失敗時の処理
 */
async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  log: ReturnType<typeof createRequestLogger>
) {
  const customerId = invoice.customer as string;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    log.error('User not found for customer', { customerId });
    return;
  }

  log.warn(`Payment failed for user ${user.id} (tier: ${user.subscriptionTier})`, {
    invoiceId: invoice.id,
    amountDue: invoice.amount_due,
  });
}
