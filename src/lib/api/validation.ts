import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import type { ApiResponse } from '@/types/api';

/**
 * バリデーションエラーレスポンスを生成
 */
export function validationErrorResponse(error: ZodError): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.issues[0]?.message || 'バリデーションエラー',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    },
    { status: 400 }
  );
}

/**
 * リクエストボディをパースしてバリデーション
 * 成功時はパース結果を返し、失敗時は null と エラーレスポンスを返す
 */
export async function parseBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse<ApiResponse<never>> }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        data: null,
        error: validationErrorResponse(result.error),
      };
    }

    return { data: result.data, error: null };
  } catch {
    return {
      data: null,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'リクエストボディのパースに失敗しました',
          },
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * クエリパラメーターをパースしてバリデーション
 */
export function parseQuery<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): { data: T; error: null } | { data: null; error: NextResponse<ApiResponse<never>> } {
  const { searchParams } = new URL(req.url);
  const queryParams: Record<string, string | undefined> = {};

  searchParams.forEach((value, key) => {
    queryParams[key] = value || undefined;
  });

  const result = schema.safeParse(queryParams);

  if (!result.success) {
    return {
      data: null,
      error: validationErrorResponse(result.error),
    };
  }

  return { data: result.data, error: null };
}

/**
 * パスパラメーターを取得するユーティリティ
 * Next.js 14 では params は Promise なので await が必要
 */
export async function getPathParam(
  params: Promise<{ [key: string]: string }>,
  key: string
): Promise<string | undefined> {
  const resolvedParams = await params;
  return resolvedParams[key];
}
