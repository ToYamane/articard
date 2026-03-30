# 12. 実装記録

このドキュメントはArticard MVP Phase 1の実装進捗を記録します。

---

## 実装状況サマリー

| フェーズ                        | ステータス | 完了日     |
| ------------------------------- | ---------- | ---------- |
| Phase 1-A: プロジェクト基盤構築 | ✅ 完了    | 2026-01-22 |
| Phase 1-B: 認証機能             | ✅ 完了    | 2026-01-22 |
| Phase 1-C: 記事生成機能         | ✅ 完了    | 2026-01-22 |
| Phase 1-D: カード生成機能       | ✅ 完了    | 2026-01-22 |
| Phase 1-E: コレクション機能     | ✅ 完了    | 2026-01-23 |
| Phase 1-F: 共有機能             | ✅ 完了    | 2026-01-23 |
| Phase 1-G: 削除機能・UI仕上げ   | ✅ 完了    | 2026-01-23 |
| Phase 1-H: テスト・デプロイ準備 | ✅ 完了    | 2026-01-23 |
| **レアリティ別画像生成モデル**  | ✅ 完了    | 2026-01-24 |
| **チャレンジモード**            | ✅ 完了    | 2026-01-25 |

---

## Phase 1-A: プロジェクト基盤構築 [完了]

**実施日**: 2026-01-22

### 実施内容

#### 1. Next.js 14 プロジェクト初期化

- `npx create-next-app@14` でプロジェクト作成
- TypeScript, App Router, Tailwind CSS, ESLint 有効
- src ディレクトリ構成採用

#### 2. 依存関係インストール

**本番依存関係:**

```json
{
  "@prisma/client": "^5.22.0",
  "@tanstack/react-query": "^5.90.19",
  "clsx": "^2.1.1",
  "firebase": "^12.8.0",
  "firebase-admin": "^13.6.0",
  "framer-motion": "^12.28.2",
  "next": "14.2.35",
  "openai": "^6.16.0",
  "sharp": "^0.34.5",
  "tailwind-merge": "^3.4.0",
  "zod": "^4.3.5",
  "zustand": "^5.0.10"
}
```

**開発依存関係:**

```json
{
  "prisma": "^5.22.0",
  "jest": "^30.2.0",
  "@testing-library/react": "^16.3.2",
  "prettier": "^3.8.1",
  "prettier-plugin-tailwindcss": "^0.7.2"
}
```

#### 3. Docker Compose設定

**PostgreSQL設定:**

- イメージ: `postgres:15`
- ポート: 5432
- DB名: articard
- ユーザー: articard
- パスワード: articard_dev_password

#### 4. Prismaスキーマ定義

**定義したモデル:**

- `User` - ユーザー情報 (Firebase UIDをPKとして使用)
- `Article` - 生成された記事
- `Card` - 生成されたカード
- `CoinTransaction` - コイン取引履歴 (Phase 2用)

**インデックス設定:**

- 各テーブルに適切なインデックスを設定
- 検索・ソート用の複合インデックス含む

#### 5. 環境変数テンプレート

**作成ファイル:**

- `.env.example` - 開発者向けテンプレート
- `.env` - ローカル開発用設定

**設定項目:**

- DATABASE_URL
- Firebase設定 (Client/Admin)
- OpenAI API
- FLUX API
- Google Cloud Storage

#### 6. ESLint/Prettier/Jest設定

**ESLint:**

- `next/core-web-vitals`, `next/typescript` 継承
- Prettier統合 (`eslint-config-prettier`)

**Prettier:**

- セミコロン有り
- シングルクォート
- Tailwind CSSプラグイン統合

**Jest:**

- `next/jest` 使用
- `jest-environment-jsdom`
- `@testing-library/jest-dom`

#### 7. 共通UIコンポーネント

**作成したコンポーネント:**

| コンポーネント   | 機能                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| `Button`         | variant (primary/secondary/ghost/danger), size (sm/md/lg), isLoading |
| `Input`          | label, error, showCharCount, maxLength                               |
| `Modal`          | isOpen, onClose, title, AnimatePresence対応                          |
| `Toast`          | type (success/error/info/warning), duration                          |
| `ToastContainer` | 複数Toast管理                                                        |
| `LoadingSpinner` | size (sm/md/lg)                                                      |
| `FullPageLoader` | 全画面ローディング                                                   |

**作成したフック:**

- `useToast` - Toast状態管理

**作成したユーティリティ:**

- `cn()` - Tailwind CSSクラスマージ
- `formatDate()` - 日付フォーマット
- `formatRelativeTime()` - 相対時間表示
- `truncate()` - テキスト切り詰め
- `getRarityStars()` - レア度星表示

### 作成ファイル一覧

```
articard/
├── docker-compose.yml
├── .env
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── jest.config.js
├── jest.setup.js
├── prisma/
│   └── schema.prisma
└── src/
    ├── lib/
    │   ├── prisma.ts
    │   └── utils.ts
    ├── types/
    │   ├── api.ts
    │   └── database.ts
    ├── components/ui/
    │   ├── button.tsx
    │   ├── input.tsx
    │   ├── modal.tsx
    │   ├── toast.tsx
    │   ├── loading-spinner.tsx
    │   └── index.ts
    └── hooks/
        └── use-toast.ts
```

### 検証結果

```bash
# 型チェック
npm run type-check  # パス

# リント
npm run lint  # エラーなし

# Prisma Client生成
npx prisma generate  # 成功
```

### 追加したnpmスクリプト

```json
{
  "lint:fix": "next lint --fix",
  "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
  "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
  "type-check": "tsc --noEmit",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:push": "prisma db push",
  "db:studio": "prisma studio"
}
```

---

## Phase 1-B: 認証機能 [完了]

**実施日**: 2026-01-22

### 実施内容

#### 1. Firebase Client SDK初期化

**ファイル:** `src/lib/firebase/client.ts`

**機能:**

- Firebase App初期化（シングルトンパターン）
- メール/パスワード認証
  - `signInWithEmail()` - メールログイン
  - `signUpWithEmail()` - メール登録
