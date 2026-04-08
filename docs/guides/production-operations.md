# 本番環境運用ガイド

このドキュメントでは、Articardの本番環境における運用・監視・セキュリティ・災害対策について説明します。

## 目次

1. [運用概要](#1-運用概要)
2. [セキュリティ設定](#2-セキュリティ設定)
3. [監視・アラート](#3-監視アラート)
4. [バックアップ・災害対策](#4-バックアップ災害対策)
5. [パフォーマンス管理](#5-パフォーマンス管理)
6. [運用チェックリスト](#6-運用チェックリスト)
7. [コスト管理・一時停止/再開](#7-コスト管理一時停止再開)

---

## 1. 運用概要

### 1.1 環境構成

| 環境        | 用途         | 特徴                                 |
| ----------- | ------------ | ------------------------------------ |
| Development | ローカル開発 | Cloud SQL Proxy経由、モック使用可    |
| Staging     | 検証・QA     | 本番同等構成（小規模）、自動デプロイ |
| Production  | 本番サービス | HA構成、監視・アラート設定済み       |

### 1.2 本番環境リソース一覧

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Production Environment (articard-prod)               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    │
│  │   Cloud Run     │    │   Cloud SQL     │    │ Cloud Storage   │    │
│  │  articard-prod  │───>│ articard-prod-db│    │ articard-prod-  │    │
│  │                 │    │   (HA構成)      │    │    images       │    │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘    │
│           │                                                             │
│           ▼                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    │
│  │ Secret Manager  │    │   Firebase      │    │ Cloud Logging   │    │
│  │                 │    │   Auth          │    │ & Monitoring    │    │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.3 運用担当者の役割

| 役割           | 責任範囲                                    |
| -------------- | ------------------------------------------- |
| インフラ管理者 | GCPリソース管理、セキュリティ、バックアップ |
| 開発チーム     | デプロイ、アプリケーション監視、バグ修正    |
| オンコール担当 | アラート対応、緊急時の初動対応              |

---

## 2. セキュリティ設定

### 2.1 VPC構成（プライベートネットワーク）

Cloud SQLへのアクセスをプライベート接続に限定することで、セキュリティを強化します。

#### VPCネットワーク作成

```bash
# プロジェクト設定
gcloud config set project articard-prod

# VPCネットワーク作成
gcloud compute networks create articard-vpc \
  --subnet-mode=auto

# プライベートIPアドレス範囲の割り当て
gcloud compute addresses create google-managed-services-articard-vpc \
  --global \
  --purpose=VPC_PEERING \
  --prefix-length=16 \
  --network=articard-vpc

# プライベートサービス接続の作成
gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=google-managed-services-articard-vpc \
  --network=articard-vpc
```

#### Cloud SQLプライベートIP設定

```bash
# 既存インスタンスにプライベートIPを追加
gcloud sql instances patch articard-prod-db \
  --network=projects/articard-prod/global/networks/articard-vpc \
  --no-assign-ip  # 外部IPを削除（オプション）
```

#### Cloud Run VPCコネクタ作成

```bash
# Serverless VPCアクセスコネクタ作成
gcloud compute networks vpc-access connectors create articard-connector \
  --region=asia-northeast1 \
  --network=articard-vpc \
  --range=10.8.0.0/28 \
  --min-instances=2 \
  --max-instances=10

# Cloud RunサービスにVPCコネクタを設定
gcloud run services update articard-prod \
  --region=asia-northeast1 \
  --vpc-connector=articard-connector \
  --vpc-egress=private-ranges-only
```

### 2.2 IAMロール最小化

#### サービスアカウント設計

```bash
# 専用サービスアカウント作成
gcloud iam service-accounts create articard-prod-sa \
  --display-name="Articard Production Service Account"

SA_EMAIL="articard-prod-sa@articard-prod.iam.gserviceaccount.com"
```

#### 最小権限の付与

```bash
# Cloud SQL クライアント
gcloud projects add-iam-policy-binding articard-prod \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/cloudsql.client"

# Cloud Storage オブジェクト管理者
gcloud projects add-iam-policy-binding articard-prod \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/storage.objectAdmin" \
  --condition='expression=resource.name.startsWith("projects/_/buckets/articard-prod-images"),title=articard-images-only'

# Secret Manager シークレットアクセス
for secret in articard-prod-db-url articard-prod-openai-key articard-prod-flux-key articard-prod-gemini-key articard-prod-stripe-key articard-prod-firebase-key; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/secretmanager.secretAccessor"
done

# Cloud Logging ログ書き込み
gcloud projects add-iam-policy-binding articard-prod \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/logging.logWriter"

# Cloud Monitoring メトリクス書き込み
gcloud projects add-iam-policy-binding articard-prod \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/monitoring.metricWriter"
```

#### IAM監査

```bash
# プロジェクトのIAMポリシーを確認
gcloud projects get-iam-policy articard-prod --format=json > iam-policy.json

# 不要な権限を検出（手動レビュー）
cat iam-policy.json | jq '.bindings[] | select(.role | contains("editor") or contains("owner"))'
```

### 2.3 Cloud Armor（DDoS対策）

#### セキュリティポリシー作成

```bash
# セキュリティポリシー作成
gcloud compute security-policies create articard-security-policy \
  --description="Articard production security policy"

# レート制限ルール（1IPあたり100リクエスト/分）
gcloud compute security-policies rules create 1000 \
  --security-policy=articard-security-policy \
  --expression="true" \
  --action=rate-based-ban \
  --rate-limit-threshold-count=100 \
  --rate-limit-threshold-interval-sec=60 \
  --ban-duration-sec=600 \
  --conform-action=allow \
  --exceed-action=deny-429 \
  --enforce-on-key=IP

# SQLインジェクション対策
gcloud compute security-policies rules create 2000 \
  --security-policy=articard-security-policy \
  --expression="evaluatePreconfiguredExpr('sqli-stable')" \
  --action=deny-403

# XSS対策
gcloud compute security-policies rules create 2001 \
  --security-policy=articard-security-policy \
  --expression="evaluatePreconfiguredExpr('xss-stable')" \
  --action=deny-403

# 特定国からのブロック（必要に応じて）
# gcloud compute security-policies rules create 3000 \
#   --security-policy=articard-security-policy \
#   --expression="origin.region_code == 'XX'" \
#   --action=deny-403
```

#### Cloud Runへの適用

Cloud Armorは外部HTTPSロードバランサー経由でのみ適用可能です。Cloud Runにロードバランサーを設定する場合:

```bash
# NEG（Network Endpoint Group）作成
gcloud compute network-endpoint-groups create articard-neg \
  --region=asia-northeast1 \
  --network-endpoint-type=serverless \
  --cloud-run-service=articard-prod

# バックエンドサービス作成
gcloud compute backend-services create articard-backend \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --protocol=HTTP2 \
  --global

# バックエンドにNEGを追加
gcloud compute backend-services add-backend articard-backend \
  --network-endpoint-group=articard-neg \
  --network-endpoint-group-region=asia-northeast1 \
  --global

# セキュリティポリシーを適用
gcloud compute backend-services update articard-backend \
  --security-policy=articard-security-policy \
  --global
```

### 2.4 Audit Logging設定

```bash
# 監査ログの有効化（Data Access Logs）
cat > audit-config.json << 'EOF'
{
  "auditConfigs": [
    {
      "service": "allServices",
      "auditLogConfigs": [
        {"logType": "ADMIN_READ"},
        {"logType": "DATA_WRITE"},
        {"logType": "DATA_READ"}
      ]
    }
  ]
}
EOF

# IAMポリシーに監査設定を追加
gcloud projects get-iam-policy articard-prod --format=json > current-policy.json
# audit-config.json の内容を current-policy.json にマージ
gcloud projects set-iam-policy articard-prod merged-policy.json
```

### 2.5 シークレット管理ベストプラクティス

```bash
# シークレットのローテーション
# 新しいバージョンを作成
echo -n "new-secret-value" | gcloud secrets versions add articard-prod-db-url --data-file=-

# 古いバージョンを無効化
gcloud secrets versions disable VERSION_ID --secret=articard-prod-db-url

# シークレットアクセスの監査
gcloud logging read 'protoPayload.serviceName="secretmanager.googleapis.com"' \
  --project=articard-prod \
  --limit=100
```

---

## 3. 監視・アラート

### 3.1 Cloud Logging設定

#### 構造化ログの実装

```typescript
// src/lib/logger.ts
interface LogEntry {
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  httpRequest?: {
    requestMethod: string;
    requestUrl: string;
    status: number;
    latency: string;
    userAgent: string;
    remoteIp: string;
  };
  labels?: Record<string, string>;
  [key: string]: unknown;
}

export function log(entry: LogEntry): void {
  // Cloud Loggingが自動的にJSON形式のログを解析
  console.log(JSON.stringify(entry));
}

// 使用例
log({
  severity: 'INFO',
  message: 'Card generated successfully',
  labels: {
    userId: user.id,
    cardId: card.id,
    rarity: card.rarity,
  },
});
```

#### ログベースのメトリクス作成

```bash
# エラーログカウント
gcloud logging metrics create articard-error-count \
  --description="Count of error logs" \
  --log-filter='resource.type="cloud_run_revision" AND severity>=ERROR'

# API レイテンシ
gcloud logging metrics create articard-api-latency \
  --description="API request latency" \
  --log-filter='resource.type="cloud_run_revision" AND httpRequest.latency:*' \
  --bucket-name="articard-latency-bucket"
```

#### ログの保持期間設定

```bash
# ログバケット作成（長期保存用）
gcloud logging buckets create articard-long-term \
  --location=asia-northeast1 \
  --retention-days=365

# ログシンクの作成
gcloud logging sinks create articard-long-term-sink \
  --log-filter='resource.type="cloud_run_revision"' \
  --destination=logging.googleapis.com/projects/articard-prod/locations/asia-northeast1/buckets/articard-long-term
```

### 3.2 Cloud Monitoring ダッシュボード

#### ダッシュボード作成（JSON定義）

```json
{
  "displayName": "Articard Production Dashboard",
  "gridLayout": {
    "columns": "2",
    "widgets": [
      {
        "title": "Cloud Run - Request Count",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }
          ]
        }
      },
      {
        "title": "Cloud Run - Request Latency (P95)",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_latencies\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_PERCENTILE_95"
                  }
                }
              }
            }
          ]
        }
      },
      {
        "title": "Cloud Run - Error Rate",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }
          ]
        }
      },
      {
        "title": "Cloud Run - Instance Count",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/container/instance_count\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }
          ]
        }
      },
      {
        "title": "Cloud SQL - CPU Utilization",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }
          ]
        }
      },
      {
        "title": "Cloud SQL - Active Connections",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/postgresql/num_backends\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }
          ]
        }
      }
    ]
  }
}
```

#### ダッシュボード作成コマンド

```bash
# JSONファイルからダッシュボード作成
gcloud monitoring dashboards create --config-from-file=dashboard.json
```

### 3.3 アラートポリシー設定

#### 高エラーレートアラート

```bash
gcloud alpha monitoring policies create \
  --display-name="Articard - High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class="5xx"' \
  --condition-threshold-value=0.05 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=300s \
  --condition-threshold-aggregation-alignment-period=60s \
  --condition-threshold-aggregation-per-series-aligner=ALIGN_RATE \
  --notification-channels=projects/articard-prod/notificationChannels/CHANNEL_ID \
  --documentation="本番環境でエラーレートが5%を超えています。Cloud Loggingでエラー内容を確認してください。"
```

#### 高レイテンシアラート

```bash
gcloud alpha monitoring policies create \
  --display-name="Articard - High Latency" \
  --condition-display-name="P95 latency > 5s" \
  --condition-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_latencies"' \
  --condition-threshold-value=5000 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=300s \
  --condition-threshold-aggregation-alignment-period=60s \
  --condition-threshold-aggregation-per-series-aligner=ALIGN_PERCENTILE_95 \
  --notification-channels=projects/articard-prod/notificationChannels/CHANNEL_ID
```

#### Cloud SQL高CPU使用率アラート

```bash
gcloud alpha monitoring policies create \
  --display-name="Articard - Cloud SQL High CPU" \
  --condition-display-name="CPU > 80%" \
  --condition-filter='resource.type="cloudsql_database" AND metric.type="cloudsql.googleapis.com/database/cpu/utilization"' \
  --condition-threshold-value=0.8 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=300s \
  --notification-channels=projects/articard-prod/notificationChannels/CHANNEL_ID
```

#### 通知チャンネル作成

```bash
# Emailチャンネル
gcloud alpha monitoring channels create \
  --display-name="Articard Ops Email" \
  --type=email \
  --channel-labels=email_address=ops@articard.com

# Slackチャンネル（Webhook経由）
gcloud alpha monitoring channels create \
  --display-name="Articard Slack Alerts" \
  --type=slack \
  --channel-labels=channel_name=#articard-alerts \
  --channel-labels=auth_token=xoxb-xxx
```

### 3.4 Uptime Check（外部監視）

```bash
# ヘルスチェックエンドポイントの監視
gcloud monitoring uptime-check-configs create articard-health-check \
  --display-name="Articard Health Check" \
  --resource-type=uptime-url \
  --monitored-resource-labels="host=articard.com,project_id=articard-prod" \
  --http-check-path="/api/health" \
  --http-check-request-method=GET \
  --period=60 \
  --timeout=10 \
  --checker-type=STATIC_IP_CHECKERS

# ホームページの監視
gcloud monitoring uptime-check-configs create articard-homepage-check \
  --display-name="Articard Homepage Check" \
  --resource-type=uptime-url \
  --monitored-resource-labels="host=articard.com,project_id=articard-prod" \
  --http-check-path="/" \
  --http-check-request-method=GET \
  --period=300 \
  --timeout=30
```

---

## 4. バックアップ・災害対策

### 4.1 Cloud SQL自動バックアップ設定

```bash
# 自動バックアップ設定（作成時に設定済みの場合は確認のみ）
gcloud sql instances describe articard-prod-db --format='value(settings.backupConfiguration)'

# バックアップ設定の更新
gcloud sql instances patch articard-prod-db \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --enable-point-in-time-recovery \
  --retained-backups-count=30 \
  --retained-transaction-log-days=7
```

#### バックアップ設定の詳細

| 設定                          | 値    | 説明                         |
| ----------------------------- | ----- | ---------------------------- |
| backup-start-time             | 03:00 | バックアップ開始時刻（UTC）  |
| retained-backups-count        | 30    | 保持するバックアップ数       |
| retained-transaction-log-days | 7     | トランザクションログ保持日数 |
| enable-point-in-time-recovery | true  | PITR有効化                   |

### 4.2 Point-in-Time Recovery手順

```bash
# バックアップ一覧確認
gcloud sql backups list --instance=articard-prod-db

# 特定時点への復元（新しいインスタンスとして）
gcloud sql instances clone articard-prod-db articard-prod-db-restored \
  --point-in-time="2024-01-15T10:00:00Z"

# 復元したインスタンスの確認
gcloud sql instances describe articard-prod-db-restored

# 接続テスト後、本番インスタンスと入れ替え
# 1. アプリケーションを停止またはメンテナンスモードに
# 2. 最新データを再度同期（必要に応じて）
# 3. Cloud RunのDB接続先を変更
# 4. アプリケーション再開
```

### 4.3 RTO/RPO定義

| 指標                               | 目標値 | 説明                                                              |
| ---------------------------------- | ------ | ----------------------------------------------------------------- |
| **RPO** (Recovery Point Objective) | 5分    | 許容されるデータ損失時間。PITRにより5分以内の任意の時点に復元可能 |
| **RTO** (Recovery Time Objective)  | 1時間  | サービス復旧までの目標時間                                        |

#### RPO達成のための設定

- Point-in-Time Recovery有効化
- トランザクションログの継続的バックアップ
- バイナリログ保持期間: 7日

#### RTO達成のための準備

- 復旧手順書の整備（本ドキュメント）
- 復旧訓練の定期実施（四半期ごと）
- Cloud Runの自動スケーリング設定
- 予備インスタンスの準備（オプション）

### 4.4 緊急時対応フロー

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         障害発生時の対応フロー                            │
└─────────────────────────────────────────────────────────────────────────┘

  [障害検知]
      │
      ▼
  [初期トリアージ] ─────────────────────────────────────────────────────┐
      │                                                                   │
      │ サービス完全停止？                                                 │
      │                                                                   │
      ├─ Yes ──> [インシデント宣言]                                       │
      │              │                                                    │
      │              ▼                                                    │
      │          [緊急対応チーム召集]                                      │
      │              │                                                    │
      │              ▼                                                    │
      │          [ステータスページ更新]                                    │
      │              │                                                    │
      │              ▼                                                    │
      │          [原因調査 & 復旧作業]                                     │
      │                                                                   │
      └─ No ───> [通常の障害対応]                                         │
                     │                                                    │
                     ▼                                                    │
                 [ログ・メトリクス確認]                                    │
                     │                                                    │
                     ▼                                                    │
                 [修正デプロイ or ロールバック]                             │
                                                                          │
  [復旧確認] <────────────────────────────────────────────────────────────┘
      │
      ▼
  [ポストモーテム作成]
      │
      ▼
  [再発防止策の実施]
```

#### 緊急連絡先

| 役割           | 連絡先            | 備考                      |
| -------------- | ----------------- | ------------------------- |
| オンコール担当 | PagerDuty / Slack | 24/7対応                  |
| インフラ管理者 | [電話番号/メール] | 重大障害時                |
| GCPサポート    | Cloud Console     | Enterprise サポート契約時 |

#### 障害レベル定義

| レベル        | 定義             | 対応                               |
| ------------- | ---------------- | ---------------------------------- |
| P1 - Critical | サービス完全停止 | 即座に緊急対応、15分以内に初期報告 |
| P2 - High     | 主要機能の障害   | 1時間以内に対応開始                |
| P3 - Medium   | 一部機能の障害   | 当日中に対応                       |
| P4 - Low      | 軽微な問題       | 次スプリントで対応                 |

### 4.5 Cloud Storage バックアップ

```bash
# GCSバケットのバージョニング有効化
gsutil versioning set on gs://articard-prod-images

# ライフサイクルルール設定（古いバージョンを90日後に削除）
cat > lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "numNewerVersions": 3,
          "isLive": false
        }
      },
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 90,
          "isLive": false
        }
      }
    ]
  }
}
EOF
gsutil lifecycle set lifecycle.json gs://articard-prod-images
```

---

## 5. パフォーマンス管理

### 5.1 Cloud Runスケーリング設定

```bash
# 現在の設定確認
gcloud run services describe articard-prod --region=asia-northeast1 --format='yaml(spec.template.spec)'

