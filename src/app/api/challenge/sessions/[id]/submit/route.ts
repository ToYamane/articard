import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { sessionIdSchema, submitCardsSchema } from '@/lib/validations/challenge';
import { submitPhaseCards } from '@/lib/services/challenge-service';
import { handleApiError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface SubmitResult {
  phaseNumber: number;
  challenge: string;
  selectedCards: Array<{
    id: string;
    keyword: string;
    rarity: string;
  }>;
  evaluation: {
    fitScore: number;
    bonusScore: number;
    totalScore: number;
    connectionExplanation: string;
    narrativeDescription: string;
    humorComment: string;
  };
  sessionTotalScore: number;
  isComplete: boolean;
  summary?: string;
}

// カード提出
export async function POST(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<SubmitResult>>> {
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
    const bodyValidation = submitCardsSchema.safeParse(body);

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

    const result = await submitPhaseCards(id, authUser.uid, bodyValidation.data.cardIds);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Submit cards error:', error);
    return handleApiError(error);
  }
}