- OAuth認証
  - `signInWithGoogle()` - Googleログイン（ポップアップ）
  - `signInWithApple()` - Appleログイン（ポップアップ）
- `signOut()` - ログアウト
- `onAuthStateChanged()` - 認証状態監視
- `getIdToken()` - IDトークン取得

#### 2. Firebase Admin SDK初期化

**ファイル:** `src/lib/firebase/admin.ts`

**機能:**

- サーバーサイドFirebase Admin初期化
- `verifyIdToken()` - IDトークン検証
- `getUserByUid()` - UID指定でユーザー取得
- `deleteUser()` - ユーザー削除

#### 3. 認証ミドルウェア

**ファイル:** `src/lib/auth.ts`

**機能:**

- `verifyAuth()` - リクエストヘッダーからIDトークンを検証
- AuthUser型定義（uid, email, emailVerified）
- Bearerトークン抽出・検証

#### 4. バリデーションスキーマ

**ファイル:** `src/lib/validations/user.ts`

**スキーマ:**
| スキーマ | 用途 | バリデーション |
|---------|------|---------------|
| `nicknameSchema` | ニックネーム | 2-20文字、英数字/ひらがな/カタカナ/漢字 |
| `registerUserSchema` | ユーザー登録 | nickname必須 |
| `updateUserSchema` | プロフィール更新 | nicknameオプション |
| `emailSchema` | メール | 有効なメールアドレス形式 |
| `passwordSchema` | パスワード | 8-100文字 |
| `loginSchema` | ログインフォーム | email + password |
| `signUpSchema` | 登録フォーム | email + password + confirmPassword（一致チェック） |

#### 5. 認証ストア・フック

**ファイル:** `src/stores/auth-store.ts`

**状態:**

- `user` - Firebaseユーザー情報
- `dbUser` - DBユーザー情報（Prisma）
- `isAuthenticated` - 認証済みフラグ
- `isLoading` - ローディング状態
- `needsSetup` - 初期設定必要フラグ

**永続化:**

- Zustand persist middleware
- localStorage使用

**ファイル:** `src/hooks/use-auth.ts`

**機能:**

- `loginWithEmail()` - メールログイン
- `loginWithGoogle()` - Googleログイン
- `loginWithApple()` - Appleログイン
- `registerWithEmail()` - メール登録
- `registerUser()` - DB登録（ニックネーム設定）
- `logout()` - ログアウト
- `updateProfile()` - プロフィール更新
- `fetchDbUser()` - DBユーザー取得

#### 6. 認証コンポーネント

**ファイル一覧:**

| コンポーネント      | ファイル                  | 機能                             |
| ------------------- | ------------------------- | -------------------------------- |
| `LoginForm`         | `login-form.tsx`          | ログインフォーム（メール/OAuth） |
| `RegisterForm`      | `register-form.tsx`       | 登録フォーム（メール/OAuth）     |
| `NicknameSetupForm` | `nickname-setup-form.tsx` | ニックネーム初期設定             |
| `OAuthButtons`      | `oauth-buttons.tsx`       | Google/Appleログインボタン       |
| `AuthGuard`         | `auth-guard.tsx`          | ルート保護コンポーネント         |

**AuthGuard設定:**

- `requireAuth` - 認証必須
- `requireSetup` - 初期設定必須
- `redirectTo` - 認証失敗時リダイレクト先

#### 7. 認証ページ

**ページ構成:**

```
src/app/(auth)/
├── layout.tsx        # 認証ページ共通レイアウト
├── login/
│   └── page.tsx      # ログインページ
├── register/
│   └── page.tsx      # 登録ページ
└── setup/
    └── page.tsx      # ニックネーム設定ページ
```

**レイアウト機能:**

- 中央配置
- Articardロゴ表示
- AuthGuard（未認証ユーザー用）

#### 8. API Routes

**POST /api/auth/register**

`src/app/api/auth/register/route.ts`

- IDトークン検証
- ニックネームバリデーション
- 既存ユーザーチェック
- ニックネーム重複チェック
- ユーザー作成（ID = Firebase UID）

**GET/PATCH/DELETE /api/users/me**

`src/app/api/users/me/route.ts`

| メソッド | 機能                                 |
| -------- | ------------------------------------ |
| GET      | 認証ユーザー情報取得                 |
| PATCH    | プロフィール更新（ニックネーム変更） |
| DELETE   | アカウント削除（関連データ含む）     |

**削除処理:**

1. CoinTransaction削除
2. Card削除
3. Article削除
4. User削除（DB）
5. Firebaseユーザー削除

### 作成ファイル一覧

```
src/
├── lib/
│   ├── firebase/
│   │   ├── client.ts          # Firebase Client SDK
│   │   └── admin.ts           # Firebase Admin SDK
│   ├── auth.ts                # 認証ミドルウェア
│   └── validations/
│       └── user.ts            # ユーザーバリデーション
├── stores/
│   └── auth-store.ts          # Zustand認証ストア
├── hooks/
│   └── use-auth.ts            # 認証フック
├── components/auth/
│   ├── login-form.tsx         # ログインフォーム
│   ├── register-form.tsx      # 登録フォーム
│   ├── nickname-setup-form.tsx # ニックネーム設定
│   ├── oauth-buttons.tsx      # OAuthボタン
│   ├── auth-guard.tsx         # ルート保護
│   └── index.ts               # エクスポート
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx         # 認証レイアウト
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── setup/
│   │       └── page.tsx
│   └── api/
│       ├── auth/
│       │   └── register/
│       │       └── route.ts   # ユーザー登録API
│       └── users/
│           └── me/
│               └── route.ts   # プロフィールAPI
```

### Prismaスキーマ変更

**変更点:**

- `User.nickname`に`@unique`制約を追加

```prisma
model User {
  id                    String    @id @db.Uuid
  nickname              String    @unique @db.VarChar(20)  // ← @unique追加
  ...
}
```

### 検証結果

