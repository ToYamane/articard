import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyIdToken } from '@/lib/firebase/admin';
import { registerUserSchema } from '@/lib/validations/user';
import type { ApiResponse } from '@/types/api';
import type { User } from '@prisma/client';

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<User>>> {
  try {
    // IDトークンを検証
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '認証が必要です',
          },
        },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const decodedToken = await verifyIdToken(token);

    // リクエストボディをパース
    const body = await req.json();
    const validationResult = registerUserSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validationResult.error.issues[0].message,
          },
        },
        { status: 400 }
      );
    }

    const { nickname } = validationResult.data;

    // 既存ユーザーチェック (idはFirebase UIDを使用)
    const existingUser = await prisma.user.findUnique({
      where: { id: decodedToken.uid },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'ユーザーは既に登録されています',
          },
        },
        { status: 409 }
      );
    }

    // ニックネーム重複チェック
    const existingNickname = await prisma.user.findUnique({
      where: { nickname },
    });

    if (existingNickname) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NICKNAME_EXISTS',
            message: 'このニックネームは既に使用されています',
          },
        },
        { status: 409 }
      );
    }

    // ユーザー作成 (idにFirebase UIDを使用)
    const user = await prisma.user.create({
      data: {
        id: decodedToken.uid,
        nickname,
      },
    });

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Register error:', error);

    if (error instanceof Error && error.message.includes('Firebase')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_ERROR',
            message: '認証エラーが発生しました',
          },
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      },
      { status: 500 }
    );
  }
}
