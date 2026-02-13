import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api';
import { createArticleSchema, getArticlesQuerySchema } from '@/lib/validations/article';
import { createArticle, getArticlesByUser } from '@/lib/services/article-service';
import type { Article } from '@prisma/client';

interface ArticleListResponse {
  articles: Article[];
  nextCursor: string | null;
  hasMore: boolean;
}

// 記事生成
export const POST = withAuth<Article>(async (authUser, req) => {
  const body = await req.json();
  const { theme, contentType } = createArticleSchema.parse(body);

  return createArticle({
    userId: authUser.uid,
    theme,
    contentType,
  });
}, { rateLimit: 'expensive' });

// 記事一覧取得
export const GET = withAuth<ArticleListResponse>(async (authUser, req) => {
  const { searchParams } = new URL(req.url);
  const queryParams = {
    cursor: searchParams.get('cursor') || undefined,
    limit: searchParams.get('limit') || undefined,
    search: searchParams.get('search') || undefined,
    sortBy: searchParams.get('sortBy') || undefined,
    sortOrder: searchParams.get('sortOrder') || undefined,
  };

  const { cursor, limit, search, sortBy, sortOrder } = getArticlesQuerySchema.parse(queryParams);

  return getArticlesByUser({
    userId: authUser.uid,
    cursor,
    limit,
    search,
    sortBy,
    sortOrder,
  });
});
