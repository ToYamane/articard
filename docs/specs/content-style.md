# 記事生成時の文章スタイル選択機能

## 概要

記事生成時に「文章スタイル」を選択できる機能。論文形式だけでなく、物語・会話・詩などのスタイルで記事を生成できる。

## 文章スタイル一覧

| ID | 表示名 | 説明 | 文字数目安 |
|-----|--------|------|-----------|
| `essay` | 論文形式 | 客観的で論理的な解説（デフォルト） | 800文字 |
| `story` | 物語形式 | 登場人物がいるストーリー仕立て | 800文字 |
| `dialogue` | 会話形式 | 先生と生徒などの対話形式 | 800文字 |
| `poem` | 詩 | リズムや韻を意識した詩的表現 | 300文字 |
| `explanation` | やさしい解説 | 小学生にもわかる平易な説明 | 600文字 |

## データベース

### Articleモデル

```prisma
model Article {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String   @map("user_id") @db.VarChar(128)
  theme       String   @db.VarChar(30)
  content     String   @db.Text
  contentType String   @default("essay") @map("content_type") @db.VarChar(20)  // 追加
  openaiModel String   @map("openai_model") @db.VarChar(50)
  tokenUsage  Int      @default(0) @map("token_usage")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  // ...
}
```

## API

### POST /api/articles

記事生成リクエスト

```json
{
  "theme": "宇宙の誕生",
  "contentType": "story"  // オプション、デフォルト: "essay"
}
```

## UI設計

### テーマ入力画面

プルダウン形式で文章スタイルを選択:

```
┌─────────────────────────────────────────────┐
│ 学びたいテーマ                               │
│ ┌─────────────────────────────────────────┐ │
│ │ 宇宙の誕生                               │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 文章スタイル                                 │
│ ┌─────────────────────────────────────────┐ │
│ │ 論文形式                            ▼   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│   [記事＋カード生成]  [記事のみ生成]          │
└─────────────────────────────────────────────┘
```

- プルダウンでスタイルを選択
- 属性名のみ表示（説明文は非表示）
- デフォルトは「論文形式」

### 記事表示

- マークダウン形式で表示
- `react-markdown` ライブラリを使用
- `@tailwindcss/typography` プラグインでスタイリング

## 実装ファイル

| ファイル | 役割 |
|---------|------|
| `src/types/article.ts` | ContentType型定義 |
| `prisma/schema.prisma` | DBスキーマ |
| `src/lib/validations/article.ts` | バリデーション |
| `src/lib/openai/article-generation.ts` | プロンプト生成 |
| `src/lib/services/article-service.ts` | サービス層 |
| `src/app/api/articles/route.ts` | APIエンドポイント |
| `src/components/article/theme-input.tsx` | 入力UI |
| `src/components/article/article-view.tsx` | 記事表示（マークダウン対応） |

## 後方互換性

- 既存記事は `contentType = 'essay'` として扱う（DBデフォルト値）
- APIは `contentType` を省略可能
