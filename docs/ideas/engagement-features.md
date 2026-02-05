# ユーザーエンゲージメント向上

ユーザーの継続利用とリテンションを高める機能群。

---

## アイデア一覧

### 1. 連続ログインボーナス＆ストリーク機能

**概要**
- 毎日ログインするとコインポイントやレアカード獲得チャンスを付与
- 連続ログイン日数（ストリーク）に応じてボーナスが増加
- 7日、30日、100日などのマイルストーンで特別報酬

**メリット**
- ビジネス: DAU（デイリーアクティブユーザー）の大幅向上
- ユーザー: 継続のモチベーション、達成感

**実装難易度**: ★★☆☆☆

**必要な変更**

データモデル:
```prisma
model UserStreak {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  currentStreak Int      @default(0)
  longestStreak Int      @default(0)
  lastLoginDate DateTime
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model DailyReward {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  day         Int      // 1-7 for weekly cycle
  knowledge   Int
  bonusRarity String?  // rare, super_rare, legend
  claimedAt   DateTime @default(now())
}
```

API:
- `POST /api/daily-reward/claim` - 報酬を受け取る
- `GET /api/daily-reward/status` - 今日の報酬状態を取得

UI:
- ログイン時のポップアップモーダル
- ホーム画面にストリーク表示
- 週間カレンダー形式の報酬一覧

**参考**
- Duolingo: ストリーク機能の代表例、ストリークフリーズも販売
- ソシャゲ全般: 7日ログインボーナスが一般的

---

### 2. カード図鑑完成度システム

**概要**
- テーマ/カテゴリごとにカード図鑑を用意
- 収集率に応じてバッジや報酬を付与
- 「あと○枚でコンプリート」の表示でコレクション欲を刺激

**メリット**
- ビジネス: カード生成の動機付け、課金への導線
- ユーザー: コレクション欲の充足、目標の明確化

**実装難易度**: ★★★☆☆

**必要な変更**

データモデル:
```prisma
model CardCategory {
  id          String   @id @default(cuid())
  name        String   // "科学", "歴史", "芸術" など
  description String?
  totalCards  Int      // カテゴリ内の総カード数
  iconUrl     String?
  cards       Card[]
}

model UserCategoryProgress {
  id          String       @id @default(cuid())
  userId      String
  user        User         @relation(fields: [userId], references: [id])
  categoryId  String
  category    CardCategory @relation(fields: [categoryId], references: [id])
  ownedCount  Int          @default(0)
  completedAt DateTime?    // コンプリート日時

  @@unique([userId, categoryId])
}
```

API:
- `GET /api/catalog` - 図鑑一覧
- `GET /api/catalog/:categoryId` - カテゴリ詳細
- `GET /api/catalog/progress` - ユーザーの進捗

UI:
- 図鑑タブの追加
- カテゴリグリッド表示
- 未所持カードはシルエット表示
- 完成度プログレスバー

**参考**
- ポケモン図鑑: シルエットで未収集を示す
- パズドラ/モンスト: モンスター図鑑とコンプリート報酬

---

### 3. ウィークリーチャレンジ（期間限定シナリオ）

**概要**
- 毎週異なるテーマのチャレンジを提供
- 「今週のお題: 宇宙に関する記事を3つ生成しよう」
- 達成で限定カードや大量コインを獲得

**メリット**
- ビジネス: 定期的なアクティブ率維持、話題性
- ユーザー: 新鮮な体験、限定報酬への魅力

**実装難易度**: ★★★☆☆

**必要な変更**

データモデル:
```prisma
model WeeklyChallenge {
  id          String   @id @default(cuid())
  title       String
  description String
  theme       String?  // テーマ制限
  targetCount Int      // 目標数
  rewardType  String   // "knowledge", "card", "badge"
  rewardValue Int      // コイン量またはカードID
  startsAt    DateTime
  endsAt      DateTime
  isActive    Boolean  @default(true)

  participants UserChallengeProgress[]
}

model UserChallengeProgress {
  id           String          @id @default(cuid())
  userId       String
  user         User            @relation(fields: [userId], references: [id])
  challengeId  String
  challenge    WeeklyChallenge @relation(fields: [challengeId], references: [id])
  currentCount Int             @default(0)
  completedAt  DateTime?
  rewardClaimed Boolean        @default(false)

  @@unique([userId, challengeId])
}
```

API:
- `GET /api/challenges/current` - 今週のチャレンジ
- `GET /api/challenges/progress` - ユーザーの進捗
- `POST /api/challenges/:id/claim` - 報酬受け取り

UI:
- ホーム画面にチャレンジバナー
- 専用チャレンジページ
- 進捗トラッカー
- 達成時の演出

**参考**
- Fortnite: ウィークリーチャレンジでバトルパス経験値
- ポケモンGO: 期間限定リサーチタスク

---

### 4. アチーブメント・バッジシステム

**概要**
- 様々な条件でバッジを獲得できるシステム
- 「初めての記事生成」「レジェンドカード獲得」「100記事達成」など
- バッジはプロフィールに表示可能

**メリット**
- ビジネス: 多様な行動への動機付け、ソーシャル共有
- ユーザー: 達成感、自己表現の手段

**実装難易度**: ★★☆☆☆

**必要な変更**

データモデル:
```prisma
model Achievement {
  id          String   @id @default(cuid())
  code        String   @unique // "first_article", "legend_collector" など
  name        String
  description String
  iconUrl     String
  category    String   // "article", "card", "social", "special"
  condition   Json     // { type: "card_count", rarity: "legend", count: 1 }
  rewardKnowledge Int  @default(0)
  isSecret    Boolean  @default(false) // 隠しアチーブメント

  users UserAchievement[]
}

model UserAchievement {
  id            String      @id @default(cuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  achievementId String
  achievement   Achievement @relation(fields: [achievementId], references: [id])
  unlockedAt    DateTime    @default(now())
  isDisplayed   Boolean     @default(false) // プロフィールに表示するか

  @@unique([userId, achievementId])
}
```

API:
- `GET /api/achievements` - 全アチーブメント一覧
- `GET /api/achievements/user` - ユーザーの獲得状況
- `POST /api/achievements/:id/display` - 表示設定

UI:
- アチーブメント一覧ページ
- 獲得時のトースト通知
- プロフィールでのバッジ表示
- 隠しアチーブメントのヒント表示

**アチーブメント例**:
| 名前 | 条件 | 報酬 |
|------|------|------|
| 冒険の始まり | 初めての記事生成 | 50コイン |
| コレクター | カードを10枚獲得 | 100コイン |
| 伝説のハンター | レジェンドカードを獲得 | 500コイン |
| 博識 | 100記事を生成 | 1000コイン |
| 継続は力なり | 30日連続ログイン | 限定バッジ |

**参考**
- Xbox/PlayStation: 実績・トロフィーシステム
- Steam: 実績とトレーディングカード
