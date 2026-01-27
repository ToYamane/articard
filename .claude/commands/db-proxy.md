# /db-proxy

Cloud SQL Auth Proxyを起動し、ローカルからCloud SQLに接続できるようにする。

## 設定

- **Project ID:** articard-ff673
- **Region:** asia-northeast1
- **Instance:** articard-db
- **Local Port:** 5432

## 実行内容

1. Cloud SQL Proxyがインストールされていない場合、ダウンロードを案内
2. Proxyをバックグラウンドで起動

```bash
# Windows
cloud-sql-proxy --port 5432 articard-ff673:asia-northeast1:articard-db

# Mac/Linux
./cloud-sql-proxy --port 5432 articard-ff673:asia-northeast1:articard-db
```
（run_in_background: true で実行）

## 前提条件

- gcloud CLI がインストールされ、認証済みであること
- Cloud SQL Admin API が有効であること

## Cloud SQL Proxyのインストール

**Windows:**
```powershell
# Invoke-WebRequest でダウンロード
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

## 確認

Proxyが起動したことを確認:
- `netstat -an | grep 5432` でポートがLISTENINGになっているか
- データベース接続が成功するか