```bash
# 型チェック
npm run type-check  # パス

# Prisma Client再生成
npx prisma generate  # 成功
```

### 認証フロー

```
1. 新規登録フロー:
   /register → Firebase登録 → /setup → ニックネーム設定 → DB登録 → /home

2. ログインフロー（既存ユーザー）:
   /login → Firebase認証 → DB確認 → /home

3. ログインフロー（初回OAuth）:
   /login → OAuth認証 → DB未登録 → /setup → ニックネーム設定 → DB登録 → /home
```

---

## Phase 1-C: 記事生成機能 [完了]

**実施日**: 2026-01-22

### 実施内容

#### 1. OpenAIクライアント初期化

**ファイル:** `src/lib/openai/client.ts`

**機能:**

- OpenAIクライアントのシングルトンパターン初期化
- 環境変数からAPIキー取得

#### 2. Moderation API連携

**ファイル:** `src/lib/openai/moderation.ts`

**機能:**

- `moderateContent()` - OpenAI Moderation APIでコンテンツチェック
- `isThemeSafe()` - テーマの安全性判定
- カスタムブロックキーワード対応

**ブロック対象:**
| カテゴリ | 内容 |
|---------|------|
| OpenAI Moderation | sexual, hate, harassment, self-harm, violence等 |
| カスタムキーワード | 薬物、爆弾の作り方、ハッキング方法等 |

#### 3. 記事生成ロジック

**ファイル:** `src/lib/openai/article-generation.ts`

**機能:**

- `generateArticle()` - テーマから学習記事を生成
- システムプロンプト設定
- トークン使用量追跡

**生成パラメータ:**

```typescript
{
  model: "gpt-4o-mini",
  temperature: 0.7,
  max_tokens: 2000,
  frequency_penalty: 0.3,
  presence_penalty: 0.3,
}
```

#### 4. 記事サービス

**ファイル:** `src/lib/services/article-service.ts`

**関数:**
| 関数 | 機能 |
|------|------|
| `createArticle()` | 記事生成＆DB保存 |
| `getArticlesByUser()` | カーソルベースページネーション取得 |
| `getArticleById()` | 記事取得（所有者チェック付き） |
| `deleteArticle()` | 記事削除（関連カード含む） |
| `getArticleCountByUser()` | ユーザーの記事数取得 |

#### 5. バリデーションスキーマ

**ファイル:** `src/lib/validations/article.ts`

**スキーマ:**
| スキーマ | バリデーション |
|---------|---------------|
| `themeSchema` | 2-30文字、特殊文字禁止（絵文字許可） |
| `createArticleSchema` | theme必須 |
| `getArticlesQuerySchema` | cursor(UUID), limit(1-50) |
| `articleIdSchema` | id(UUID) |

#### 6. API Routes

**POST /api/articles**

`src/app/api/articles/route.ts`

- テーマバリデーション
- Moderationチェック
- 記事生成＆保存
- エラーハンドリング（Moderation違反、Rate Limit）

**GET /api/articles**

- カーソルベースページネーション
- ユーザーの記事一覧取得

**GET /api/articles/:id**

`src/app/api/articles/[id]/route.ts`

- 記事詳細取得
- 所有者チェック

**DELETE /api/articles/:id**

- 記事削除（関連カード含む）
- 所有者チェック

#### 7. 記事コンポーネント

**ファイル一覧:**

| コンポーネント   | ファイル              | 機能                                       |
| ---------------- | --------------------- | ------------------------------------------ |
| `ThemeInput`     | `theme-input.tsx`     | テーマ入力フォーム（文字数カウンター付き） |
| `ArticleView`    | `article-view.tsx`    | 記事表示コンポーネント                     |
| `ArticleLoading` | `article-loading.tsx` | 生成中ローディング画面                     |
| `ArticleResult`  | `article-result.tsx`  | 生成完了結果画面                           |

#### 8. 記事ページ

**ページ構成:**

```
src/app/(main)/
├── layout.tsx           # メインレイアウト（ヘッダー、AuthGuard）
├── create/
│   └── page.tsx         # 記事作成ページ
└── articles/
    └── [id]/
        └── page.tsx     # 記事詳細ページ
```

**記事作成ページ機能:**

- テーマ入力
- 生成中ローディング（キャンセル可能）
- 生成結果表示
- カード生成へ遷移
- 再生成機能

**記事詳細ページ機能:**

- 記事本文表示
- カード生成ボタン
- 削除機能（確認モーダル付き）

### 作成ファイル一覧

```
src/
├── lib/
│   ├── openai/
│   │   ├── client.ts              # OpenAIクライアント
│   │   ├── moderation.ts          # Moderation API
│   │   ├── article-generation.ts  # 記事生成ロジック
│   │   └── index.ts               # エクスポート
│   ├── services/
│   │   └── article-service.ts     # 記事サービス
│   └── validations/
│       └── article.ts             # 記事バリデーション
├── components/article/
│   ├── theme-input.tsx            # テーマ入力
│   ├── article-view.tsx           # 記事表示
│   ├── article-loading.tsx        # ローディング
│   ├── article-result.tsx         # 結果表示
│   └── index.ts                   # エクスポート
├── app/
│   ├── (main)/
│   │   ├── layout.tsx             # メインレイアウト
│   │   ├── create/
│   │   │   └── page.tsx           # 作成ページ
│   │   └── articles/
│   │       └── [id]/
│   │           └── page.tsx       # 詳細ページ
│   └── api/
│       └── articles/
│           ├── route.ts           # 一覧・作成API
│           └── [id]/
│               └── route.ts       # 詳細・削除API
```

### 検証結果

```bash
# 型チェック
npm run type-check  # パス
```

### 記事生成フロー

```
1. 記事作成フロー:
   /create → テーマ入力 → Moderationチェック → 記事生成 → DB保存 → 結果表示

2. カード生成への遷移:
   結果画面 → 「カードを生成」ボタン → /articles/{id}/card

3. 記事削除フロー:
   /articles/{id} → 「削除」ボタン → 確認モーダル → 削除実行 → /home
```

