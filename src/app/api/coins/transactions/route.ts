import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getTransactions } from '@/lib/services/coin-service';
import { handleApiError } from '@/lib/errors';

/**
 * GET /api/coins/transactions
 * トランザクション履歴を取得
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '認証が必要です',
          },
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const cursor = searchParams.get('cursor');

    const result = await getTransactions(authUser.uid, {
      limit: limit ? parseInt(limit, 10) : undefined,
      cursor: cursor || undefined,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
