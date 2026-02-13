import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, type AuthUser } from '@/lib/auth';
import { handleApiError, successResponse } from '@/lib/errors';
import { createRequestLogger } from '@/lib/logger';
import type { ApiResponse } from '@/types/api';

/**
 * Next.js App Router の動的ルート用のコンテキスト型
 */
export interface RouteContext<T extends Record<string, string> = Record<string, string>> {
  params: Promise<T>;
}

/**
 * withAuth オプション
 */
export interface WithAuthOptions {
  rateLimit?: string;
}

/**
 * 認証必須のAPIルートをラップするヘルパー
 * 認証チェックとエラーハンドリングを共通化
 *
 * ハンドラがNextResponseを返した場合はそのまま返す（バリデーションエラー等）
 */
export function withAuth<T>(
  handler: (authUser: AuthUser, req: NextRequest) => Promise<T | NextResponse>,
  options?: WithAuthOptions
) {
  return async (req: NextRequest): Promise<NextResponse<ApiResponse<T>>> => {
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
    const log = createRequestLogger(requestId, req.nextUrl.pathname);

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

      // レート制限チェック（Step 2 で実装）
      if (options?.rateLimit) {
        const { checkRateLimit } = await import('@/lib/rate-limit');
        const rateLimitResult = await checkRateLimit(authUser.uid, options.rateLimit);
        if (!rateLimitResult.success) {
          log.warn('Rate limit exceeded', { userId: authUser.uid, tier: options.rateLimit });
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: '利用制限に達しました。しばらくしてからお試しください',
              },
            },
            {
              status: 429,
              headers: {
                'Retry-After': String(rateLimitResult.retryAfter ?? 60),
              },
            }
          );
        }
      }

      const result = await handler(authUser, req);

      // NextResponseの場合はそのまま返す（バリデーションエラー等）
      if (result instanceof NextResponse) {
        return result as NextResponse<ApiResponse<T>>;
      }

      return successResponse(result);
    } catch (error) {
      log.error('API Error', { error, path: req.nextUrl.pathname });
      return handleApiError(error) as NextResponse<ApiResponse<T>>;
    }
  };
}

/**
 * 認証必須の動的ルート（パスパラメーター付き）用ヘルパー
 *
 * ハンドラがNextResponseを返した場合はそのまま返す（バリデーションエラー等）
 */
export function withAuthParams<T, P extends Record<string, string> = { id: string }>(
  handler: (authUser: AuthUser, req: NextRequest, params: P) => Promise<T | NextResponse>,
  options?: WithAuthOptions
) {
  return async (
    req: NextRequest,
    context: RouteContext<P>
  ): Promise<NextResponse<ApiResponse<T>>> => {
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
    const log = createRequestLogger(requestId, req.nextUrl.pathname);

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

      // レート制限チェック（Step 2 で実装）
      if (options?.rateLimit) {
        const { checkRateLimit } = await import('@/lib/rate-limit');
        const rateLimitResult = await checkRateLimit(authUser.uid, options.rateLimit);
        if (!rateLimitResult.success) {
          log.warn('Rate limit exceeded', { userId: authUser.uid, tier: options.rateLimit });
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: '利用制限に達しました。しばらくしてからお試しください',
              },
            },
            {
              status: 429,
              headers: {
                'Retry-After': String(rateLimitResult.retryAfter ?? 60),
              },
            }
          );
        }
      }

      const params = await context.params;
      const result = await handler(authUser, req, params);

      // NextResponseの場合はそのまま返す（バリデーションエラー等）
      if (result instanceof NextResponse) {
        return result as NextResponse<ApiResponse<T>>;
      }

      return successResponse(result);
    } catch (error) {
      log.error('API Error', { error, path: req.nextUrl.pathname });
      return handleApiError(error) as NextResponse<ApiResponse<T>>;
    }
  };
}

/**
 * オプショナル認証のAPIルートをラップするヘルパー
 * 認証なしでもアクセス可能だが、認証情報があれば利用可能
 *
 * ハンドラがNextResponseを返した場合はそのまま返す（バリデーションエラー等）
 */
export function withOptionalAuth<T>(
  handler: (authUser: AuthUser | null, req: NextRequest) => Promise<T | NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse<ApiResponse<T>>> => {
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
    const log = createRequestLogger(requestId, req.nextUrl.pathname);

    try {
      const authUser = await verifyAuth(req);
      const result = await handler(authUser, req);

      // NextResponseの場合はそのまま返す（バリデーションエラー等）
      if (result instanceof NextResponse) {
        return result as NextResponse<ApiResponse<T>>;
      }

      return successResponse(result);
    } catch (error) {
      log.error('API Error', { error, path: req.nextUrl.pathname });
      return handleApiError(error) as NextResponse<ApiResponse<T>>;
    }
  };
}

/**
 * 認証ユーザーの型をエクスポート（利便性のため）
 */
export type { AuthUser };
