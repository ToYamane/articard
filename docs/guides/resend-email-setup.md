# Resend メールセットアップガイド

Articard のメール認証・パスワードリセットは [Resend](https://resend.com) を使用してコード方式で送信する。Firebase のメール送信機能は使用しない。

## 概要

| 項目               | 値                                 |
| ------------------ | ---------------------------------- |
| メール送信サービス | Resend（無料枠: 3,000通/月）       |
| 送信元アドレス     | `noreply@articard.app`             |
| 方式               | 6桁コード入力（メール内にURLなし） |
| 用途               | メール認証、パスワードリセット     |
| 環境変数           | `RESEND_API_KEY`                   |

## 1. Resend アカウント作成

1. [resend.com](https://resend.com) にアクセスしてアカウントを作成
2. ダッシュボードにログイン

## 2. ドメイン設定

### 2.1 ドメインの追加

1. Resend ダッシュボード → **Domains** → **Add Domain**
2. ドメイン名: `articard.app` を入力
3. **Add** をクリック

### 2.2 DNS レコードの設定

Resend が表示する DNS レコードをドメインレジストラに設定する。以下の3種類:

| レコードタイプ   | 目的                    | 設定値                      |
| ---------------- | ----------------------- | --------------------------- |
| **TXT (SPF)**    | 送信元の正当性を証明    | Resend が表示する値をコピー |
| **CNAME (DKIM)** | メールの改ざん防止      | Resend が表示する値をコピー |
| **TXT (DMARC)**  | SPF/DKIM の検証ポリシー | Resend が表示する値をコピー |

> **Note**: DNS レコードの反映には数分〜最大48時間かかる場合がある。Resend ダッシュボードで **Verify** をクリックして確認。

### 2.3 ドメイン認証の確認

Resend ダッシュボードでドメインのステータスが **Verified** になっていることを確認。

## 3. API キーの取得

1. Resend ダッシュボード → **API Keys** → **Create API Key**
2. Name: `articard-production`（任意）
3. Permission: **Sending access**
4. Domain: `articard.app`
5. **Create** をクリックし、表示された API キー（`re_` で始まる）をコピー

## 4. 環境変数の設定

### ローカル開発

`.env` に追加:

```bash
RESEND_API_KEY=re_xxxxx
```

### 本番環境（GCP Secret Manager）

```bash
# Secret Manager に登録
echo -n "re_xxxxx" | gcloud secrets create articard-resend-key \
  --project=articard-ff673 \
  --replication-policy=automatic \
  --data-file=-

# または setup-secrets.sh を使用（.env に RESEND_API_KEY が設定されていれば自動登録）
bash scripts/setup-secrets.sh .env
```

## 5. DB マイグレーション

`email_verifications` テーブルを作成する:

```bash
# dev server が起動中の場合は停止してから実行
npx prisma generate
npm run db:push
```

> **Note**: dev server が起動中だと `prisma generate` がファイルロックで失敗する場合がある。必ず停止してから実行すること。

## 6. 動作検証

### メール認証フロー

1. `/register` で新規アカウントを登録
2. 登録したメールアドレスに6桁のコードが届く
3. `/verify-email` でコードを入力
4. 認証完了 → `/setup` へ遷移

### パスワードリセットフロー

1. `/forgot-password` にアクセス
2. 登録済みのメールアドレスを入力 → コード送信
3. メールに届いた6桁コードと新しいパスワードを入力
4. パスワード変更完了 → `/login` でログイン

### スパムスコア確認

1. [mail-tester.com](https://www.mail-tester.com/) にアクセス
2. 表示されたテスト用メールアドレスに対してアプリからメールを送信
3. スコアを確認（目標: 9/10 以上、従来は 7.3/10）

## トラブルシューティング

### メールが届かない

1. Resend ダッシュボード → **Emails** でステータスを確認
2. ドメインが **Verified** になっているか確認
3. `RESEND_API_KEY` が正しく設定されているか確認
4. API ルートのログでエラーがないか確認

### 迷惑メールに振り分けられる

1. DNS レコード（SPF/DKIM/DMARC）が正しく設定されているか確認
2. mail-tester.com で具体的な減点項目を確認
3. Resend ダッシュボードでドメインの認証ステータスを再確認

## 関連ファイル

| ファイル                                        | 内容                                |
| ----------------------------------------------- | ----------------------------------- |
| `src/lib/email/resend.ts`                       | Resend クライアント・メール送信関数 |
| `src/app/api/auth/send-verification/route.ts`   | 認証コード送信 API                  |
| `src/app/api/auth/verify-code/route.ts`         | コード検証 API                      |
| `src/app/api/auth/send-password-reset/route.ts` | パスワードリセットコード送信 API    |
| `src/app/api/auth/reset-password/route.ts`      | パスワードリセット API              |
| `prisma/schema.prisma`                          | `EmailVerification` モデル          |
