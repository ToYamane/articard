import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { cardIdSchema } from '@/lib/validations/card';
import { getCardById, deleteCard } from '@/lib/services/card-service';
import { handleApiError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { Card } from '@prisma/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// カード取得
export async function GET(
  req: NextRequest,
  context: RouteContext
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

    const params = await context.params;
    const validationResult = cardIdSchema.safeParse({ id: params.id });

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

    const card = await getCardById(validationResult.data.id, authUser.uid);

    if (!card) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'カードが見つかりません',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: card,
    });
  } catch (error) {
    console.error('Get card error:', error);
    return handleApiError(error);
  }
}

// カード削除
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
    const validationResult = cardIdSchema.safeParse({ id: params.id });

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

    const deleted = await deleteCard(validationResult.data.id, authUser.uid);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'カードが見つかりません',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'カードが削除されました' },
    });
  } catch (error) {
    console.error('Delete card error:', error);
    return handleApiError(error);
  }
}
