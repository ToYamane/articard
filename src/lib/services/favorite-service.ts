import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';

/**
 * カードのお気に入りをトグル
 */
export async function toggleFavoriteCard(
  userId: string,
  cardId: string
): Promise<{ isFavorite: boolean }> {
  // カードの存在・所有権チェック
  const card = await prisma.card.findUnique({
    where: { id: cardId },
  });

  if (!card || card.userId !== userId) {
    throw ApiError.notFound('カードが見つかりません');
  }

  // 既存のお気に入りを確認
  const existing = await prisma.favoriteCard.findUnique({
    where: { userId_cardId: { userId, cardId } },
  });

  if (existing) {
    await prisma.favoriteCard.delete({
      where: { id: existing.id },
    });
    return { isFavorite: false };
  }

  await prisma.favoriteCard.create({
    data: { userId, cardId },
  });
  return { isFavorite: true };
}

/**
 * 記事のお気に入りをトグル
 */
export async function toggleFavoriteArticle(
  userId: string,
  articleId: string
): Promise<{ isFavorite: boolean }> {
  // 記事の存在・所有権チェック
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  if (!article || article.userId !== userId) {
    throw ApiError.notFound('記事が見つかりません');
  }

  // 既存のお気に入りを確認
  const existing = await prisma.favoriteArticle.findUnique({
    where: { userId_articleId: { userId, articleId } },
  });

  if (existing) {
    await prisma.favoriteArticle.delete({
      where: { id: existing.id },
    });
    return { isFavorite: false };
  }

  await prisma.favoriteArticle.create({
    data: { userId, articleId },
  });
  return { isFavorite: true };
}

/**
 * ユーザーのお気に入りカードID一覧を取得
 */
export async function getFavoriteCardIds(userId: string): Promise<string[]> {
  const favorites = await prisma.favoriteCard.findMany({
    where: { userId },
    select: { cardId: true },
  });
  return favorites.map((f) => f.cardId);
}

/**
 * ユーザーのお気に入り記事ID一覧を取得
 */
export async function getFavoriteArticleIds(userId: string): Promise<string[]> {
  const favorites = await prisma.favoriteArticle.findMany({
    where: { userId },
    select: { articleId: true },
  });
  return favorites.map((f) => f.articleId);
}
