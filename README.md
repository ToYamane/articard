<p align="center">
  <img src="image/logo/ArtiCard_logo_transparent.png" alt="Articard Logo" width="120">
</p>

<h1 align="center">Articard</h1>

<p align="center">
  AIを活用した学習記事生成 × コレクタブルカード生成アプリケーション
</p>

<p align="center">
  <strong>🏆 AWS 地域創生・社会課題解決 AI プログラミングコンテスト 仙台大会 最優秀賞</strong>
</p>

## コンセプト

ユーザーが入力したテーマから学習記事をAI生成し、記事内のキーワードから世界に1枚だけのユニークなカードを生成するサービス。「学ぶ楽しさ」と「集める楽しさ」を融合し、子どもから大人まで楽しみながら学べるプラットフォームを目指しています。

## スクリーンショット

<table>
  <tr>
    <td align="center" width="33%">
      <img src="image/promo/article-generation.png" alt="記事生成" width="280"><br>
      <strong>記事生成</strong><br>
      テーマを入力するとAIが学習記事を生成
    </td>
    <td align="center" width="33%">
      <img src="image/promo/card-battle.png" alt="カード選択" width="280"><br>
      <strong>カード選択</strong><br>
      AIとの対話で記事からユニークなカードを生成
    </td>
    <td align="center" width="33%">
      <img src="image/promo/card-result.png" alt="カード結果" width="280"><br>
      <strong>カード結果</strong><br>
      適合度・レア度が計算されたコレクタブルカード
    </td>
  </tr>
</table>

<p align="center">
  <img src="image/promo/026495f1-3d50-455c-916c-4e5da1e224d8_card.webp" alt="カードサンプル" width="200">
</p>

## 主要機能

1. **学習記事生成** - テーマを入力すると800文字の学習記事を生成
2. **カード生成** - 記事からキーワードを抽出し、文脈に応じたレア度・イラスト・テキストのカードを生成
3. **コレクション** - 生成したカードを図鑑形式で管理・検索・フィルター
4. **SNS共有** - カードを画像としてSNSに共有（X, LINE対応）

## 開発規模

- **84 コミット** / conventional commits 形式（`feat:`, `fix:`, `refactor:`）
- **422 ファイル** / フルスタック構成
- **135 件のユニットテスト**（Jest + React Testing Library）
- **CI/CD**: GCP Cloud Build → Docker → Cloud Run 自動デプロイ
- **11本の仕様書** による設計ドキュメント完備

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion |
| バックエンド | Next.js API Routes |
| データベース | PostgreSQL (Prisma ORM) |
| 認証 | Firebase Authentication |
| ストレージ | Google Cloud Storage |
| 記事生成AI | OpenAI API (GPT-4o-mini) |
| 画像生成AI | FLUX API (Black Forest Labs) |
| 状態管理 | Zustand, TanStack Query |
| インフラ | Google Cloud Platform (Cloud Run) |

## プロジェクト構造

```
articard/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # 認証ページ (login, register, setup)
│   │   ├── (main)/                   # 認証済みページ (home, create, collection, etc.)
│   │   ├── (public)/                 # 公開ページ (share/[id])
│   │   └── api/                      # API Routes
│   ├── components/
│   │   ├── ui/                       # 汎用UI (Button, Input, Modal, Toast)
│   │   ├── auth/                     # 認証 (LoginForm, OAuthButtons, AuthGuard)
│   │   ├── article/                  # 記事 (ThemeInput, ArticleView)
│   │   ├── card/                     # カード (CardDisplay, CardGrid, RarityBadge)
│   │   ├── collection/               # コレクション (Filter, Search, Stats)
│   │   └── share/                    # 共有 (ShareModal, ShareButtons)
│   ├── lib/
│   │   ├── services/                 # ビジネスロジック
│   │   ├── openai/                   # OpenAI連携
│   │   ├── flux/                     # FLUX API連携
│   │   ├── firebase/                 # Firebase Auth
│   │   ├── gcs/                      # Cloud Storage
│   │   ├── card/                     # カード生成ロジック (rarity, image-composer)
│   │   ├── errors/                   # エラーハンドリング
│   │   └── validations/              # Zodスキーマ
│   ├── hooks/                        # カスタムフック
│   ├── stores/                       # Zustand ストア
│   ├── types/                        # 型定義
│   └── constants/                    # 定数
├── prisma/                           # Prismaスキーマ
├── __tests__/                        # テストファイル
├── public/images/card-templates/     # レア度別カードテンプレート
└── docs/                             # 仕様書
```