---

## Phase 1-D: カード生成機能 [完了]

**実施日**: 2026-01-22

### 実施内容

#### 1. キーワード抽出ロジック

**ファイル:** `src/lib/openai/keyword-extraction.ts`

**機能:**

- `extractKeywords()` - 記事から10個のキーワードを抽出
- `selectRandomKeyword()` - 使用可能なキーワードからランダム選択
- キーワード重複防止対応

#### 2. 文脈分析ロジック

**ファイル:** `src/lib/openai/context-analysis.ts`

**機能:**

- `analyzeContext()` - キーワードの文脈を分析
- 出力: contextCategory, contextDescription, uniquenessScore, emotionalTone

**文脈カテゴリ:**
| カテゴリ | 説明 |
|---------|------|
| historical_event | 歴史的出来事 |
| mythology | 神話・伝説 |
| scientific | 科学的事象 |
| cultural | 文化的象徴 |
| biographical | 人物関連 |
| general | 一般的 |
| metaphorical | 比喩的 |

#### 3. レア度計算ロジック

**ファイル:** `src/lib/card/rarity.ts`

**機能:**

- `calculateRarity()` - 文脈とユニークネススコアからレア度を計算
- `getRarityColor()` - レア度に応じた色取得
- `getRarityGradient()` - レア度に応じたグラデーション取得

**計算式:**

```
基本スコア = 0
+ 文脈カテゴリボーナス (0-40)
+ ユニークネススコア × 3 (3-30)
+ (30 - キーワード頻度 × 3) (0-30)
+ ランダム (±10)

≥80: legend, ≥60: super_rare, ≥40: rare, ≥20: uncommon, <20: common
```

#### 4. フレーバーテキスト生成

**ファイル:** `src/lib/openai/flavor-text.ts`

**機能:**

- `generateFlavorText()` - 100文字以内のフレーバーテキスト生成
- レア度とトーンに応じた表現調整

#### 5. FLUX APIクライアント

**ファイル:** `src/lib/flux/client.ts`, `src/lib/flux/image-generation.ts`

**機能:**

- `requestImageGeneration()` - BFL FLUX Pro 1.1で画像生成リクエスト
- `getGenerationResult()` - ポーリングで結果取得
- `generateCardIllustration()` - カードイラスト生成

**生成パラメータ:**

```typescript
{
  width: 512,
  height: 768,
  steps: 30,
  guidance: 7.5,
}
```

#### 6. カード画像合成

**ファイル:** `src/lib/card/image-composer.ts`

**機能:**

- `composeCardImage()` - Sharp使用でカード画像合成
- イラスト配置 + レア度枠 + サムネイル生成
- サイズ: 512×768px（カード）, 128×192px（サムネイル）

#### 7. ストレージ連携

**ファイル:** `src/lib/gcs/storage.ts`

**機能:**

- ローカル/GCS切り替え対応
- `uploadCardIllustration()` - イラストアップロード
- `uploadCardImage()` - カード画像アップロード
- `uploadThumbnail()` - サムネイルアップロード

#### 8. カードサービス

**ファイル:** `src/lib/services/card-service.ts`

**関数:**
| 関数 | 機能 |
|------|------|
| `createCard()` | カード生成フルフロー実行 |
| `getCardsByUser()` | カーソルベースページネーション取得 |
| `getCardById()` | カード取得（所有者チェック付き） |
| `deleteCard()` | カード削除 |
| `getCardStatsByUser()` | レア度別統計取得 |

#### 9. API Routes

**POST /api/cards**

- カード生成（記事IDから全フロー実行）
- キーワード枯渇エラーハンドリング

**GET /api/cards**

- カード一覧取得（レア度フィルター対応）

**GET/DELETE /api/cards/:id**

- カード詳細取得・削除

#### 10. カードコンポーネント

**ファイル一覧:**

| コンポーネント      | ファイル           | 機能                               |
| ------------------- | ------------------ | ---------------------------------- |
| `RarityBadge`       | `rarity-badge.tsx` | レア度バッジ表示                   |
| `CardDisplay`       | `card-display.tsx` | カード表示（ホバーエフェクト付き） |
| `CardDetailDisplay` | `card-display.tsx` | カード詳細表示                     |
| `CardGrid`          | `card-grid.tsx`    | カードグリッド表示                 |
| `CardLoading`       | `card-loading.tsx` | 生成中ローディング（ステージ表示） |
| `CardResult`        | `card-result.tsx`  | 生成完了結果表示                   |

#### 11. カードページ

**ページ構成:**

```
src/app/(main)/
├── articles/
│   └── [id]/
│       └── card/
│           └── page.tsx    # カード生成ページ
└── cards/
    └── [id]/
        └── page.tsx        # カード詳細ページ
```

### 作成ファイル一覧

```
src/
├── lib/
│   ├── openai/
│   │   ├── keyword-extraction.ts  # キーワード抽出
│   │   ├── context-analysis.ts    # 文脈分析
│   │   ├── flavor-text.ts         # フレーバーテキスト
│   │   └── index.ts               # 更新
│   ├── flux/
│   │   ├── client.ts              # FLUX APIクライアント
│   │   ├── image-generation.ts    # イラスト生成
│   │   └── index.ts               # エクスポート
│   ├── card/
│   │   ├── rarity.ts              # レア度計算
│   │   ├── image-composer.ts      # 画像合成
│   │   └── index.ts               # エクスポート
│   ├── gcs/
│   │   └── storage.ts             # ストレージ連携
│   ├── services/
│   │   └── card-service.ts        # カードサービス
│   └── validations/
│       └── card.ts                # カードバリデーション
├── types/
│   └── database.ts                # EmotionalTone追加
├── components/card/
│   ├── rarity-badge.tsx           # レア度バッジ
│   ├── card-display.tsx           # カード表示
│   ├── card-grid.tsx              # カードグリッド
│   ├── card-loading.tsx           # ローディング
│   ├── card-result.tsx            # 結果表示
│   └── index.ts                   # エクスポート
├── app/
│   ├── (main)/
│   │   ├── articles/
│   │   │   └── [id]/
│   │   │       └── card/
│   │   │           └── page.tsx   # カード生成ページ
│   │   └── cards/
│   │       └── [id]/
│   │           └── page.tsx       # カード詳細ページ
│   └── api/
│       └── cards/
│           ├── route.ts           # 一覧・生成API
│           └── [id]/
│               └── route.ts       # 詳細・削除API
```

