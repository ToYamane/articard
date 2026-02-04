---
name: api-health
description: 主要 API エンドポイントの動作確認
disable-model-invocation: true
allowed-tools: Bash, Read
context: fork
---

# API ヘルスチェック

開発サーバーの主要 API エンドポイントの動作を確認する。

## 実行手順

### 1. 開発サーバーの確認

まず開発サーバーが起動しているか確認:

```bash
# Windows
netstat -ano | findstr :3000

# Mac/Linux
lsof -i :3000
```

サーバーが起動していない場合は、起動を促す。

### 2. エンドポイントのテスト

以下のエンドポイントにリクエストを送信:

```bash
# ヘルスチェック（認証不要のエンドポイントがあれば）
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health

# 認証が必要なAPIの場合はステータスコードのみ確認
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/articles
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/cards
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/themes
```

### 3. 結果の報告

各エンドポイントの状態を表形式で報告:

```
API ヘルスチェック結果:

| エンドポイント         | ステータス | 備考           |
|----------------------|----------|---------------|
| /api/health          | 200 OK   | 正常           |
| /api/articles        | 401      | 認証必要（正常） |
| /api/cards           | 401      | 認証必要（正常） |
| /api/themes          | 200 OK   | 正常           |
```

## チェック対象エンドポイント

1. `/api/health` - 基本ヘルスチェック
2. `/api/articles` - 記事関連
3. `/api/cards` - カード関連
4. `/api/themes` - テーマ関連
5. `/api/users/me` - ユーザー情報

## 期待される応答

- **200**: 正常（認証不要のエンドポイント）
- **401**: 認証が必要（Bearer トークンなしでアクセスした場合）
- **404**: エンドポイントが存在しない
- **500**: サーバーエラー（要調査）

## 注意事項

- このチェックは開発サーバー（localhost:3000）に対して実行
- 認証が必要なAPIは401が正常な応答
- 500エラーが返る場合はログを確認
