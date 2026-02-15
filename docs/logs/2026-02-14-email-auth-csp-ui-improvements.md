# メール認証・CSP dev対応・UI改善・法的ページ修正

**日付**: 2026-02-14
**コミット**: `4c861dc`

## 概要

メール/パスワード登録時のメール認証フロー追加、開発環境のCSP対応、パスワード表示トグル、チャレンジページレイアウト改善、ランディングページ微調整、法的ページの用語統一など、複数の改善を実施。

---

## 1. メール認証フロー

### 背景

メール/パスワードで登録したユーザーが、メールアドレスの所有確認なしにサービスを利用できていた。セキュリティとアカウント有効性を担保するため、Firebase の組み込みメール認証を導入。

### 変更内容

- **`src/app/(auth)/verify-email/page.tsx`**（新規）: メール認証待ちページ。AuthGuard で保護
- **`src/components/auth/verify-email-content.tsx`**（新規）: 認証UI本体
  - 送信先メールアドレスの表示
  - 「認証を確認」ボタン（Firebase ユーザーを reload して emailVerified をチェック）
  - 「再送信」ボタン（60秒クールダウン付き）
  - ログアウトリンク
- **`src/components/auth/register-form.tsx`**: 登録後に `sendVerificationEmail()` を呼び、`/verify-email` へリダイレクト
- **`src/lib/firebase/client.ts`**: `sendVerificationEmail()` 関数を追加（Firebase `sendEmailVerification` のラッパー、認証後の遷移先を `/login` に設定）
- **`src/components/auth/index.ts`**: `VerifyEmailContent` をエクスポートに追加

### AuthGuard ルーティング拡張

- **`src/components/auth/auth-guard.tsx`**: ルート優先度を再設計
  1. 未認証 → `/login`
  2. 認証済み + ログイン/登録ページ → 状態に応じてリダイレクト
  3. **メール未認証 → `/verify-email`**（setup より先に強制）
  4. メール認証済み + verify-email ページ → `/setup` or `/home`
  5. 未登録 → `/setup`
  6. 登録済み + setup ページ → `/home`
- **`src/stores/auth-store.ts`**: `selectNeedsEmailVerification` セレクター追加（`providerId === 'password'` かつ `!emailVerified`）
- **`src/hooks/use-auth.ts`**:
  - `needsEmailVerification` をhookから公開
  - `reloadUser()` コールバック追加（Firebase ユーザーを reload → トークン再取得 → ストア更新）
  - auth state 変更時にパスワードユーザーの `emailVerified` を自動リロード
  - `registerWithEmail` の戻り値を `UserCredential` に変更
  - ログアウト後の遷移先を `/login` → `/` に変更

### 設計判断

- Google OAuth ユーザーはメール認証不要（自動的に verified）
- Firebase 組み込みの認証メール機能を使用（カスタムトークン実装なし）
- クールダウンタイマーで再送スパムを防止

---

## 2. CSP 開発モード対応

### 背景

Next.js dev モードでは webpack HMR が `eval()` を使用するが、`middleware.ts` の CSP `script-src` に `'unsafe-eval'` が含まれておらず、ブラウザが JS 実行をブロックして白画面になっていた。

### 変更内容

- **`src/middleware.ts`**: `script-src` を `NODE_ENV` で分岐
  - 開発時: `'unsafe-eval'` を追加（webpack HMR 対応）
  - 本番: 従来通り `'unsafe-eval'` なし（セキュリティ維持）

---

## 3. /dev スキル改善

### 背景

`/dev` スキルが Cloud SQL Proxy と Next.js を別々の `run_in_background` で起動していたため、片方だけ停止したり、`taskkill /F /IM node.exe` で Claude Code 自身のプロセスを殺す危険性があった。

### 変更内容

- **`.claude/skills/dev/SKILL.md`**:
  - `npm run dev`（concurrently）を1つのバックグラウンドタスクとして起動
  - 停止は TaskStop → ポート PID 特定のフォールバック
  - `taskkill /F /IM node.exe` の使用を禁止

---

## 4. パスワード表示トグル

### 変更内容

- **`src/components/ui/input.tsx`**:
  - `type="password"` の入力欄に目のアイコンで表示/非表示を切り替えるボタンを追加
  - `useState` でトグル管理、`tabIndex={-1}` でフォーカス順序に影響しない
  - ダークモード・ホバー対応

---

## 5. チャレンジページレイアウト改善

### 背景

チャレンジページがビューポート高さ固定（`h-[calc(100vh-120px)]`）で、カード選択エリアがスクロール必須だった。モバイルで使いにくかった。

### 変更内容

- **`src/app/(main)/challenge/[sessionId]/page.tsx`**: 固定高さコンテナ → 自然なフローレイアウトに変更
- **`src/components/challenge/card-selector.tsx`**: `min-h-0 flex-1 overflow-y-auto` → 通常のブロックレイアウトに変更

---

## 6. ランディングページ微調整

### 変更内容

- **`src/app/page.tsx`**: スクロールインジケーター（MORE テキスト + 矢印）を拡大
  - テキスト: `text-xs` → `text-sm md:text-base`
  - 矢印 SVG: `20x20` → `28x28`

---

## 7. 法的ページ用語統一

### 背景

アプリ内通貨の名称が「ナレッジ」から「コイン」に変更されていたが、法的ページの表記が旧名称のままだった。

### 変更内容

- **`src/app/(public)/commerce/page.tsx`**: 「ナレッジ（アプリ内通貨）の購入」→「コイン（アプリ内通貨）の購入」
- **`src/app/(public)/terms/page.tsx`**: 第2条の2・第3条の2 の「ナレッジ」→「コイン」
- **`src/app/(public)/privacy/page.tsx`**: 運営者名の表記簡素化
- **`docs/logs/2026-02-13-landing-optimization-legal-update.md`**: ログ内の表記も修正

---

## 変更ファイル一覧

| ファイル                                                    | 変更                                      |
| ----------------------------------------------------------- | ----------------------------------------- |
| `src/app/(auth)/verify-email/page.tsx`                      | **新規** メール認証ページ                 |
| `src/components/auth/verify-email-content.tsx`              | **新規** 認証UI（確認・再送・ログアウト） |
| `src/components/auth/register-form.tsx`                     | 登録後に認証メール送信 + リダイレクト     |
| `src/components/auth/auth-guard.tsx`                        | メール認証ルーティング追加                |
| `src/components/auth/index.ts`                              | エクスポート追加                          |
| `src/hooks/use-auth.ts`                                     | reloadUser・needsEmailVerification 追加   |
| `src/stores/auth-store.ts`                                  | needsEmailVerification セレクター追加     |
| `src/lib/firebase/client.ts`                                | sendVerificationEmail 追加                |
| `src/middleware.ts`                                         | CSP script-src を環境変数で分岐           |
| `.claude/skills/dev/SKILL.md`                               | concurrently ベースに改善                 |
| `src/components/ui/input.tsx`                               | パスワード表示トグル追加                  |
| `src/app/(main)/challenge/[sessionId]/page.tsx`             | 固定高さ→自然フロー                       |
| `src/components/challenge/card-selector.tsx`                | スクロール固定→通常レイアウト             |
| `src/app/page.tsx`                                          | スクロールインジケーター拡大              |
| `src/app/(public)/commerce/page.tsx`                        | ナレッジ→コイン                           |
| `src/app/(public)/terms/page.tsx`                           | ナレッジ→コイン                           |
| `src/app/(public)/privacy/page.tsx`                         | 運営者名表記簡素化                        |
| `docs/logs/2026-02-13-landing-optimization-legal-update.md` | ログ内表記修正                            |
