import { NextRequest, NextResponse } from 'next/server';
import { getSuggestedThemesQuerySchema } from '@/lib/validations/suggested-theme';
import { getRandomSuggestedThemes } from '@/lib/services/suggested-theme-service';
import { handleApiError } from '@/lib/errors';
import { createRequestLogger } from '@/lib/logger';
import type { ApiResponse } from '@/types/api';

interface SuggestedThemesResponse {
  themes: { id: string; theme: string }[];
}

// おすすめテーマ取得（認証不要）
export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<SuggestedThemesResponse>>> {
  try {
    const { searchParams } = new URL(req.url);
    const queryParams = {
      count: searchParams.get('count') || undefined,
    };

    const validationResult = getSuggestedThemesQuerySchema.safeParse(queryParams);

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

    const themes = await getRandomSuggestedThemes(validationResult.data.count);

    return NextResponse.json({
      success: true,
      data: { themes },
    });
  } catch (error) {
    const requestId = req.headers.get('x-request-id') || '';
    const log = createRequestLogger(requestId, '/api/suggested-themes');
    log.error('Get suggested themes error', { error });
    return handleApiError(error);
  }
}