### 検証結果

```bash
# 型チェック
npm run type-check  # パス
```

### カード生成フロー

```
1. カード生成フロー:
   /articles/{id}/card
   → キーワード抽出 (OpenAI)
   → 使用可能キーワード選択
   → 文脈分析 (OpenAI)
   → レア度計算
   → フレーバーテキスト生成 (OpenAI)
   → イラスト生成 (FLUX)
   → カード画像合成 (Sharp)
   → 画像アップロード
   → DB保存
   → 結果表示

2. コレクション閲覧フロー:
   結果画面 → 「コレクションを見る」ボタン → /collection

3. カード削除フロー:
   /cards/{id} → 「削除」ボタン → 確認モーダル → 削除実行 → /collection
```

---

## Phase 1-E: コレクション機能 [完了]

**実施日**: 2026-01-23

### 実施内容

#### 1. コレクションコンポーネント

**ファイル一覧:**

| コンポーネント     | ファイル                | 機能                                         |
| ------------------ | ----------------------- | -------------------------------------------- |
| `CollectionFilter` | `collection-filter.tsx` | レア度/文脈カテゴリ/並び替えフィルターパネル |
| `CollectionSearch` | `collection-search.tsx` | キーワード検索入力                           |
| `CollectionStats`  | `collection-stats.tsx`  | 統計表示（総カード数、レア度別内訳、充実度） |
| `CollectionEmpty`  | `collection-empty.tsx`  | 空状態表示（フィルター有無で表示切り替え）   |

**FilterState型:**

```typescript
interface FilterState {
  rarity: Rarity[]; // レア度フィルター
  contextCategory: ContextCategory[]; // 文脈カテゴリフィルター
  sortBy: 'createdAt' | 'rarity' | 'keyword'; // ソート項目
  sortOrder: 'asc' | 'desc'; // ソート順序
}
```

**CollectionStatsData型:**

```typescript
interface CollectionStatsData {
  totalCards: number; // 総カード数
  rarityBreakdown: Record<Rarity, number>; // レア度別内訳
  totalKnowledgePoints: number; // 総知識ポイント
}
```

#### 2. 統計API

**ファイル:** `src/app/api/stats/route.ts`

**GET /api/stats:**

- 認証ユーザーの統計情報を取得
- 総カード数、レア度別カウント、知識ポイント合計を返却
- Prisma `groupBy` と `aggregate` を使用

**レスポンス:**

```typescript
{
  success: true,
  data: {
    totalCards: number,
    rarityBreakdown: {
      common: number,
      uncommon: number,
      rare: number,
      super_rare: number,
      legend: number
    },
    totalKnowledgePoints: number
  }
}
```

#### 3. 無限スクロールフック

**ファイル:** `src/hooks/use-infinite-scroll.ts`

**機能:**

- `useInfiniteScroll<T>()` - 汎用無限スクロールフック
- Intersection Observer APIで自動読み込み
- カーソルベースページネーション対応
- ローディング状態管理

**戻り値:**
| 項目 | 型 | 説明 |
|------|---|------|
| `items` | `T[]` | 読み込んだアイテム |
| `isLoading` | `boolean` | 初回ローディング中 |
| `isLoadingMore` | `boolean` | 追加読み込み中 |
| `hasMore` | `boolean` | 追加データあり |
| `error` | `Error | null` | エラー情報 |
| `loadMore` | `() => Promise<void>` | 追加読み込み実行 |
| `refresh` | `() => Promise<void>` | リフレッシュ |
| `observerRef` | `(node) => void` | 監視対象要素のref |

**ファイル:** `src/hooks/use-collection.ts`

**機能:**

- `useCollection()` - コレクション専用フック
- フィルター・検索・ソート状態管理
- `useInfiniteScroll` をラップ
- APIエンドポイントと連携

#### 4. コレクションページ

**ファイル:** `src/app/(main)/collection/page.tsx`

**機能:**

- 統計情報表示
- 検索バー・フィルターボタン
- フィルターモーダル
- カードグリッド（無限スクロール）
- 空状態表示

**UIフロー:**

```
1. ページ読み込み
   → 統計API呼び出し
   → カード一覧API呼び出し（無限スクロール初期化）

2. フィルター操作
   → フィルターモーダル表示
   → フィルター適用 → カード一覧リフレッシュ

3. 検索操作
   → キーワード入力 → 検索ボタン → カード一覧リフレッシュ

4. 無限スクロール
   → 画面下部到達 → Intersection Observer発火 → 追加読み込み
```

#### 5. ホームページ

**ファイル:** `src/app/(main)/home/page.tsx`

**機能:**

- ウェルカムメッセージ（ニックネーム表示）
- クイックアクションボタン（記事作成、コレクション）
- 統計サマリー表示
- 最近のカード6件表示

**UIセクション:**
| セクション | 内容 |
|-----------|------|
| ウェルカム | 「ようこそ、{nickname}さん」 |
| クイックアクション | 記事作成ボタン、コレクションボタン |
| 統計 | CollectionStatsコンポーネント |
| 最近のカード | CardGridで6件表示、「すべて見る」リンク |

### 作成ファイル一覧

```
src/
├── components/collection/
│   ├── collection-filter.tsx     # フィルターモーダル
│   ├── collection-search.tsx     # 検索入力
│   ├── collection-stats.tsx      # 統計表示
│   ├── collection-empty.tsx      # 空状態
│   └── index.ts                  # エクスポート
├── hooks/
│   ├── use-infinite-scroll.ts    # 無限スクロールフック
│   └── use-collection.ts         # コレクションフック
├── app/
│   ├── (main)/
│   │   ├── collection/
│   │   │   └── page.tsx          # コレクションページ
│   │   └── home/
│   │       └── page.tsx          # ホームページ
│   └── api/
│       └── stats/
│           └── route.ts          # 統計API
```

