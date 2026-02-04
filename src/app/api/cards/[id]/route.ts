import { NextRequest } from 'next/server';
import { withAuthParams } from '@/lib/api';
import { cardIdSchema } from '@/lib/validations/card';
import { getCardById, deleteCard, type CardWithArticle } from '@/lib/services/card-service';
import { ApiError } from '@/lib/errors';

// カード取得
export const GET = withAuthParams<CardWithArticle>(async (authUser, req, params) => {
  const { id } = cardIdSchema.parse({ id: params.id });

  const card = await getCardById(id, authUser.uid);

  if (!card) {
    throw new ApiError('NOT_FOUND', 'カードが見つかりません', 404);
  }

  return card;
});

// カード削除
export const DELETE = withAuthParams<{ message: string }>(async (authUser, req, params) => {
  const { id } = cardIdSchema.parse({ id: params.id });

  const deleted = await deleteCard(id, authUser.uid);

  if (!deleted) {
    throw new ApiError('NOT_FOUND', 'カードが見つかりません', 404);
  }

  return { message: 'カードが削除されました' };
});
