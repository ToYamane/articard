import { withAuthParams } from '@/lib/api/with-auth';
import { ApiError } from '@/lib/errors';
import {
  getSessionById,
  abandonSession,
  type SessionDetails,
} from '@/lib/services/challenge-service';

// セッション詳細取得
export const GET = withAuthParams<SessionDetails>(async (authUser, _req, { id }) => {
  const session = await getSessionById(id, authUser.uid);

  if (!session) {
    throw new ApiError('NOT_FOUND', 'セッションが見つかりません', 404);
  }

  return session;
});

// セッション中断
export const DELETE = withAuthParams<{ message: string }>(async (authUser, _req, { id }) => {
  await abandonSession(id, authUser.uid);
  return { message: 'セッションを中断しました' };
});
