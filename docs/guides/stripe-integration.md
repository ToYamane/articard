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

| フィールド           | 説明                                 |
| -------------------- | ------------------------------------ |
| stripeCustomerId     | StripeのCustomer ID（`cus_xxx`）     |
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

| イベント                        | 処理内容                           |
| ------------------------------- | ---------------------------------- |
| `checkout.session.completed`    | サブスク有効化、ボーナスコイン付与 |
| `customer.subscription.updated` | プラン変更の反映                   |
| `customer.subscription.deleted` | サブスク解約処理                   |
| `invoice.paid`                  | 定期支払い成功の記録               |
| `invoice.payment_failed`        | 支払い失敗のログ記録               |

## 14.6 ファイル構成

```
src/
├── lib/stripe/
│   └── index.ts          # Stripeサーバー設定
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

| カード番号            | 結果           |
| --------------------- | -------------- |
| `4242 4242 4242 4242` | 成功           |
| `4000 0000 0000 0002` | 拒否           |
| `4000 0000 0000 3220` | 3Dセキュア認証 |

有効期限: 未来の任意の日付、CVC: 任意の3桁

## 14.8 本番環境への移行

### 前提知識: テストモードと本番モードの違い

Stripeのテストモードと本番モードは**完全に独立した環境**である。以下のデータはテスト→本番に引き継がれない:

- **商品・価格**: 本番で新規作成が必要
- **顧客（Customer）**: テストの `cus_test_xxx` は本番に存在しない
- **サブスクリプション**: テストの `sub_xxx` は本番で無効
- **APIキー**: `sk_test_` / `pk_test_` は本番では使用不可
- **Webhookシークレット**: 本番エンドポイント用に新規発行される

唯一共有されるのはアカウント設定（ビジネス情報、ブランディング等）のみ。

### Step 1: Stripeダッシュボードで商品・価格を作成

Stripeダッシュボード（https://dashboard.stripe.com）で右上のトグルを「本番環境」に切り替え、以下の商品を作成する。

**プラスプラン**

| 項目   | 値                         |
| ------ | -------------------------- |
| 商品名 | Articard プラス            |
| 説明   | 月間コイン増量・広告非表示 |
| 価格   | ¥980 / 月（定期）          |
| 通貨   | JPY                        |

**プレミアムプラン**

| 項目   | 値                             |
| ------ | ------------------------------ |
| 商品名 | Articard プレミアム            |
| 説明   | 全機能アクセス・最大コイン付与 |
| 価格   | ¥2,980 / 月（定期）            |
| 通貨   | JPY                            |

作成後、各価格の `price_xxxxx` IDをメモする（環境変数に使用）。

### Step 2: 本番用APIキーの取得

ダッシュボードの「開発者 > APIキー」から以下を取得:

| キー             | 形式            | 用途                                        |
| ---------------- | --------------- | ------------------------------------------- |
| シークレットキー | `sk_live_xxxxx` | サーバーサイドAPI呼び出し                   |
| 公開可能キー     | `pk_live_xxxxx` | クライアントサイド（Checkout リダイレクト） |

> **注意**: シークレットキーは作成時に一度だけ表示される。安全な場所に保管すること。

### Step 3: Webhookエンドポイント登録

ダッシュボードの「開発者 > Webhook」で新規エンドポイントを追加:

- **エンドポイントURL**: `https://articard.app/api/stripe/webhook`
- **受信するイベント**:

| イベント                        | 必須 | 説明                          |
| ------------------------------- | ---- | ----------------------------- |
| `checkout.session.completed`    | Yes  | 初回決済完了 → サブスク有効化 |
| `customer.subscription.updated` | Yes  | プラン変更の反映              |
| `customer.subscription.deleted` | Yes  | 解約処理                      |
| `invoice.paid`                  | Yes  | 定期支払い成功の記録          |
| `invoice.payment_failed`        | Yes  | 支払い失敗のログ記録          |

登録後に表示される **署名シークレット**（`whsec_xxxxx`）をメモする。

### Step 4: GCP Secret Managerの更新

本番用の値を `.env.production` に記入し、`setup-secrets.sh` で Secret Manager に登録する:

```bash
# 1. 本番用の .env ファイルを用意
cp .env .env.production

# 2. .env.production の Stripe 関連を本番値に書き換え
#    STRIPE_SECRET_KEY=sk_live_xxxxx
#    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
#    STRIPE_WEBHOOK_SECRET=whsec_xxxxx        ← Step 3 で取得
#    STRIPE_PRICE_PLUS=price_xxxxx            ← Step 1 で作成
#    STRIPE_PRICE_PREMIUM=price_xxxxx         ← Step 1 で作成

# 3. Secret Manager に登録（冪等: 既存シークレットは新バージョン追加）
./scripts/setup-secrets.sh .env.production
```

