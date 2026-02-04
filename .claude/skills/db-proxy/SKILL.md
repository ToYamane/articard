---
name: db-proxy
description: Cloud SQL Proxy の起動と接続確認
argument-hint: [start|stop|status]
disable-model-invocation: true
allowed-tools: Bash
---

# Cloud SQL Proxy 制御

Cloud SQL Auth Proxy を制御してローカルから Cloud SQL に接続できるようにする。

## 設定

- **Project ID:** articard-ff673
- **Region:** asia-northeast1
- **Instance:** articard-db
- **Local Port:** 5433

## 引数

- `start` または引数なし - Proxy を起動
- `stop` - Proxy を停止
- `status` - 接続状態を確認

## 実行手順

### `/db-proxy start` または `/db-proxy`

1. 既存のプロセスを確認
2. バックグラウンドで起動（run_in_background: true）

```bash
# Windows
./cloud-sql-proxy.exe articard-ff673:asia-northeast1:articard-db --port 5433

# Mac/Linux
./cloud-sql-proxy articard-ff673:asia-northeast1:articard-db --port 5433
```

### `/db-proxy stop`

```bash
# Windows
taskkill /F /IM cloud-sql-proxy.exe

# Mac/Linux
pkill -f cloud-sql-proxy
```

### `/db-proxy status`

ポート5433の状態を確認:

```bash
# Windows
netstat -ano | findstr :5433

# Mac/Linux
lsof -i :5433
```

## 前提条件

- gcloud CLI がインストールされ、認証済みであること
- Cloud SQL Admin API が有効であること
- `cloud-sql-proxy.exe`（Windows）または `cloud-sql-proxy`（Mac/Linux）がプロジェクトルートに存在すること

## Cloud SQL Proxy のインストール

Proxy がない場合のダウンロード方法:

**Windows:**
```powershell
Invoke-WebRequest -Uri "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.1/cloud-sql-proxy.x64.exe" -OutFile cloud-sql-proxy.exe
```

**Mac (Intel):**
```bash
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.1/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy
```

**Mac (Apple Silicon):**
```bash
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.1/cloud-sql-proxy.darwin.arm64
chmod +x cloud-sql-proxy
```

**Linux:**
```bash
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.1/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy
```

## 確認事項

- ポート5433がLISTENINGになっているか
- DATABASE_URL の接続先が localhost:5433 であるか
