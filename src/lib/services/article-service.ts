import { prisma } from '@/lib/prisma';
import { isThemeSafe, generateArticle } from '@/lib/openai';
import { ApiError } from '@/lib/errors';
import { getFavoriteArticleIds } from '@/lib/services/favorite-service';
import {
  processPaginationResult,
  buildCursorOptions,
  DEFAULT_PAGE_SIZE,
} from '@/lib/utils/pagination';
import type { Article, Prisma } from '@prisma/client';
import type { ContentType } from '@/types/article';

export interface CreateArticleParams {
  userId: string;
  theme: string;
  contentType?: ContentType;
}

export interface ArticleListParams {
  userId: string;
  cursor?: string;
  limit?: number;
  search?: string;
  sortBy?: 'createdAt' | 'cardCount';
  sortOrder?: 'asc' | 'desc';
  onlyFavorites?: boolean;
}

export interface ArticleListResult {
  articles: Article[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * 記事を生成して保存
 */
export async function createArticle({
  userId,
  theme,
  contentType = 'essay',
}: CreateArticleParams): Promise<Article> {
  // テーマの安全性チェック
  const safetyCheck = await isThemeSafe(theme);
  if (!safetyCheck.safe) {
    throw ApiError.moderationBlocked(safetyCheck.reason || 'このテーマでは記事を生成できません');
  }

  // 記事生成
  const generationResult = await generateArticle(theme, contentType);

  // データベースに保存
  const article = await prisma.article.create({
    data: {
      userId,
      theme,
      content: generationResult.content,
      contentType,
      openaiModel: generationResult.model,
      tokenUsage: generationResult.tokenUsage.total,
    },
  });

  return article;
}

/**
 * ユーザーの記事一覧を取得（カーソルベースページネーション）
 */
export async function getArticlesByUser({
  userId,
  cursor,
  limit = DEFAULT_PAGE_SIZE,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  onlyFavorites,
}: ArticleListParams): Promise<ArticleListResult> {
  const where: Prisma.ArticleWhereInput = {
    userId,
    ...(search && {
      theme: { contains: search, mode: 'insensitive' as const },
    }),
  };

  // お気に入りのみフィルタ
  if (onlyFavorites) {
    const favoriteIds = await getFavoriteArticleIds(userId);
    where.id = { in: favoriteIds };
  }

  const orderBy: Prisma.ArticleOrderByWithRelationInput =
    sortBy === 'cardCount' ? { cards: { _count: sortOrder } } : { createdAt: sortOrder };

  const articles = await prisma.article.findMany({
    where,
    orderBy,
    take: limit + 1,
    include: {
      _count: {
        select: { cards: true },
      },
    },
    ...buildCursorOptions(cursor),
  });

  const { items, nextCursor, hasMore } = processPaginationResult(articles, limit);

  return {
    articles: items,
    nextCursor,
    hasMore,
  };
}

/**
 * 記事を取得
 */
export async function getArticleById(articleId: string, userId?: string): Promise<Article | null> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  // ユーザーIDが指定されている場合は所有者チェック
  if (article && userId && article.userId !== userId) {
    return null;
  }

  return article;
}

/**
 * 記事を削除（関連カードの articleId は SetNull で自動的に null になる）
 */
export async function deleteArticle(articleId: string, userId: string): Promise<boolean> {
  // 所有者チェック
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  if (!article || article.userId !== userId) {
    return false;
  }

  await prisma.article.delete({ where: { id: articleId } });

  return true;
}

/**
 * ユーザーの記事数を取得
 */
export async function getArticleCountByUser(userId: string): Promise<number> {
  return prisma.article.count({
    where: { userId },
  });
}
