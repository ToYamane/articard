import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ApiError } from './api-error';
import { logger } from '@/lib/logger';
import type { ApiResponse, ErrorResponse } from '@/types/api';

/**
 * エラーをAPIレスポンスに変換
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  logger.error('API Error', { error });

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
