import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, type AuthUser } from '@/lib/api/with-auth';
import type { User } from '@prisma/client';

export const POST = withAuth<User>(async (authUser: AuthUser) => {
  // 既存ユーザーチェック
  const existingUser = await prisma.user.findUnique({
    where: { id: authUser.uid },
  });

  if (existingUser) {
    return existingUser;
  }

  // ゲストユーザー作成（ウェルカムボーナスなし）
  const nickname = `ゲスト_${authUser.uid.slice(-8)}`;

  // ニックネーム衝突時のリトライ
  let finalNickname = nickname;
  for (let i = 0; i < 3; i++) {
    const exists = await prisma.user.findUnique({
      where: { nickname: finalNickname },
    });
    if (!exists) break;
    finalNickname = `ゲスト_${authUser.uid.slice(-(8 + i + 1))}`;
  }

  const user = await prisma.user.create({
    data: {
      id: authUser.uid,
      nickname: finalNickname,
      isGuest: true,
      coinBalance: 0,
      dailyFreeCoins: 90,
    },
  });

  return user;
});
