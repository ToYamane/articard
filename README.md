<p align="center">
  <img src="public/logo/icon.webp" alt="Articard Logo" width="80" />
  <img src="public/logo/text.webp" alt="Articard" width="200" />
</p>

<p align="center">
  テーマを入力するだけで学習記事とコレクタブルカードをAI生成する、フルスタック学習プラットフォーム
</p>

<p align="center">
  <a href="https://articard.app"><strong>ランディングページ</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="https://articard.app/register"><strong>新規登録</strong></a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="docs/ArtiCard紹介.pdf">紹介資料 (PDF)</a>
</p>

---

## コンセプト

ユーザーが入力したテーマからAIが学習記事を生成し、記事内のキーワードから**世界に1枚だけのユニークなカード**を生成するサービスです。カードにはレア度があり、レア度に応じて異なるAIモデルがイラストを生成します。

## スクリーンショット

### カードレア度（Rare / Super Rare / Legend）

<p align="center">
  <img src="public/promo/card-rare.webp" alt="Rare Card" width="200" />
  <img src="public/promo/card-super-rare.webp" alt="Super Rare Card" width="200" />
  <img src="public/promo/card-legend.webp" alt="Legend Card" width="200" />
</p>

### 記事生成 ＆ チャレンジモード

<p align="center">
  <img src="public/promo/screenshot-article.webp" alt="Article Generation" width="340" />
  <img src="public/promo/screenshot-challenge.webp" alt="Challenge Mode" width="340" />
</p>

## 主要機能

1. **学習記事生成** - テーマを入力するとAIが800文字の学習記事を生成
2. **カード生成** - 記事からキーワードを抽出し、レア度・イラスト・テキスト付きのユニークなカードを生成
3. **コレクション** - 生成したカードを図鑑形式で管理・検索・フィルター
4. **SNS共有** - カード画像をX・LINEで共有、画像ダウンロード対応
5. **チャレンジモード** - 手持ちカードでAI対戦型クイズに挑戦。正解数に応じてコイン報酬を獲得
6. **コインシステム** - アプリ内通貨でカード生成。Stripe決済によるコイン購入にも対応

## 開発規模

- **84 コミット** / conventional commits 形式（`feat:`, `fix:`, `refactor:`）
- **422 ファイル** / フルスタック構成
- **135 件のユニットテスト**（Jest + React Testing Library）
- **CI/CD**: GCP Cloud Build → Docker → Cloud Run 自動デプロイ
- **11本の仕様書** による設計ドキュメント完備

## 技術スタック

| レイヤー       | 技術                                                          |
| -------------- | ------------------------------------------------------------- |
| フロントエンド | Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion |
| バックエンド   | Next.js API Routes                                            |
| データベース   | PostgreSQL (Prisma ORM)                                       |
| 認証           | Firebase Authentication                                       |
| ストレージ     | Google Cloud Storage                                          |
| 記事生成AI     | OpenAI API (GPT-4o-mini)                                      |
| 画像生成AI     | FLUX (BFL), Google Gemini, DALL-E 3                           |
| 決済           | Stripe (Checkout Session)                                     |
| 状態管理       | Zustand, TanStack Query                                       |
| インフラ       | Google Cloud Platform (Cloud Run)                             |

## 技術的なこだわり

- **レア度別マルチモデル画像生成** - Common(FLUX 1.1 Pro) / Rare(Gemini) / Super Rare(FLUX 2 Pro) / Legend(DALL-E 3 HD) と、レア度に応じて異なるAIモデルを切り替え
- **Canvas API によるカード画像合成** - テンプレート画像・イラスト・テキストをサーバーサイドで合成し、1枚のカード画像を生成
- **Firebase Auth + Bearer トークン認証** - Firebase IDトークンを検証する統一認証ミドルウェア (`withAuth` / `withAuthParams`)
- **Zod バリデーション + 統一エラーハンドリング** - 全APIルートで入力検証と `{ success, data }` / `{ success, error }` の一貫したレスポンス形式
- **Upstash Redis レートリミット** - APIエンドポイント毎にfail-open設計のレート制限
- **560+ ユニットテスト** - サービス層・APIルート・バリデーション・ビジネスロジックを網羅（38テストスイート）

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
│   │   ├── gemini/                   # Gemini画像生成
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

<details>
<summary>セットアップ（ローカル開発環境）</summary>

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

### 利用可能なコマンド

| コマンド              | 説明                        |
| --------------------- | --------------------------- |
| `npm run dev`         | 開発サーバー起動            |
| `npm run build`       | プロダクションビルド        |
| `npm run start`       | プロダクション起動          |
| `npm run lint`        | ESLint実行                  |
| `npm run type-check`  | 型チェック                  |
| `npm run test`        | テスト実行                  |
| `npm run db:generate` | Prisma クライアント生成     |
| `npm run db:push`     | スキーマをDBに反映          |
| `npm run db:studio`   | Prisma Studio（DBビューア） |

</details>

## 実装済み機能

- **認証**: Google OAuth、メール/パスワード認証、パスワードリセット
- **記事生成**: OpenAI GPT-4o-miniによるテーマベースの記事生成、バッチ生成対応
- **カード生成**: キーワード抽出、確率ベースのレア度計算、マルチモデルイラスト生成
- **コレクション**: 無限スクロール、レア度フィルター、検索、ソート
- **共有**: SNS共有（X, LINE）、画像ダウンロード、公開ページ
- **チャレンジモード**: AI対戦型クイズ、デッキ構築、スコアランキング
- **コインシステム**: アプリ内通貨、チャレンジ報酬、Stripe決済によるコイン購入
- **削除**: カード削除、記事削除、アカウント削除（確認モーダル付き）
- **テスト**: 560件のユニットテスト（38スイート）

## 仕様書

| ファイル                                                        | 内容                           |
| --------------------------------------------------------------- | ------------------------------ |
| [system-overview.md](docs/specs/system-overview.md)             | システム概要・技術スタック詳細 |
| [article-generation.md](docs/specs/article-generation.md)       | 記事生成機能                   |
| [card-generation.md](docs/specs/card-generation.md)             | カード生成機能                 |
| [batch-card-generation.md](docs/specs/batch-card-generation.md) | バッチカード生成               |
| [collection.md](docs/specs/collection.md)                       | コレクション機能               |
| [user-auth.md](docs/specs/user-auth.md)                         | 認証・ユーザー管理             |
| [database.md](docs/specs/database.md)                           | データベース設計               |
| [api-design.md](docs/specs/api-design.md)                       | API設計                        |
| [coin-system.md](docs/specs/coin-system.md)                     | コインシステム                 |
| [challenge-mode.md](docs/specs/challenge-mode.md)               | チャレンジモード               |
| [rarity-image-models.md](docs/specs/rarity-image-models.md)     | レア度別画像生成モデル         |
| [screen-flow.md](docs/specs/screen-flow.md)                     | 画面遷移図                     |
| [content-style.md](docs/specs/content-style.md)                 | コンテンツスタイル             |

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照
