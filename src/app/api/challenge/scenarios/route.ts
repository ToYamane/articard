import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getScenarioList } from '@/lib/challenge';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { ScenarioListItem } from '@/types/challenge';

interface ScenarioWithHighScore extends ScenarioListItem {
  highScore: number | null;
  bestRank: string | null;
  playCount: number;
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
    const highScores = await prisma.challengeHighScore.findMany({
      where: {
        userId: authUser.uid,
      },
    });

    // ハイスコアをマップに変換
    const highScoreMap = new Map<string, { highScore: number; bestRank: string; playCount: number }>();
    for (const hs of highScores) {
      highScoreMap.set(hs.scenarioId, {
        highScore: hs.highScore,
        bestRank: hs.bestRank,
        playCount: hs.playCount,
      });
    }

    // シナリオにハイスコアを追加
    const scenariosWithHighScore: ScenarioWithHighScore[] = scenarios.map((s) => {
      const scoreData = highScoreMap.get(s.id);
      return {
        ...s,
        highScore: scoreData?.highScore ?? null,
        bestRank: scoreData?.bestRank ?? null,
        playCount: scoreData?.playCount ?? 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: scenariosWithHighScore,
    });
  } catch (error) {
    console.error('Get scenarios error:', error);
    return handleApiError(error);
  }
}
