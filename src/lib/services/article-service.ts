import { prisma } from '@/lib/prisma';
import { isThemeSafe, generateArticle } from '@/lib/openai';
import { batchDeleteCardImages } from '@/lib/gcs/storage';
import { ApiError } from '@/lib/errors';
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
}: ArticleListParams): Promise<ArticleListResult> {
  const where: Prisma.ArticleWhereInput = {
    userId,
    ...(search && {
      theme: { contains: search, mode: 'insensitive' as const },
    }),
  };

  const orderBy: Prisma.ArticleOrderByWithRelationInput =
    sortBy === 'cardCount'
      ? { cards: { _count: sortOrder } }
      : { createdAt: sortOrder };

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
export async function getArticleById(
  articleId: string,
  userId?: string
): Promise<Article | null> {
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
 * 記事を削除（関連カードも含む）
 */
export async function deleteArticle(
  articleId: string,
  userId: string
): Promise<boolean> {
  // 所有者チェック
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  if (!article || article.userId !== userId) {
    return false;
  }

  // 関連カードのIDを取得（画像削除用）
  const relatedCards = await prisma.card.findMany({
    where: { articleId },
    select: { id: true },
  });
  const cardIds = relatedCards.map((card) => card.id);

  // トランザクションで削除
  await prisma.$transaction(async (tx) => {
    // 関連カードを削除
    await tx.card.deleteMany({
      where: { articleId },
    });

    // 記事を削除
    await tx.article.delete({
      where: { id: articleId },
    });
  });

  // 関連カードの画像を一括削除
  if (cardIds.length > 0) {
    try {
      await batchDeleteCardImages(cardIds);
    } catch {
      // 画像削除に失敗してもDBは削除済みなので無視
    }
  }

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
