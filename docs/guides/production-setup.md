# 本番環境構築ガイド

本番環境のGCPプロジェクトを構築する際の手順書です。

## 目次

1. [GCPプロジェクト作成](#1-gcpプロジェクト作成)
2. [Cloud SQL設定](#2-cloud-sql設定)
3. [Cloud Storage設定](#3-cloud-storage設定)
4. [Firebase設定](#4-firebase設定)
5. [外部APIキー取得](#5-外部apiキー取得)
6. [Secret Manager設定](#6-secret-manager設定)
7. [Cloud Run デプロイ](#7-cloud-run-デプロイ)
8. [DBマイグレーション](#8-dbマイグレーション)
9. [動作確認チェックリスト](#9-動作確認チェックリスト)

---

## 1. GCPプロジェクト作成

### 1.1 プロジェクト作成

```bash
# プロジェクト作成
gcloud projects create articard-prod --name="Articard Production"

# プロジェクト切り替え
gcloud config set project articard-prod
```

### 1.2 請求アカウント設定

```bash
# 請求アカウント一覧
gcloud billing accounts list

# 請求アカウントをプロジェクトにリンク
gcloud billing projects link articard-prod --billing-account=BILLING_ACCOUNT_ID
```

### 1.3 必要なAPIの有効化

```bash
gcloud services enable \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  firebase.googleapis.com
```

---

## 2. Cloud SQL設定

### 2.1 インスタンス作成

```bash
gcloud sql instances create articard-prod-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-northeast1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --availability-type=REGIONAL \
  --backup-start-time=03:00 \
  --enable-point-in-time-recovery
```

**本番向け推奨設定:**
- `--tier=db-custom-2-4096` (2vCPU, 4GB RAM)
- `--availability-type=REGIONAL` (HA構成)
- `--backup-start-time` でバックアップ設定

### 2.2 データベース・ユーザー作成

```bash
# データベース作成
gcloud sql databases create articard --instance=articard-prod-db

# ユーザー作成
gcloud sql users create articard_user \
  --instance=articard-prod-db \
  --password=SECURE_PASSWORD_HERE
```

### 2.3 接続設定

**Cloud Run からの接続（推奨）:**
Cloud Run サービスから Cloud SQL に接続する場合は、Unix ソケット接続を使用。

```
DATABASE_URL="postgresql://articard_user:PASSWORD@localhost/articard?host=/cloudsql/articard-prod:asia-northeast1:articard-prod-db"
```

**外部IPからの接続（開発/マイグレーション用）:**

```bash
# 外部IPを許可
gcloud sql instances patch articard-prod-db \
  --authorized-networks=YOUR_IP/32

# 接続文字列
DATABASE_URL="postgresql://articard_user:PASSWORD@INSTANCE_IP:5432/articard"
```

---

## 3. Cloud Storage設定

### 3.1 バケット作成

```bash
gsutil mb -l asia-northeast1 gs://articard-prod-images
```

### 3.2 公開アクセス設定

```bash
# 公開読み取りを許可
gsutil iam ch allUsers:objectViewer gs://articard-prod-images
```

### 3.3 CORS設定

`cors.json` を作成:

```json
[
  {
    "origin": ["https://articard.com", "https://www.articard.com"],
    "method": ["GET"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

```bash
gsutil cors set cors.json gs://articard-prod-images
```

### 3.4 サービスアカウント権限

```bash
# Cloud Run サービスアカウントに権限付与
gcloud projects add-iam-policy-binding articard-prod \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

---

## 4. Firebase設定

### 4.1 Firebaseプロジェクト作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」→ GCPプロジェクト「articard-prod」を選択
3. Firebase を有効化

### 4.2 Authentication設定

1. Firebase Console → Authentication → Sign-in method
2. 以下のプロバイダーを有効化:
   - メール/パスワード
   - Google

### 4.3 Webアプリ登録

1. プロジェクト設定 → マイアプリ → Webアプリを追加
2. 以下の設定値を取得:

```
NEXT_PUBLIC_FIREBASE_API_KEY=""
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="articard-prod.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="articard-prod"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="articard-prod.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=""
NEXT_PUBLIC_FIREBASE_APP_ID=""
```

### 4.4 Admin SDK秘密鍵取得

1. プロジェクト設定 → サービスアカウント
2. 「新しい秘密鍵の生成」→ JSONファイルをダウンロード
3. 以下の値を抽出:

```
FIREBASE_ADMIN_PROJECT_ID="articard-prod"
FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk-xxxxx@articard-prod.iam.gserviceaccount.com"
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## 5. 外部APIキー取得

### 5.1 OpenAI

1. [OpenAI Platform](https://platform.openai.com/) にアクセス
2. API Keys → Create new secret key
3. 用途: 記事生成（GPT-4o-mini）、DALL-E 3（legendカード）

```
OPENAI_API_KEY="sk-proj-..."
```

### 5.2 FLUX (BFL)

1. [BFL API](https://api.bfl.ai/) にアクセス
2. アカウント作成 → APIキー取得
3. 用途: カード画像生成（common: Klein, super_rare: Pro）

```
BFL_API_KEY="bfl_..."
FLUX_API_URL="https://api.bfl.ai/v1"
```

### 5.3 Google Gemini

1. [Google AI Studio](https://aistudio.google.com/) にアクセス
2. Get API key → Create API key
3. 用途: rareカード画像生成

```
GOOGLE_GEMINI_API_KEY="AIza..."
```

---

## 6. Secret Manager設定

### 6.1 シークレット作成

```bash
# データベースURL
echo -n "postgresql://..." | gcloud secrets create articard-db-url --data-file=-

# OpenAI APIキー
echo -n "sk-proj-..." | gcloud secrets create articard-openai-key --data-file=-

# FLUX APIキー
echo -n "bfl_..." | gcloud secrets create articard-flux-key --data-file=-

# Gemini APIキー
echo -n "AIza..." | gcloud secrets create articard-gemini-key --data-file=-

# Firebase Admin 秘密鍵（改行をエスケープ済み）
echo -n "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" | \
  gcloud secrets create articard-firebase-key --data-file=-
```

### 6.2 Cloud Run サービスアカウントへの権限付与

```bash
gcloud secrets add-iam-policy-binding articard-db-url \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 他のシークレットも同様に設定
```

---

## 7. Cloud Run デプロイ

### 7.1 Artifact Registry リポジトリ作成

```bash
gcloud artifacts repositories create articard \
  --repository-format=docker \
  --location=asia-northeast1
```

### 7.2 Dockerイメージビルド・プッシュ

```bash
# ビルド
docker build -t asia-northeast1-docker.pkg.dev/articard-prod/articard/app:latest .

# プッシュ
docker push asia-northeast1-docker.pkg.dev/articard-prod/articard/app:latest
```

### 7.3 Cloud Run デプロイ

```bash
gcloud run deploy articard \
  --image=asia-northeast1-docker.pkg.dev/articard-prod/articard/app:latest \
  --region=asia-northeast1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --timeout=3600 \
  --add-cloudsql-instances=articard-prod:asia-northeast1:articard-prod-db \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="NEXT_PUBLIC_APP_URL=https://articard.com" \
  --set-env-vars="GCS_BUCKET_NAME=articard-prod-images" \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=articard-prod" \
  --set-secrets="DATABASE_URL=articard-db-url:latest" \
  --set-secrets="OPENAI_API_KEY=articard-openai-key:latest" \
  --set-secrets="BFL_API_KEY=articard-flux-key:latest" \
  --set-secrets="GOOGLE_GEMINI_API_KEY=articard-gemini-key:latest" \
  --set-secrets="FIREBASE_ADMIN_PRIVATE_KEY=articard-firebase-key:latest"
```

### 7.4 カスタムドメイン設定

```bash
gcloud run domain-mappings create \
  --service=articard \
  --domain=articard.com \
  --region=asia-northeast1
```

---

## 8. DBマイグレーション

### 8.1 マイグレーション実行

Cloud Run ジョブまたはローカルから実行:

```bash
# 環境変数設定
export DATABASE_URL="postgresql://articard_user:PASSWORD@INSTANCE_IP:5432/articard"

# マイグレーション実行
npx prisma migrate deploy
```

### 8.2 初期データ投入（必要に応じて）

```bash
npx prisma db seed
```

---

## 9. 動作確認チェックリスト

### GCPリソース
- [ ] Cloud SQL インスタンスが起動している
- [ ] Cloud Storage バケットが作成されている
- [ ] Cloud Run サービスがデプロイされている
- [ ] Secret Manager にすべてのシークレットが登録されている

### Firebase
- [ ] Authentication が有効になっている
- [ ] Webアプリが登録されている
- [ ] Admin SDK 秘密鍵が取得されている

### 外部API
- [ ] OpenAI APIキーが有効
- [ ] FLUX APIキーが有効
- [ ] Gemini APIキーが有効

### アプリケーション
- [ ] トップページが表示される
- [ ] ログイン/新規登録ができる
- [ ] 記事が生成できる
- [ ] カードが生成できる（各レアリティ）
- [ ] カード画像がGCSに保存される
- [ ] コレクションが表示される

### セキュリティ
- [ ] HTTPS が有効
- [ ] 認証が正常に動作する
- [ ] API エンドポイントが保護されている

---

## 環境変数一覧

本番環境で必要な環境変数の完全なリスト:

```bash
# Database
DATABASE_URL="postgresql://..."

# Firebase Auth (Client)
NEXT_PUBLIC_FIREBASE_API_KEY=""
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=""
NEXT_PUBLIC_FIREBASE_PROJECT_ID=""
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=""
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=""
NEXT_PUBLIC_FIREBASE_APP_ID=""

# Firebase Admin (Server)
FIREBASE_ADMIN_PROJECT_ID=""
FIREBASE_ADMIN_CLIENT_EMAIL=""
FIREBASE_ADMIN_PRIVATE_KEY=""

# External APIs
OPENAI_API_KEY=""
BFL_API_KEY=""
FLUX_API_URL="https://api.bfl.ai/v1"
GOOGLE_GEMINI_API_KEY=""

# Google Cloud Storage
GCS_BUCKET_NAME=""
GOOGLE_CLOUD_PROJECT=""

# App Settings
NEXT_PUBLIC_APP_URL="https://articard.com"
NODE_ENV="production"
MOCK_EXTERNAL_APIS="false"
```

---

## コスト見積もり（月額）

| サービス | 用途 | 月額目安 |
|---------|------|---------|
| Cloud SQL | PostgreSQL | $10-50 |
| Cloud Run | アプリホスティング | $5-30 |
| Cloud Storage | 画像保存 | $1-5 |
| Firebase Auth | 認証 | 無料（10K MAU以下） |
| OpenAI API | 記事生成 + DALL-E | 従量課金 |
| FLUX API | 画像生成 | 従量課金 |
| Gemini API | 画像生成 | 従量課金 |

**カード生成コスト（1枚あたり）:**
- legend: ~$0.10
- super_rare: ~$0.04
- rare: ~$0.03
- common: ~$0.005
- **平均: ~$0.02/枚**

---

## トラブルシューティング

### Cloud SQL 接続エラー

```
Error: connect ECONNREFUSED
```

→ Cloud Run の `--add-cloudsql-instances` 設定を確認

### GCS アップロードエラー

```
Error: Could not load the default credentials
```

→ サービスアカウントに `roles/storage.objectAdmin` 権限を付与

### Firebase 認証エラー

```
Error: Firebase ID token has expired
```

→ クライアントでトークンを再取得するロジックを確認

---

## 開発環境との違い

| 項目 | 開発環境 | 本番環境 |
|------|---------|---------|
| DB | Docker PostgreSQL | Cloud SQL (HA) |
| 画像保存 | public/uploads | Cloud Storage |
| Firebase | 開発プロジェクト | 本番プロジェクト |
| シークレット | .env ファイル | Secret Manager |
| デプロイ | npm run dev | Cloud Run |
| ドメイン | localhost:3000 | articard.com |
