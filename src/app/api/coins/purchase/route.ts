import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';
import { parseBody } from '@/lib/api';
import { coinPurchaseSchema } from '@/lib/validations/subscription';
import { createRequestLogger } from '@/lib/logger';
import { COIN_PACKAGES } from '@/lib/constants/coins';
import type { ApiResponse } from '@/types/api';

// POST /api/coins/purchase - コイン購入（開発者のみ）
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ coins: number; newBalance: number }>>> {
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

    // Zodバリデーション
    const parsed = await parseBody(req, coinPurchaseSchema);
    if (parsed.error) return parsed.error;
    const { packageId } = parsed.data;

    const pkg = COIN_PACKAGES[packageId];

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
  } catch (error) {
    const requestId = req.headers.get('x-request-id') || '';
    const log = createRequestLogger(requestId, '/api/coins/purchase');
    log.error('Purchase coins error', { error });
    return handleApiError(error);
  }
}
