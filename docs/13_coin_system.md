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
| チャレンジ 1-3回目/日 | 無料 | 毎日リセット（無料ユーザー） |
| チャレンジ 4回目以降 | 10コイン | プランにより無料回数変動 |

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
- チャレンジ: 3回無料

プラスユーザーの1日:
- 無料コイン: 150
- カード生成: 最大5枚（150 ÷ 30 = 5）
- チャレンジ: 10回無料
- 初回ボーナス: 300コイン（永続）

プレミアムユーザーの1日:
- 無料コイン: 300
- カード生成: 最大10枚（300 ÷ 30 = 10）
- チャレンジ: 無制限
- 初回ボーナス: 900コイン（永続）

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
本日の無料回数: 2/3  （無料ユーザー）
本日の無料回数: 7/10 （プラスユーザー）
本日の無料回数: 無制限 （プレミアムユーザー）
```

- 残り無料回数を表示（プランにより異なる）
- 無料回数超過後は「(次回 10コイン)」と表示

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
  CHALLENGE_EXTRA: 10,    // 無料回数超過後のチャレンジ
} as const;

// 報酬
export const COIN_REWARDS = {
  DAILY_FREE: 90,         // 毎日の無料コイン（無料ユーザー）
  CHALLENGE_RANK_B: 30,   // Bランク達成
  CHALLENGE_RANK_A: 30,   // Aランク達成
  CHALLENGE_RANK_S: 30,   // Sランク達成
} as const;

// 日次制限（無料ユーザー）
export const DAILY_LIMITS = {
  FREE_CHALLENGES: 3,     // 無料チャレンジ回数
} as const;

// ランク閾値
export const RANK_THRESHOLDS = {
  B: 400,
  A: 600,
  S: 800,
} as const;

// サブスクリプションプラン
export const SUBSCRIPTION_PLANS = {
  plus: {
    id: 'plus',
    name: 'プラス',
    monthlyPrice: 980,
    dailyFreeCoins: 150,
    freeChallenges: 10,
    signupBonus: 300,
  },
  premium: {
    id: 'premium',
    name: 'プレミアム',
    monthlyPrice: 2980,
    dailyFreeCoins: 300,
    freeChallenges: Infinity,
    signupBonus: 900,
  },
} as const;

// コイン購入パッケージ
export const COIN_PACKAGES = {
  standard: { id: 'standard', name: 'スタンダード', coins: 600, price: 980 },
  value: { id: 'value', name: 'バリュー', coins: 2100, price: 2980 },
  premium: { id: 'premium', name: 'プレミアム', coins: 6000, price: 6980 },
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

- [x] コイン購入機能（課金）※ 13.12, 13.13 で実装済み
- [ ] トランザクション履歴画面
- [ ] 連続ログインボーナス
- [ ] 特別イベント報酬
- [ ] 決済連携（Stripe / App Store IAP / Google Play Billing）
- [ ] サブスクリプション有効期限切れ処理

## 13.12 サブスクリプションプラン

### プラン比較

| 項目 | 無料 | プラス (¥980/月) | プレミアム (¥2,980/月) |
|------|------|------------------|----------------------|
| 毎日コイン | 90 | 150 | 300 |
| 永続コイン付与 | - | 初回300 | 初回900 |
| チャレンジ無料 | 3回/日 | 10回/日 | 無制限 |

### 初回ボーナス

サブスクリプション開始時に永続コインを1回のみ付与。
- プラス: 300コイン
- プレミアム: 900コイン

※ 一度受け取ると、解約→再加入しても再付与されない（`subscriptionBonusReceived`フラグで管理）

## 13.13 コイン購入パッケージ

### パッケージ一覧

| パッケージ | コイン数 | 価格 | 単価 |
|-----------|---------|------|------|
| スタンダード | 600 | ¥980 | ¥1.63 |
| バリュー | 2,100 | ¥2,980 | ¥1.42 |
| プレミアム | 6,000 | ¥6,980 | ¥1.16 |

### 購入制限

現在は開発者ユーザー（`isDeveloper: true`）のみ利用可能。
本番決済連携後に一般ユーザーへ解放予定。

## 13.14 サービス層（subscription-service.ts）

| 関数 | 説明 |
|------|------|
| `activateSubscription(userId, tier)` | サブスク有効化（ボーナス付与含む） |
| `getSubscriptionStatus(userId)` | サブスク状態取得 |
| `cancelSubscription(userId)` | サブスク解約 |

### 有効化処理フロー

1. プランの有効性を検証
2. 有効期限を1ヶ月後に設定
3. 初回ボーナスを付与（未受取の場合のみ）
4. ユーザー情報を更新（tier, isPremium, premiumExpiresAt等）
5. トランザクション履歴に記録