### 検証結果

```bash
# 型チェック
npm run type-check  # パス
```

### コレクション閲覧フロー

```
1. ホームからコレクションへ:
   /home → クイックアクション or 最近のカード → /collection

2. フィルター適用フロー:
   /collection → フィルターボタン → モーダル → レア度/カテゴリ選択 → 適用 → 一覧更新

3. 検索フロー:
   /collection → キーワード入力 → 検索ボタン → 一覧更新

4. カード詳細閲覧:
   /collection → カードクリック → /cards/{id}
```

---

---

## Phase 1-F: 共有機能 [完了]

**実施日**: 2026-01-23

### 実施内容

#### 1. 共有API

**ファイル:** `src/app/api/cards/[id]/share/route.ts`

**GET /api/cards/:id/share:**

- 認証不要（公開エンドポイント）
- カード情報 + OGPメタデータを返却

#### 2. 共有コンポーネント

| コンポーネント | ファイル            | 機能                             |
| -------------- | ------------------- | -------------------------------- |
| `ShareModal`   | `share-modal.tsx`   | 共有オプション選択モーダル       |
| `ShareButtons` | `share-buttons.tsx` | X/LINE共有、画像DL、リンクコピー |
| `ShareCard`    | `share-card.tsx`    | 公開ページ用カード表示           |

#### 3. 公開ページ

**ファイル:** `src/app/(public)/share/[id]/page.tsx`

- 認証不要アクセス
- OGPメタデータ動的生成
- カード画像表示
- 「自分も作ってみる」CTAボタン

### 作成ファイル一覧

```
src/
├── app/
│   ├── (public)/
│   │   ├── layout.tsx              # 公開ページレイアウト
│   │   └── share/[id]/
│   │       └── page.tsx            # 共有カード閲覧ページ
│   └── api/cards/[id]/share/
│       └── route.ts                # 共有API
├── components/share/
│   ├── share-modal.tsx
│   ├── share-buttons.tsx
│   ├── share-card.tsx
│   └── index.ts
└── lib/share/
    └── utils.ts                    # 共有ユーティリティ
```

---

## Phase 1-G: 削除機能・UI仕上げ [完了]

**実施日**: 2026-01-23

### 実施内容

#### 1. 削除機能

- **カード削除**: `src/lib/services/card-service.ts` - ConfirmModal、Cloud Storage連携
- **記事削除**: `src/lib/services/article-service.ts` - カスケード削除、トランザクション対応
- **アカウント削除**: `src/app/api/users/me/route.ts` - Firebase Auth削除、全データクリーンアップ

#### 2. FLUX API修正

- `polling_url` を使用するよう修正
- `FluxGenerationResponse` インターフェースに `polling_url` 追加
- `requestImageGeneration` の戻り値を `{ taskId, pollingUrl }` に変更
- `getGenerationResult` の引数を `pollingUrl` に変更

#### 3. アニメーション追加

以下のページにFramer Motionアニメーションを追加:

- `/create` - AnimatePresenceで状態遷移アニメーション
- `/home` - セクション単位のスタガードアニメーション
- `/collection` - フェードインアニメーション
- `/settings` - カスケードアニメーション

### 修正ファイル一覧

- `src/lib/flux/client.ts` - polling_url対応
- `src/lib/flux/image-generation.ts` - polling_url対応
- `src/app/(main)/create/page.tsx` - アニメーション追加
- `src/app/(main)/home/page.tsx` - アニメーション追加
- `src/app/(main)/collection/page.tsx` - アニメーション追加
- `src/app/(main)/settings/page.tsx` - アニメーション追加

---

## Phase 1-H: テスト・デプロイ準備 [完了]

**実施日**: 2026-01-23

### 実施内容

#### 1. テストヘルパー

- `__tests__/helpers/api-test-helpers.ts` - リクエスト生成、レスポンス検証
- `__tests__/helpers/db-helpers.ts` - Prismaモック設定
- `src/__tests__/helpers/` - @/エイリアス対応

#### 2. APIルートテスト（8ファイル）

| ファイル                         | テスト数 | カバー範囲                         |
| -------------------------------- | -------- | ---------------------------------- |
| `auth/register/route.test.ts`    | 11       | 認証、バリデーション、重複チェック |
| `users/me/route.test.ts`         | 15       | GET/PATCH/DELETE、権限、エラー     |
| `articles/route.test.ts`         | 10       | POST/GET、ページネーション         |
| `articles/[id]/route.test.ts`    | 8        | GET/DELETE、権限チェック           |
| `cards/route.test.ts`            | 12       | POST/GET、フィルター               |
| `cards/[id]/route.test.ts`       | 10       | GET/DELETE、権限チェック           |
| `cards/[id]/share/route.test.ts` | 6        | 公開API、OGP生成                   |
| `stats/route.test.ts`            | 8        | 統計取得、空データ                 |

#### 3. サービス層テスト（2ファイル）

| ファイル                  | テスト数 | カバー範囲             |
| ------------------------- | -------- | ---------------------- |
| `article-service.test.ts` | 15       | CRUD、トランザクション |
| `card-service.test.ts`    | 18       | CRUD、画像削除連携     |

#### 4. デプロイ設定

- `cloudbuild.production.yaml` にDBマイグレーションステップ追加

### 最終検証結果

```
Test Suites: 16 passed, 16 total
Tests:       244 passed, 244 total
Snapshots:   0 total
Time:        ~4.5s

npm run type-check: ✅ パス
npm run lint: ✅ 警告なし
```

---

## レアリティ別画像生成モデル [完了]

**実施日**: 2026-01-24

**詳細ドキュメント**: [rarity-image-models.md](../specs/rarity-image-models.md)

