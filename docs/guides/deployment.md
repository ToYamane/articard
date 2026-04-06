# デプロイガイド

Articard の本番デプロイ手順。単一 GCP プロジェクト `articard-ff673` で運用。

## 1. インフラ構成

| リソース           | 値                                                        |
| ------------------ | --------------------------------------------------------- |
| GCP プロジェクト   | `articard-ff673`                                          |
| リージョン         | `asia-northeast1`                                         |
| Cloud Run サービス | `articard`                                                |
| Cloud SQL          | `articard-ff673:asia-northeast1:articard-db` (PostgreSQL) |
| Cloud Storage      | `articard-ff673.appspot.com`                              |
| Container Registry | `gcr.io/articard-ff673/articard`                          |
| Firebase           | `articard-ff673`                                          |

### アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────┐
│                   articard-ff673                            │
├─────────────────────────────────────────────────────────────┤
│  Cloud Run: articard                                        │
│    - Image: gcr.io/articard-ff673/articard                  │
│    - CPU: 1 / Memory: 512Mi                                  │
│    - Min instances: 0 / Max: 50                             │
│    - Concurrency: 100 / Timeout: 300s                       │
│                                                             │
│  Cloud SQL: articard-db (PostgreSQL)                        │
│    - Cloud SQL Proxy 経由で接続                              │
│                                                             │
│  Cloud Storage: articard-ff673.appspot.com                  │
│    - illustrations/, cards/, thumbnails/                     │
│                                                             │
│  Secret Manager: 18 シークレット                             │
│  Cloud Build: cloudbuild.production.yaml                    │
└─────────────────────────────────────────────────────────────┘
```

## 2. デプロイフロー

```
master ブランチ
    │
    ├── git push origin master
    │
    ▼
Cloud Build (手動 or トリガー)
    │
    ├── Step 1: テスト (npm ci → type-check → lint → test)
    ├── Step 2: Docker ビルド (NEXT_PUBLIC 変数を Secret Manager から注入)
    ├── Step 3: GCR にプッシュ
    ├── Step 4: Cloud Run にデプロイ (ランタイムシークレット設定)
    └── Step 5: ヘルスチェック (/api/health)
```

## 3. Secret Manager

### 3.1 シークレット一覧

Cloud Build（ビルド時）と Cloud Run（ランタイム）の両方で使用。

| シークレット名                          | .env 変数名                                | 用途                      |
| --------------------------------------- | ------------------------------------------ | ------------------------- |
| **Database**                            |                                            |                           |
| `articard-database-url`                 | `DATABASE_URL`                             | PostgreSQL 接続文字列     |
| **Firebase Client (6個)**               |                                            |                           |
| `articard-firebase-api-key`             | `NEXT_PUBLIC_FIREBASE_API_KEY`             | Firebase API キー         |
| `articard-firebase-auth-domain`         | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Firebase Auth ドメイン    |
| `articard-firebase-project-id`          | `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | Firebase プロジェクト ID  |
| `articard-firebase-storage-bucket`      | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Firebase Storage バケット |
| `articard-firebase-messaging-sender-id` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM Sender ID             |
| `articard-firebase-app-id`              | `NEXT_PUBLIC_FIREBASE_APP_ID`              | Firebase App ID           |
| **Firebase Admin (3個)**                |                                            |                           |
| `articard-firebase-admin-project-id`    | `FIREBASE_ADMIN_PROJECT_ID`                | Admin プロジェクト ID     |
| `articard-firebase-admin-email`         | `FIREBASE_ADMIN_CLIENT_EMAIL`              | Admin サービスアカウント  |
| `articard-firebase-admin-key`           | `FIREBASE_ADMIN_PRIVATE_KEY`               | Admin 秘密鍵              |
| **AI APIs (3個)**                       |                                            |                           |
| `articard-openai-key`                   | `OPENAI_API_KEY`                           | OpenAI (記事生成)         |
| `articard-bfl-key`                      | `BFL_API_KEY`                              | FLUX (画像生成)           |
| `articard-gemini-key`                   | `GOOGLE_GEMINI_API_KEY`                    | Gemini (画像生成)         |
| **Stripe (5個)**                        |                                            |                           |
| `articard-stripe-secret-key`            | `STRIPE_SECRET_KEY`                        | Stripe シークレットキー   |
| `articard-stripe-webhook-secret`        | `STRIPE_WEBHOOK_SECRET`                    | Webhook 署名検証          |
| `articard-stripe-publishable-key`       | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`       | Stripe 公開キー           |
| `articard-stripe-price-plus`            | `STRIPE_PRICE_PLUS`                        | Plus プラン Price ID      |
| `articard-stripe-price-premium`         | `STRIPE_PRICE_PREMIUM`                     | Premium プラン Price ID   |
| **Email (1個)**                         |                                            |                           |
| `articard-resend-key`                   | `RESEND_API_KEY`                           | Resend メール送信         |

### 3.2 セットアップ

セットアップスクリプトで `.env` から一括登録:

```bash
# .env から Secret Manager にシークレットを登録
bash scripts/setup-secrets.sh .env

