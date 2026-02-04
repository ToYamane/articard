import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, type AuthUser } from '@/lib/auth';
import { handleApiError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

/**
 * Next.js App Router の動的ルート用のコンテキスト型
 */
export interface RouteContext<T extends Record<string, string> = Record<string, string>> {
  params: Promise<T>;
}

/**
 * 認証必須のAPIルートをラップするヘルパー
 * 認証チェックとエラーハンドリングを共通化
 */
export function withAuth<T>(
  handler: (authUser: AuthUser, req: NextRequest) => Promise<T>
) {
  return async (req: NextRequest): Promise<NextResponse<ApiResponse<T>>> => {
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

      const result = await handler(authUser, req);
      return successResponse(result);
    } catch (error) {
      return handleApiError(error) as NextResponse<ApiResponse<T>>;
    }
  };
}

/**
 * 認証必須の動的ルート（パスパラメーター付き）用ヘルパー
 */
export function withAuthParams<T, P extends Record<string, string> = { id: string }>(
  handler: (authUser: AuthUser, req: NextRequest, params: P) => Promise<T>
) {
  return async (
    req: NextRequest,
    context: RouteContext<P>
  ): Promise<NextResponse<ApiResponse<T>>> => {
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
      const result = await handler(authUser, req, params);
      return successResponse(result);
    } catch (error) {
      return handleApiError(error) as NextResponse<ApiResponse<T>>;
    }
  };
}

/**
 * オプショナル認証のAPIルートをラップするヘルパー
 * 認証なしでもアクセス可能だが、認証情報があれば利用可能
 */
export function withOptionalAuth<T>(
  handler: (authUser: AuthUser | null, req: NextRequest) => Promise<T>
) {
  return async (req: NextRequest): Promise<NextResponse<ApiResponse<T>>> => {
    try {
      const authUser = await verifyAuth(req);
      const result = await handler(authUser, req);
      return successResponse(result);
    } catch (error) {
      return handleApiError(error) as NextResponse<ApiResponse<T>>;
    }
  };
}

/**
 * 認証ユーザーの型をエクスポート（利便性のため）
 */
export type { AuthUser };
