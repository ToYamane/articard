import { withAuth } from '@/lib/api/with-auth';
import { parseBody, parseQuery } from '@/lib/api/validation';
import {
  createSessionSchema,
  getSessionsQuerySchema,
} from '@/lib/validations/challenge';
import {
  createSession,
  getUserSessions,
} from '@/lib/services/challenge-service';
import type { ChallengeSessionStatus } from '@/types/challenge';

interface SessionResponse {
  id: string;
  scenarioId: string;
  status: ChallengeSessionStatus;
}

interface SessionListItem {
  id: string;
  scenarioId: string;
  status: ChallengeSessionStatus;
  currentPhase: number;
  totalScore: number;
  startedAt: Date;
  completedAt: Date | null;
}

// セッション作成
export const POST = withAuth<SessionResponse>(async (authUser, req) => {
  const { data, error } = await parseBody(req, createSessionSchema);
  if (error) return error;

  return createSession(authUser.uid, data.scenarioId);
}, { rateLimit: 'standard' });

// セッション一覧取得
export const GET = withAuth<{ sessions: SessionListItem[] }>(async (authUser, req) => {
  const { data, error } = parseQuery(req, getSessionsQuerySchema);
  if (error) return error;

  const sessions = await getUserSessions(
    authUser.uid,
    data.status,
    data.limit
  );

  return { sessions };
});
