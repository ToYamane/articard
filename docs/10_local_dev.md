# 10. ローカル開発環境

## 10.1 前提条件

### 必要なツール

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Node.js | 20.x | ランタイム |
| npm / pnpm | 最新 | パッケージ管理 |
| Docker | 最新 | PostgreSQL実行 |
| Docker Compose | 最新 | コンテナオーケストレーション |
| gcloud CLI | 最新 | GCP操作（任意） |
| Firebase CLI | 最新 | Firebase操作 |

## 10.2 Docker Compose設定

### docker-compose.yml

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    container_name: articard-db
    environment:
      POSTGRES_USER: articard
      POSTGRES_PASSWORD: articard_dev_password
      POSTGRES_DB: articard
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U articard"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### データベース起動コマンド

```bash
# 起動
docker compose up -d

# 停止
docker compose down

# データを含めて削除
docker compose down -v

# ログ確認
docker compose logs -f db
```

## 10.3 環境変数テンプレート

### .env.local

```bash
# ===================================
# Articard ローカル開発環境変数
# ===================================

# ----- Database -----
DATABASE_URL="postgresql://articard:articard_dev_password@localhost:5432/articard"

# ----- Firebase Auth -----
NEXT_PUBLIC_FIREBASE_API_KEY="your-firebase-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"

# Firebase Admin SDK（サーバーサイド）
FIREBASE_ADMIN_PROJECT_ID="your-project-id"
FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com"
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# ----- OpenAI -----
OPENAI_API_KEY="sk-your-openai-api-key"

# ----- FLUX API (BFL) -----
FLUX_API_KEY="your-bfl-api-key"
FLUX_API_URL="https://api.bfl.ml/v1"

# ----- Google Cloud Storage -----
GCS_BUCKET_NAME="articard-dev-images"
GOOGLE_CLOUD_PROJECT="your-gcp-project-id"

# 開発時はエミュレーターまたはサービスアカウント
GOOGLE_APPLICATION_CREDENTIALS="./service-account.json"

# ----- App Settings -----
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### .env.example

プロジェクトルートに配置し、Git管理対象とする。

```bash
# .env.example - 開発者向けテンプレート
# このファイルをコピーして .env.local を作成してください
# cp .env.example .env.local

DATABASE_URL="postgresql://articard:articard_dev_password@localhost:5432/articard"

NEXT_PUBLIC_FIREBASE_API_KEY=""
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=""
NEXT_PUBLIC_FIREBASE_PROJECT_ID=""
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=""
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=""
NEXT_PUBLIC_FIREBASE_APP_ID=""

FIREBASE_ADMIN_PROJECT_ID=""
FIREBASE_ADMIN_CLIENT_EMAIL=""
FIREBASE_ADMIN_PRIVATE_KEY=""

OPENAI_API_KEY=""
FLUX_API_KEY=""
FLUX_API_URL="https://api.bfl.ml/v1"

GCS_BUCKET_NAME=""
GOOGLE_CLOUD_PROJECT=""
GOOGLE_APPLICATION_CREDENTIALS=""

NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

## 10.4 外部APIのモック戦略

### 開発時のモード

| モード | 環境変数 | 動作 |
|--------|---------|------|
| 本番モード | `MOCK_EXTERNAL_APIS=false` | 実際のAPIを使用 |
| モックモード | `MOCK_EXTERNAL_APIS=true` | モックレスポンスを返却 |

### OpenAI APIモック

```typescript
// src/lib/mocks/openai.ts

export const mockArticleGeneration = {
  title: "モック記事タイトル",
  content: "これはモック記事の内容です。開発時に使用されます。",
  summary: "モック記事の要約",
  keywords: [
    { word: "キーワード1", importance: 0.9 },
    { word: "キーワード2", importance: 0.7 },
    { word: "キーワード3", importance: 0.5 },
  ],
};

export const mockModerationResult = {
  flagged: false,
  categories: {},
  category_scores: {},
};
```

### FLUX APIモック

```typescript
// src/lib/mocks/flux.ts

// 開発時用のプレースホルダー画像URL
export const mockImageUrl = "https://placehold.co/512x512/png?text=Mock+Card";

export const mockImageGeneration = async () => {
  // 本番と同じ遅延をシミュレート
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return {
    url: mockImageUrl,
    width: 512,
    height: 512,
  };
};
```

### モック切り替えの実装例

```typescript
// src/lib/api/image-generation.ts

import { mockImageGeneration } from "../mocks/flux";

export async function generateCardImage(prompt: string): Promise<string> {
  if (process.env.MOCK_EXTERNAL_APIS === "true") {
    const result = await mockImageGeneration();
    return result.url;
  }

  // 実際のFLUX API呼び出し
  const response = await fetch(`${process.env.FLUX_API_URL}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.FLUX_API_KEY}`,
    },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();
  return data.url;
}
```

## 10.5 ローカル起動手順

### 初回セットアップ

```bash
# 1. リポジトリクローン
git clone https://github.com/your-org/articard.git
cd articard

# 2. 依存関係インストール
npm install

# 3. 環境変数設定
cp .env.example .env.local
# .env.local を編集して必要な値を設定

# 4. データベース起動
docker compose up -d

# 5. データベースマイグレーション
npx prisma migrate dev

# 6. Prisma Client生成
npx prisma generate

# 7. 開発サーバー起動
npm run dev
```

### 日常の開発フロー

```bash
# データベース起動（まだ起動していない場合）
docker compose up -d

# 開発サーバー起動
npm run dev

# ブラウザでアクセス
# http://localhost:3000
```

### 便利なコマンド

```bash
# Prisma Studio（DBのGUI）
npx prisma studio

# データベースリセット
npx prisma migrate reset

# 型チェック
npm run type-check

# リント
npm run lint

# テスト実行
npm run test

# ビルド確認
npm run build
```

## 10.6 トラブルシューティング

### データベース接続エラー

```bash
# Dockerコンテナの状態確認
docker compose ps

# PostgreSQLのログ確認
docker compose logs db

# 手動で接続テスト
docker exec -it articard-db psql -U articard -d articard
```

### ポート競合

```bash
# 5432ポートが使用中の場合
# docker-compose.yml のポートを変更
ports:
  - "5433:5432"  # ホスト側を5433に変更

# .env.local も更新
DATABASE_URL="postgresql://articard:articard_dev_password@localhost:5433/articard"
```

### Prismaエラー

```bash
# スキーマとDBの同期
npx prisma db push

# マイグレーションの強制リセット（開発時のみ）
npx prisma migrate reset --force

# Prisma Clientの再生成
npx prisma generate
```

### Firebase認証エラー

```bash
# Firebaseエミュレーター使用（任意）
firebase emulators:start --only auth

# .env.local に追加
NEXT_PUBLIC_USE_FIREBASE_EMULATOR="true"
```

## 10.7 ディレクトリ構造

```
articard/
├── .env.example          # 環境変数テンプレート
├── .env.local            # ローカル環境変数（Git管理外）
├── docker-compose.yml    # Docker Compose設定
├── prisma/
│   ├── schema.prisma     # Prismaスキーマ
│   └── migrations/       # マイグレーションファイル
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # UIコンポーネント
│   ├── lib/
│   │   ├── api/          # API関連
│   │   ├── mocks/        # モックデータ
│   │   └── utils/        # ユーティリティ
│   └── types/            # TypeScript型定義
├── public/               # 静的ファイル
└── tests/                # テストファイル
```
