# 06. データベース設計

## 6.1 概要

- **DBMS**: PostgreSQL 15 (Cloud SQL)
- **ORM**: Prisma
- **命名規則**: snake_case（DB）、camelCase（アプリケーション）

## 6.2 ER図

```mermaid
erDiagram
    users ||--o{ articles : "creates"
    users ||--o{ cards : "owns"
    articles ||--o{ cards : "generates"
    users ||--o{ knowledge_transactions : "has"
    users ||--o{ challenge_sessions : "plays"
    users ||--o{ challenge_high_scores : "records"
    users ||--o{ challenge_achievements : "earns"
    users ||--o{ favorite_cards : "favorites"
    users ||--o{ favorite_articles : "favorites"
    cards ||--o{ favorite_cards : "has"
    articles ||--o{ favorite_articles : "has"

    users {
        varchar(128) id PK "Firebase UID"
        varchar(20) nickname "ニックネーム"
        int knowledge_balance "永続コイン残高"
        int daily_free_coins "当日無料コイン"
        timestamp daily_coins_reset_at "コインリセット日時"
        int daily_challenge_count "当日チャレンジ回数"
        timestamp daily_challenge_reset_at "チャレンジリセット日時"
        boolean is_premium "プレミアム会員"
        boolean is_developer "開発者フラグ"
        timestamp premium_expires_at "プレミアム期限"
        varchar(20) subscription_tier "サブスクプラン plus/premium"
        boolean subscription_bonus_received "初回ボーナス受取済み"
        varchar(255) stripe_customer_id "Stripe顧客ID"
        varchar(255) stripe_subscription_id "StripeサブスクID"
        timestamp created_at
        timestamp updated_at
        timestamp last_active_at
    }

    articles {
        uuid id PK
        varchar(128) user_id FK
        varchar(30) theme "入力テーマ"
        text content "記事本文"
        varchar(20) content_type "コンテンツタイプ"
        varchar(50) openai_model "使用モデル"
        int token_usage "トークン消費"
        timestamp created_at
    }

    cards {
        uuid id PK
        varchar(128) user_id FK
        uuid article_id FK
        varchar(50) keyword "キーワード"
        int card_number "カード番号"
        varchar(20) rarity "レア度"
        varchar(100) flavor_text "フレーバーテキスト"
        varchar(30) context_category "文脈カテゴリ"
        text context_description "文脈説明"
        varchar(500) illustration_url "イラストURL"
        varchar(500) card_image_url "カード画像URL"
        varchar(500) card_back_image_url "カード裏面画像URL"
        varchar(500) thumbnail_url "サムネイルURL"
        text flux_prompt "生成プロンプト"
        timestamp created_at
    }

    knowledge_transactions {
        uuid id PK
        varchar(128) user_id FK
        int amount "増減量"
        varchar(20) transaction_type "取引種別"
        varchar(100) description "説明"
        int balance_after "取引後残高"
        timestamp created_at
    }

    suggested_themes {
        uuid id PK
        varchar(30) theme "テーマ"
        varchar(30) category "カテゴリ"
        boolean is_active "有効フラグ"
        int usage_count "使用回数"
        timestamp created_at
    }

    challenge_sessions {
        uuid id PK
        varchar(128) user_id FK
        varchar(50) scenario_id "シナリオID"
        varchar(20) status "ステータス"
        int current_phase "現在フェーズ"
        json game_state "ゲーム状態"
        timestamp started_at
        timestamp completed_at
    }

    challenge_high_scores {
        uuid id PK
        varchar(128) user_id FK
        varchar(50) scenario_id "シナリオID"
        int high_score "ハイスコア"
        varchar(1) best_rank "最高ランク C/B/A/S"
        int play_count "プレイ回数"
        timestamp updated_at
    }

    challenge_achievements {
        uuid id PK
        varchar(128) user_id FK
        varchar(50) scenario_id "シナリオID"
        varchar(1) rank "達成ランク B/A/S"
        int coins_awarded "付与コイン"
        timestamp created_at
    }

    favorite_cards {
        uuid id PK
        varchar(128) user_id FK
        uuid card_id FK
        timestamp created_at
    }

    favorite_articles {
        uuid id PK
        varchar(128) user_id FK
        uuid article_id FK
        timestamp created_at
    }
```