## セットアップ

### 前提条件

- Node.js 18+
- Docker & Docker Compose
- Firebase プロジェクト（認証用）
- OpenAI API キー（記事・カード生成用）
- FLUX API キー（イラスト生成用）
- Google Cloud Storage バケット（画像保存用）

### 1. リポジトリのクローン

```bash
git clone https://github.com/ToYamane/articard.git
cd articard
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local` を編集して各APIキーを設定:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/articard"

# Firebase (Client)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your_project.iam.gserviceaccount.com

# OpenAI
OPENAI_API_KEY=sk-...

# FLUX (Black Forest Labs)
BFL_API_KEY=your_flux_api_key

# Google Cloud Storage
GCS_BUCKET_NAME=your_bucket_name
GCS_PROJECT_ID=your_project_id
GCS_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. データベース起動

```bash
docker-compose up -d
```

### 5. Prisma マイグレーション

```bash
npm run db:generate
npm run db:push
```

### 6. 開発サーバー起動

```bash
npm run dev
```

アプリケーションは http://localhost:3000 で起動します。

## 利用可能なコマンド

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run start` | プロダクション起動 |
| `npm run lint` | ESLint実行 |
| `npm run type-check` | 型チェック |
| `npm run test` | テスト実行 |
| `npm run db:generate` | Prisma クライアント生成 |
| `npm run db:push` | スキーマをDBに反映 |
| `npm run db:studio` | Prisma Studio（DBビューア） |

## 実装状況

### Phase 1: MVP

| フェーズ | ステータス |
|---------|-----------|
| Phase 1-A: プロジェクト基盤構築 | ✅ 完了 |
| Phase 1-B: 認証機能 | ✅ 完了 |
| Phase 1-C: 記事生成機能 | ✅ 完了 |
| Phase 1-D: カード生成機能 | ✅ 完了 |
| Phase 1-E: コレクション機能 | ✅ 完了 |
| Phase 1-F: 共有機能 | ✅ 完了 |
| Phase 1-G: 削除機能・UI仕上げ | ✅ 完了 |
| Phase 1-H: テスト・デプロイ準備 | 🔄 進行中 |

### 実装済み機能

- **認証**: Google OAuth、メール/パスワード認証
- **記事生成**: OpenAI GPT-4o-miniによるテーマベースの記事生成
- **カード生成**: キーワード抽出、レア度計算、FLUX APIによるイラスト生成
- **コレクション**: 無限スクロール、レア度フィルター、検索、ソート
- **共有**: SNS共有（X, LINE）、画像ダウンロード、公開ページ
- **削除**: カード削除、記事削除、アカウント削除（確認モーダル付き）
- **テスト**: 135件のユニットテスト

## 仕様書

```
docs/
├── 01_overview.md          # システム概要・技術スタック詳細
├── 02_article_generation.md # 記事生成機能
├── 03_card_generation.md    # カード生成機能
├── 04_collection.md         # コレクション機能
├── 05_user_auth.md          # 認証・ユーザー管理
├── 06_database.md           # データベース設計（ER図）
├── 07_api_design.md         # API設計
├── 08_screen_flow.md        # 画面遷移図
├── 09_testing.md            # テスト方針
├── 10_local_dev.md          # ローカル開発
└── 11_deployment.md         # デプロイフロー
```

## ライセンス

Private - All rights reserved
