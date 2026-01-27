# 13. コインシステム

## 13.1 概要

Articardのアプリ内通貨システム。ユーザーはコインを消費してカードを生成し、チャレンジモードの達成報酬としてコインを獲得できる。

### 設計思想

- **毎日遊べる**: 無料コインで毎日3枚のカード生成が可能
- **やりこみ要素**: チャレンジ達成で永続コインを獲得
- **マネタイズ**: 無課金でも遊べるが、課金で快適に

## 13.2 コイン種別

| 種別 | 説明 | 付与方法 | 有効期限 |
|------|------|----------|----------|
| 無料コイン | 毎日自動付与 | 日本時間0時に90コイン | 当日24時まで |
| 永続コイン | 達成報酬・購入 | チャレンジランク達成時 | なし（永続） |

### 消費優先順位

1. 無料コインから優先消費
2. 無料コインが不足した場合、永続コインを消費

## 13.3 消費・報酬設計

### 消費

| 機能 | コスト | 備考 |
|------|--------|------|
| 記事生成 | 無料 | 制限なし |
| カード生成 | 30コイン | 全レアリティ共通 |
| チャレンジ 1-10回目/日 | 無料 | 毎日リセット |
| チャレンジ 11回目以降 | 10コイン | |

### 報酬（チャレンジ達成）

| ランク | 条件 | 報酬 | 備考 |
|--------|------|------|------|
| Bランク | スコア400以上 | 30コイン | 初回のみ |
| Aランク | スコア600以上 | 30コイン | 初回のみ |
| Sランク | スコア800以上 | 30コイン | 初回のみ |

- 報酬は各シナリオ×各ランクで初回のみ
- 累積獲得可能（1シナリオ最大90コイン）
- 永続コインとして付与

### 経済シミュレーション

```
無料ユーザーの1日:
- 無料コイン: 90
- カード生成: 最大3枚（90 ÷ 30 = 3）
- チャレンジ: 10回無料

やりこみユーザー:
- シナリオ10個 × 90コイン = 最大900コイン獲得可能
- → カード30枚分
```

## 13.4 日次リセット

### リセット対象

| 項目 | リセット内容 |
|------|-------------|
| 無料コイン | 90コインに回復 |
| チャレンジ回数 | 0回にリセット |

### リセットタイミング

- **日本時間（JST）0:00**
- ユーザーがアクション（残高確認、カード生成、チャレンジ開始）を行った際に自動チェック

### 実装方式

```typescript
// coin-service.ts
function getJSTDayStart(date: Date): Date {
  const jstOffset = 9 * 60 * 60 * 1000;
  // ... JST基準で日付の開始時刻を計算
}

function isSameJSTDay(date1: Date, date2: Date): boolean {
  // JST基準で同じ日かどうか判定
}
```

## 13.5 データベース設計

### Userテーブル拡張

```prisma
model User {
  // 既存フィールド...
  knowledgeBalance      Int       @default(0) @map("knowledge_balance")      // 永続コイン
  dailyFreeCoins        Int       @default(90) @map("daily_free_coins")      // 当日無料コイン
  dailyCoinsResetAt     DateTime? @map("daily_coins_reset_at") @db.Timestamptz
  dailyChallengeCount   Int       @default(0) @map("daily_challenge_count")
  dailyChallengeResetAt DateTime? @map("daily_challenge_reset_at") @db.Timestamptz
}
```

### ChallengeAchievementテーブル（新規）

```prisma
model ChallengeAchievement {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId       String   @map("user_id") @db.VarChar(128)
  scenarioId   String   @map("scenario_id") @db.VarChar(50)
  rank         String   @db.VarChar(1) // 'B' | 'A' | 'S'
  coinsAwarded Int      @map("coins_awarded")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, scenarioId, rank])
  @@index([userId])
  @@map("challenge_achievements")
}
```

### ER図（コイン関連部分）

```
┌─────────────────┐       ┌─────────────────────────┐
│      users      │       │  challenge_achievements │
├─────────────────┤       ├─────────────────────────┤
│ id              │───┐   │ id                      │
│ knowledge_balance│   │   │ user_id            FK  │───┘
│ daily_free_coins│   └──▶│ scenario_id            │
│ daily_coins_reset_at│   │ rank                   │
│ daily_challenge_count│  │ coins_awarded          │
│ daily_challenge_reset_at│ created_at            │
└─────────────────┘       └─────────────────────────┘
```

## 13.6 API設計

### GET /api/coins

コイン残高とチャレンジ回数情報を取得。

**リクエスト**
```
GET /api/coins
Authorization: Bearer <token>
```