スクリプトが更新する Stripe 関連シークレット:

| Secret Manager 名                 | 環境変数                             |
| --------------------------------- | ------------------------------------ |
| `articard-stripe-secret-key`      | `STRIPE_SECRET_KEY`                  |
| `articard-stripe-webhook-secret`  | `STRIPE_WEBHOOK_SECRET`              |
| `articard-stripe-publishable-key` | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| `articard-stripe-price-plus`      | `STRIPE_PRICE_PLUS`                  |
| `articard-stripe-price-premium`   | `STRIPE_PRICE_PREMIUM`               |

### Step 5: デプロイ

Cloud Build でプロダクションデプロイを実行:

```bash
gcloud builds submit \
  --config=cloudbuild.production.yaml \
  --project=articard-ff673
```

デプロイフローは自動で以下を実行する:

1. テスト（type-check, lint, test）
2. Docker イメージビルド（Secret Manager から `NEXT_PUBLIC_*` を注入）
3. GCR にプッシュ
4. Cloud Run にデプロイ（Secret Manager から全環境変数をマウント）
5. ヘルスチェック（`/api/health` に最大5回リトライ）

### Step 6: 動作確認チェックリスト

デプロイ完了後、以下を順に確認する:

- [ ] `https://articard.app` にアクセスできる
- [ ] ヘルスチェック: `curl https://articard.app/api/health` が 200 を返す
- [ ] 設定ページで「プラスに加入」をクリック → Stripe Checkout（本番）にリダイレクトされる
- [ ] Stripe Checkout の金額が ¥980 であること（テスト用カードは本番では使えないため、確認のみ）
- [ ] Stripeダッシュボード（本番）の「Webhook > エンドポイント」で配信ログが表示される
- [ ] 実際に決済完了後、設定ページでプランが更新される
- [ ] 解約フローが正常に動作する

### 切り戻し手順

問題が発生した場合:

1. **Stripe側**: ダッシュボードでWebhookエンドポイントを無効化
2. **アプリ側**: Secret Manager のシークレットをテスト用の値に戻す
   ```bash
   # テスト用の .env で再登録
   ./scripts/setup-secrets.sh .env
   ```
3. **再デプロイ**: Cloud Build を再実行
   ```bash
   gcloud builds submit \
     --config=cloudbuild.production.yaml \
     --project=articard-ff673
   ```
4. **影響確認**: 切り戻し中に決済を試みたユーザーがいないかStripeダッシュボードで確認

## 14.9 セキュリティ

### Webhook署名検証

すべてのWebhookリクエストは署名検証を行う:

```typescript
const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
```

### 認証

Checkout APIはBearerトークン認証が必要。未認証リクエストは401を返す。

## 14.10 開発者モード

`isDeveloper: true` のユーザーは、以下の2つの方法でサブスクリプションをテストできる：

### 通常のStripe決済テスト

設定ページの「プラスに加入」「プレミアムに加入」ボタンをクリックすると、一般ユーザーと同様にStripe Checkoutにリダイレクトされる。これにより、実際の決済フローをテスト可能。

### 直接有効化（Stripeスキップ）

設定ページ下部に表示される「開発者専用：Stripeスキップ（テスト用）」セクションから、決済なしで即座にサブスクリプションを有効化できる。

```
┌─────────────────────────────────────────────────┐
│ 開発者専用：Stripeスキップ（テスト用）           │
├─────────────────────────────────────────────────┤
│ [プラス直接有効化]  [プレミアム直接有効化]       │
└─────────────────────────────────────────────────┘
```

### 実装

```typescript
// 通常の加入ボタン → 常にStripe Checkout経由
const handleActivateSubscription = async (tier: 'plus' | 'premium') => {
  await startSubscriptionCheckout(tier);
};

// 開発者専用の直接有効化ボタン → Stripeスキップ
const handleDirectActivation = async (tier: 'plus' | 'premium') => {
  await activateSubscription(tier);
};
```

### Stripe決済テスト手順

1. 設定ページで「プラスに加入 (¥980/月)」をクリック
2. Stripe Checkoutページにリダイレクト
3. テスト用カード情報を入力:
   - カード番号: `4242 4242 4242 4242`
   - 有効期限: 任意の未来日付（例: `12/30`）
   - CVC: 任意の3桁（例: `123`）
   - その他: 任意の値
4. 「申し込む」をクリック
5. 設定ページにリダイレクトされ、「サブスクリプションの登録が完了しました！」と表示
6. プランが「プラス加入中」に変更されていることを確認

## 14.11 今後の拡張

- [ ] カスタマーポータル（プラン変更・解約のセルフサービス）
- [ ] 請求書メール送信
- [ ] 支払い失敗時のリトライ通知
- [ ] コイン購入のStripe連携
- [ ] Apple Pay / Google Pay対応