# スケーリング設定の更新
gcloud run services update articard-prod \
  --region=asia-northeast1 \
  --min-instances=1 \
  --max-instances=20 \
  --concurrency=80 \
  --cpu-throttling=false \
  --execution-environment=gen2
```

#### スケーリングパラメータ

| パラメータ            | 本番推奨値 | 説明                                  |
| --------------------- | ---------- | ------------------------------------- |
| min-instances         | 1          | コールドスタート回避のため最小1       |
| max-instances         | 20         | トラフィックに応じて調整              |
| concurrency           | 80         | 1インスタンスあたりの同時リクエスト数 |
| cpu-throttling        | false      | リクエスト処理中以外もCPU割り当て     |
| execution-environment | gen2       | 第2世代実行環境（推奨）               |

### 5.2 Cloud SQLチューニング

#### インスタンスサイズの調整

```bash
# 現在のメトリクス確認
gcloud monitoring metrics list --filter='metric.type:cloudsql'

# インスタンスのTier変更
gcloud sql instances patch articard-prod-db \
  --tier=db-custom-4-8192  # 4 vCPU, 8GB RAM
```

#### 接続プーリング

Cloud Runからの接続数を制限するため、接続プーリングを設定:

```bash
# Cloud SQLの最大接続数確認
gcloud sql instances describe articard-prod-db \
  --format='value(settings.databaseFlags)'

