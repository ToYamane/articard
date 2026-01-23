import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { articleIdSchema } from '@/lib/validations/article';
import { getArticleById, deleteArticle } from '@/lib/services/article-service';
import { handleApiError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { Article } from '@prisma/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// 記事取得
export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<Article>>> {
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

    const params = await context.params;
    const validationResult = articleIdSchema.safeParse({ id: params.id });

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

    const article = await getArticleById(validationResult.data.id, authUser.uid);

    if (!article) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '記事が見つかりません',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error('Get article error:', error);
    return handleApiError(error);
  }
}

// 記事削除
export async function DELETE(
  req: NextRequest,
  context: RouteContext
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

    const params = await context.params;
    const validationResult = articleIdSchema.safeParse({ id: params.id });

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

    const deleted = await deleteArticle(validationResult.data.id, authUser.uid);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '記事が見つかりません',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: '記事が削除されました' },
    });
  } catch (error) {
    console.error('Delete article error:', error);
    return handleApiError(error);
  }
}
