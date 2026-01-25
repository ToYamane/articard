import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getScenarioList } from '@/lib/challenge';
import { handleApiError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { ScenarioListItem } from '@/types/challenge';

// シナリオ一覧取得
export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<ScenarioListItem[]>>> {
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

    const scenarios = getScenarioList();

    return NextResponse.json({
      success: true,
      data: scenarios,
    });
  } catch (error) {
    console.error('Get scenarios error:', error);
    return handleApiError(error);
  }
}
