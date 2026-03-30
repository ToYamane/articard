# データベース設計ノート

## 概要

2026年1月27日に実施したDB設計の調査と改善作業の記録。

---

## 実施した作業

### 1. チャレンジモードのDB簡略化

#### 背景

- カード削除時にチャレンジセッション履歴が参照エラーになる問題
- プレイ履歴を全て保持する必要がないという要件確認

#### 削除したテーブル

| テーブル名                 | 役割                       | 削除理由                   |
| -------------------------- | -------------------------- | -------------------------- |
| `challenge_session_cards`  | デッキに入れたカードの記録 | Cardとの外部キー制約が問題 |
| `challenge_session_phases` | 各フェーズの詳細結果       | 履歴保持不要               |

#### 新規追加したテーブル

```prisma
model ChallengeHighScore {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId     String   @map("user_id") @db.VarChar(128)
  scenarioId String   @map("scenario_id") @db.VarChar(50)
  highScore  Int      @map("high_score")
  bestRank   String   @map("best_rank") @db.VarChar(1) // 'C' | 'B' | 'A' | 'S'
  playCount  Int      @default(1) @map("play_count")
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, scenarioId])
  @@index([userId])
  @@map("challenge_high_scores")
}
```

#### 変更したテーブル

```prisma
model ChallengeSession {
  // 変更前: totalScore, deckCards, phases リレーション
  // 変更後: gameState JSON で一時データ管理

  gameState Json? @map("game_state") // { deck: [...], phases: [...], totalScore: number }
}
```

### 2. rewards.ts のトランザクション追加

#### 問題

複数ランク同時達成時に途中でエラーが発生すると、達成記録はあるが報酬がない不整合状態が発生する可能性があった。

#### 修正内容

```typescript
// 修正前: 各操作が独立
for (const rank of newRanks) {
  await prisma.challengeAchievement.create({...});
  await addPermanentCoins(...);
}

// 修正後: トランザクションでラップ
await prisma.$transaction(async (tx) => {
  for (const rank of newRanks) {
    await tx.challengeAchievement.create({...});
    await tx.user.update({...});
    await tx.coinTransaction.create({...});
  }
});
```

### 3. 複合インデックスの追加

#### 背景

クエリパターンを分析した結果、以下の複合検索が頻繁に行われていることが判明:

- `ChallengeSession`: `userId` + `status` での検索（進行中セッションの存在確認）
- `ChallengeAchievement`: `userId` + `scenarioId` での検索（達成状況確認）

#### 追加したインデックス

```prisma
// ChallengeSession
@@index([userId, status])

// ChallengeAchievement
@@index([userId, scenarioId])
```

#### 効果

- `findFirst({ where: { userId, status: 'in_progress' } })` が O(log n) で直接ヒット
- 達成報酬チェック時のクエリ効率が向上

#### 不要と判断したインデックス

`SuggestedTheme` に対する `@@index([isActive, createdAt(sort: Desc)])` は、
`ORDER BY RANDOM()` を使用しているため効果がなく、追加不要と判断。

### 4. 日次リセット処理の最適化

#### 問題

`coin-service.ts` の `checkAndResetDaily()` が最大2回のUPDATEを実行していた。

#### 修正内容

```typescript
// 修正前: 2回のUPDATE
if (!user.dailyCoinsResetAt || !isSameJSTDay(...)) {
  await prisma.user.update({...});  // 1回目
}
if (!user.dailyChallengeResetAt || !isSameJSTDay(...)) {
  await prisma.user.update({...});  // 2回目
}

// 修正後: 1回のUPDATEに統合
const needsCoinsReset = !user.dailyCoinsResetAt || !isSameJSTDay(...);
const needsChallengeReset = !user.dailyChallengeResetAt || !isSameJSTDay(...);

if (needsCoinsReset || needsChallengeReset) {
  await prisma.user.update({
    data: {
      ...(needsCoinsReset && { dailyFreeCoins: ..., dailyCoinsResetAt: ... }),
      ...(needsChallengeReset && { dailyChallengeCount: ..., dailyChallengeResetAt: ... }),
    },
  });
}
```

