import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ApiError } from './api-error';
import type { ApiResponse, ErrorResponse } from '@/types/api';

/**
 * エラーをAPIレスポンスに変換
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  console.error('API Error:', error);

  // ApiError の場合
  if (error instanceof ApiError) {
    const errorObj: { code: string; message: string; details?: unknown } = {
      code: error.code,
      message: error.message,
    };
    if (error.details !== undefined) {
      errorObj.details = error.details;
    }
    return NextResponse.json(
      {
        success: false,
        error: errorObj,
      },
      { status: error.statusCode }
    );
  }

  // Zod バリデーションエラーの場合
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.issues[0]?.message || 'バリデーションエラー',
          details: error.issues,
        },
      },
      { status: 400 }
    );
  }

  // 通常の Error の場合
  if (error instanceof Error) {
    // 特定のエラーメッセージをパターンマッチ
    const errorMessage = error.message;

    if (errorMessage.includes('認証') || errorMessage.includes('auth')) {
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

    if (errorMessage.includes('見つかりません') || errorMessage.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: errorMessage,
          },
        },
        { status: 404 }
      );
    }

    if (errorMessage.includes('生成できません') || errorMessage.includes('キーワード')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_AVAILABLE_KEYWORD',
            message: errorMessage,
          },
        },
        { status: 400 }
      );
    }
  }

  // デフォルトのサーバーエラー
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバーエラーが発生しました',
      },
    },
    { status: 500 }
  );
}

/**
 * 成功レスポンスを生成
 */
export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * API route をラップするヘルパー
 */
export function withErrorHandler<T>(
  handler: () => Promise<NextResponse<ApiResponse<T>>>
): Promise<NextResponse<ApiResponse<T>>> {
  return handler().catch((error) => handleApiError(error) as NextResponse<ApiResponse<T>>);
}