# 接続数制限の設定
gcloud sql instances patch articard-prod-db \
  --database-flags=max_connections=200
```

アプリケーション側でのコネクションプール設定（Prisma）:

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // connection_limit を Cloud Run の concurrency * max_instances 以下に設定
  // 例: 80 * 20 = 1600 だが、DB側の max_connections を考慮
}
```

#### クエリパフォーマンス分析

```bash
# スロークエリログの有効化
gcloud sql instances patch articard-prod-db \
  --database-flags=log_min_duration_statement=1000  # 1秒以上のクエリをログ

# Query Insightsの有効化
gcloud sql instances patch articard-prod-db \
  --insights-config-query-insights-enabled \
  --insights-config-query-string-length=1024 \
  --insights-config-record-application-tags \
  --insights-config-record-client-address
```

### 5.3 Cloud CDN設定（オプション）

静的アセットの配信を高速化するためのCDN設定:

```bash
# Cloud Storageバケットをバックエンドとして設定
gcloud compute backend-buckets create articard-static-backend \
  --gcs-bucket-name=articard-prod-images \
  --enable-cdn \
  --cache-mode=CACHE_ALL_STATIC

# URLマップの作成
gcloud compute url-maps create articard-url-map \
  --default-service=articard-backend

# 静的アセットのルール追加
gcloud compute url-maps add-path-matcher articard-url-map \
  --path-matcher-name=static-matcher \
  --default-backend-bucket=articard-static-backend \
  --path-rules="/images/*=articard-static-backend"
```

