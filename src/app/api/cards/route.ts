import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { createCardSchema, getCardsQuerySchema } from '@/lib/validations/card';
import { createCard, getCardsByUser } from '@/lib/services/card-service';
import { ApiError } from '@/lib/errors';
import type { Card } from '@prisma/client';

interface CardListResponse {
  cards: Card[];
  nextCursor: string | null;
  hasMore: boolean;
}

// カード生成
export const POST = withAuth<Card>(
  async (authUser, req) => {
    const body = await req.json();
    const { articleId, rarity } = createCardSchema.parse(body);

    // レアリティ指定がある場合、開発者権限をチェック
    if (rarity) {
      const user = await prisma.user.findUnique({
        where: { id: authUser.uid },
        select: { isDeveloper: true },
      });

      if (!user?.isDeveloper) {
        throw new ApiError('FORBIDDEN', 'レアリティ指定は開発者のみ利用可能です', 403);
      }
    }

    return createCard({
      userId: authUser.uid,
      articleId,
      specifiedRarity: rarity,
    });
  },
  { rateLimit: 'expensive' }
);

// カード一覧取得
export const GET = withAuth<CardListResponse>(async (authUser, req) => {
  const { searchParams } = new URL(req.url);
  const queryParams = {
    cursor: searchParams.get('cursor') || undefined,
    limit: searchParams.get('limit') || undefined,
    rarity: searchParams.get('rarity') || undefined,
    keyword: searchParams.get('keyword') || undefined,
    sortBy: searchParams.get('sortBy') || undefined,
    sortOrder: searchParams.get('sortOrder') || undefined,
    onlyFavorites: searchParams.get('onlyFavorites') || undefined,
  };

  const { cursor, limit, rarity, keyword, sortBy, sortOrder, onlyFavorites } =
    getCardsQuerySchema.parse(queryParams);

  return getCardsByUser({
    userId: authUser.uid,
    cursor,
    limit,
    rarity,
    keyword,
    sortBy,
    sortOrder,
    onlyFavorites,
  });
});
