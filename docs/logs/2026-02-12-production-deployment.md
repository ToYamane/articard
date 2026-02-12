# 本番デプロイ実行ログ

**日付**: 2026-02-12

## 概要

Cloud Run への本番デプロイを実行し、サービスの稼働確認・ドメイン設定まで完了した。
事前準備（Dockerfile / Cloud Build 修正）は `2026-02-12-production-deploy-prep.md` を参照。

## デプロイまでの経緯

### CI テスト修正（3コミット）

Cloud Build のテストステップで発生した問題を修正:

1. **Stripe モック追加・エラーコード修正** (`8d37fd4`)
   - テストで Stripe モジュールが未モックだったため追加
   - API テストのエラーコード期待値を修正

2. **Cloud Build テストステップを node:20 に変更** (`b994e78`)
   - Alpine ベースの Node イメージで libssl の互換性問題が発生
   - `node:20`（Debian ベース）に変更して解消

3. **card validation テスト修正** (`47ce0d6`)
   - テストの期待値をスキーマの `max(200)` に合わせて修正

### Docker ビルド修正（1コミット）

4. **Prisma OpenSSL 3.x 対応・ビルド時ダミー env** (`9c20573`)
   - Prisma が OpenSSL 3.x を要求するため `binaryTargets` に `debian-openssl-3.0.x` を追加
   - ビルド時に `DATABASE_URL` が未設定でエラーになる問題を空文字のダミーで回避

## デプロイ実行結果

- **Cloud Run サービス**: `articard` (asia-northeast1)
- **ステータス**: 稼働中（healthy）
- **DB 接続**: 正常（Cloud SQL 接続確認済み）
- **ヘルスチェック**: `/api/health` が 200 を返す

## Git Push

4コミットを `origin/master` に push 完了:

```
0c04a49..9c20573  master -> master
```

## カスタムドメイン設定

### ドメイン検証

`articard.app` のドメイン所有権検証を GCP で完了。

### Domain Mapping 作成

```bash
gcloud beta run domain-mappings create \
  --service=articard \
  --domain=articard.app \
  --region=asia-northeast1 \
  --project=articard-ff673
```

### 必要な DNS レコード

ドメインプロバイダで以下のレコードを設定する:

#### A レコード（4つ）

| ホスト | タイプ | 値 |
|--------|--------|-----|
| `@` | A | `216.239.32.21` |
| `@` | A | `216.239.34.21` |
| `@` | A | `216.239.36.21` |
| `@` | A | `216.239.38.21` |

#### AAAA レコード（4つ）

| ホスト | タイプ | 値 |
|--------|--------|-----|
| `@` | AAAA | `2001:4860:4802:32::15` |
| `@` | AAAA | `2001:4860:4802:34::15` |
| `@` | AAAA | `2001:4860:4802:36::15` |
| `@` | AAAA | `2001:4860:4802:38::15` |

SSL 証明書は DNS 設定後に Google が自動プロビジョニングする。

## 残作業（手動）

### 1. DNS レコード設定

ドメインプロバイダの管理画面で上記 A/AAAA レコードを設定。

### 2. Stripe Webhook 設定

1. Stripe Dashboard でエンドポイント登録
   - URL: `https://articard.app/api/stripe/webhook`
   - イベント: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
2. 取得した `whsec_xxxxx` を Secret Manager に登録
3. Cloud Run を更新して最新シークレットを反映

## 検証チェックリスト

- [x] `git log origin/master..HEAD` が空（push 完了）
- [x] `gcloud beta run domain-mappings list` で `articard.app` が表示される
- [ ] DNS レコード設定後: `curl https://articard.app/api/health` が 200 を返す
- [ ] Stripe webhook テスト送信が成功する
