---
name: dev
description: 開発サーバー（Next.js + DB）の起動・停止・再起動・状態確認
argument-hint: [start|stop|restart|status]
disable-model-invocation: true
allowed-tools: Bash
---

# 開発サーバー制御

開発サーバー（Next.js + Cloud SQL Proxy）を制御するコマンド。
`npm run dev`（concurrently）で proxy + next を1プロセスグループとして管理する。

## 引数

- `start` または引数なし - 開発サーバーをバックグラウンドで起動
- `stop` - 実行中のプロセスを停止
- `restart` - 停止して再起動
- `status` - 現在の状態を確認

## 実行手順

### `/dev start` または `/dev`

1. ポート3000, 5433が使用中でないか確認（`netstat -ano | findstr ":3000 :5433"`）
2. `npm run dev` を **1つのバックグラウンドタスク** で起動（`run_in_background: true`）
3. 数秒待ってからポート確認

```bash
npm run dev
```

**重要**: `run_in_background: true` で起動すること。task_id を記録しておく（stop で使用）。

### `/dev stop`

1. まず TaskStop で起動時の task_id を使って停止を試みる
2. フォールバック: ポートを使用中のプロセスを特定して停止

```bash
# Windows - ポートからPIDを特定して停止
for /f "tokens=5" %a in ('netstat -ano ^| findstr ":3000.*LISTENING"') do taskkill /F /PID %a 2>nul
for /f "tokens=5" %a in ('netstat -ano ^| findstr ":5433.*LISTENING"') do taskkill /F /PID %a 2>nul

# Mac/Linux
lsof -ti :3000 | xargs kill -9 2>/dev/null; lsof -ti :5433 | xargs kill -9 2>/dev/null
```

**注意**: `taskkill /F /IM node.exe` は使わないこと（Claude Code 自身の node プロセスを殺す危険性がある）。

### `/dev restart`

1. 停止処理を実行
2. 2秒待機
3. 起動処理を実行

### `/dev status`

プロセスとポートの状態を確認:

```bash
# Windows
netstat -ano | findstr ":3000 :5433"

# Mac/Linux
lsof -i :3000 -i :5433
```

## 確認事項

- Cloud SQL Proxy: ポート5433がLISTENINGになっているか
- Next.js: http://localhost:3000 でアクセス可能か
- ポート3000が使用中の場合は3001、3002も確認
