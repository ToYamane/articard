import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { prisma } from '@/lib/prisma';
import { parseBody } from '@/lib/api';
import { coinPurchaseSchema } from '@/lib/validations/subscription';
import { COIN_PACKAGES } from '@/lib/constants/coins';

// POST /api/coins/purchase - コイン購入（開発者のみ）
export const POST = withAuth(async (authUser, req) => {
  // 開発者チェック
  const user = await prisma.user.findUnique({
    where: { id: authUser.uid },
    select: { isDeveloper: true, knowledgeBalance: true, dailyFreeCoins: true },
  });

  if (!user?.isDeveloper) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: '開発者のみ利用可能です' } },
      { status: 403 }
    );
  }

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

  // コイン付与
  const result = await prisma.$transaction(async (tx) => {
    const newBalance = user.knowledgeBalance + pkg.coins;

    await tx.user.update({
      where: { id: authUser.uid },
      data: { knowledgeBalance: newBalance },
    });

    await tx.knowledgeTransaction.create({
      data: {
        userId: authUser.uid,
        amount: pkg.coins,
        transactionType: 'purchase',
        description: `${pkg.name}パッケージ購入（${pkg.coins}コイン）`,
        balanceAfter: user.dailyFreeCoins + newBalance,
      },
    });

    return { newBalance };
  });

  return NextResponse.json({
    success: true,
    data: {
      coins: pkg.coins,
      newBalance: result.newBalance,
    },
  });
});