### 概要

レアリティに応じて異なる画像生成モデルを使用し、レアカードほど高品質な画像を生成する。

### レアリティ別モデル設定

| レアリティ | 出現率 | モデル                         | プロバイダー | 推定コスト |
| ---------- | ------ | ------------------------------ | ------------ | ---------- |
| legend     | 5%     | DALL-E 3 HD                    | OpenAI       | ~$0.10     |
| super_rare | 10%    | FLUX.2 Pro                     | BFL          | ~$0.04     |
| rare       | 25%    | Nano Banana (Gemini 2.5 Flash) | Google       | ~$0.03     |
| common     | 60%    | FLUX.2 Klein                   | BFL          | ~$0.005    |

**平均コスト: ~$0.0195/カード**

### 作成ファイル

| ファイル                             | 説明                              |
| ------------------------------------ | --------------------------------- |
| `src/lib/openai/dalle.ts`            | DALL-E 3 HD/Standard クライアント |
| `src/lib/gemini/client.ts`           | Nano Banana (Gemini) クライアント |
| `src/lib/image-generation/types.ts`  | 型定義・モデル設定                |
| `src/lib/image-generation/router.ts` | レアリティ別ルーター              |
| `src/lib/image-generation/index.ts`  | 統一エクスポート                  |

### 修正ファイル

| ファイル                           | 変更内容                            |
| ---------------------------------- | ----------------------------------- |
| `src/lib/flux/client.ts`           | FLUX.2 klein/pro/dev モデル対応追加 |
| `src/lib/flux/image-generation.ts` | レアリティルーター経由に変更        |
| `src/lib/services/card-service.ts` | モデル・コスト情報をログ出力        |
| `.env.example`                     | `GOOGLE_GEMINI_API_KEY` 追加        |

---

---

## チャレンジモード [完了]

**実施日**: 2026-01-25

**詳細ドキュメント**: [challenge-mode.md](../specs/challenge-mode.md)

### 概要

生成したカードを使ってシナリオベースの冒険に挑戦するゲームモード。
AIがチャレンジを生成し、カードの適合度を評価して面白おかしく実況する。

### 実装内容

#### 1. データベーススキーマ

**新規テーブル:**
| テーブル | 説明 |
|----------|------|
| `challenge_sessions` | ゲームセッション管理 |
| `challenge_session_cards` | デッキ内カード |
| `challenge_session_phases` | フェーズ結果 |

**既存テーブル変更:**

- `User` に `challengeSessions` リレーション追加
- `Card` に `challengeSessionCards` リレーション追加

#### 2. バックエンド

| ファイル                                | 説明                                         |
| --------------------------------------- | -------------------------------------------- |
| `src/types/challenge.ts`                | 型定義（セッション、フェーズ、スコアリング） |
| `src/lib/challenge/scenarios.ts`        | シナリオ定義（宇宙探査ミッション）           |
| `src/lib/challenge/index.ts`            | エクスポート                                 |
| `src/lib/services/challenge-service.ts` | ビジネスロジック                             |
| `src/lib/openai/challenge-ai.ts`        | AI評価・チャレンジ生成                       |
| `src/lib/validations/challenge.ts`      | Zodスキーマ                                  |

#### 3. API Routes

| エンドポイント                           | メソッド | 説明           |
| ---------------------------------------- | -------- | -------------- |
| `/api/challenge/scenarios`               | GET      | シナリオ一覧   |
| `/api/challenge/sessions`                | POST     | セッション作成 |
| `/api/challenge/sessions`                | GET      | セッション一覧 |
| `/api/challenge/sessions/[id]`           | GET      | セッション詳細 |
| `/api/challenge/sessions/[id]`           | DELETE   | セッション中断 |
| `/api/challenge/sessions/[id]/deck`      | POST     | デッキ設定     |
| `/api/challenge/sessions/[id]/challenge` | GET      | チャレンジ取得 |
| `/api/challenge/sessions/[id]/submit`    | POST     | カード提出     |

#### 4. フロントエンド

**ページ:**
| ファイル | 説明 |
|----------|------|
| `src/app/(main)/challenge/page.tsx` | シナリオ選択 |
| `src/app/(main)/challenge/[sessionId]/page.tsx` | ゲームプレイ |

**コンポーネント:**
| ファイル | 説明 |
|----------|------|
| `scenario-card.tsx` | シナリオカード表示 |
| `deck-builder.tsx` | デッキ編成UI |
| `phase-display.tsx` | フェーズ進行表示 |
| `challenge-card.tsx` | チャレンジ表示 |
| `card-selector.tsx` | カード選択UI |
| `result-display.tsx` | 結果&AI実況 |
| `challenge-complete.tsx` | 完了画面 |

#### 5. ナビゲーション

- メインレイアウトに「チャレンジ」リンク追加

### 作成ファイル一覧

```
prisma/schema.prisma                    # スキーマ変更

src/types/challenge.ts                  # 新規

src/lib/challenge/
├── scenarios.ts                        # 新規
└── index.ts                            # 新規

src/lib/openai/challenge-ai.ts          # 新規
src/lib/openai/index.ts                 # 更新

src/lib/services/challenge-service.ts   # 新規

src/lib/validations/challenge.ts        # 新規

src/app/api/challenge/
├── scenarios/route.ts                  # 新規
└── sessions/
    ├── route.ts                        # 新規
    └── [id]/
        ├── route.ts                    # 新規
        ├── deck/route.ts               # 新規
        ├── challenge/route.ts          # 新規
        └── submit/route.ts             # 新規

src/app/(main)/challenge/
├── page.tsx                            # 新規
└── [sessionId]/page.tsx                # 新規

src/components/challenge/
├── scenario-card.tsx                   # 新規
├── deck-builder.tsx                    # 新規
├── phase-display.tsx                   # 新規
├── challenge-card.tsx                  # 新規
├── card-selector.tsx                   # 新規
├── result-display.tsx                  # 新規
├── challenge-complete.tsx              # 新規
└── index.ts                            # 新規

src/app/(main)/layout.tsx               # 更新（ナビ追加）
```

