import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Middleware
 * - リクエスト ID 生成
 * - セキュリティヘッダー
 */
const isDev = process.env.NODE_ENV === 'development';
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://js.stripe.com"
  : "script-src 'self' 'unsafe-inline' https://apis.google.com https://js.stripe.com";

export function middleware(req: NextRequest) {
  // リクエスト ID: 既存ヘッダーがあればそのまま使用
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  // レスポンスヘッダー設定
  const response = NextResponse.next({
    request: {
      headers: new Headers(req.headers),
    },
  });

  // リクエスト ID を伝搬
  response.headers.set('x-request-id', requestId);

  // リクエストヘッダーにも設定（API ルートで参照可能に）
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-request-id', requestId);

  const nextResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // セキュリティヘッダー
  nextResponse.headers.set('x-request-id', requestId);
  nextResponse.headers.set('X-Frame-Options', 'DENY');
  nextResponse.headers.set('X-Content-Type-Options', 'nosniff');
  nextResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  nextResponse.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  nextResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  nextResponse.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://storage.googleapis.com https://*.stripe.com",
      "font-src 'self'",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com https://api.stripe.com https://firebaseinstallations.googleapis.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
      'frame-src https://js.stripe.com https://*.firebaseapp.com',
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ')
  );

  return nextResponse;
}

export const config = {
  matcher: [
    /*
     * _next/static, _next/image, favicon 等を除外
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
