# 環境別セットアップガイド

このドキュメントでは、Articardの3つの環境（開発・ステージング・本番）の構成と、環境間の移行手順を説明します。

## 目次

1. [環境概要](#1-環境概要)
2. [環境別リソース一覧](#2-環境別リソース一覧)
3. [新規環境構築手順](#3-新規環境構築手順)
4. [デプロイフロー](#4-デプロイフロー)
5. [環境固有の設定](#5-環境固有の設定)

---

## 1. 環境概要

### 1.1 3環境構成

| 環境 | 用途 | GCPプロジェクト | ブランチ | URL |
|------|------|----------------|---------|-----|
| Development | ローカル開発・デバッグ | articard-ff673 | feature/* | localhost:3000 |
| Staging | 検証・テスト・QA | articard-staging | develop | staging.articard.com |
| Production | 本番サービス | articard-prod | main | articard.com |

### 1.2 環境間の役割と差異

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Development（開発環境）                          │
├─────────────────────────────────────────────────────────────────────────┤
│  目的: ローカル開発、機能実装、デバッグ                                    │
│  特徴:                                                                   │
│    - Cloud SQL Proxy経由で共有DBに接続                                   │
│    - 実APIまたはモック切り替え可能（MOCK_EXTERNAL_APIS）                   │
│    - ホットリロード有効                                                   │
│    - 詳細なエラーログ表示                                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ PR merge to develop
┌─────────────────────────────────────────────────────────────────────────┐
│                          Staging（ステージング環境）                      │
├─────────────────────────────────────────────────────────────────────────┤
│  目的: 本番リリース前の検証、QA、ユーザー受け入れテスト                    │
│  特徴:                                                                   │
│    - 本番と同等の構成（ただし小規模）                                      │
│    - 自動デプロイ（develop マージ時）                                     │
│    - テスト用の外部API（Stripeテストモードなど）                           │
│    - 本番データのサブセットまたはテストデータ                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ PR merge to main (手動承認)
┌─────────────────────────────────────────────────────────────────────────┐
│                          Production（本番環境）                          │
├─────────────────────────────────────────────────────────────────────────┤
│  目的: エンドユーザー向けサービス提供                                      │
│  特徴:                                                                   │
│    - HA構成（Cloud SQL Regional、Cloud Run自動スケール）                  │
│    - 本番API（Stripe本番モード、外部API本番キー）                          │
│    - カナリアデプロイ対応                                                 │
│    - 監視・アラート設定                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 環境別リソース一覧

### 2.1 GCPプロジェクト構成

| リソース | Development | Staging | Production |
|---------|-------------|---------|------------|
| **GCPプロジェクト** | articard-ff673 | articard-staging | articard-prod |
| **リージョン** | asia-northeast1 | asia-northeast1 | asia-northeast1 |

### 2.2 リソース命名規則

```
{service}-{env}[-{component}]

例:
  articard-staging-db      # Staging Cloud SQL
  articard-prod-db         # Production Cloud SQL
  articard-staging-images  # Staging GCS Bucket
  articard-prod-images     # Production GCS Bucket
```

### 2.3 サービス別リソース

#### Cloud SQL

| 項目 | Development | Staging | Production |
|------|-------------|---------|------------|
| インスタンス名 | articard-db | articard-staging-db | articard-prod-db |
| データベース名 | articard | articard | articard |
| ユーザー | articard_user | articard_user | articard_user |
| Tier | db-f1-micro | db-f1-micro | db-custom-2-4096 |
| 可用性 | ZONAL | ZONAL | REGIONAL (HA) |
| バックアップ | なし | 日次 | 日次 + PITR |

#### Cloud Run

| 項目 | Development | Staging | Production |
|------|-------------|---------|------------|
| サービス名 | - | articard-staging | articard-prod |
| メモリ | - | 512Mi | 1Gi |
| CPU | - | 1 | 2 |
| 最小インスタンス | - | 0 | 1 |
| 最大インスタンス | - | 5 | 20 |
| タイムアウト | - | 300s | 3600s |

#### Cloud Storage

| 項目 | Development | Staging | Production |
|------|-------------|---------|------------|
| バケット名 | articard-ff673.appspot.com | articard-staging-images | articard-prod-images |
| ストレージクラス | STANDARD | STANDARD | STANDARD |
| 公開アクセス | あり | あり | あり |

#### Firebase

| 項目 | Development | Staging | Production |
|------|-------------|---------|------------|
| プロジェクト | articard-ff673 | articard-staging | articard-prod |
| Auth Domain | articard-ff673.firebaseapp.com | articard-staging.firebaseapp.com | articard-prod.firebaseapp.com |

### 2.4 環境変数の差異

```bash
# ===================================
# Development（ローカル）
# ===================================
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
DATABASE_URL="postgresql://articard_user:xxx@localhost:5433/articard"
GCS_BUCKET_NAME="articard-ff673.appspot.com"
MOCK_EXTERNAL_APIS="false"  # または "true" でモック使用

# ===================================
# Staging
# ===================================
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://staging.articard.com"
DATABASE_URL=<Secret Manager: articard-staging-db-url>
GCS_BUCKET_NAME="articard-staging-images"
STRIPE_SECRET_KEY=<テストモードキー>

# ===================================
# Production
# ===================================
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://articard.com"
DATABASE_URL=<Secret Manager: articard-prod-db-url>
GCS_BUCKET_NAME="articard-prod-images"
STRIPE_SECRET_KEY=<本番キー>
```

---

## 3. 新規環境構築手順

### 3.1 ステージング環境の構築

#### Step 1: GCPプロジェクト作成

```bash
# プロジェクト作成
gcloud projects create articard-staging --name="Articard Staging"

# プロジェクト切り替え
gcloud config set project articard-staging

# 請求アカウントをリンク
gcloud billing accounts list
gcloud billing projects link articard-staging --billing-account=BILLING_ACCOUNT_ID

# APIの有効化
gcloud services enable \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  firebase.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com
```

#### Step 2: Cloud SQL構築

```bash
# インスタンス作成（Staging用の小規模構成）
gcloud sql instances create articard-staging-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-northeast1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --availability-type=ZONAL \
  --backup-start-time=04:00

# データベース作成
gcloud sql databases create articard --instance=articard-staging-db

# ユーザー作成
gcloud sql users create articard_user \
  --instance=articard-staging-db \
  --password=SECURE_STAGING_PASSWORD
```

#### Step 3: Cloud Storage構築

```bash
# バケット作成
gsutil mb -l asia-northeast1 gs://articard-staging-images

# 公開アクセス設定
gsutil iam ch allUsers:objectViewer gs://articard-staging-images

# CORS設定
cat > /tmp/cors-staging.json << 'EOF'
[
  {
    "origin": ["https://staging.articard.com", "https://articard-staging-*.run.app"],
    "method": ["GET"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF
gsutil cors set /tmp/cors-staging.json gs://articard-staging-images
```

#### Step 4: Firebase設定

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. 「プロジェクトを追加」→ GCPプロジェクト「articard-staging」を選択
3. Authentication → Sign-in method で以下を有効化:
   - メール/パスワード
   - Google
4. Webアプリを登録し、設定値を取得

#### Step 5: Secret Manager設定

```bash
# シークレット作成
echo -n "postgresql://articard_user:PASSWORD@/articard?host=/cloudsql/articard-staging:asia-northeast1:articard-staging-db" | \
  gcloud secrets create articard-staging-db-url --data-file=-

echo -n "sk-proj-..." | gcloud secrets create articard-staging-openai-key --data-file=-
echo -n "bfl_..." | gcloud secrets create articard-staging-flux-key --data-file=-
echo -n "AIza..." | gcloud secrets create articard-staging-gemini-key --data-file=-

# Stripeテストキー
echo -n "sk_test_..." | gcloud secrets create articard-staging-stripe-key --data-file=-
```

#### Step 6: Artifact Registry作成

```bash
gcloud artifacts repositories create articard \
  --repository-format=docker \
  --location=asia-northeast1
```

#### Step 7: Cloud Run デプロイ

```bash
# サービスアカウント作成（推奨）
gcloud iam service-accounts create articard-staging-sa \
  --display-name="Articard Staging Service Account"

# 必要な権限を付与
PROJECT_NUMBER=$(gcloud projects describe articard-staging --format='value(projectNumber)')
SA_EMAIL="articard-staging-sa@articard-staging.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding articard-staging \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding articard-staging \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/storage.objectAdmin"

gcloud secrets add-iam-policy-binding articard-staging-db-url \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

# 他のシークレットも同様に権限付与
for secret in articard-staging-openai-key articard-staging-flux-key articard-staging-gemini-key articard-staging-stripe-key; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/secretmanager.secretAccessor"
done

# Cloud Run デプロイ
gcloud run deploy articard-staging \
  --image=asia-northeast1-docker.pkg.dev/articard-staging/articard/app:staging \
  --region=asia-northeast1 \
  --platform=managed \
  --allow-unauthenticated \
  --service-account=$SA_EMAIL \
  --memory=512Mi \
  --cpu=1 \
  --timeout=300 \
  --min-instances=0 \
  --max-instances=5 \
  --add-cloudsql-instances=articard-staging:asia-northeast1:articard-staging-db \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="NEXT_PUBLIC_APP_URL=https://staging.articard.com" \
  --set-env-vars="GCS_BUCKET_NAME=articard-staging-images" \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=articard-staging" \
  --set-secrets="DATABASE_URL=articard-staging-db-url:latest" \
  --set-secrets="OPENAI_API_KEY=articard-staging-openai-key:latest" \
  --set-secrets="BFL_API_KEY=articard-staging-flux-key:latest" \
  --set-secrets="GOOGLE_GEMINI_API_KEY=articard-staging-gemini-key:latest" \
  --set-secrets="STRIPE_SECRET_KEY=articard-staging-stripe-key:latest"
```

### 3.2 本番環境の構築

本番環境の詳細な構築手順は[production-setup.md](./production-setup.md)を参照してください。

ステージング環境との主な違い:

```bash
# Cloud SQL: HA構成
gcloud sql instances create articard-prod-db \
  --database-version=POSTGRES_15 \
  --tier=db-custom-2-4096 \
  --region=asia-northeast1 \
  --storage-type=SSD \
  --storage-size=20GB \
  --availability-type=REGIONAL \
  --backup-start-time=03:00 \
  --enable-point-in-time-recovery

# Cloud Run: より多くのリソース
gcloud run deploy articard-prod \
  --memory=1Gi \
  --cpu=2 \
  --timeout=3600 \
  --min-instances=1 \
  --max-instances=20 \
  # ...その他のオプション
```

### 3.3 環境間のデータ移行

#### Development → Staging（テストデータ）

```bash
# Developmentからデータエクスポート
pg_dump -h localhost -p 5433 -U articard_user -d articard \
  --data-only --table=users --table=articles --table=cards \
  > /tmp/test_data.sql

# Stagingにインポート
# Cloud SQL Proxyでステージング接続
./cloud-sql-proxy articard-staging:asia-northeast1:articard-staging-db --port 5434

psql -h localhost -p 5434 -U articard_user -d articard < /tmp/test_data.sql
```

#### Production → Staging（本番データのサブセット）

```bash
# 本番データの一部を匿名化してエクスポート
# 注意: 個人情報を含むデータは適切に匿名化すること

# Cloud SQL エクスポート機能を使用
gcloud sql export sql articard-prod-db gs://articard-prod-backup/export.sql \
  --database=articard \
  --table=articles \
  --table=cards

# Stagingにインポート
gcloud sql import sql articard-staging-db gs://articard-prod-backup/export.sql \
  --database=articard
```

---

## 4. デプロイフロー

### 4.1 ブランチ戦略

```
main (本番)
  │
  ├── develop (開発統合)
  │     │
  │     ├── feature/add-new-feature
  │     ├── feature/fix-bug-123
  │     └── feature/refactor-api
  │
  └── hotfix/critical-fix (緊急修正)
```

### 4.2 デプロイパイプライン

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         デプロイフロー全体図                              │
└─────────────────────────────────────────────────────────────────────────┘

  feature/*                    develop                      main
      │                           │                           │
      │  PR作成                   │                           │
      ├────────────────────────>  │                           │
      │                           │                           │
      │  コードレビュー            │                           │
      │  CI実行（テスト・リント）   │                           │
      │                           │                           │
      │  マージ                    │                           │
      ├────────────────────────>  │                           │
      │                           │                           │
      │                     [自動デプロイ]                     │
      │                           │                           │
      │                     Staging環境                       │
      │                           │                           │
      │                     QA・検証                          │
      │                           │                           │
      │                     リリースPR作成                     │
      │                           ├────────────────────────>  │
      │                           │                           │
      │                           │              [手動承認]    │
      │                           │                           │
      │                           │             カナリアデプロイ│
      │                           │                           │
      │                           │             トラフィック移行│
      │                           │                           │
      │                           │             Production    │
```

### 4.3 Staging自動デプロイ

developブランチへのマージでCloud Buildが自動実行:

```yaml
# cloudbuild-staging.yaml
steps:
  # テスト・ビルド（省略、deployment.md参照）

  # Cloud Runデプロイ
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'articard-staging'
      - '--image=asia-northeast1-docker.pkg.dev/$PROJECT_ID/articard/app:$SHORT_SHA'
      - '--region=asia-northeast1'
      # ... その他のオプション

  # マイグレーション実行
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: bash
    args:
      - '-c'
      - |
        gcloud run jobs execute articard-migrate-staging --region=asia-northeast1 --wait

trigger:
  branch: develop
```

### 4.4 Production手動デプロイ

#### Step 1: リリースPR作成

```bash
# developからmainへPR作成
gh pr create --base main --head develop \
  --title "Release v1.2.0" \
  --body "## 変更内容
- 新機能A追加
- バグ修正B
- パフォーマンス改善C

## テスト結果
Staging環境で検証済み

## ロールバック手順
必要に応じてリビジョン articard-prod-00010 にロールバック"
```

#### Step 2: PRマージ後のカナリアデプロイ

mainへのマージでCloud Buildが実行され、新リビジョンがデプロイされます（トラフィックなし）。

```bash
# 現在のリビジョン確認
gcloud run revisions list --service=articard-prod --region=asia-northeast1

# カナリアリビジョンの動作確認（タグURL経由）
curl https://canary---articard-prod-xxx.run.app/api/health
```

#### Step 3: トラフィック段階移行

```bash
# 10%のトラフィックをcanaryへ
gcloud run services update-traffic articard-prod \
  --region=asia-northeast1 \
  --to-tags=canary=10

# メトリクス確認後、50%へ
gcloud run services update-traffic articard-prod \
  --region=asia-northeast1 \
  --to-tags=canary=50

# 問題なければ100%移行
gcloud run services update-traffic articard-prod \
  --region=asia-northeast1 \
  --to-latest
```

### 4.5 ロールバック手順

#### Cloud Runロールバック

```bash
# リビジョン一覧確認
gcloud run revisions list --service=articard-prod --region=asia-northeast1

# 出力例:
# REVISION                    ACTIVE  SERVICE        DEPLOYED                 TRAFFIC
# articard-prod-00012-abc     ✓       articard-prod  2024-01-15 10:30:00      100%
# articard-prod-00011-def             articard-prod  2024-01-14 15:00:00
# articard-prod-00010-ghi             articard-prod  2024-01-10 09:00:00

# 特定リビジョンへロールバック
gcloud run services update-traffic articard-prod \
  --region=asia-northeast1 \
  --to-revisions=articard-prod-00011-def=100

# 確認
gcloud run services describe articard-prod --region=asia-northeast1 --format='value(status.traffic)'
```

#### データベースロールバック

```bash
# Point-in-Time Recovery（本番のみ）
gcloud sql instances clone articard-prod-db articard-prod-db-recovered \
  --point-in-time="2024-01-15T10:00:00Z"

# または、バックアップから復元
gcloud sql backups list --instance=articard-prod-db
gcloud sql backups restore BACKUP_ID --restore-instance=articard-prod-db
```

---

## 5. 環境固有の設定

### 5.1 Firebase環境分離

各環境で異なるFirebaseプロジェクトを使用:

```typescript
// src/lib/firebase/config.ts
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
```

**環境別の設定値:**

| 環境 | Firebase Project ID | Auth Domain |
|------|---------------------|-------------|
| Development | articard-ff673 | articard-ff673.firebaseapp.com |
| Staging | articard-staging | articard-staging.firebaseapp.com |
| Production | articard-prod | articard-prod.firebaseapp.com |

### 5.2 Stripeテスト/本番モード

```bash
# Staging: テストモードキー
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_test_..."

# Production: 本番キー
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_live_..."
```

**Webhook設定:**

| 環境 | Webhook URL |
|------|-------------|
| Development | localhost:3000/api/webhooks/stripe (Stripe CLI使用) |
| Staging | staging.articard.com/api/webhooks/stripe |
| Production | articard.com/api/webhooks/stripe |

### 5.3 外部API環境設定

#### OpenAI

全環境で同一のAPIキーを使用可能。使用量監視のため、環境ごとにOrganization内でプロジェクトを分けることを推奨。

#### FLUX / Gemini

全環境で同一のAPIキーを使用可能。コスト管理のため、Staging/Productionでは別々のAPIキーを使用することを推奨。

```bash
# Staging: 開発用APIキー（レート制限低め）
BFL_API_KEY="bfl_dev_..."
GOOGLE_GEMINI_API_KEY="AIza_dev_..."

# Production: 本番用APIキー
BFL_API_KEY="bfl_prod_..."
GOOGLE_GEMINI_API_KEY="AIza_prod_..."
```

### 5.4 ドメイン設定

#### カスタムドメインマッピング

```bash
# Staging
gcloud run domain-mappings create \
  --service=articard-staging \
  --domain=staging.articard.com \
  --region=asia-northeast1

# Production
gcloud run domain-mappings create \
  --service=articard-prod \
  --domain=articard.com \
  --region=asia-northeast1

gcloud run domain-mappings create \
  --service=articard-prod \
  --domain=www.articard.com \
  --region=asia-northeast1
```

#### DNS設定

Cloud Runが提供するDNSレコードをドメインレジストラに設定:

```
# A/AAAAレコードまたはCNAMEレコード
staging.articard.com  → ghs.googlehosted.com
articard.com          → ghs.googlehosted.com
www.articard.com      → ghs.googlehosted.com
```

---

## チェックリスト

### 新規環境構築チェックリスト

- [ ] GCPプロジェクト作成・請求アカウントリンク
- [ ] 必要なAPIの有効化
- [ ] Cloud SQLインスタンス・データベース・ユーザー作成
- [ ] Cloud Storageバケット作成・CORS設定
- [ ] Firebaseプロジェクト設定・Authentication有効化
- [ ] Secret Manager にすべてのシークレット登録
- [ ] サービスアカウント作成・権限付与
- [ ] Artifact Registryリポジトリ作成
- [ ] Cloud Runサービスデプロイ
- [ ] カスタムドメイン設定（必要に応じて）
- [ ] 動作確認（ログイン、記事生成、カード生成）

### デプロイ前チェックリスト

- [ ] すべてのテストがパス
- [ ] 型チェック・リントエラーなし
- [ ] マイグレーションファイルがコミット済み
- [ ] 環境変数・シークレットが正しく設定されている
- [ ] Staging環境で検証済み

### デプロイ後チェックリスト

- [ ] ヘルスチェックエンドポイント応答確認
- [ ] 主要機能の動作確認
- [ ] エラーログに異常がないこと
- [ ] パフォーマンスメトリクスが正常範囲内