## 6.3 テーブル定義

### users テーブル

ユーザー情報を管理。Firebase Auth と連携。

```sql
CREATE TABLE users (
    id VARCHAR(128) PRIMARY KEY,  -- Firebase UID
    nickname VARCHAR(20) NOT NULL UNIQUE,
    knowledge_balance INT NOT NULL DEFAULT 0,           -- 永続コイン
    daily_free_coins INT NOT NULL DEFAULT 90,           -- 当日無料コイン
    daily_coins_reset_at TIMESTAMP WITH TIME ZONE,      -- コインリセット日時
    daily_challenge_count INT NOT NULL DEFAULT 0,       -- 当日チャレンジ回数
    daily_challenge_reset_at TIMESTAMP WITH TIME ZONE,  -- チャレンジリセット日時
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    is_developer BOOLEAN NOT NULL DEFAULT FALSE,
    premium_expires_at TIMESTAMP WITH TIME ZONE,
    subscription_tier VARCHAR(20),                      -- 'plus' | 'premium' | NULL
    subscription_bonus_received BOOLEAN NOT NULL DEFAULT FALSE,  -- 初回ボーナス受取済み
    stripe_customer_id VARCHAR(255) UNIQUE,             -- Stripe顧客ID
    stripe_subscription_id VARCHAR(255) UNIQUE,         -- StripeサブスクリプションID
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_is_premium ON users(is_premium);
```

### articles テーブル

生成された学習記事を管理。

```sql
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(30) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(20) NOT NULL DEFAULT 'essay',  -- essay, story, dialogue, poem, simple
    openai_model VARCHAR(50) NOT NULL,
    token_usage INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_articles_user_id ON articles(user_id);
CREATE INDEX idx_articles_created_at ON articles(created_at);
CREATE INDEX idx_articles_user_created ON articles(user_id, created_at DESC);
```

### cards テーブル

生成されたカードを管理。

```sql
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
    keyword VARCHAR(50) NOT NULL,
    card_number INT,                                   -- 同一キーワードの通し番号
    rarity VARCHAR(20) NOT NULL,                      -- common, rare, super_rare, legend
    flavor_text VARCHAR(100) NOT NULL,
    context_category VARCHAR(30) NOT NULL,
    context_description TEXT NOT NULL,
    illustration_url VARCHAR(500) NOT NULL,
    card_image_url VARCHAR(500) NOT NULL,
    card_back_image_url VARCHAR(500),                 -- カード裏面画像URL
    thumbnail_url VARCHAR(500) NOT NULL,
    flux_prompt TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(keyword, card_number)                      -- 同一キーワード+番号はユニーク
);

-- インデックス
CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_cards_article_id ON cards(article_id);
CREATE INDEX idx_cards_rarity ON cards(rarity);
CREATE INDEX idx_cards_created_at ON cards(created_at);
CREATE INDEX idx_cards_user_created ON cards(user_id, created_at DESC);
CREATE INDEX idx_cards_user_rarity ON cards(user_id, rarity);
CREATE INDEX idx_cards_keyword ON cards(keyword);

-- 全文検索用（日本語対応）
CREATE INDEX idx_cards_keyword_gin ON cards USING gin(to_tsvector('simple', keyword));
```

### knowledge_transactions テーブル

コインの増減履歴を管理。

```sql
CREATE TABLE knowledge_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INT NOT NULL,  -- 正:増加, 負:減少
    transaction_type VARCHAR(20) NOT NULL,  -- purchase, bonus, consume, refund, daily
    description VARCHAR(100),
    balance_after INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_kt_user_id ON knowledge_transactions(user_id);
CREATE INDEX idx_kt_created_at ON knowledge_transactions(created_at);
CREATE INDEX idx_kt_type ON knowledge_transactions(transaction_type);
```

