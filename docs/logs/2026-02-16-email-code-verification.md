# メール認証・パスワードリセット: コード入力方式への移行

**日付**: 2026-02-16

## 概要

Firebase の認証メールに含まれる `firebaseapp.com` URL が SpamAssassin の `URI_FIREBASEAPP` ルールに引っかかり、迷惑メールに分類される問題（mail-tester スコア 7.3/10）を解決するため、メール認証とパスワードリセットをコード入力方式に移行。メール送信基盤を Firebase から **Resend** に切り替え、メール本文からURLを完全に排除した。併せて未実装だった `/forgot-password` ページもコード入力方式で新規実装。

---

## 1. メール送信基盤（Resend）

### 背景

Firebase の `sendEmailVerification` / `sendPasswordResetEmail` が送信するメールには `firebaseapp.com` ドメインのURLが含まれ、SpamAssassin がスパム判定する原因になっていた。URLを含まないメールを送信するため、自前のメール送信基盤が必要。

### 変更内容

- **`package.json`**: `resend` パッケージを追加
- **`prisma/schema.prisma`**: `EmailVerification` モデルを追加
  - 6桁コード、purpose（`email_verify` / `password_reset`）、有効期限（10分）、試行回数を管理
  - `email_verifications` テーブルにマッピング
- **`src/lib/email/resend.ts`**（新規）: Resend メール送信ユーティリティ
  - `sendVerificationCode(email, code)` — メール認証用
  - `sendPasswordResetCode(email, code)` — パスワードリセット用
  - 送信元: `noreply@articard.app`
  - シンプルなHTMLテンプレート（コードのみ表示、URL一切なし）

---

## 2. メール認証フローの変更

### 背景

従来は Firebase の `sendEmailVerification()` でリンク付きメールを送信し、ユーザーがリンクをクリックして認証する方式だった。リンクの `firebaseapp.com` URLがスパム判定の原因。

### 変更内容

#### バックエンド

- **`src/lib/firebase/admin.ts`**: `updateUserEmailVerified()` を追加（Admin SDK でサーバー側から認証済みフラグを設定）
- **`src/lib/validations/auth.ts`**（新規）: `verifyCodeSchema`（6桁数字バリデーション）
- **`src/app/api/auth/send-verification/route.ts`**（新規）: 認証コード送信 API
  - `withAuth` で認証必須、`crypto.randomInt` で6桁コード生成
  - 同一メールの既存コードを削除してから新規作成（有効期限10分）
  - Resend でメール送信、レート制限: `standard`
- **`src/app/api/auth/verify-code/route.ts`**（新規）: コード検証 API
  - DB からコード照合（email + purpose + 期限内）
  - 試行回数チェック（5回超過でコード無効化）
  - 成功時: `updateUserEmailVerified(uid)` でFirebase更新 → コード削除

#### フロントエンド

- **`src/components/auth/register-form.tsx`**: `sendVerificationEmail(credential.user)` → `POST /api/auth/send-verification` に変更
- **`src/components/auth/verify-email-content.tsx`**: 全面リニューアル
  - 「リンクをクリック」方式 → 6桁コード入力UI（`inputMode="numeric"`, `maxLength={6}`）
  - 「認証する」ボタンで `POST /api/auth/verify-code` を呼び出し
  - 成功後に `reloadUser()` で Firebase の `emailVerified` を反映
  - 再送信ボタン: `POST /api/auth/send-verification`（60秒クールダウン）

---

## 3. パスワードリセット（新規実装）

### 背景

ログインフォームに「パスワードをお忘れですか？」リンクがあったが、リンク先 `/forgot-password` は未実装だった。Firebase の `sendPasswordResetEmail` もスパム判定対象のため、コード方式で新規実装。

### 変更内容

#### バックエンド

- **`src/lib/firebase/admin.ts`**: `updateUserPassword()`, `getUserByEmail()` を追加
- **`src/lib/validations/auth.ts`**: `sendPasswordResetSchema`, `resetPasswordSchema` を追加
- **`src/app/api/auth/send-password-reset/route.ts`**（新規）: リセットコード送信 API
  - **認証不要**（ログイン前のユーザーが使用）
  - ユーザーが存在しなくても成功を返す（情報漏洩防止）
  - 同一メールへの連続送信を60秒で制限
- **`src/app/api/auth/reset-password/route.ts`**（新規）: パスワードリセット API
  - **認証不要**
  - コード照合 + 試行回数チェック後、`updateUserPassword()` で Firebase 更新

#### フロントエンド