# カスタムパスの場合
bash scripts/setup-secrets.sh /path/to/.env
```

スクリプトは冪等（既存シークレットは新しいバージョンとして更新）。
Cloud Build と Cloud Run のサービスアカウントに `secretmanager.secretAccessor` 権限も自動付与。

### 3.3 手動でのシークレット操作

```bash
# シークレットの値を確認
gcloud secrets versions access latest --secret=articard-database-url

# シークレットを手動で更新
echo -n "new-value" | gcloud secrets versions add articard-database-url --data-file=-

# シークレット一覧
gcloud secrets list --project=articard-ff673
```

## 4. Dockerfile

マルチステージビルド（3段階）:

| ステージ  | 内容                                                               |
| --------- | ------------------------------------------------------------------ |
| `deps`    | `npm ci` で依存関係インストール                                    |
| `builder` | Prisma generate → `npm run build` (NEXT_PUBLIC ARG をビルド時注入) |
| `runner`  | standalone 出力 + prisma + fonts をコピー、非 root ユーザーで実行  |

ビルド時引数（`--build-arg`）:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

> **Note**: `NEXT_PUBLIC_*` 変数は Next.js ビルド時にクライアント JS にインライン化されるため、
> Docker ビルド時の `--build-arg` で渡す必要がある。ランタイムの環境変数では反映されない。

### ローカルビルド検証

```bash
bash scripts/docker-build-test.sh .env
```

## 5. Cloud Build 設定

`cloudbuild.production.yaml` の構成:

### ステップ

| Step | 名前     | 内容                                                          |
| ---- | -------- | ------------------------------------------------------------- |
| 1    | `test`   | `npm ci` → `type-check` → `lint` → `test`                     |
| 2    | `build`  | Docker ビルド（Secret Manager からビルド引数注入）            |
| 3    | `push`   | `gcr.io/$PROJECT_ID/articard` に push                         |
| 4    | `deploy` | Cloud Run にデプロイ（ランタイムシークレット + 環境変数設定） |
| 5    | `verify` | `/api/health` へのヘルスチェック（5回リトライ）               |

### 置換変数

| 変数                  | デフォルト値                                 | 用途               |
| --------------------- | -------------------------------------------- | ------------------ |
| `_REGION`             | `asia-northeast1`                            | デプロイリージョン |
| `_APP_URL`            | `https://articard.app`                       | アプリ URL         |
| `_CLOUD_SQL_INSTANCE` | `articard-ff673:asia-northeast1:articard-db` | Cloud SQL 接続名   |
| `_GCS_BUCKET`         | `articard-ff673.appspot.com`                 | GCS バケット       |

### ランタイム環境変数（Cloud Run に直接設定）

| 変数                  | 値               |
| --------------------- | ---------------- |
| `NODE_ENV`            | `production`     |
| `NEXT_PUBLIC_APP_URL` | `${_APP_URL}`    |
| `GCS_BUCKET_NAME`     | `${_GCS_BUCKET}` |

## 6. デプロイ手順

### 6.1 初回デプロイ

#### Step 1: コードをプッシュ

```bash
git push origin master
```

#### Step 2: Secret Manager セットアップ

```bash
bash scripts/setup-secrets.sh .env
```

#### Step 3: データベースマイグレーション

Cloud SQL Proxy 経由で手動実行:

```bash
# ターミナル1: Cloud SQL Proxy 起動
./cloud-sql-proxy articard-ff673:asia-northeast1:articard-db --port 5433

# ターミナル2: マイグレーション実行
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5433/articard" npx prisma migrate deploy
```

#### Step 4: Cloud Build 実行

