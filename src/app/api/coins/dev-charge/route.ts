import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

// POST /api/coins/dev-charge - 開発者専用：任意金額の即時チャージ
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ amount: number; newBalance: number }>>> {
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
      select: { isDeveloper: true, knowledgeBalance: true, dailyFreeCoins: true },
    });

    if (!user?.isDeveloper) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '開発者のみ利用可能です' } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { amount } = body as { amount: number };

    // バリデーション: 正の整数、1〜99999
    if (!amount || !Number.isInteger(amount) || amount < 1 || amount > 99999) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_AMOUNT', message: '金額は1〜99999の整数で指定してください' } },
        { status: 400 }
      );
    }

    // コイン付与
    const result = await prisma.$transaction(async (tx) => {
      const newBalance = user.knowledgeBalance + amount;

      await tx.user.update({
        where: { id: authUser.uid },
        data: { knowledgeBalance: newBalance },
      });

      await tx.knowledgeTransaction.create({
        data: {
          userId: authUser.uid,
          amount,
          transactionType: 'purchase',
          description: `開発者チャージ（${amount}コイン）`,
          balanceAfter: user.dailyFreeCoins + newBalance,
        },
      });

      return { newBalance };
    });

    return NextResponse.json({
      success: true,
      data: {
        amount,
        newBalance: result.newBalance,
      },
    });
  } catch (error) {
    console.error('Dev charge coins error:', error);
    return handleApiError(error);
  }
}
