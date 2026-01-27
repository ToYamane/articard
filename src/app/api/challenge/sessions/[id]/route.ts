import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { sessionIdSchema } from '@/lib/validations/challenge';
import {
  getSessionById,
  abandonSession,
  type SessionDetails,
} from '@/lib/services/challenge-service';
import { handleApiError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// セッション詳細取得
export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<SessionDetails>>> {
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
    const validationResult = sessionIdSchema.safeParse({ id });

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

    const session = await getSessionById(id, authUser.uid);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'セッションが見つかりません',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Get session error:', error);
    return handleApiError(error);
  }
}

// セッション中断
export async function DELETE(
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
    const validationResult = sessionIdSchema.safeParse({ id });

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

    await abandonSession(id, authUser.uid);

    return NextResponse.json({
      success: true,
      data: { message: 'セッションを中断しました' },
    });
  } catch (error) {
    console.error('Abandon session error:', error);
    return handleApiError(error);
  }
}
