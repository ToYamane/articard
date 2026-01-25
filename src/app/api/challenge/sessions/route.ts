import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  createSessionSchema,
  getSessionsQuerySchema,
} from '@/lib/validations/challenge';
import {
  createSession,
  getUserSessions,
} from '@/lib/services/challenge-service';
import { handleApiError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { ChallengeSessionStatus } from '@/types/challenge';

// セッション作成
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{
  id: string;
  scenarioId: string;
  status: ChallengeSessionStatus;
}>>> {
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
    const validationResult = createSessionSchema.safeParse(body);

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

    const { scenarioId } = validationResult.data;

    const session = await createSession(authUser.uid, scenarioId);

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Create session error:', error);
    return handleApiError(error);
  }
}

// セッション一覧取得
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<{
  sessions: Array<{
    id: string;
    scenarioId: string;
    status: ChallengeSessionStatus;
    currentPhase: number;
    totalScore: number;
    startedAt: Date;
    completedAt: Date | null;
  }>;
}>>> {
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
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') || undefined,
    };

    const validationResult = getSessionsQuerySchema.safeParse(queryParams);

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

    const sessions = await getUserSessions(
      authUser.uid,
      validationResult.data.status,
      validationResult.data.limit
    );

    return NextResponse.json({
      success: true,
      data: { sessions },
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return handleApiError(error);
  }
}
