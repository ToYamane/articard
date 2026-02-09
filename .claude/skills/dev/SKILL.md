---
name: dev
description: 開発サーバー（Next.js + DB）の起動・停止・再起動・状態確認
argument-hint: [start|stop|restart|status]
disable-model-invocation: true
allowed-tools: Bash
---

# 開発サーバー制御

開発サーバー（Next.js + Cloud SQL Proxy）を制御するコマンド。
`/dev start` で DB Proxy と Next.js を同時にバックグラウンド起動する。

## 引数

- `start` または引数なし - DB Proxy + 開発サーバーをバックグラウンドで起動
- `stop` - 実行中のプロセスをすべて停止
- `restart` - 停止して再起動
- `status` - 現在の状態を確認

## 実行手順

### `/dev start` または `/dev`

1. 既存のプロセスを確認（node, cloud-sql-proxy）
2. Cloud SQL Proxy をバックグラウンドで起動（run_in_background: true）
3. Next.js 開発サーバーをバックグラウンドで起動（run_in_background: true）
4. 数秒待ってからポート確認

Cloud SQL Proxy 起動:
```bash
# Windows
./cloud-sql-proxy.exe articard-ff673:asia-northeast1:articard-db --port 5433

# Mac/Linux
./cloud-sql-proxy articard-ff673:asia-northeast1:articard-db --port 5433
```

Next.js 起動:
```bash
npm run dev:next
```

### `/dev stop`

すべてのプロセスを停止:

```bash
# Windows
taskkill /F /IM cloud-sql-proxy.exe 2>nul; taskkill /F /IM node.exe

# Mac/Linux
pkill -f cloud-sql-proxy; pkill -f "next dev" || pkill -f "node.*next"
```

### `/dev restart`

1. 停止処理を実行
2. 2秒待機
3. 起動処理を実行

### `/dev status`

プロセスとポートの状態を確認:

```bash
# Windows
tasklist | findstr /i "node cloud-sql-proxy"
netstat -ano | findstr ":3000 :5433"

# Mac/Linux
ps aux | grep -E "next|node|cloud-sql-proxy" | grep -v grep
lsof -i :3000 -i :5433
```

## 確認事項

- Cloud SQL Proxy: ポート5433がLISTENINGになっているか
- Next.js: http://localhost:3000 でアクセス可能か
- ポート3000が使用中の場合は3001、3002も確認