**レスポンス**
```json
{
  "success": true,
  "data": {
    "freeCoins": 60,
    "permanentCoins": 120,
    "totalAvailable": 180,
    "challenge": {
      "count": 3,
      "remainingFree": 7,
      "isFree": true,
      "nextCost": 0
    }
  }
}
```

### エラーコード

| コード | 説明 | HTTPステータス |
|--------|------|----------------|
| INSUFFICIENT_COINS | コイン不足 | 400 |

## 13.7 サービス層

### coin-service.ts

| 関数 | 説明 |
|------|------|
| `checkAndResetDaily(userId)` | 日次リセットチェック・実行 |
| `getBalances(userId)` | 両残高取得（リセット含む） |
| `getBalance(userId)` | 合計残高取得（後方互換） |
| `consumeCoins(userId, amount, description)` | コイン消費（無料優先） |
| `addPermanentCoins(userId, amount, type, description)` | 永続コイン追加 |
| `hasEnoughCoins(userId, amount)` | 残高チェック |
| `checkChallengeLimit(userId)` | チャレンジ回数確認 |
| `incrementChallengeCount(userId)` | チャレンジ回数インクリメント |
| `getTransactions(userId, options)` | 履歴取得 |

### rewards.ts

| 関数 | 説明 |
|------|------|
| `getAchievableRanks(score)` | スコアから達成可能ランク取得 |
| `getRewardAmount(rank)` | ランク別報酬額取得 |
| `processAchievementRewards(userId, scenarioId, score)` | 達成報酬処理 |
| `getScenarioAchievements(userId, scenarioId)` | シナリオ別達成状況取得 |
| `getUserAchievements(userId)` | 全達成状況取得 |

## 13.8 フロントエンド

### ヘッダー残高表示

```
┌─────────────────────────────────────────────────┐
│ Articard    [🟢 60] [🟡 120]  チャレンジ 記事...│
└─────────────────────────────────────────────────┘
              ↑無料    ↑永続
```

- 緑: 無料コイン（当日限り）
- 黄: 永続コイン
- 30秒ごとに自動更新

### チャレンジページ

```
本日の無料回数: 7/10
```

- 残り無料回数を表示
- 11回目以降は「(次回 10コイン)」と表示

### チャレンジ完了画面

達成報酬がある場合、専用の報酬表示セクションを表示:

```
┌─────────────────────────┐
│     🎉 達成報酬獲得!    │
├─────────────────────────┤
│ Bランク初達成  +30コイン │
│ Aランク初達成  +30コイン │
├─────────────────────────┤
│ 合計 +60 コイン獲得!    │
└─────────────────────────┘
```

## 13.9 定数定義

**ファイル**: `src/lib/constants/coins.ts`

```typescript
// 消費コスト
export const COIN_COSTS = {
  CARD_GENERATION: 30,    // カード生成
  CHALLENGE_EXTRA: 10,    // チャレンジ11回目以降
} as const;

// 報酬
export const COIN_REWARDS = {
  DAILY_FREE: 90,         // 毎日の無料コイン
  CHALLENGE_RANK_B: 30,   // Bランク達成
  CHALLENGE_RANK_A: 30,   // Aランク達成
  CHALLENGE_RANK_S: 30,   // Sランク達成
} as const;

// 日次制限
export const DAILY_LIMITS = {
  FREE_CHALLENGES: 10,    // 無料チャレンジ回数
} as const;

// ランク閾値
export const RANK_THRESHOLDS = {
  B: 400,
  A: 600,
  S: 800,
} as const;
```

## 13.10 修正ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `prisma/schema.prisma` | User拡張、ChallengeAchievement追加 |
| `src/lib/constants/coins.ts` | 新規作成 |
| `src/lib/services/coin-service.ts` | 大幅拡張 |
| `src/lib/challenge/rewards.ts` | 新規作成 |
| `src/app/api/coins/route.ts` | 両残高返却 |
| `src/lib/services/card-service.ts` | コイン消費追加 |
| `src/lib/services/challenge-service.ts` | 回数制限・報酬追加 |
| `src/types/api.ts` | INSUFFICIENT_COINSエラーコード追加 |
| `src/lib/errors/api-error.ts` | insufficientCoins静的メソッド追加 |
| `src/components/layout/header.tsx` | 両残高表示 |
| `src/app/(main)/challenge/page.tsx` | 回数・コスト表示 |
| `src/components/challenge/challenge-complete.tsx` | 報酬表示追加 |
| `src/app/(main)/challenge/[sessionId]/page.tsx` | 報酬データ受け渡し |

## 13.11 今後の拡張予定

- [ ] コイン購入機能（課金）
- [ ] トランザクション履歴画面
- [ ] 連続ログインボーナス
- [ ] 特別イベント報酬