```bash
# 手動実行
gcloud builds submit \
  --config=cloudbuild.production.yaml \
  --project=articard-ff673

# _APP_URL を上書きする場合
gcloud builds submit \
  --config=cloudbuild.production.yaml \
  --project=articard-ff673 \
  --substitutions=_APP_URL="https://your-domain.com"
```

#### Step 5: デプロイ確認

```bash
# サービス URL を取得
gcloud run services describe articard \
  --region=asia-northeast1 \
  --format='value(status.url)'

# ヘルスチェック
curl https://<SERVICE_URL>/api/health
```

### 6.2 通常のデプロイ（2回目以降）

```bash
# 1. コードをプッシュ
git push origin master

# 2. マイグレーションがある場合は Cloud SQL Proxy 経由で実行
# 3. Cloud Build 実行（手動 or トリガー）
gcloud builds submit --config=cloudbuild.production.yaml --project=articard-ff673
```

### 6.3 Cloud Build トリガー設定（オプション）

master プッシュで自動デプロイしたい場合:

```bash
gcloud builds triggers create github \
  --name="articard-production" \
  --repo-name="articard" \
  --repo-owner="YOUR_GITHUB_USER" \
  --branch-pattern="^master$" \
  --build-config="cloudbuild.production.yaml" \
  --project=articard-ff673
```

## 7. デプロイ後作業

### 7.1 カスタムドメイン設定

```bash
# Cloud Run にカスタムドメインをマッピング
gcloud run domain-mappings create \
  --service=articard \
  --domain=your-domain.com \
  --region=asia-northeast1

# DNS レコードが表示されるので、DNS プロバイダで設定
# 設定後、_APP_URL を更新して再デプロイ
gcloud builds submit \
  --config=cloudbuild.production.yaml \
  --substitutions=_APP_URL="https://your-domain.com"
```

### 7.2 Stripe Webhook 設定

1. [Stripe Dashboard](https://dashboard.stripe.com/webhooks) でエンドポイントを追加
2. エンドポイント URL: `https://your-domain.com/api/stripe/webhook`
3. 対象イベント:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Webhook シークレットを Secret Manager に登録:

```bash
echo -n "whsec_xxxxx" | gcloud secrets versions add articard-stripe-webhook-secret --data-file=-
```

5. Cloud Run を再デプロイして新しいシークレットを適用（新しいリビジョンが必要）

### 7.3 `_APP_URL` の更新

`cloudbuild.production.yaml` の `substitutions._APP_URL` をカスタムドメインに更新:

```yaml
substitutions:
  _APP_URL: 'https://your-domain.com' # ← 更新
```

または Cloud Build 実行時に上書き:

```bash
gcloud builds submit \
  --config=cloudbuild.production.yaml \
  --substitutions=_APP_URL="https://your-domain.com"
```

## 8. ロールバック

### Cloud Run ロールバック

```bash
# リビジョン一覧確認
gcloud run revisions list --service=articard --region=asia-northeast1

# 特定リビジョンへロールバック
gcloud run services update-traffic articard \
  --region=asia-northeast1 \
  --to-revisions=REVISION_NAME=100
```

### データベースロールバック

```bash
# マイグレーション状態確認
DATABASE_URL="..." npx prisma migrate status

# Prisma は直接ロールバックをサポートしていない
# 必要に応じてバックアップから復元または手動 SQL で対応
```

## 9. 運用

### ログ確認

```bash
# Cloud Run ログ
gcloud run services logs read articard --region=asia-northeast1 --limit=50

# Cloud Build ログ
gcloud builds list --project=articard-ff673 --limit=5
gcloud builds log BUILD_ID
```

### モニタリング

Cloud Console で確認:

- Cloud Run: リクエスト数、レイテンシ (P50/P95/P99)、エラーレート、インスタンス数
- Cloud SQL: 接続数、CPU/メモリ使用率
- Secret Manager: アクセスログ

### デプロイ前チェックリスト

- [ ] テストが全てパス (`npm run test`)
- [ ] 型チェックエラーなし (`npm run type-check`)
- [ ] リントエラーなし (`npm run lint`)
- [ ] マイグレーションファイルがコミット済み
- [ ] シークレットが Secret Manager に設定済み
- [ ] `_APP_URL` が正しいドメインに設定済み

### デプロイ後チェックリスト

- [ ] `/api/health` が 200 を返す
- [ ] ログイン/サインアップが動作する
- [ ] 記事生成が動作する
- [ ] カード生成が動作する
- [ ] Stripe 決済フローが動作する
- [ ] エラーログに異常がない
