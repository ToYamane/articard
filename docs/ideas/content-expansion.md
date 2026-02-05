# コンテンツ拡張

コンテンツの種類と質を拡充する機能群。

---

## アイデア一覧

### 1. UGC: カスタムシナリオ作成

**概要**
- ユーザーが独自の「シナリオ」を作成・公開できる
- シナリオ = テーマ + 制約条件 + 報酬設定
- 他ユーザーがシナリオをプレイ
- 人気シナリオの作者に報酬

**メリット**
- ビジネス: コンテンツの自動拡充、コミュニティ活性化
- ユーザー: 創作の楽しさ、他者との共有

**実装難易度**: ★★★★☆

**必要な変更**

データモデル:
```prisma
model Scenario {
  id          String   @id @default(cuid())
  authorId    String
  author      User     @relation(fields: [authorId], references: [id])
  title       String
  description String
  theme       String   // メインテーマ
  constraints Json     // 制約条件
  difficulty  String   @default("normal") // easy, normal, hard, expert
  playCount   Int      @default(0)
  likeCount   Int      @default(0)
  status      String   @default("draft") // draft, pending_review, published, rejected
  isPublic    Boolean  @default(false)
  createdAt   DateTime @default(now())
  publishedAt DateTime?

  plays     ScenarioPlay[]
  likes     ScenarioLike[]
  reports   ScenarioReport[]
}

model ScenarioPlay {
  id          String   @id @default(cuid())
  scenarioId  String
  scenario    Scenario @relation(fields: [scenarioId], references: [id])
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  articleId   String?
  article     Article? @relation(fields: [articleId], references: [id])
  completed   Boolean  @default(false)
  score       Int?     // クイズスコア
  playedAt    DateTime @default(now())
}

model ScenarioLike {
  id          String   @id @default(cuid())
  scenarioId  String
  scenario    Scenario @relation(fields: [scenarioId], references: [id])
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())

  @@unique([scenarioId, userId])
}

model ScenarioReport {
  id          String   @id @default(cuid())
  scenarioId  String
  scenario    Scenario @relation(fields: [scenarioId], references: [id])
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  reason      String   // "inappropriate", "spam", "copyright", "other"
  description String?
  status      String   @default("pending") // pending, reviewed, resolved
  createdAt   DateTime @default(now())
}
```

制約条件の例:
```typescript
interface ScenarioConstraints {
  requiredKeywords?: string[];     // 必須キーワード
  forbiddenKeywords?: string[];    // 禁止キーワード
  minWordCount?: number;           // 最小文字数
  maxWordCount?: number;           // 最大文字数
  targetAudience?: string;         // 対象読者
  timeLimit?: number;              // 制限時間（分）
  quizMinScore?: number;           // クイズ最低点
}
```

API:
- `POST /api/scenarios` - シナリオ作成
- `GET /api/scenarios` - シナリオ一覧（検索・フィルタ）
- `GET /api/scenarios/:id` - シナリオ詳細
- `POST /api/scenarios/:id/play` - シナリオプレイ開始
- `POST /api/scenarios/:id/like` - いいね
- `POST /api/scenarios/:id/report` - 報告

UI:
- シナリオ作成ウィザード
- シナリオ一覧（人気順、新着順、カテゴリ別）
- シナリオ詳細ページ
- プレイ画面
- 作者ダッシュボード

**作者報酬**:
| 条件 | 報酬 |
|------|------|
| 初プレイ | 10コイン/プレイ |
| 100プレイ達成 | 500コインボーナス |
| 週間人気1位 | 2000コイン |
| 殿堂入り | 専用バッジ |

**参考**
- Mario Maker: ユーザー作成コース
- LittleBigPlanet: UGCプラットフォーム

---

### 2. 記事ソース拡張（Wikipedia/YouTube/ニュース）

**概要**
- テキストプロンプト以外のソースから記事を生成
- Wikipedia記事のURL → 要約記事
- YouTubeの教育動画 → 文字起こし＆要約
- ニュース記事 → 教育的解説

**メリット**
- ビジネス: コンテンツの幅拡大、差別化
- ユーザー: 多様な学習ソース、効率的なインプット

**実装難易度**: ★★★★☆

**必要な変更**

データモデル:
```prisma
model ArticleSource {
  id          String   @id @default(cuid())
  articleId   String   @unique
  article     Article  @relation(fields: [articleId], references: [id])
  sourceType  String   // "prompt", "wikipedia", "youtube", "news"
  sourceUrl   String?
  sourceTitle String?
  rawContent  String?  @db.Text // 元コンテンツ
  metadata    Json?    // ソース固有のメタデータ
}
```

ソース別処理:

**Wikipedia**:
```typescript
interface WikipediaSource {
  articleUrl: string;
  language: string;
  sections?: string[];  // 特定セクションのみ
}
// Wikipedia API でコンテンツ取得 → GPT で教育記事化
```

**YouTube**:
```typescript
interface YouTubeSource {
  videoUrl: string;
  language: string;
  startTime?: number;   // 開始時間
  endTime?: number;     // 終了時間
}
// YouTube Data API + 字幕取得 → GPT で要約・解説
```

**ニュース**:
```typescript
interface NewsSource {
  articleUrl: string;
  preserveFacts: boolean;  // 事実関係の保持
}
// Webスクレイピング → GPT で教育的解説化
```

API:
- `POST /api/articles/from-wikipedia` - Wikipedia から生成
- `POST /api/articles/from-youtube` - YouTube から生成
- `POST /api/articles/from-news` - ニュース記事から生成
- `GET /api/articles/:id/source` - ソース情報取得

UI:
- ソース選択タブ
- URL入力フィールド
- プレビュー表示
- ソース情報バッジ

**制限事項**:
- YouTube: 公開動画のみ、字幕がある動画のみ
- ニュース: 著作権に配慮、引用の範囲内で要約
- Wikipedia: ライセンス表記必須

**コスト設定（コイン）**:
| ソース | コスト | 理由 |
|--------|--------|------|
| プロンプト | 100 | 基本 |
| Wikipedia | 150 | API呼び出し |
| YouTube | 200 | 文字起こし処理 |
| ニュース | 150 | スクレイピング |

**参考**
- Notion AI: 様々なソースからの要約
- Readwise: ハイライトの統合