### challenge_achievements テーブル

チャレンジモードの達成報酬を管理。各シナリオ×各ランクで初回のみ報酬付与。

```sql
CREATE TABLE challenge_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scenario_id VARCHAR(50) NOT NULL,
    rank VARCHAR(1) NOT NULL,  -- 'B', 'A', 'S'
    coins_awarded INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, scenario_id, rank)
);

-- インデックス
CREATE INDEX idx_ca_user_id ON challenge_achievements(user_id);
CREATE INDEX idx_ca_user_scenario ON challenge_achievements(user_id, scenario_id);
```

### suggested_themes テーブル

ユーザーに提示するテーマ提案を管理。

```sql
CREATE TABLE suggested_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    theme VARCHAR(30) NOT NULL,
    category VARCHAR(30),                             -- テーマのカテゴリ（歴史、科学など）
    is_active BOOLEAN NOT NULL DEFAULT TRUE,          -- 有効フラグ
    usage_count INT NOT NULL DEFAULT 0,               -- 使用回数
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_st_is_active ON suggested_themes(is_active);
CREATE INDEX idx_st_category ON suggested_themes(category);
```

### challenge_sessions テーブル

チャレンジモードのゲームセッションを管理。進行中のゲーム状態を保持。

```sql
CREATE TABLE challenge_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scenario_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,                      -- 'in_progress', 'completed', 'abandoned'
    current_phase INT NOT NULL DEFAULT 0,
    game_state JSONB,                                 -- { deck: [...], phases: [...], totalScore: number }
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- インデックス
CREATE INDEX idx_cs_user_id ON challenge_sessions(user_id);
CREATE INDEX idx_cs_status ON challenge_sessions(status);
CREATE INDEX idx_cs_user_status ON challenge_sessions(user_id, status);
```

### challenge_high_scores テーブル

チャレンジモードのハイスコアを記録。各シナリオごとに1レコード。

```sql
CREATE TABLE challenge_high_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scenario_id VARCHAR(50) NOT NULL,
    high_score INT NOT NULL,
    best_rank VARCHAR(1) NOT NULL,                    -- 'C', 'B', 'A', 'S'
    play_count INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, scenario_id)
);

-- インデックス
CREATE INDEX idx_chs_user_id ON challenge_high_scores(user_id);
```

### favorite_cards テーブル

ユーザーのお気に入りカードを管理。

```sql
CREATE TABLE favorite_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, card_id)
);

-- インデックス
CREATE INDEX idx_fc_user_id ON favorite_cards(user_id);
```

### favorite_articles テーブル

ユーザーのお気に入り記事を管理。

```sql
CREATE TABLE favorite_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, article_id)
);

-- インデックス
CREATE INDEX idx_fa_user_id ON favorite_articles(user_id);
```

### stripe_webhook_events テーブル

Stripe Webhook の冪等性チェック用。

```sql
CREATE TABLE stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_swe_processed_at ON stripe_webhook_events(processed_at);
```

## 6.4 Prisma スキーマ

