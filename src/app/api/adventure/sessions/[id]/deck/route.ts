import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { sessionIdSchema, setDeckSchema } from '@/lib/validations/adventure';
import { setSessionDeck } from '@/lib/services/adventure-service';
import { handleApiError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// デッキ設定
export async function POST(
  req: NextRequest,
  { params }: RouteParams
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

    const { id } = await params;
    const idValidation = sessionIdSchema.safeParse({ id });

    if (!idValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: idValidation.error.issues[0].message,
          },
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const bodyValidation = setDeckSchema.safeParse(body);

    if (!bodyValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: bodyValidation.error.issues[0].message,
          },
        },
        { status: 400 }
      );
    }

    await setSessionDeck(id, authUser.uid, bodyValidation.data.cardIds);

    return NextResponse.json({
      success: true,
      data: { message: 'デッキを設定しました' },
    });
  } catch (error) {
    console.error('Set deck error:', error);
    return handleApiError(error);
  }
}
