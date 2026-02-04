import { NextRequest } from 'next/server';
import { withAuthParams } from '@/lib/api';
import { articleIdSchema } from '@/lib/validations/article';
import { getArticleById, deleteArticle } from '@/lib/services/article-service';
import { ApiError } from '@/lib/errors';
import type { Article } from '@prisma/client';

// 記事取得
export const GET = withAuthParams<Article>(async (authUser, req, params) => {
  const { id } = articleIdSchema.parse({ id: params.id });

  const article = await getArticleById(id, authUser.uid);

  if (!article) {
    throw new ApiError('NOT_FOUND', '記事が見つかりません', 404);
  }

  return article;
});

// 記事削除
export const DELETE = withAuthParams<{ message: string }>(async (authUser, req, params) => {
  const { id } = articleIdSchema.parse({ id: params.id });

  const deleted = await deleteArticle(id, authUser.uid);

  if (!deleted) {
    throw new ApiError('NOT_FOUND', '記事が見つかりません', 404);
  }

  return { message: '記事が削除されました' };
});
