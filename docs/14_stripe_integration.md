# 14. Stripe決済連携

## 14.1 概要

Stripeを使用したサブスクリプション決済システム。ユーザーはStripe Checkoutを通じてプラン（プラス/プレミアム）に加入できる。

### 技術スタック

- **stripe**: サーバーサイドSDK（v20.x）
- **@stripe/stripe-js**: クライアントサイドSDK（v8.x）
- **Stripe Checkout**: ホスト型決済ページ
- **Stripe Webhooks**: イベント通知

## 14.2 アーキテクチャ

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Next.js    │────▶│   Stripe    │
│  (Browser)  │     │    API      │     │    API      │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   ▲                   │
       │                   │                   │
       ▼                   │                   ▼
┌─────────────┐            │           ┌─────────────┐
│   Stripe    │────────────┘           │   Stripe    │
│  Checkout   │◀───────────────────────│   Webhook   │
└─────────────┘                        └─────────────┘
```

### フロー

1. ユーザーが設定ページで「プラスに加入」をクリック
2. `/api/stripe/checkout` でCheckout Sessionを作成
3. Stripe Checkoutページにリダイレクト
4. ユーザーが決済情報を入力・完了
5. `/settings?subscription=success` にリダイレクト
6. Stripeが `/api/stripe/webhook` にイベント送信
7. Webhookハンドラがサブスクリプションを有効化

## 14.3 環境変数

```env
# Stripe APIキー
STRIPE_SECRET_KEY=sk_test_xxxxx          # サーバー用シークレットキー
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx  # クライアント用公開キー
STRIPE_WEBHOOK_SECRET=whsec_xxxxx        # Webhookシークレット

# Stripe Price ID（Stripeダッシュボードで作成）
STRIPE_PRICE_PLUS=price_xxxxx            # プラスプラン (¥980/月)
STRIPE_PRICE_PREMIUM=price_xxxxx         # プレミアムプラン (¥2,980/月)

# アプリURL（Checkoutからのリダイレクト先）
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 14.4 データベース設計

### Userテーブル拡張

```prisma
model User {
  // ... 既存フィールド
  stripeCustomerId     String? @unique @map("stripe_customer_id")
  stripeSubscriptionId String? @unique @map("stripe_subscription_id")
}
```

| フィールド | 説明 |
|-----------|------|
| stripeCustomerId | StripeのCustomer ID（`cus_xxx`） |
| stripeSubscriptionId | StripeのSubscription ID（`sub_xxx`） |

## 14.5 API設計

### POST /api/stripe/checkout

Stripe Checkout Sessionを作成し、決済ページURLを返す。

**リクエスト**
```json
{
  "tier": "plus" | "premium"
}
```

**レスポンス**
```json
{
  "success": true,
  "data": {
    "sessionId": "cs_test_xxxxx",
    "url": "https://checkout.stripe.com/..."
  }
}
```

### POST /api/stripe/webhook

Stripeからのイベント通知を処理する。

**処理するイベント**

| イベント | 処理内容 |
|----------|----------|
| `checkout.session.completed` | サブスク有効化、ボーナスコイン付与 |
| `customer.subscription.updated` | プラン変更の反映 |
| `customer.subscription.deleted` | サブスク解約処理 |
| `invoice.payment_failed` | 支払い失敗のログ記録 |

## 14.6 ファイル構成

```
src/
├── lib/stripe/
│   ├── index.ts          # Stripeサーバー設定
│   └── client.ts         # Stripeクライアント設定
├── app/api/stripe/
│   ├── checkout/route.ts # Checkout Session API
│   └── webhook/route.ts  # Webhook処理API
└── hooks/
    └── use-subscription.ts  # startSubscriptionCheckout追加
```

## 14.7 ローカル開発

### Stripe CLIのセットアップ

```bash
# インストール（Windows - Scoop）
scoop install stripe

# または公式サイトからダウンロード
# https://stripe.com/docs/stripe-cli

# Stripeにログイン
stripe login

# Webhookをローカルに転送
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

`stripe listen` を実行すると `whsec_...` が表示されるので、`.env` の `STRIPE_WEBHOOK_SECRET` に設定する。

### テスト用カード番号

| カード番号 | 結果 |
|-----------|------|
| `4242 4242 4242 4242` | 成功 |
| `4000 0000 0000 0002` | 拒否 |
| `4000 0000 0000 3220` | 3Dセキュア認証 |

有効期限: 未来の任意の日付、CVC: 任意の3桁

## 14.8 本番環境への移行

### 1. Stripeダッシュボードで本番モードに切り替え

- 右上のトグルで「本番環境」に切り替え
- 本番用の商品・価格を作成
- 本番用APIキーを取得

### 2. 環境変数を本番用に更新

```env
STRIPE_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_PRICE_PLUS=price_xxxxx  # 本番用Price ID
STRIPE_PRICE_PREMIUM=price_xxxxx
```

### 3. Webhookエンドポイントを登録

Stripeダッシュボード > 開発者 > Webhook で本番URLを登録:
- URL: `https://your-domain.com/api/stripe/webhook`
- イベント: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`

## 14.9 セキュリティ

### Webhook署名検証

すべてのWebhookリクエストは署名検証を行う:

```typescript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
);
```

### 認証

Checkout APIはBearerトークン認証が必要。未認証リクエストは401を返す。

## 14.10 開発者モード

`isDeveloper: true` のユーザーは、Stripe決済をスキップして直接サブスクリプションを有効化できる（テスト用）。

```typescript
if (profile?.isDeveloper) {
  // 直接有効化（Stripeをスキップ）
  await activateSubscription(tier);
} else {
  // Stripe Checkoutにリダイレクト
  await startSubscriptionCheckout(tier);
}
```

## 14.11 今後の拡張

- [ ] カスタマーポータル（プラン変更・解約のセルフサービス）
- [ ] 請求書メール送信
- [ ] 支払い失敗時のリトライ通知
- [ ] コイン購入のStripe連携
- [ ] Apple Pay / Google Pay対応