#### 効果

- DBへのラウンドトリップを最大2回→1回に削減
- 日付変更直後のパフォーマンス向上

---

## 残りの改善事項

### 中優先度

#### 1. Enum型の導入

現在 `VarChar` で定義されている列挙値をEnum型に変更することで型安全性が向上する。

```prisma
// 推奨
enum Rarity {
  common
  rare
  super_rare
  legend
}

enum TransactionType {
  purchase
  bonus
  consume
  refund
  daily
}

// 使用例
model Card {
  rarity Rarity // 現在: String @db.VarChar(20)
}
```

**メリット**: DB層での値検証、Prisma Clientの型厳密化
**デメリット**: マイグレーション必要、値追加時にマイグレーション必要

### 低優先度

#### 2. ドキュメント整備

以下のフィールド/テーブルが `docs/specs/database.md` に未記載:

- `Card.cardNumber` フィールド
- `Card.cardBackImageUrl` フィールド
- `SuggestedTheme` テーブル
- `ChallengeHighScore` テーブル（新規追加分）

#### 3. Rarity値の統一 ✅

- 全ドキュメントで `common, rare, super_rare, legend` の4種類に統一済み
- `uncommon` は使用されていない

---

## 現在のスキーマ構造

```
User (1)
  ├── (多) Article ──── (多) Card  [onDelete: SetNull]
  ├── (多) Card
  ├── (多) CoinTransaction
  ├── (多) ChallengeSession      // 進行中のゲーム状態のみ
  │         └── Index: [userId, status]
  ├── (多) ChallengeHighScore    // ハイスコア記録
  │         └── Unique: [userId, scenarioId]
  ├── (多) ChallengeAchievement  // ランク達成報酬
  │         ├── Unique: [userId, scenarioId, rank]
  │         └── Index: [userId, scenarioId]
  ├── (多) FavoriteCard          // お気に入りカード
  │         └── Unique: [userId, cardId]
  └── (多) FavoriteArticle       // お気に入り記事
            └── Unique: [userId, articleId]
```

---

## 新しいチャレンジモードのデータフロー

```
1. セッション開始
   └── ChallengeSession 作成（gameState 初期化）

2. デッキ設定
   └── gameState.deck に5枚のカード情報を保存

3. 各フェーズ
   └── gameState.phases に結果を追記
   └── gameState.totalScore を更新

4. 完了時
   ├── ChallengeHighScore 更新（ハイスコアなら上書き）
   ├── ChallengeAchievement 作成（新ランク達成なら報酬付与）
   └── ChallengeSession 削除（クリーンアップ）

5. 中断時
   └── ChallengeSession 削除
```

---

## 参考: gameState の構造

```typescript
interface GameState {
  deck: {
    cardId: string;
    keyword: string;
    rarity: string;
    flavorText: string;
    contextDescription: string;
    thumbnailUrl: string;
    cardImageUrl: string;
    isUsed: boolean;
    usedInPhase: number | null;
  }[];
  phases: {
    phaseNumber: number;
    challenge: string;
    selectedCardIds: string[];
    fitScore: number;
    bonusScore: number;
    totalScore: number;
    aiCommentary: string;
    completedAt: string;
  }[];
  totalScore: number;
}
```

---

## 変更履歴

| 日付       | 変更内容                                                                   |
| ---------- | -------------------------------------------------------------------------- |
| 2026-01-27 | チャレンジモードDB簡略化、rewards.ts トランザクション追加                  |
| 2026-01-27 | 複合インデックス追加（ChallengeSession, ChallengeAchievement）             |
| 2026-01-27 | 日次リセット処理の最適化（2回→1回のUPDATE）                                |
| 2026-02-13 | Article→Card を onDelete: Cascade → SetNull に変更（articleId nullable化） |
| 2026-02-13 | FavoriteCard, FavoriteArticle テーブル追加                                 |
| 2026-02-13 | StripeWebhookEvent テーブル追加（Webhook冪等性チェック用）                 |
