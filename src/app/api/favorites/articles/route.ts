import { withAuth } from '@/lib/api';
import { toggleFavoriteArticleSchema } from '@/lib/validations/favorite';
import { toggleFavoriteArticle, getFavoriteArticleIds } from '@/lib/services/favorite-service';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';

// お気に入り記事をトグル
export const POST = withAuth<{ isFavorite: boolean }>(async (authUser, req) => {
  const user = await prisma.user.findUnique({
    where: { id: authUser.uid },
    select: { isGuest: true },
  });
  if (user?.isGuest) {
    throw new ApiError('GUEST_RESTRICTED', 'お気に入り機能はアカウント登録が必要です', 403);
  }
  const body = await req.json();
  const { articleId } = toggleFavoriteArticleSchema.parse(body);
  return toggleFavoriteArticle(authUser.uid, articleId);
});

// お気に入り記事ID一覧を取得
export const GET = withAuth<{ ids: string[] }>(async (authUser) => {
  const ids = await getFavoriteArticleIds(authUser.uid);
  return { ids };
});
