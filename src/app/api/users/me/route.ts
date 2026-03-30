import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { updateUserSchema } from '@/lib/validations/user';
import { deleteUser as deleteFirebaseUser } from '@/lib/firebase/admin';
import { batchDeleteCardImages } from '@/lib/gcs/storage';
import { ApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { User } from '@prisma/client';

// ユーザー情報取得
export const GET = withAuth<User>(async (authUser) => {
  const user = await prisma.user.findUnique({
    where: { id: authUser.uid },
  });

  if (!user) {
    throw ApiError.notFound('ユーザーが見つかりません');
  }

  // lastActiveAt を更新（ゲストクリーンアップ用、fire-and-forget）
  try {
    void prisma.user.update({
      where: { id: authUser.uid },
      data: { lastActiveAt: new Date() },
    });
  } catch {
    // 更新失敗は無視
  }

  return user;
});

// ユーザー情報更新
export const PATCH = withAuth<User>(async (authUser, req) => {
  const body = await req.json();
  const { nickname } = updateUserSchema.parse(body);

  // 現在のユーザー確認
  const currentUser = await prisma.user.findUnique({
    where: { id: authUser.uid },
  });

  if (!currentUser) {
    throw ApiError.notFound('ユーザーが見つかりません');
  }

  // ニックネーム重複チェック（自分以外）
  if (nickname && nickname !== currentUser.nickname) {
    const existingNickname = await prisma.user.findUnique({
      where: { nickname },
    });

    if (existingNickname) {
      throw new ApiError('NICKNAME_EXISTS', 'このニックネームは既に使用されています', 409);
    }
  }

  // ユーザー更新
  return prisma.user.update({
    where: { id: authUser.uid },
    data: {
      ...(nickname && { nickname }),
    },
  });
});

// アカウント削除
export const DELETE = withAuth<{ message: string }>(async (authUser) => {
  const user = await prisma.user.findUnique({
    where: { id: authUser.uid },
    include: {
      cards: {
        select: { id: true },
      },
    },
  });

  if (!user) {
    throw ApiError.notFound('ユーザーが見つかりません');
  }

  // カードIDを保存（画像削除用）
  const cardIds = user.cards.map((card) => card.id);

  // トランザクションで削除（関連データも含む）
  await prisma.$transaction(async (tx) => {
    // カードに関連するCoinTransactionを削除
    await tx.coinTransaction.deleteMany({
      where: { userId: user.id },
    });

    // カードを削除
    await tx.card.deleteMany({
      where: { userId: user.id },
    });

    // 記事を削除
    await tx.article.deleteMany({
      where: { userId: user.id },
    });

    // ユーザーを削除
    await tx.user.delete({
      where: { id: user.id },
    });
  });

  // カード画像を一括削除
  if (cardIds.length > 0) {
    try {
      await batchDeleteCardImages(cardIds);
    } catch (error) {
      // 画像削除に失敗してもDBは削除済みなのでログのみ
      logger.error('Failed to delete card images for user', { error });
    }
  }

  // Firebase Authenticationからユーザーを削除
  try {
    await deleteFirebaseUser(authUser.uid);
  } catch (firebaseError) {
    logger.error('Firebase user deletion error', { error: firebaseError });
    // DBからは削除済みなので、Firebase削除失敗はログのみ
  }

  return { message: 'アカウントが削除されました' };
});
