// API テスト用ヘルパー

import { NextRequest } from 'next/server';

// 認証ヘッダー付きのリクエストを作成
// 注意: NextRequestにはプレーンオブジェクトでヘッダーを渡す必要がある（Headers classは動作しない）
export function createAuthenticatedRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
  } = {}
): NextRequest {
  const { method = 'GET', body, token = 'mock-id-token' } = options;

  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
  };

  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

// 認証なしのリクエストを作成
export function createUnauthenticatedRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
  } = {}
): NextRequest {
  const { method = 'GET', body } = options;

  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
  };

  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

// URLパラメータ付きリクエストを作成
export function createRequestWithParams(
  baseUrl: string,
  params: Record<string, string>,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    authenticated?: boolean;
  } = {}
): NextRequest {
  const { authenticated = true } = options;
  const url = new URL(baseUrl, 'http://localhost:3000');

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  if (authenticated) {
    return createAuthenticatedRequest(url.toString(), options);
  }
  return createUnauthenticatedRequest(url.toString(), options);
}

// レスポンスを検証するヘルパー
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function expectSuccessResponse<T = any>(
  response: Response,
  expectedStatus = 200
): Promise<T> {
  expect(response.status).toBe(expectedStatus);
  const data = await response.json();
  expect(data.success).toBe(true);
  expect(data.data).toBeDefined();
  return data.data as T;
}

export async function expectErrorResponse(
  response: Response,
  expectedStatus: number,
  expectedCode?: string
) {
  expect(response.status).toBe(expectedStatus);
  const data = await response.json();
  expect(data.success).toBe(false);
  expect(data.error).toBeDefined();
  if (expectedCode) {
    expect(data.error.code).toBe(expectedCode);
  }
  return data.error as { code: string; message: string };
}

// よく使うエラーコード
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  USER_EXISTS: 'USER_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  NICKNAME_EXISTS: 'NICKNAME_EXISTS',
  ARTICLE_NOT_FOUND: 'ARTICLE_NOT_FOUND',
  CARD_NOT_FOUND: 'CARD_NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
} as const;

// テスト用のダミーデータ生成
export function generateTestId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

// 日付を比較用にISO文字列に変換
export function toISOString(date: Date | string): string {
  if (typeof date === 'string') {
    return new Date(date).toISOString();
  }
  return date.toISOString();
}

// 動的パラメータを持つURLを作成
export function buildUrl(
  path: string,
  params?: Record<string, string>
): string {
  const url = new URL(path, 'http://localhost:3000');
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return url.toString();
}
