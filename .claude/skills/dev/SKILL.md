---
name: dev
description: 開発サーバーの起動・停止・再起動・状態確認
argument-hint: [start|stop|restart|status]
disable-model-invocation: true
allowed-tools: Bash
---

# 開発サーバー制御

開発サーバー（Next.js）を制御するコマンド。

## 引数

- `start` - 開発サーバーをバックグラウンドで起動
- `stop` - 実行中の開発サーバーを停止
- `restart` - 停止して再起動
- `status` または引数なし - 現在の状態を確認

## 実行手順

### `/dev start`

1. 既存のプロセスを確認
2. バックグラウンドで `npm run dev` を実行（run_in_background: true）
3. 数秒待ってからポート確認

```bash
npm run dev
```

### `/dev stop`

Node.js プロセスを停止:

```bash
# Windows
taskkill /F /IM node.exe

# Mac/Linux
pkill -f "next dev" || pkill -f "node.*next"
```

### `/dev restart`

1. 停止処理を実行
2. 2秒待機
3. 起動処理を実行

### `/dev status` または引数なし

プロセスとポートの状態を確認:

```bash
# Windows
tasklist | findstr node
netstat -ano | findstr :3000

# Mac/Linux
ps aux | grep -E "next|node" | grep -v grep
lsof -i :3000
```

## 確認事項

- サーバー起動後は http://localhost:3000 でアクセス可能か確認
- ポート3000が使用中の場合は3001、3002も確認
