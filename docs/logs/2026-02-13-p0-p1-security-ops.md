# 2026-02-13 P0/P1 セキュリティ・運用品質改善

## 概要

本番運用に向けた P0（セキュリティ）+ P1（運用品質）の改善を実施。
構造化ログ、レート制限、Webhook 冪等性、チャレンジセッション有効期限の 4 つの柱で対応。

## 変更内容

### Step 1: 構造化ログ + Middleware

**背景**: `console.log` 散在によりログの検索・フィルタリングが困難だった。

**対応**:
- `src/lib/logger.ts`: Cloud Logging 互換の構造化ロガー
  - severity フィールド付き JSON 出力（本番）/ 人間可読形式（開発）
  - `createLogger()`, `createRequestLogger()` でコンテキスト付きログ生成
- `src/middleware.ts`: Next.js Middleware 新規作成
  - リクエスト ID 生成（`x-request-id` ヘッダー伝搬）
  - セキュリティヘッダー: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `HSTS`, `Permissions-Policy`, `CSP`
- `next.config.mjs`: セキュリティヘッダー設定を Middleware に移動（重複排除）

### Step 2: レート制限（Upstash Redis）

**背景**: API エンドポイントにレート制限がなく、不正利用リスクがあった。

**対応**:
- `src/lib/rate-limit/`: レート制限モジュール新規作成
  - `types.ts`: `RateLimitTier` (`expensive` | `standard` | `lenient`), `RateLimitResult` 型定義
  - `config.ts`: ティア別設定（expensive: 5/分, standard: 30/分, lenient: 60/分）
  - `rate-limiter.ts`: Upstash Redis ベースの Sliding Window 実装
  - `index.ts`: 公開エクスポート
  - Fail-open 設計: Redis 未設定/障害時はリクエスト許可
- `src/lib/api/with-auth.ts`: `withAuth`/`withAuthParams` にオプション `rateLimit` パラメータ追加
- API ルート適用:
  - `src/app/api/articles/route.ts`: `expensive`（AI 記事生成）
  - `src/app/api/cards/route.ts`: `expensive`（AI カード生成）
  - `src/app/api/challenge/sessions/route.ts`: `standard`（セッション開始）
  - `src/app/api/challenge/sessions/[id]/submit/route.ts`: `standard`（回答提出）
- `package.json`: `@upstash/ratelimit`, `@upstash/redis` 追加

### Step 3: Webhook 冪等性

**背景**: Stripe Webhook のリトライで同一イベントが複数回処理される可能性があった。

**対応**:
- `prisma/schema.prisma`: `StripeWebhookEvent` モデル追加
  - `eventId` (unique): Stripe イベント ID
  - `eventType`: イベント種別
  - `processedAt`: 処理日時（TTL クリーンアップ用インデックス）
- `src/app/api/stripe/webhook/route.ts`:
  - イベント処理前に `StripeWebhookEvent` を upsert（重複検知）
  - 既に処理済みの場合は 200 を返してスキップ
- `src/lib/services/webhook-cleanup-service.ts`: 7 日以上前のレコードを削除するクリーンアップ関数

### Step 4: チャレンジセッション有効期限

**背景**: 放置されたセッションが無期限に残り続ける問題があった。

**対応**:
- `src/lib/constants/challenge.ts`: `SESSION_EXPIRATION_MS`（24 時間）定数
- `src/lib/services/challenge-service.ts`:
  - `getActiveSession()`: 期限切れセッションを `expired` ステータスに自動更新（lazy expiration）
  - `startSession()`: 既存の期限切れセッションを expire してから新規作成
  - `submitAnswer()`: 期限切れチェック追加

## 変更ファイル一覧

### 新規ファイル（11）
| ファイル | 内容 |
|---------|------|
| `src/lib/logger.ts` | 構造化ロガー |
| `src/middleware.ts` | リクエスト ID・セキュリティヘッダー |
| `src/lib/rate-limit/types.ts` | レート制限型定義 |
| `src/lib/rate-limit/config.ts` | ティア別設定 |
| `src/lib/rate-limit/rate-limiter.ts` | Upstash Redis レート制限 |
| `src/lib/rate-limit/index.ts` | エクスポート |
| `src/lib/constants/challenge.ts` | セッション有効期限定数 |
| `src/lib/services/webhook-cleanup-service.ts` | Webhook レコードクリーンアップ |
| `__tests__/lib/logger.test.ts` | ロガーテスト |
| `__tests__/lib/rate-limit/` | レート制限テスト |
| `docs/logs/2026-02-13-p0-p1-security-ops.md` | 本ログ |

### 変更ファイル（13）
| ファイル | 変更内容 |
|---------|---------|
| `next.config.mjs` | セキュリティヘッダーを Middleware に移動 |
| `package.json` | `@upstash/ratelimit`, `@upstash/redis` 追加 |
| `package-lock.json` | ロックファイル更新 |
| `prisma/schema.prisma` | `StripeWebhookEvent` モデル追加 |
| `src/lib/api/with-auth.ts` | レート制限オプション統合 |
| `src/app/api/articles/route.ts` | `rateLimit: 'expensive'` 適用 |
| `src/app/api/cards/route.ts` | `rateLimit: 'expensive'` 適用 |
| `src/app/api/challenge/sessions/route.ts` | `rateLimit: 'standard'` 適用 |
| `src/app/api/challenge/sessions/[id]/submit/route.ts` | `rateLimit: 'standard'` 適用 |
| `src/app/api/stripe/webhook/route.ts` | 冪等性チェック追加 |
| `src/lib/services/challenge-service.ts` | セッション有効期限ロジック追加 |
| `__tests__/app/api/stripe/webhook/route.test.ts` | 冪等性テスト追加 |
| `__tests__/lib/services/challenge-service.test.ts` | 有効期限テスト更新 |

## テスト

- ロガーテスト: 各レベル出力・コンテキスト付与・エラーシリアライズ
- レート制限テスト: Upstash 未設定時の fail-open、制限超過時の 429 応答
- Webhook 冪等性テスト: 重複イベントスキップ、新規イベント処理
- チャレンジセッションテスト: 期限切れセッションの自動 expire

## デプロイ時の残タスク

1. **DB マイグレーション**: `npx prisma db push` で `stripe_webhook_events` テーブル作成
2. **環境変数**: Upstash Redis 接続情報を設定
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. **Webhook クリーンアップ**: Cloud Scheduler 等で `cleanupOldWebhookEvents()` を定期実行（推奨: 日次）
