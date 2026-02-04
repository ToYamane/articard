import { withAuth } from '@/lib/api/with-auth';
import { getUserHighScores } from '@/lib/services/challenge-service';

interface HighScoreItem {
  scenarioId: string;
  highScore: number;
  bestRank: string;
  playCount: number;
  updatedAt: Date;
}

// ハイスコア一覧取得
export const GET = withAuth<{ highScores: HighScoreItem[] }>(async (authUser) => {
  const highScores = await getUserHighScores(authUser.uid);
  return { highScores };
});
