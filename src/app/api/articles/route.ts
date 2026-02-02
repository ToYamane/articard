import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createArticleSchema, getArticlesQuerySchema } from '@/lib/validations/article';
import { createArticle, getArticlesByUser } from '@/lib/services/article-service';
import { handleApiError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { Article } from '@prisma/client';

interface ArticleListResponse {
  articles: Article[];
  nextCursor: string | null;
  hasMore: boolean;
}

// 記事生成
export async function POST(
  req: NextRequest
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

    const body = await req.json();
    const validationResult = createArticleSchema.safeParse(body);

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

    const { theme, contentType } = validationResult.data;

    const article = await createArticle({
      userId: authUser.uid,
      theme,
      contentType,
    });

    return NextResponse.json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error('Create article error:', error);
    return handleApiError(error);
  }
}

// 記事一覧取得
export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<ArticleListResponse>>> {
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

    const { searchParams } = new URL(req.url);
    const queryParams = {
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.get('limit') || undefined,
    };

    const validationResult = getArticlesQuerySchema.safeParse(queryParams);

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

    const result = await getArticlesByUser({
      userId: authUser.uid,
      cursor: validationResult.data.cursor,
      limit: validationResult.data.limit,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get articles error:', error);
    return handleApiError(error);
  }
}