```prisma
// prisma/schema.prisma

generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Rarity {
  common
  rare
  super_rare
  legend
}

enum SessionStatus {
  in_progress
  completed
  abandoned
}

enum TransactionType {
  purchase
  bonus
  consume
  refund
  daily
}

enum SubscriptionTier {
  plus
  premium
}

model User {
  id                        String    @id @db.VarChar(128)
  nickname                  String    @unique @db.VarChar(20)
  knowledgeBalance          Int       @default(0) @map("knowledge_balance")
  dailyFreeCoins            Int       @default(90) @map("daily_free_coins")
  dailyCoinsResetAt         DateTime? @map("daily_coins_reset_at") @db.Timestamptz
  dailyChallengeCount       Int       @default(0) @map("daily_challenge_count")
  dailyChallengeResetAt     DateTime? @map("daily_challenge_reset_at") @db.Timestamptz
  isPremium                 Boolean   @default(false) @map("is_premium")
  isDeveloper               Boolean   @default(false) @map("is_developer")
  premiumExpiresAt          DateTime? @map("premium_expires_at") @db.Timestamptz
  subscriptionTier          SubscriptionTier? @map("subscription_tier")
  subscriptionBonusReceived Boolean   @default(false) @map("subscription_bonus_received")
  stripeCustomerId          String?   @unique @map("stripe_customer_id") @db.VarChar(255)
  stripeSubscriptionId      String?   @unique @map("stripe_subscription_id") @db.VarChar(255)
  createdAt                 DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt                 DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  lastActiveAt              DateTime  @default(now()) @map("last_active_at") @db.Timestamptz

  articles              Article[]
  cards                 Card[]
  knowledgeTransactions KnowledgeTransaction[]
  challengeSessions     ChallengeSession[]
  challengeHighScores   ChallengeHighScore[]
  challengeAchievements ChallengeAchievement[]
  favoriteCards         FavoriteCard[]
  favoriteArticles      FavoriteArticle[]

  @@index([createdAt])
  @@map("users")
}

model Article {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String   @map("user_id") @db.VarChar(128)
  theme       String   @db.VarChar(30)
  content     String   @db.Text
  contentType String   @default("essay") @map("content_type") @db.VarChar(20)
  openaiModel String   @map("openai_model") @db.VarChar(50)
  tokenUsage  Int      @default(0) @map("token_usage")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz

  user      User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  cards     Card[]
  favorites FavoriteArticle[]

  @@index([userId])
  @@index([createdAt])
  @@index([userId, createdAt(sort: Desc)])
  @@map("articles")
}

model Card {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId             String   @map("user_id") @db.VarChar(128)
  articleId          String?  @map("article_id") @db.Uuid
  keyword            String   @db.VarChar(50)
  cardNumber         Int      @map("card_number")
  rarity             Rarity
  flavorText         String   @map("flavor_text") @db.VarChar(100)
  contextCategory    String   @map("context_category") @db.VarChar(30)
  contextDescription String   @map("context_description") @db.Text
  illustrationUrl    String   @map("illustration_url") @db.VarChar(500)
  cardImageUrl       String   @map("card_image_url") @db.VarChar(500)
  cardBackImageUrl   String?  @map("card_back_image_url") @db.VarChar(500)
  thumbnailUrl       String   @map("thumbnail_url") @db.VarChar(500)
  fluxPrompt         String   @map("flux_prompt") @db.Text
  createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz

  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  article   Article?       @relation(fields: [articleId], references: [id], onDelete: SetNull)
  favorites FavoriteCard[]

  @@unique([keyword, cardNumber], name: "keyword_cardNumber_unique")
  @@index([userId])
  @@index([articleId])
  @@index([rarity])
  @@index([createdAt])
  @@index([userId, createdAt(sort: Desc)])
  @@index([userId, rarity])
  @@index([keyword])
  @@map("cards")
}

model KnowledgeTransaction {
  id              String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId          String          @map("user_id") @db.VarChar(128)
  amount          Int
  transactionType TransactionType @map("transaction_type")
  description     String?         @db.VarChar(100)
  balanceAfter    Int             @map("balance_after")
  createdAt       DateTime        @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([createdAt])
  @@index([userId, createdAt(sort: Desc)])
  @@map("knowledge_transactions")
}

model SuggestedTheme {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  theme      String   @db.VarChar(30)
  category   String?  @db.VarChar(30)
  isActive   Boolean  @default(true) @map("is_active")
  usageCount Int      @default(0) @map("usage_count")
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@index([isActive])
  @@index([category])
  @@map("suggested_themes")
}

model ChallengeSession {
  id           String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId       String        @map("user_id") @db.VarChar(128)
  scenarioId   String        @map("scenario_id") @db.VarChar(50)
  status       SessionStatus
  currentPhase Int           @default(0) @map("current_phase")
  gameState    Json?         @map("game_state")
  startedAt    DateTime      @default(now()) @map("started_at") @db.Timestamptz
  completedAt  DateTime?     @map("completed_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
  @@index([userId, status])
  @@index([userId, startedAt(sort: Desc)])
  @@map("challenge_sessions")
}

model ChallengeHighScore {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId     String   @map("user_id") @db.VarChar(128)
  scenarioId String   @map("scenario_id") @db.VarChar(50)
  highScore  Int      @map("high_score")
  bestRank   String   @map("best_rank") @db.VarChar(1)
  playCount  Int      @default(1) @map("play_count")
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, scenarioId])
  @@index([userId])
  @@map("challenge_high_scores")
}

model ChallengeAchievement {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId       String   @map("user_id") @db.VarChar(128)
  scenarioId   String   @map("scenario_id") @db.VarChar(50)
  rank         String   @db.VarChar(1)
  coinsAwarded Int      @map("coins_awarded")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, scenarioId, rank])
  @@index([userId])
  @@index([userId, scenarioId])
  @@map("challenge_achievements")
}

model FavoriteCard {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.VarChar(128)
  cardId    String   @map("card_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  card Card @relation(fields: [cardId], references: [id], onDelete: Cascade)

  @@unique([userId, cardId])
  @@index([userId])
  @@map("favorite_cards")
}

model FavoriteArticle {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.VarChar(128)
  articleId String   @map("article_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  article Article @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@unique([userId, articleId])
  @@index([userId])
  @@map("favorite_articles")
}

model StripeWebhookEvent {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  eventId     String   @unique @map("event_id") @db.VarChar(255)
  eventType   String   @map("event_type") @db.VarChar(100)
  processedAt DateTime @default(now()) @map("processed_at") @db.Timestamptz

  @@index([processedAt])
  @@map("stripe_webhook_events")
}
```

