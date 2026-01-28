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
    users ||--o{ challenge_achievements : "earns"

    users {
        uuid id PK "Firebase UID"
        varchar(20) nickname "ニックネーム"
        int knowledge_balance "永続コイン残高"
        int daily_free_coins "当日無料コイン"
        timestamp daily_coins_reset_at "コインリセット日時"
        int daily_challenge_count "当日チャレンジ回数"
        timestamp daily_challenge_reset_at "チャレンジリセット日時"
        boolean is_premium "プレミアム会員"
        timestamp premium_expires_at "プレミアム期限"
        varchar(20) subscription_tier "サブスクプラン plus/premium"
        boolean subscription_bonus_received "初回ボーナス受取済み"
        timestamp created_at
        timestamp updated_at
        timestamp last_active_at
    }

    articles {
        uuid id PK
        uuid user_id FK
        varchar(30) theme "入力テーマ"
        text content "記事本文"
        varchar(50) openai_model "使用モデル"
        int token_usage "トークン消費"
        timestamp created_at
    }

    cards {
        uuid id PK
        uuid user_id FK
        uuid article_id FK
        varchar(50) keyword "キーワード"
        varchar(20) rarity "レア度"
        varchar(100) flavor_text "フレーバーテキスト"
        varchar(30) context_category "文脈カテゴリ"
        text context_description "文脈説明"
        varchar(500) illustration_url "イラストURL"
        varchar(500) card_image_url "カード画像URL"
        varchar(500) thumbnail_url "サムネイルURL"
        text flux_prompt "生成プロンプト"
        timestamp created_at
    }

    knowledge_transactions {
        uuid id PK
        uuid user_id FK
        int amount "増減量"
        varchar(20) transaction_type "取引種別"
        varchar(100) description "説明"
        int balance_after "取引後残高"
        timestamp created_at
    }

    challenge_achievements {
        uuid id PK
        uuid user_id FK
        varchar(50) scenario_id "シナリオID"
        varchar(1) rank "達成ランク B/A/S"
        int coins_awarded "付与コイン"
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
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(30) NOT NULL,
    content TEXT NOT NULL,
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
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    keyword VARCHAR(50) NOT NULL,
    rarity VARCHAR(20) NOT NULL,  -- common, uncommon, rare, super_rare, legend
    flavor_text VARCHAR(100) NOT NULL,
    context_category VARCHAR(30) NOT NULL,
    context_description TEXT NOT NULL,
    illustration_url VARCHAR(500) NOT NULL,
    card_image_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500) NOT NULL,
    flux_prompt TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
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
```

## 6.4 Prisma スキーマ

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                        String    @id @db.VarChar(128)
  nickname                  String    @unique @db.VarChar(20)
  knowledgeBalance          Int       @default(0) @map("knowledge_balance")       // 永続コイン
  dailyFreeCoins            Int       @default(90) @map("daily_free_coins")       // 当日無料コイン
  dailyCoinsResetAt         DateTime? @map("daily_coins_reset_at") @db.Timestamptz
  dailyChallengeCount       Int       @default(0) @map("daily_challenge_count")
  dailyChallengeResetAt     DateTime? @map("daily_challenge_reset_at") @db.Timestamptz
  isPremium                 Boolean   @default(false) @map("is_premium")
  isDeveloper               Boolean   @default(false) @map("is_developer")
  premiumExpiresAt          DateTime? @map("premium_expires_at") @db.Timestamptz
  subscriptionTier          String?   @map("subscription_tier") @db.VarChar(20)   // 'plus' | 'premium' | null
  subscriptionBonusReceived Boolean   @default(false) @map("subscription_bonus_received")
  createdAt                 DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt                 DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  lastActiveAt              DateTime  @default(now()) @map("last_active_at") @db.Timestamptz

  articles              Article[]
  cards                 Card[]
  knowledgeTransactions KnowledgeTransaction[]
  challengeAchievements ChallengeAchievement[]

  @@index([createdAt])
  @@index([isPremium])
  @@map("users")
}

model Article {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  theme       String   @db.VarChar(30)
  content     String   @db.Text
  openaiModel String   @map("openai_model") @db.VarChar(50)
  tokenUsage  Int      @default(0) @map("token_usage")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  cards Card[]

  @@index([userId])
  @@index([createdAt])
  @@index([userId, createdAt(sort: Desc)])
  @@map("articles")
}

model Card {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId             String   @map("user_id") @db.Uuid
  articleId          String   @map("article_id") @db.Uuid
  keyword            String   @db.VarChar(50)
  rarity             String   @db.VarChar(20)
  flavorText         String   @map("flavor_text") @db.VarChar(100)
  contextCategory    String   @map("context_category") @db.VarChar(30)
  contextDescription String   @map("context_description") @db.Text
  illustrationUrl    String   @map("illustration_url") @db.VarChar(500)
  cardImageUrl       String   @map("card_image_url") @db.VarChar(500)
  thumbnailUrl       String   @map("thumbnail_url") @db.VarChar(500)
  fluxPrompt         String   @map("flux_prompt") @db.Text
  createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  article Article @relation(fields: [articleId], references: [id], onDelete: Cascade)

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
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId          String   @map("user_id") @db.VarChar(128)
  amount          Int
  transactionType String   @map("transaction_type") @db.VarChar(20)
  description     String?  @db.VarChar(100)
  balanceAfter    Int      @map("balance_after")
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([createdAt])
  @@index([transactionType])
  @@map("knowledge_transactions")
}

model ChallengeAchievement {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId       String   @map("user_id") @db.VarChar(128)
  scenarioId   String   @map("scenario_id") @db.VarChar(50)
  rank         String   @db.VarChar(1)  // 'B' | 'A' | 'S'
  coinsAwarded Int      @map("coins_awarded")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, scenarioId, rank])
  @@index([userId])
  @@map("challenge_achievements")
}
```

## 6.5 Enum定義

```typescript
// types/database.ts

export type Rarity = 
  | "common" 
  | "uncommon" 
  | "rare" 
  | "super_rare" 
  | "legend";

export type ContextCategory =
  | "historical_event"
  | "mythology"
  | "scientific"
  | "cultural"
  | "biographical"
  | "general"
  | "metaphorical";

export type TransactionType =
  | "purchase"      // 課金購入
  | "bonus"         // ボーナス付与
  | "consume"       // 消費
  | "refund";       // 返金
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

| 項目 | 設定 |
|------|------|
| インスタンスタイプ | db-f1-micro（開発）/ db-g1-small（本番） |
| ストレージ | 10GB SSD |
| リージョン | asia-northeast1（東京） |
| バックアップ | 自動バックアップ有効（7日保持） |
| 高可用性 | 本番のみ有効 |

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

| テーブル | レコード数 | サイズ |
|----------|-----------|--------|
| users | 10,000 | ~5MB |
| articles | 50,000 | ~100MB |
| cards | 50,000 | ~50MB |
| knowledge_transactions | 100,000 | ~20MB |
| **合計** | - | **~200MB** |

### スケーリング計画

- 初期: 10GB SSD
- 100万カード到達時: ストレージ拡張検討
- 読み取り負荷増加時: リードレプリカ検討