- **`src/app/(auth)/forgot-password/page.tsx`**（新規）: パスワードリセットページ
- **`src/components/auth/forgot-password-content.tsx`**（新規）: 3段階の状態遷移UI
  1. メールアドレス入力 → コード送信
  2. 6桁コード＋新パスワード入力 → リセット実行
  3. 完了画面 + ログインリンク
  - 再送信ボタン（60秒クールダウン）
- **`src/components/auth/auth-guard.tsx`**: `publicRoutes` に `/forgot-password` を追加
- **`src/components/auth/index.ts`**: `ForgotPasswordContent` をエクスポートに追加

---

## 4. クリーンアップ

### 変更内容

- **`src/lib/firebase/client.ts`**: `sendVerificationEmail()`, `resetPassword()` 関数と関連 import（`sendEmailVerification`, `sendPasswordResetEmail`）を削除
- **`src/lib/firebase/index.ts`**: `resetPassword` エクスポートを削除、新しい Admin 関数をエクスポートに追加
- **`src/hooks/use-auth.ts`**: `sendPasswordReset` アクションと `resetPassword` import を削除
- **`src/app/auth/action/route.ts`**（削除）: Firebase アクション URL へのリダイレクトルート（不要に）

---

## 設計判断

- **コード方式を選択した理由**: メール本文からURLを完全に排除することで SpamAssassin の `URI_FIREBASEAPP` ルールを回避。マジックリンク方式も検討したが、独自ドメインURLでもスパム判定リスクが残るため、最もシンプルなコード方式を採用
- **Resend を選択した理由**: 無料枠 3,000通/月で十分、ドメイン認証（SPF/DKIM/DMARC）が容易、API がシンプル
- **情報漏洩防止**: パスワードリセットのメール送信 API は、ユーザーが存在しない場合も成功レスポンスを返す（メールアドレスの存在確認に悪用されることを防止）
- **試行回数制限**: コード検証は最大5回まで。超過時はコードを無効化し、再送信を要求
- **Firebase Admin SDK で `emailVerified` を設定**: コード検証成功時にサーバー側から直接 Firebase ユーザーの `emailVerified` フラグを更新。クライアント側は `reloadUser()` でトークンを再取得し状態を反映

---

## 変更ファイル一覧

| ファイル                                          | 変更                                                                   |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| `prisma/schema.prisma`                            | `EmailVerification` モデル追加                                         |
| `src/lib/email/resend.ts`                         | **新規** Resend メール送信ユーティリティ                               |
| `src/lib/validations/auth.ts`                     | **新規** 認証コード・パスワードリセットのバリデーション                |
| `src/lib/firebase/admin.ts`                       | `updateUserEmailVerified`, `updateUserPassword`, `getUserByEmail` 追加 |
| `src/lib/firebase/client.ts`                      | `sendVerificationEmail`, `resetPassword` 削除                          |
| `src/lib/firebase/index.ts`                       | エクスポート更新（旧関数削除・新関数追加）                             |
| `src/app/api/auth/send-verification/route.ts`     | **新規** 認証コード送信 API                                            |
| `src/app/api/auth/verify-code/route.ts`           | **新規** コード検証 API                                                |
| `src/app/api/auth/send-password-reset/route.ts`   | **新規** パスワードリセットコード送信 API                              |
| `src/app/api/auth/reset-password/route.ts`        | **新規** パスワードリセット API                                        |
| `src/components/auth/register-form.tsx`           | 認証メール送信を API 呼び出しに変更                                    |
| `src/components/auth/verify-email-content.tsx`    | コード入力UIに全面リニューアル                                         |
| `src/app/(auth)/forgot-password/page.tsx`         | **新規** パスワードリセットページ                                      |
| `src/components/auth/forgot-password-content.tsx` | **新規** 3段階パスワードリセットUI                                     |
| `src/components/auth/auth-guard.tsx`              | `/forgot-password` を公開ルートに追加                                  |
| `src/components/auth/index.ts`                    | `ForgotPasswordContent` エクスポート追加                               |
| `src/hooks/use-auth.ts`                           | `sendPasswordReset` 削除                                               |
| `src/app/auth/action/route.ts`                    | **削除** Firebase アクション URL リダイレクト                          |

---

## デプロイ手順

1. `.env` に `RESEND_API_KEY=re_xxxxx` を追加
2. [Resend](https://resend.com) でドメイン `articard.app` を設定（SPF/DKIM/DMARC の DNS レコード追加）
3. `npx prisma generate && npm run db:push` で `email_verifications` テーブルを作成
4. デプロイ後、mail-tester.com でスパムスコア改善を確認