## 6.5 Enum定義

```typescript
// types/database.ts

export type Rarity = 'common' | 'rare' | 'super_rare' | 'legend';

export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';

export type TransactionType =
  | 'purchase' // 課金購入
  | 'bonus' // ボーナス付与
  | 'consume' // 消費
  | 'refund' // 返金
  | 'daily'; // 日次付与

export type SubscriptionTier = 'plus' | 'premium';

export type ContextCategory =
  | 'historical_event'
  | 'mythology'
  | 'scientific'
  | 'cultural'
  | 'biographical'
  | 'general'
  | 'metaphorical';
```

## 6.6 マイグレーション戦略

```bash
# 開発環境
npx prisma migrate dev --name init

# 本番環境
npx prisma migrate deploy
```

## 6.7 Cloud SQL 設定

### インスタンス仕様（初期）

| 項目               | 設定                                     |
| ------------------ | ---------------------------------------- |
| インスタンスタイプ | db-f1-micro（開発）/ db-g1-small（本番） |
| ストレージ         | 10GB SSD                                 |
| リージョン         | asia-northeast1（東京）                  |
| バックアップ       | 自動バックアップ有効（7日保持）          |
| 高可用性           | 本番のみ有効                             |

### 接続設定

```typescript
// Cloud Run から Cloud SQL への接続
// Unix ソケット経由
const DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DB_NAME}?host=/cloudsql/${INSTANCE_CONNECTION_NAME}`;
```

## 6.8 バックアップ・リカバリ

### 自動バックアップ

- 毎日自動バックアップ
- 7日間保持
- ポイントインタイムリカバリ有効

### 手動バックアップ

重要な変更前に手動バックアップを実施。

```bash
gcloud sql backups create --instance=INSTANCE_NAME
```

## 6.9 データ量見積もり

### 想定データ量（1年後）

| テーブル               | レコード数 | サイズ     |
| ---------------------- | ---------- | ---------- |
| users                  | 10,000     | ~5MB       |
| articles               | 50,000     | ~100MB     |
| cards                  | 50,000     | ~50MB      |
| knowledge_transactions | 100,000    | ~20MB      |
| **合計**               | -          | **~200MB** |

### スケーリング計画

- 初期: 10GB SSD
- 100万カード到達時: ストレージ拡張検討
- 読み取り負荷増加時: リードレプリカ検討
