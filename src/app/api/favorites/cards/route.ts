import { withAuth } from '@/lib/api';
import { toggleFavoriteCardSchema } from '@/lib/validations/favorite';
import { toggleFavoriteCard, getFavoriteCardIds } from '@/lib/services/favorite-service';

// お気に入りカードをトグル
export const POST = withAuth<{ isFavorite: boolean }>(async (authUser, req) => {
  const body = await req.json();
  const { cardId } = toggleFavoriteCardSchema.parse(body);
  return toggleFavoriteCard(authUser.uid, cardId);
});

// お気に入りカードID一覧を取得
export const GET = withAuth<{ ids: string[] }>(async (authUser) => {
  const ids = await getFavoriteCardIds(authUser.uid);
  return { ids };
});
