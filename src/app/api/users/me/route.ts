import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { updateUserSchema } from '@/lib/validations/user';
import { deleteUser as deleteFirebaseUser } from '@/lib/firebase/admin';
import { batchDeleteCardImages } from '@/lib/gcs/storage';
import type { ApiResponse } from '@/types/api';
import type { User } from '@prisma/client';

// ユーザー情報取得
export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<User>>> {
  try {
    const authUser = await verifyAuth(req);
    if (!authUser) {
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

    const user = await prisma.user.findUnique({
      where: { id: authUser.uid },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'ユーザーが見つかりません',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get user error:', error);
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

// ユーザー情報更新
export async function PATCH(
  req: NextRequest
): Promise<NextResponse<ApiResponse<User>>> {
  try {
    const authUser = await verifyAuth(req);
    if (!authUser) {
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

    const body = await req.json();
    const validationResult = updateUserSchema.safeParse(body);

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

    // 現在のユーザー確認
    const currentUser = await prisma.user.findUnique({
      where: { id: authUser.uid },
    });

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'ユーザーが見つかりません',
          },
        },
        { status: 404 }
      );
    }

    // ニックネーム重複チェック（自分以外）
    if (nickname && nickname !== currentUser.nickname) {
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
    }

    // ユーザー更新
    const updatedUser = await prisma.user.update({
      where: { id: authUser.uid },
      data: {
        ...(nickname && { nickname }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update user error:', error);
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

// アカウント削除
export async function DELETE(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ message: string }>>> {
  try {
    const authUser = await verifyAuth(req);
    if (!authUser) {
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

    const user = await prisma.user.findUnique({
      where: { id: authUser.uid },
      include: {
        cards: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'ユーザーが見つかりません',
          },
        },
        { status: 404 }
      );
    }

    // カードIDを保存（画像削除用）
    const cardIds = user.cards.map((card) => card.id);

    // トランザクションで削除（関連データも含む）
    await prisma.$transaction(async (tx) => {
      // カードに関連するKnowledgeTransactionを削除
      await tx.knowledgeTransaction.deleteMany({
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
        console.error('Failed to delete card images for user:', error);
      }
    }

    // Firebase Authenticationからユーザーを削除
    try {
      await deleteFirebaseUser(authUser.uid);
    } catch (firebaseError) {
      console.error('Firebase user deletion error:', firebaseError);
      // DBからは削除済みなので、Firebase削除失敗はログのみ
    }

    return NextResponse.json({
      success: true,
      data: { message: 'アカウントが削除されました' },
    });
  } catch (error) {
    console.error('Delete user error:', error);
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