### 5.4 パフォーマンス監視

```bash
# Cloud Run レイテンシの確認
gcloud monitoring metrics list \
  --filter='metric.type="run.googleapis.com/request_latencies"'

# Cloud SQL レイテンシの確認
gcloud monitoring metrics list \
  --filter='metric.type="cloudsql.googleapis.com/database/postgresql/transaction/commit_count"'
```

---

## 6. 運用チェックリスト

### 6.1 日次タスク

- [ ] Cloud Monitoring ダッシュボードの確認
- [ ] エラーログの確認（重大なエラーがないか）
- [ ] Uptime Check の結果確認
- [ ] 外部API（OpenAI、FLUX、Gemini）の使用量確認

### 6.2 週次タスク

- [ ] Cloud SQL バックアップの確認
- [ ] Cloud Run メトリクスのトレンド分析
- [ ] セキュリティアラートの確認
- [ ] コスト使用量の確認（Budget Alerts）
- [ ] 未対応アラートの棚卸し

### 6.3 月次タスク

- [ ] IAM権限の監査
- [ ] シークレットの有効期限確認
- [ ] 外部APIキーのローテーション検討
- [ ] パフォーマンスレポートの作成
- [ ] コスト最適化レビュー
- [ ] 災害復旧訓練の実施（四半期）

