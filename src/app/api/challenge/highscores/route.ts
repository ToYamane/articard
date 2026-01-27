import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getUserHighScores } from '@/lib/services/challenge-service';
import { handleApiError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

interface HighScoreItem {
  scenarioId: string;
  highScore: number;
  bestRank: string;
  playCount: number;
  updatedAt: Date;
}

// ハイスコア一覧取得
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<{
  highScores: HighScoreItem[];
}>>> {
  try {
    const authUser = await verifyAuth(req);
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

    const highScores = await getUserHighScores(authUser.uid);

    return NextResponse.json({
      success: true,
      data: { highScores },
    });
  } catch (error) {
    console.error('Get high scores error:', error);
    return handleApiError(error);
  }
}
