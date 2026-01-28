import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe, STRIPE_PRICE_TO_TIER } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { activateSubscription, cancelSubscription } from '@/lib/services/subscription-service';

// Webhookのbodyを生で取得するために必要
export const dynamic = 'force-dynamic';

// POST /api/stripe/webhook - Stripe Webhook
export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.error('Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  console.log(`Stripe webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Checkout完了時の処理
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier as 'plus' | 'premium' | undefined;

  if (!userId || !tier) {
    console.error('Missing metadata in checkout session:', session.id);
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

  console.log(`Subscription activated for user ${userId}: ${tier}`);
}

/**
 * サブスクリプション更新時の処理
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // カスタマーIDからユーザーを検索
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error('User not found for customer:', customerId);
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
      console.log(`Subscription updated for user ${user.id}: ${tier}`);
    }
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    // サブスクが無効になった場合
    await cancelSubscription(user.id);
    console.log(`Subscription canceled for user ${user.id}`);
  }
}

/**
 * サブスクリプション削除時の処理
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  await cancelSubscription(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeSubscriptionId: null },
  });

  console.log(`Subscription deleted for user ${user.id}`);
}

/**
 * 支払い失敗時の処理
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  // TODO: ユーザーに通知を送る（メール等）
  console.log(`Payment failed for user ${user.id}`);
}
