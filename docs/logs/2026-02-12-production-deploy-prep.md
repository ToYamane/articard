# 本番 Cloud Run デプロイ準備

**日付**: 2026-02-12

## 概要

本番 Cloud Run デプロイに向けた Dockerfile / Cloud Build / GCS ロジックの修正。ビルド時の環境変数不足、Cloud SQL 接続設定、フォント欠落など8つの問題を修正。

## 修正した問題

### 1. `NEXT_PUBLIC_*` 環境変数がビルド時に未設定
- **問題**: Next.js はビルド時に `NEXT_PUBLIC_*` をインライン化するが、Dockerfile に ARG 定義がなくランタイムの `--set-env-vars` では反映されない
- **対応**: Dockerfile の builder ステージに 8つの `ARG` を追加、Cloud Build で `--build-arg` として渡す

### 2. Cloud Build にビルド・プッシュステップが欠如
- **問題**: 旧構成は事前ビルド済みイメージを前提としており、Cloud Build 内でのビルドステップがなかった
- **対応**: test → build → push → deploy → verify の5ステップ構成に全面書き換え

### 3. Cloud SQL 接続設定がない
- **問題**: Cloud Run から Cloud SQL に接続するための `--add-cloudsql-instances` が未設定
- **対応**: deploy ステップに `--add-cloudsql-instances=${_CLOUD_SQL_INSTANCE}` を追加

### 4. 環境変数・シークレットの不足
- **問題**: Stripe 関連、GCS バケット名、Gemini API キーなど多数の環境変数が未設定
- **対応**: `--set-secrets` に Stripe（5つ）、Gemini、Firebase Storage/Messaging/AppID を追加。`GCS_BUCKET_NAME` を `--set-env-vars` に追加

### 5. GCS 使用判定が Cloud Run で false になる
- **問題**: `USE_GCS` が `GOOGLE_APPLICATION_CREDENTIALS` の存在のみで判定しており、Cloud Run の ADC（Application Default Credentials）環境では false になる
- **対応**: `process.env.K_SERVICE` チェックを追加（Cloud Run 環境変数）

### 6. fonts ディレクトリが Docker イメージに含まれない
- **問題**: カード画像生成で使用する日本語フォントが runner ステージにコピーされていない
- **対応**: `COPY --from=builder /app/fonts ./fonts` を追加

### 7. `npm ci --only=production` で devDependencies が欠如
- **問題**: deps ステージで `--only=production` を指定しているため、ビルドに必要な devDependencies（TypeScript 等）がインストールされない
- **対応**: `--only=production` を削除（standalone ビルドで最終イメージは軽量化される）

### 8. DB マイグレーション方針の変更
- **問題**: 旧構成ではデプロイ後にコンテナ内から `prisma migrate deploy` を実行していたが、Cloud SQL Proxy 経由の方が安全
- **対応**: Cloud Build からマイグレーションステップを削除。ローカルの Cloud SQL Proxy 経由で手動実行する方針に変更

## 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `Dockerfile` | deps: `--only=production` 削除、builder: `NEXT_PUBLIC_*` ARG 8つ追加、runner: fonts コピー追加 |
| `cloudbuild.production.yaml` | 全面書き換え（test→build→push→deploy→verify の5ステップ構成、Secret Manager 連携、置換変数追加） |
| `src/lib/gcs/storage.ts` | `USE_GCS` 判定に `K_SERVICE` チェック追加（Cloud Run ADC 対応） |

## その他の構成変更

- Cloud Build タイムアウト: `600s` → `1200s`
- Cloud Run タイムアウト: `60s` → `300s`
- ヘルスチェック: 単発 → リトライ付き（5回、10秒間隔）
- 置換変数: `_IMAGE_TAG` 削除、`_CLOUD_SQL_INSTANCE` と `_GCS_BUCKET` 追加

## 検証結果

- `npm run type-check` — 成功（エラーなし）
- `npm run lint` — 警告のみ（全て既存、新規エラーなし）

## 未コミット変更の整理（別コミット推奨）

deploy-prep 以外に以下の未コミット変更あり:

1. **チャレンジモード最適化** (`challenge/page.tsx`, `[sessionId]/page.tsx`, `challenge-service.ts`, `sessions/[id]/submit/route.ts`)
   - 非ハイスコアセッションの自動削除
   - submit レスポンスに phases データ追加
   - high-scores API 呼び出し削除（パフォーマンス改善）
   - 無制限プレイ表示対応

2. **Stripe 改善** (`stripe/webhook/route.ts`, `subscription/route.ts`)
   - `past_due` ステータス対応
   - DELETE で実際に Stripe サブスクリプションをキャンセル
   - 支払い失敗時のログ改善

## 今後の作業

### 即時必要（デプロイ前）
1. 未コミット変更をコミット（2つに分割: deploy-prep / challenge+stripe 改善）
2. GCP Secret Manager にシークレット作成（10個新規）
3. Cloud Build サービスアカウントに Secret Manager アクセス権付与
4. ローカル Docker ビルド検証

### デプロイ実行
5. Cloud SQL Proxy 経由で DB マイグレーション実行（`npx prisma migrate deploy`）
6. Cloud Build トリガー設定 or 手動実行（`gcloud builds submit`）
7. ヘルスチェック・動作確認

### デプロイ後
8. カスタムドメイン設定（`_APP_URL` 置換変数を実際のドメインに更新）
9. Stripe Webhook エンドポイント設定（本番URL）
10. `docs/guides/deployment.md` を actual 設定に更新（現在は理想的な3環境構成の記述）