### 6.4 リリース時タスク

- [ ] Staging環境での動作確認完了
- [ ] マイグレーションの確認（破壊的変更がないか）
- [ ] ロールバック計画の準備
- [ ] カナリアデプロイの実施
- [ ] デプロイ後のメトリクス監視（15分間）
- [ ] 主要機能のスモークテスト

### 6.5 インシデント対応チェックリスト

- [ ] アラートの確認と初期トリアージ
- [ ] 影響範囲の特定
- [ ] ステータスページの更新（必要に応じて）
- [ ] 原因調査の開始
- [ ] 修正または ロールバックの実施
- [ ] 復旧確認
- [ ] ポストモーテムの作成
- [ ] 再発防止策の実施

---

## 7. コスト管理・一時停止/再開

### 7.1 現在のコスト構成

運用コスト削減のため、以下の設定を適用済み:

| リソース  | 設定                                      | 備考                                     |
| --------- | ----------------------------------------- | ---------------------------------------- |
| Cloud Run | CPU: 1 / Memory: 512Mi / min-instances: 0 | ゼロスケール（アクセスなければ課金なし） |
| Cloud SQL | `db-f1-micro` / ZONAL                     | HA構成なし（個人運用前提）               |
| GCS       | Standard クラス                           | 画像保存のみ                             |

