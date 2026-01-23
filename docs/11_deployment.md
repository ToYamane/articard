# 11. デプロイフロー

## 11.1 環境構成

### 3環境構成

| 環境 | 用途 | GCPプロジェクト | ブランチ |
|------|------|----------------|---------|
| development | ローカル開発 | - | feature/* |
| staging | 検証・テスト | articard-staging | develop |
| production | 本番 | articard-prod | main |

### 環境別リソース

```
┌─────────────────────────────────────────────────────────────────┐
│                        Staging環境                               │
├─────────────────────────────────────────────────────────────────┤
│  Cloud Run: articard-staging                                     │
│  Cloud SQL: articard-staging-db (PostgreSQL 15)                  │
│  Cloud Storage: articard-staging-images                          │
│  Firebase: articard-staging                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       Production環境                             │
├─────────────────────────────────────────────────────────────────┤
│  Cloud Run: articard-prod                                        │
│  Cloud SQL: articard-prod-db (PostgreSQL 15, HA構成)             │
│  Cloud Storage: articard-prod-images                             │
│  Firebase: articard-prod                                         │
│  Cloud CDN: 静的アセット配信                                      │
└─────────────────────────────────────────────────────────────────┘
```

## 11.2 Cloud Build設定

### cloudbuild.yaml (Staging)

```yaml
# cloudbuild-staging.yaml
steps:
  # 1. 依存関係インストール
  - name: 'node:20'
    entrypoint: npm
    args: ['ci']

  # 2. 型チェック
  - name: 'node:20'
    entrypoint: npm
    args: ['run', 'type-check']

  # 3. リント
  - name: 'node:20'
    entrypoint: npm
    args: ['run', 'lint']

  # 4. テスト実行
  - name: 'node:20'
    entrypoint: npm
    args: ['run', 'test']
    env:
      - 'DATABASE_URL=postgresql://test:test@localhost:5432/test'

  # 5. ビルド
  - name: 'node:20'
    entrypoint: npm
    args: ['run', 'build']
    env:
      - 'NEXT_PUBLIC_APP_URL=https://articard-staging-xxx.run.app'

  # 6. Dockerイメージビルド
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/articard/app:$SHORT_SHA'
      - '-t'
      - 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/articard/app:staging'
      - '.'

  # 7. イメージプッシュ
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - '--all-tags'
      - 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/articard/app'

  # 8. Cloud Runデプロイ
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'articard-staging'
      - '--image=asia-northeast1-docker.pkg.dev/$PROJECT_ID/articard/app:$SHORT_SHA'
      - '--region=asia-northeast1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--set-secrets=DATABASE_URL=articard-db-url:latest,OPENAI_API_KEY=openai-api-key:latest,FLUX_API_KEY=flux-api-key:latest'

  # 9. データベースマイグレーション
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: bash
    args:
      - '-c'
      - |
        gcloud run jobs execute articard-migrate-staging --region=asia-northeast1 --wait

options:
  logging: CLOUD_LOGGING_ONLY

timeout: '1200s'

# developブランチへのプッシュでトリガー
trigger:
  branch: develop
```

### cloudbuild.yaml (Production)

```yaml
# cloudbuild-prod.yaml
steps:
  # 1. 依存関係インストール
  - name: 'node:20'
    entrypoint: npm
    args: ['ci']

  # 2. 型チェック
  - name: 'node:20'
    entrypoint: npm
    args: ['run', 'type-check']

  # 3. リント
  - name: 'node:20'
    entrypoint: npm
    args: ['run', 'lint']

  # 4. テスト実行
  - name: 'node:20'
    entrypoint: npm
    args: ['run', 'test']

  # 5. ビルド
  - name: 'node:20'
    entrypoint: npm
    args: ['run', 'build']
    env:
      - 'NEXT_PUBLIC_APP_URL=https://articard.com'

  # 6. Dockerイメージビルド
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/articard/app:$SHORT_SHA'
      - '-t'
      - 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/articard/app:latest'
      - '.'

  # 7. イメージプッシュ
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - '--all-tags'
      - 'asia-northeast1-docker.pkg.dev/$PROJECT_ID/articard/app'

  # 8. Cloud Runデプロイ（トラフィック段階移行）
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'articard-prod'
      - '--image=asia-northeast1-docker.pkg.dev/$PROJECT_ID/articard/app:$SHORT_SHA'
      - '--region=asia-northeast1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--no-traffic'  # 最初はトラフィックを流さない
      - '--tag=canary'
      - '--set-secrets=DATABASE_URL=articard-db-url:latest,OPENAI_API_KEY=openai-api-key:latest,FLUX_API_KEY=flux-api-key:latest'

  # 9. データベースマイグレーション
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: bash
    args:
      - '-c'
      - |
        gcloud run jobs execute articard-migrate-prod --region=asia-northeast1 --wait

options:
  logging: CLOUD_LOGGING_ONLY

timeout: '1800s'

# mainブランチへのプッシュでトリガー（手動承認必要）
trigger:
  branch: main
```

## 11.3 Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# 依存関係インストール
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ビルド
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# 本番イメージ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 8080
ENV PORT=8080

CMD ["node", "server.js"]
```

## 11.4 デプロイフロー

### 通常のデプロイフロー

```
┌─────────────────────────────────────────────────────────────────┐
│                     開発フロー                                   │
└─────────────────────────────────────────────────────────────────┘

  feature/xxx ──PR──> develop ──PR──> main
       │                 │              │
       ▼                 ▼              ▼
   ローカル開発      Staging自動     Production手動
                    デプロイ        デプロイ
```

### 詳細フロー

#### 1. Feature開発

```bash
# featureブランチ作成
git checkout -b feature/add-new-feature develop

# 開発作業
# ...

# developへPR作成
gh pr create --base develop
```

#### 2. Stagingデプロイ（自動）

```bash
# developへのマージでCloud Buildが自動実行
# - テスト実行
# - ビルド
# - Staging環境へデプロイ
# - マイグレーション実行
```

#### 3. Productionデプロイ（手動承認）

```bash
# developからmainへPR作成
gh pr create --base main --head develop --title "Release v1.x.x"

# PRマージ後、Cloud Buildが実行
# - テスト実行
# - ビルド
# - Canaryリビジョンとしてデプロイ（トラフィックなし）

# 手動でトラフィック移行
gcloud run services update-traffic articard-prod \
  --region=asia-northeast1 \
  --to-tags=canary=10  # 10%のトラフィックをcanaryへ

# 問題なければ100%移行
gcloud run services update-traffic articard-prod \
  --region=asia-northeast1 \
  --to-latest
```

## 11.5 ロールバック手順

### Cloud Runロールバック

```bash
# リビジョン一覧確認
gcloud run revisions list --service=articard-prod --region=asia-northeast1

# 特定リビジョンへロールバック
gcloud run services update-traffic articard-prod \
  --region=asia-northeast1 \
  --to-revisions=articard-prod-00010-abc=100
```

### データベースロールバック

```bash
# マイグレーション履歴確認
npx prisma migrate status

# 注意: Prismaは直接ロールバックをサポートしていない
# 必要に応じてバックアップから復元または手動SQLで対応
```

## 11.6 Secret Manager設定

### シークレット一覧

| シークレット名 | 用途 |
|---------------|------|
| articard-db-url | データベース接続文字列 |
| openai-api-key | OpenAI APIキー |
| flux-api-key | FLUX (BFL) APIキー |
| firebase-admin-key | Firebase Admin SDK秘密鍵 |

### シークレット作成

```bash
# シークレット作成
echo -n "your-secret-value" | gcloud secrets create articard-db-url \
  --replication-policy="automatic" \
  --data-file=-

# シークレット更新
echo -n "new-secret-value" | gcloud secrets versions add articard-db-url \
  --data-file=-

# Cloud Runへの権限付与
gcloud secrets add-iam-policy-binding articard-db-url \
  --member="serviceAccount:articard-prod@articard-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## 11.7 モニタリング

### Cloud Run メトリクス

- リクエスト数
- レイテンシ（P50, P95, P99）
- エラーレート
- インスタンス数
- メモリ使用率
- CPU使用率

### アラート設定

```yaml
# アラートポリシー例
- name: "High Error Rate"
  condition:
    metric: "run.googleapis.com/request_count"
    filter: "response_code_class=5xx"
    threshold: 10  # 5分間で10リクエスト以上
  notification:
    - email
    - slack

- name: "High Latency"
  condition:
    metric: "run.googleapis.com/request_latencies"
    percentile: 95
    threshold: 5000  # 5秒以上
  notification:
    - email
```

## 11.8 環境変数（環境別）

### Staging

```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://articard-staging-xxx.run.app
DATABASE_URL=<Secret Manager経由>
OPENAI_API_KEY=<Secret Manager経由>
FLUX_API_KEY=<Secret Manager経由>
FLUX_API_URL=https://api.bfl.ml/v1
GCS_BUCKET_NAME=articard-staging-images
```

### Production

```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://articard.com
DATABASE_URL=<Secret Manager経由>
OPENAI_API_KEY=<Secret Manager経由>
FLUX_API_KEY=<Secret Manager経由>
FLUX_API_URL=https://api.bfl.ml/v1
GCS_BUCKET_NAME=articard-prod-images
```

## 11.9 チェックリスト

### デプロイ前チェック

- [ ] テストが全てパス
- [ ] 型チェックエラーなし
- [ ] リントエラーなし
- [ ] マイグレーションファイルがコミット済み
- [ ] 環境変数・シークレットが設定済み

### デプロイ後チェック

- [ ] ヘルスチェックエンドポイント応答確認
- [ ] 主要機能の動作確認
- [ ] エラーログの確認
- [ ] パフォーマンスメトリクスの確認
