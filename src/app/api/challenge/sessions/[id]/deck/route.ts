import { withAuthParams } from '@/lib/api/with-auth';
import { parseBody } from '@/lib/api/validation';
import { setDeckSchema } from '@/lib/validations/challenge';
import { setSessionDeck } from '@/lib/services/challenge-service';

// デッキ設定
export const POST = withAuthParams<{ message: string }>(async (authUser, req, { id }) => {
  const { data, error } = await parseBody(req, setDeckSchema);
  if (error) return error;

  await setSessionDeck(id, authUser.uid, data.cardIds);
  return { message: 'デッキを設定しました' };
});