**稼働時の月額目安: ¥2,000〜3,000**
（内訳: Cloud SQL ~¥1,500、Cloud Run ~¥500、GCS ~¥300、その他 ~¥200）

### 7.2 一時停止（データ保持・課金最小化）

個人プロジェクトで長期間利用しない場合、データを保持したまま課金をほぼゼロに抑えられます。

#### 停止手順

```bash
# 1. Cloud SQL インスタンスを停止（データ保持、ストレージ代のみ）
gcloud sql instances patch articard-db --activation-policy=NEVER

# 2. Cloud Run の外部アクセスを遮断（誤アクセスによる起動を防ぐ）
gcloud run services update articard --region=asia-northeast1 --ingress=internal
```

#### 停止中の課金

**月額 ¥200〜400** 程度

- Cloud SQL ストレージ（10GB SSD）: ~¥150
- GCS ストレージ: ~¥50〜100
- Secret Manager / Firebase: ほぼ¥0

#### 停止中に保持されるもの

- データベースの全データ（記事、カード、ユーザー情報）
- GCS の画像データ
- Secret Manager のシークレット
- Cloud Run サービス設定・リビジョン
- カスタムドメインマッピング
- Firebase Authentication ユーザー

### 7.3 再開手順

```bash
# 1. Cloud SQL を起動
gcloud sql instances patch articard-db --activation-policy=ALWAYS

# 2. Cloud Run の外部アクセスを復活
gcloud run services update articard --region=asia-northeast1 --ingress=all

# 3. 動作確認（起動まで数分かかる場合あり）
curl https://<SERVICE_URL>/api/health
```

