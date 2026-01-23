import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createCardSchema, getCardsQuerySchema } from '@/lib/validations/card';
import { createCard, getCardsByUser } from '@/lib/services/card-service';
import { handleApiError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { Card } from '@prisma/client';

interface CardListResponse {
  cards: Card[];
  nextCursor: string | null;
  hasMore: boolean;
}

// カード生成
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<Card>>> {
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
    const validationResult = createCardSchema.safeParse(body);

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

    const { articleId } = validationResult.data;

    const card = await createCard({
      userId: authUser.uid,
      articleId,
    });

    return NextResponse.json({
      success: true,
      data: card,
    });
  } catch (error) {
    console.error('Create card error:', error);
    return handleApiError(error);
  }
}

// カード一覧取得
export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<CardListResponse>>> {
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
      rarity: searchParams.get('rarity') || undefined,
    };

    const validationResult = getCardsQuerySchema.safeParse(queryParams);

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

    const result = await getCardsByUser({
      userId: authUser.uid,
      cursor: validationResult.data.cursor,
      limit: validationResult.data.limit,
      rarity: validationResult.data.rarity,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get cards error:', error);
    return handleApiError(error);
  }
}
