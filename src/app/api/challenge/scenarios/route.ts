import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getScenarioList } from '@/lib/challenge';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { ScenarioListItem } from '@/types/challenge';

interface ScenarioWithHighScore extends ScenarioListItem {
  highScore: number | null;
}

// シナリオ一覧取得（ハイスコア付き）
export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<ScenarioWithHighScore[]>>> {
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

    // ユーザーのシナリオ別ハイスコアを取得
    const highScores = await prisma.challengeSession.groupBy({
      by: ['scenarioId'],
      where: {
        userId: authUser.uid,
        status: 'completed',
      },
      _max: {
        totalScore: true,
      },
    });

    // ハイスコアをマップに変換
    const highScoreMap = new Map<string, number>();
    for (const hs of highScores) {
      if (hs._max.totalScore !== null) {
        highScoreMap.set(hs.scenarioId, hs._max.totalScore);
      }
    }

    // シナリオにハイスコアを追加
    const scenariosWithHighScore: ScenarioWithHighScore[] = scenarios.map((s) => ({
      ...s,
      highScore: highScoreMap.get(s.id) ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: scenariosWithHighScore,
    });
  } catch (error) {
    console.error('Get scenarios error:', error);
    return handleApiError(error);
  }
}
