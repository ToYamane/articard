# Cloud SQL → Neon 移行ガイド

このドキュメントでは、Articardの本番DBを Cloud SQL (PostgreSQL) から **Neon** (サーバーレスPostgres) に移行する手順を説明します。

## 目次

1. [移行の目的](#1-移行の目的)
2. [前提条件](#2-前提条件)
3. [メリット・デメリット](#3-メリットデメリット)
4. [移行工程の概要](#4-移行工程の概要)
5. [詳細手順](#5-詳細手順)
6. [ロールバック手順](#6-ロールバック手順)
7. [Cloud SQL の停止・削除](#7-cloud-sql-の停止削除)
8. [FAQ・注意点](#8-faq注意点)

---

## 1. 移行の目的

Cloud SQL は最小構成（`db-f1-micro` / ZONAL）でも**インスタンス起動中は常時課金**されるため、月額¥1,500前後が固定コストとして発生します。

Neon はサーバーレスPostgresであり、**アクセスがないと自動でcompute停止 → 接続時に自動復帰**します。個人運用・低頻度アクセスのワークロードでは、月額¥0〜¥300程度まで削減できます。

| 項目             | Cloud SQL (現状)       | Neon (移行後)                   |
| ---------------- | ---------------------- | ------------------------------- |
| 月額目安         | ¥1,500前後（常時課金） | ¥0〜¥300（従量課金）            |
| スケール         | 固定（db-f1-micro）    | オートスケール（compute units） |
| アイドル時       | 課金継続               | compute停止（ストレージのみ）   |
| コールドスタート | なし                   | 数百ms〜1秒程度                 |
| Postgres互換性   | 100%                   | 100%（同じPostgres 16系）       |

---

## 2. 前提条件

- Neon アカウント作成済み（[neon.tech](https://neon.tech)）
- `gcloud` CLI が認証済み（articard-ff673 プロジェクト）
- `pg_dump` / `pg_restore` が利用可能（PostgreSQL 16系クライアント）
- Cloud SQL Proxy（`cloud-sql-proxy.exe`）が利用可能
- 既存の `DATABASE_URL` を保管しておくこと（ロールバック時に必要）

---

## 3. メリット・デメリット

### メリット

- **大幅なコスト削減**: 月¥1,500 → ¥0〜¥300（無料枠で完結する可能性大）
- **Postgres互換**: アプリコードの修正は最小限（Prismaの設定変更のみ）
- **ロールバック容易**: 接続文字列を戻すだけで即時復元
- **管理工数ゼロ**: バックアップ、パッチ適用、HA構成すべてマネージド

### デメリット

- **コールドスタート遅延**: 久しぶりのリクエストで初回1〜3秒の遅延
- **無料枠の制約**: 0.5GB ストレージ / 月190 compute hours
- **接続プーリング必須**: Cloud Run のようなサーバーレス環境からは pgbouncer 経由が推奨
- **GCPからの分離**: ログ/メトリクスが Cloud Monitoring に統合されない

---

## 4. 移行工程の概要

| 工程                  | 想定時間    | 内容                                              |
| --------------------- | ----------- | ------------------------------------------------- |
| 1. Neonセットアップ   | 15分        | アカウント作成、Tokyoリージョンでプロジェクト作成 |
| 2. スキーマ移行       | 30分        | `prisma migrate deploy` で新DBにスキーマ適用      |
| 3. データ移行         | 30分〜1時間 | `pg_dump` → `pg_restore`                          |
| 4. Prisma設定調整     | 30分〜1時間 | `directUrl` の追加、コネクション設定              |
| 5. ローカル動作確認   | 1時間       | 全機能の疎通テスト                                |
| 6. Secret Manager更新 | 15分        | 本番の `DATABASE_URL` を差し替え                  |
| 7. 本番切替・検証     | 1〜2時間    | Cloud Run再デプロイ、動作確認                     |
| 8. Cloud SQL停止      | 15分        | 数日様子を見て問題なければ停止                    |

**合計: 半日〜1日（4〜8時間）**

---

## 5. 詳細手順

### 5.1 Neonプロジェクト作成

1. [Neon Console](https://console.neon.tech) にログイン
2. **New Project** を選択
3. 設定:
   - Project name: `articard-prod`
   - Postgres version: `16`
   - Region: **`Asia Pacific (Tokyo)`** （重要: レイテンシに直結）
   - Compute size: `0.25 CU`（最小）
4. プロジェクト作成後、以下を控える:
   - **Pooled connection string**（`?pgbouncer=true` を含む、アプリ実行用）
   - **Direct connection string**（マイグレーション用）

```bash
# 控える接続文字列の例
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.ap-northeast-1.aws.neon.tech/articard?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:pass@ep-xxx.ap-northeast-1.aws.neon.tech/articard?sslmode=require"
```

### 5.2 Prismaスキーマの修正

`prisma/schema.prisma` の `datasource` ブロックに `directUrl` を追加します。

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled (アプリ実行時)
  directUrl = env("DIRECT_URL")     // direct (migrate時)
}
```

### 5.3 既存データのバックアップ

Cloud SQL Proxy を起動した状態で `pg_dump` を実行します。

```bash
# Cloud SQL Proxy 起動（別ターミナル）
./cloud-sql-proxy.exe articard-ff673:asia-northeast1:articard-db --port 5433

# データダンプ（カスタム形式 = 復元時に並列処理可）
pg_dump \
  -h localhost -p 5433 \
  -U <user> -d <dbname> \
  -F c -b -v \
  -f articard-backup-$(date +%Y%m%d).dump
```

> **Tip**: ダンプファイルは安全な場所に保管。移行失敗時の最後の砦です。

### 5.4 スキーマ適用（Neon側）

新しい接続文字列を使ってスキーマを適用します。

```bash
# 環境変数を一時的に Neon 向けに設定
export DATABASE_URL="<Neon pooled URL>"
export DIRECT_URL="<Neon direct URL>"

# スキーマ適用
npx prisma migrate deploy

# Prisma Client 再生成
npx prisma generate
```

### 5.5 データ復元

```bash
# Direct URL から接続情報を抽出して pg_restore に渡す
pg_restore \
  -h ep-xxx.ap-northeast-1.aws.neon.tech \
  -U <neon-user> -d articard \
  --no-owner --no-acl \
  -v articard-backup-YYYYMMDD.dump
```

復元後、レコード数を比較して整合性を確認:

```sql
-- Cloud SQL 側と Neon 側で同じクエリを実行して件数比較
SELECT 'users' AS table_name, COUNT(*) FROM "User"
UNION ALL SELECT 'articles', COUNT(*) FROM "Article"
UNION ALL SELECT 'cards', COUNT(*) FROM "Card";
```

### 5.6 ローカル動作確認

`.env` を Neon 向けに切り替えて全機能をテスト:

```env
DATABASE_URL="postgresql://...@ep-xxx-pooler...?pgbouncer=true"
DIRECT_URL="postgresql://...@ep-xxx...?sslmode=require"
```

確認項目:

- [ ] ログイン / 新規登録
- [ ] 記事生成
- [ ] カード生成（各レアリティ）
- [ ] コレクション表示
- [ ] お気に入り追加・削除
- [ ] Stripe決済フロー（テスト環境）
- [ ] チャレンジセッション

### 5.7 Secret Manager の更新

```bash
# 既存の値をバックアップ（ロールバック用）
gcloud secrets versions access latest --secret=articard-prod-db-url > db-url-backup.txt

# 新しい値を追加
echo -n "<Neon pooled URL>" | gcloud secrets versions add articard-prod-db-url --data-file=-

# DIRECT_URL 用シークレットを新規作成
echo -n "<Neon direct URL>" | gcloud secrets create articard-prod-direct-url --data-file=-
```

### 5.8 Cloud Run の再デプロイ

`DIRECT_URL` 環境変数を Cloud Run サービスに追加し、再デプロイ:

```bash
gcloud run services update articard \
  --region=asia-northeast1 \
  --update-secrets=DIRECT_URL=articard-prod-direct-url:latest
```

または GitHub Actions のデプロイワークフローで `DIRECT_URL` を追加してデプロイ。

### 5.9 本番動作確認

```bash
# ヘルスチェック
curl https://<SERVICE_URL>/api/health

# Cloud Run ログを監視
gcloud run services logs tail articard --region=asia-northeast1
```

数時間〜1日、エラーログとレスポンスタイムを観察。問題がなければ移行完了。

---

## 6. ロールバック手順

問題が発生した場合、Secret Manager の旧バージョンに切り戻すだけで復元できます（Cloud SQLが起動中の場合）。

```bash
# 旧バージョン（Cloud SQL）に戻す
gcloud secrets versions list articard-prod-db-url
gcloud run services update articard \
  --region=asia-northeast1 \
  --update-secrets=DATABASE_URL=articard-prod-db-url:<旧バージョン番号>
```

> **重要**: Cloud SQL を完全削除する前にロールバック猶予期間（最低1週間推奨）を設けること。

---

## 7. Cloud SQL の停止・削除

### 7.1 一時停止（推奨: 移行検証期間）

Neon に切り替えた後、即削除せず一定期間停止しておくと安心です。

```bash
gcloud sql instances patch articard-db --activation-policy=NEVER
```

停止中の課金は月¥200〜400（ストレージのみ）。

### 7.2 完全削除（移行が安定した後）

数週間運用して問題がなければ削除:

```bash
# 最終バックアップを取得
gcloud sql backups create --instance=articard-db --description="Final backup before deletion"

# インスタンス削除
gcloud sql instances delete articard-db
```

> **警告**: 削除後はデータ復元不可。必ず `pg_dump` のローカルバックアップも保管してください。

---

## 8. FAQ・注意点

### Q. Prismaの `migrate dev` は使える?

A. ローカル開発時は問題ありません。本番では `migrate deploy` のみを使用してください（pooled connectionでDDLを実行するとロックエラーになる場合があるため、Direct URL経由で実行されます）。

### Q. コネクションプールの設定は?

A. Neon の pgbouncer はデフォルトで `transaction` モード。Prismaから使う場合、長時間トランザクション（数秒以上）はタイムアウトする可能性があるため注意。Articardの現状の処理では問題ありません。

### Q. 無料枠を超えるとどうなる?

A. Neon は超過時に自動停止または有料プラン勧誘になります。`articard` のような個人運用なら **0.5GB / 月190 compute hours** で十分収まる想定ですが、想定外のアクセス急増に備えて Neon Console の **Usage** タブを定期確認してください。

### Q. Cloud SQL Proxy は不要になる?

A. はい。Neon は SSL接続でPublicに公開されており、IP制限ではなく認証情報で保護されます。ローカル開発でも `cloud-sql-proxy` の起動は不要です。

### Q. バックアップはどうなる?

A. Neon 無料枠は **7日間のPITR (Point-in-Time Recovery)** が標準で含まれます。手動の `pg_dump` バックアップを定期取得する場合は、別途スクリプトを用意してください。

### Q. ステージング環境はどうする?

A. Neon の **Branching** 機能で本番DBから瞬時に分岐できます（コピーオンライト）。ステージング/PR環境ごとに独立したブランチDBを持てるのが大きな利点。

---

## 参考資料

- [Neon Documentation](https://neon.tech/docs)
- [Prisma + Neon Guide](https://neon.tech/docs/guides/prisma)
- [Connection Pooling in Neon](https://neon.tech/docs/connect/connection-pooling)
- [production-operations.md](./production-operations.md) - 本番環境運用ガイド
- [production-setup.md](./production-setup.md) - 本番環境構築ガイド
