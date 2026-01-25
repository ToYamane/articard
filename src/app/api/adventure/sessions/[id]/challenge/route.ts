import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { sessionIdSchema } from '@/lib/validations/adventure';
import { getCurrentPhaseChallenge } from '@/lib/services/adventure-service';
import { handleApiError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { PhaseChallenge, PhaseDefinition } from '@/types/adventure';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ChallengeResponse {
  challenge: PhaseChallenge;
  phaseDefinition: PhaseDefinition;
  availableCards: Array<{
    id: string;
    keyword: string;
    rarity: string;
    thumbnailUrl: string;
    cardImageUrl: string;
    flavorText: string;
    contextDescription: string;
  }>;
  totalPhases: number;
}

// 現在のフェーズチャレンジ取得
export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<ChallengeResponse>>> {
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

    const result = await getCurrentPhaseChallenge(id, authUser.uid);

    return NextResponse.json({
      success: true,
      data: result as ChallengeResponse,
    });
  } catch (error) {
    console.error('Get challenge error:', error);
    return handleApiError(error);
  }
}
