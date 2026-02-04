import { withAuth } from '@/lib/api/with-auth';
import { getScenarioList } from '@/lib/challenge';
import { prisma } from '@/lib/prisma';
import type { ScenarioListItem } from '@/types/challenge';

interface ScenarioWithHighScore extends ScenarioListItem {
  highScore: number | null;
  bestRank: string | null;
  playCount: number;
}

// シナリオ一覧取得（ハイスコア付き）
export const GET = withAuth<ScenarioWithHighScore[]>(async (authUser) => {
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
  return scenarios.map((s) => {
    const scoreData = highScoreMap.get(s.id);
    return {
      ...s,
      highScore: scoreData?.highScore ?? null,
      bestRank: scoreData?.bestRank ?? null,
      playCount: scoreData?.playCount ?? 0,
    };
  });
});