### 検証方法

```bash
# 1. スキーマ適用
npx prisma generate
npm run db:push

# 2. 開発サーバー起動
npm run dev

# 3. 動作確認
# - シナリオ選択→デッキ編成→全5フェーズをプレイ
# - AI実況が適切に生成されることを確認
# - スコア計算が正しいことを確認
```

---

---

## Stripe Checkout テスト対応 [完了]

**実施日**: 2026-01-28

### 概要

開発者ユーザー（`isDeveloper: true`）がStripe決済フローをテストできるよう、設定ページのサブスクリプション機能を改善。

### 問題

従来は`isDeveloper: true`のユーザーがサブスク加入ボタンを押すと、Stripeをスキップして直接有効化されていた。これでは実際の決済フローをテストできなかった。

### 解決策

通常の加入ボタンと開発者専用の直接有効化ボタンを分離。

### 実装内容

#### 1. 設定ページ変更

**ファイル:** `src/app/(main)/settings/page.tsx`

**変更点:**

- `handleActivateSubscription` → 常にStripe Checkout経由
- `handleDirectActivation` → 新規追加、開発者専用でStripeスキップ
- 通常の加入ボタンは既に加入中のプランを無効化
- 開発者向けに「開発者専用：Stripeスキップ（テスト用）」セクションを追加

**UI変更:**

```
┌─────────────────────────────────────────────────┐
│ サブスクリプション                               │
├─────────────────────────────────────────────────┤
│ [プラスに加入]  [プレミアムに加入]  [解約]      │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 開発者専用：Stripeスキップ（テスト用）       │ │ ← 開発者のみ表示
│ │ [プラス直接有効化]  [プレミアム直接有効化]   │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 修正ファイル

| ファイル                            | 変更内容                                   |
| ----------------------------------- | ------------------------------------------ |
| `src/app/(main)/settings/page.tsx`  | 加入ボタンの分離、開発者専用セクション追加 |
| `docs/guides/stripe-integration.md` | 14.10セクションを更新、テスト手順追記      |
| `docs/specs/coin-system.md`         | Stripe連携を実装済みに更新                 |

### 検証手順

1. 設定ページで「プラスに加入 (¥980/月)」をクリック
2. Stripe Checkoutにリダイレクトされることを確認
3. テストカード `4242 4242 4242 4242` で決済
4. 成功後、設定ページで「プラス加入中」と表示されることを確認

---

## UI改良 Phase 4-5 [完了]

**実施日**: 2026-02-02

### 概要

UIの一貫性向上と視覚的な豊かさを追加するための改良を実施。

### Phase 4: コンポーネント適用

#### Settings ページに SectionContainer 適用

**ファイル:** `src/app/(main)/settings/page.tsx`

6つのセクションに SectionContainer を適用:

- プロフィール
- サブスクリプション
- コイン残高・購入
- 開発者オプション
- データ管理
- アカウント

#### theme-input.tsx に Select コンポーネント適用

**ファイル:** `src/components/article/theme-input.tsx`

文章スタイル選択部分をカスタム Select コンポーネントに置き換え。

### Phase 5: 視覚的な豊かさの追加

#### 1. ボタンの改良

**ファイル:** `src/components/ui/button.tsx`

- Primary: グラデーション背景 + シャドウ
- Secondary: ホバー時にシャドウ追加
- Disabled: グラデーション無効化

#### 2. 背景グラデーション

**ファイル:** `src/app/globals.css`

淡いグラデーション背景を追加:

```css
body {
  background: linear-gradient(
    135deg,
    hsl(220 20% 98%) 0%,
    hsl(210 30% 96%) 50%,
    hsl(200 25% 97%) 100%
  );
}
```

#### 3. セクションコンテナの改良

**ファイル:** `src/components/ui/section-container.tsx`

- シャドウ追加（shadow-sm）
- ホバー時に浮き上がり効果（hover:shadow-md）
- トランジションアニメーション

#### 4. 入力欄のフォーカス効果

**ファイル:** `src/components/ui/input.tsx`

フォーカス時のグロー効果:

```css
focus:ring-2 focus:ring-blue-500/20 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.1)]
```

#### 5. カードのホバー効果

**ファイル:** `src/components/card/card-display.tsx`

- ホバー時に浮き上がり（-translate-y-1）
- レア度に応じたグロー強調
- シャドウ強化（hover:shadow-xl）

### 修正ファイル一覧

| ファイル                                  | 変更内容                    |
| ----------------------------------------- | --------------------------- |
| `src/app/(main)/settings/page.tsx`        | SectionContainer 適用       |
| `src/components/article/theme-input.tsx`  | Select コンポーネント適用   |
| `src/components/ui/button.tsx`            | グラデーション + シャドウ   |
| `src/app/globals.css`                     | 背景グラデーション          |
| `src/components/ui/section-container.tsx` | シャドウ + ホバー効果       |
| `src/components/ui/input.tsx`             | フォーカス時グロー          |
| `src/components/card/card-display.tsx`    | ホバー時浮き上がり + グロー |

---

## 変更履歴

| 日付       | 変更内容                           |
| ---------- | ---------------------------------- |
| 2026-01-22 | Phase 1-A 完了                     |
| 2026-01-22 | Phase 1-B 完了                     |
| 2026-01-22 | Phase 1-C 完了                     |
| 2026-01-22 | Phase 1-D 完了                     |
| 2026-01-23 | Phase 1-E 完了                     |
| 2026-01-23 | Phase 1-F 完了                     |
| 2026-01-23 | Phase 1-G 完了                     |
| 2026-01-23 | Phase 1-H 完了 - MVP完成           |
| 2026-01-24 | レアリティ別画像生成モデル機能追加 |
| 2026-01-25 | チャレンジモード機能追加           |
| 2026-01-28 | Stripe Checkout テスト対応         |
| 2026-02-02 | UI改良 Phase 4-5 完了              |
