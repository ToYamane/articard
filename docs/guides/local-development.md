# 10. ローカル開発環境

## 10.1 前提条件

### 必要なツール

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Node.js | 20.x | ランタイム |
| npm / pnpm | 最新 | パッケージ管理 |
| Cloud SQL Proxy | 最新 | Cloud SQL接続 |
| gcloud CLI | 最新 | GCP認証 |
| Firebase CLI | 最新 | Firebase操作 |

### Cloud SQL Proxyの準備

```bash
# ダウンロード（Windows）
# https://cloud.google.com/sql/docs/mysql/connect-auth-proxy#install

# GCP認証
gcloud auth application-default login
```

## 10.2 環境変数

### .env

```bash
# ===================================
# Articard 環境変数
# ===================================

# ----- Database (Cloud SQL via Proxy) -----
DATABASE_URL="postgresql://articard_user:articard_cloud_pass_2024@localhost:5433/articard"

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
GOOGLE_APPLICATION_CREDENTIALS="./service-account.json"

# ----- App Settings -----
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

## 10.3 外部APIのモック戦略

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

## 10.4 ローカル起動手順

### 初回セットアップ

```bash
# 1. リポジトリクローン
git clone https://github.com/your-org/articard.git
cd articard

# 2. 依存関係インストール
npm install

# 3. 環境変数設定
cp .env.example .env
# .env を編集して必要な値を設定

# 4. GCP認証
gcloud auth application-default login

# 5. Cloud SQL Proxy起動（別ターミナル）
./cloud-sql-proxy.exe articard-ff673:asia-northeast1:articard-db --port 5433

# 6. Prisma Client生成
npx prisma generate

# 7. 開発サーバー起動
npm run dev
```

### 日常の開発フロー

```bash
# ターミナル1: Cloud SQL Proxy起動
./cloud-sql-proxy.exe articard-ff673:asia-northeast1:articard-db --port 5433

# ターミナル2: 開発サーバー起動
npm run dev

# ブラウザでアクセス
# http://localhost:3000
```

### 便利なコマンド

```bash
# Prisma Studio（DBのGUI）
npx prisma studio

# スキーマをDBに反映
npm run db:push

# 型チェック
npm run type-check

# リント
npm run lint

# テスト実行
npm run test

# ビルド確認
npm run build
```

## 10.5 トラブルシューティング

### データベース接続エラー

```bash
# Cloud SQL Proxyが起動しているか確認
# 別ターミナルで起動中であることを確認

# GCP認証が有効か確認
gcloud auth application-default print-access-token
```

### Prismaエラー

```bash
# スキーマとDBの同期
npx prisma db push

# Prisma Clientの再生成
npx prisma generate
```

### Firebase認証エラー

```bash
# Firebaseエミュレーター使用（任意）
firebase emulators:start --only auth

# .env に追加
NEXT_PUBLIC_USE_FIREBASE_EMULATOR="true"
```

### よくあるエラー一覧

| エラー | 原因 | 対処 |
|--------|------|------|
| `Can't reach database server at localhost:5433` | Cloud SQL Proxy未起動 | Proxyを起動 |
| `The column X does not exist` | スキーマ未同期 | `npm run db:push` |
| `Port 3000 is in use` | 古いNodeプロセスが残っている | PowerShell: `Get-Process node \| Stop-Process -Force` |
| `EPERM: operation not permitted` (Prisma) | Nodeプロセスがファイルをロック中 | 全Nodeプロセス停止後に再試行 |

## 10.6 ディレクトリ構造

```
articard/
├── .env                  # 環境変数（Git管理外）
├── .env.example          # 環境変数テンプレート
├── cloud-sql-proxy.exe   # Cloud SQL Proxy
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