再デプロイは不要。設定・データはすべてそのまま復活します。

### 7.4 状態確認コマンド

```bash
# Cloud SQL の状態確認
gcloud sql instances describe articard-db --format="value(state,settings.activationPolicy)"
# 停止中: STOPPED  NEVER
# 稼働中: RUNNABLE  ALWAYS

# Cloud Run の状態確認
gcloud run services describe articard --region=asia-northeast1 \
  --format="value(metadata.annotations['run.googleapis.com/ingress'])"
# 停止中: internal
# 稼働中: all
```

### 7.5 完全削除（データ消失）

プロジェクトを完全にクローズする場合のみ実施。**データは復元できません**。

```bash
# Cloud Run サービス削除
gcloud run services delete articard --region=asia-northeast1

# Cloud SQL インスタンス削除
gcloud sql instances delete articard-db

# GCS バケット削除
gsutil rm -r gs://articard-ff673.appspot.com
```

---

## 参考資料

- [production-setup.md](./production-setup.md) - 本番環境構築ガイド
- [deployment.md](./deployment.md) - デプロイフロー詳細
- [environment-setup.md](./environment-setup.md) - 環境別セットアップガイド
- [GCP Cloud Run ドキュメント](https://cloud.google.com/run/docs)
- [GCP Cloud SQL ドキュメント](https://cloud.google.com/sql/docs)
- [GCP Cloud Monitoring ドキュメント](https://cloud.google.com/monitoring/docs)
