import { prisma } from '@/lib/prisma';
import { SUBSCRIPTION_PLANS, type SubscriptionTier } from '@/lib/constants/coins';

/**
 * サブスク有効化結果
 */
export interface ActivateSubscriptionResult {
  success: boolean;
  tier: SubscriptionTier;
  bonusCoins: number;
  expiresAt: Date;
}

/**
 * サブスク状態
 */
export interface SubscriptionStatus {
  tier: SubscriptionTier | null;
  expiresAt: Date | null;
  bonusReceived: boolean;
  plan: typeof SUBSCRIPTION_PLANS[SubscriptionTier] | null;
}

/**
 * サブスクリプションを有効化
 */
export async function activateSubscription(
  userId: string,
  tier: SubscriptionTier
): Promise<ActivateSubscriptionResult> {
  const plan = SUBSCRIPTION_PLANS[tier];
  if (!plan) {
    throw new Error('無効なプランです');
  }

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionBonusReceived: true,
        knowledgeBalance: true,
        dailyFreeCoins: true,
      },
    });

    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    // ボーナス付与（初回のみ）
    const bonusCoins = user.subscriptionBonusReceived ? 0 : plan.signupBonus;
    const newBalance = user.knowledgeBalance + bonusCoins;

    // ユーザー情報更新
    await tx.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: tier,
        isPremium: true,
        premiumExpiresAt: expiresAt,
        subscriptionBonusReceived: true,
        knowledgeBalance: newBalance,
        // 日次コインも即時更新
        dailyFreeCoins: Math.max(user.dailyFreeCoins, plan.dailyFreeCoins),
      },
    });

    // ボーナス付与のトランザクション履歴
    if (bonusCoins > 0) {
      await tx.knowledgeTransaction.create({
        data: {
          userId,
          amount: bonusCoins,
          transactionType: 'bonus',
          description: `${plan.name}プラン初回特典`,
          balanceAfter: newBalance,
        },
      });
    }

    return {
      success: true,
      tier,
      bonusCoins,
      expiresAt,
    };
  });
}

/**
 * サブスクリプション状態を取得
 */
export async function getSubscriptionStatus(
  userId: string
): Promise<SubscriptionStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
      premiumExpiresAt: true,
      subscriptionBonusReceived: true,
    },
  });

  if (!user) {
    throw new Error('ユーザーが見つかりません');
  }

  const tier = user.subscriptionTier as SubscriptionTier | null;
  const plan = tier ? SUBSCRIPTION_PLANS[tier] : null;

  return {
    tier,
    expiresAt: user.premiumExpiresAt,
    bonusReceived: user.subscriptionBonusReceived,
    plan,
  };
}

/**
 * サブスクリプションを解約
 */
export async function cancelSubscription(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: null,
      isPremium: false,
      premiumExpiresAt: null,
    },
  });
}
