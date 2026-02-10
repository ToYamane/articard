# マネタイズ強化

収益化を促進し、持続可能なサービス運営を実現する機能群。

---

## アイデア一覧

### 1. バトルパス（月額課金モデル）

**概要**
- 月額課金制のシーズンパス
- 無料トラックと有料トラックの二段構成
- アクティビティに応じてティアが上昇し、報酬を獲得
- シーズンごとに限定カードや特典を用意

**メリット**
- ビジネス: 安定した月額収益、長期的なエンゲージメント
- ユーザー: 明確な進捗目標、限定報酬への期待感

**実装難易度**: ★★★★☆

**必要な変更**

データモデル:
```prisma
model Season {
  id          String   @id @default(cuid())
  name        String   // "Season 1: 知識の冒険"
  description String?
  startsAt    DateTime
  endsAt      DateTime
  maxTier     Int      @default(50)
  isActive    Boolean  @default(false)

  tiers     SeasonTier[]
  purchases BattlePassPurchase[]
  progress  UserSeasonProgress[]
}

model SeasonTier {
  id            String  @id @default(cuid())
  seasonId      String
  season        Season  @relation(fields: [seasonId], references: [id])
  tier          Int     // 1-50
  xpRequired    Int     // このティアに必要な累計XP
  freeReward    Json?   // { type: "knowledge", amount: 100 }
  premiumReward Json?   // { type: "card", rarity: "legend", cardId: "xxx" }

  @@unique([seasonId, tier])
}

model BattlePassPurchase {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  seasonId    String
  season      Season   @relation(fields: [seasonId], references: [id])
  price       Int      // 購入価格（円）
  purchasedAt DateTime @default(now())

  @@unique([userId, seasonId])
}

model UserSeasonProgress {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  seasonId    String
  season      Season   @relation(fields: [seasonId], references: [id])
  currentXp   Int      @default(0)
  currentTier Int      @default(0)
  claimedTiers Int[]   @default([])

  @@unique([userId, seasonId])
}
```

API:
- `GET /api/season/current` - 現在のシーズン情報
- `GET /api/season/progress` - ユーザーの進捗
- `POST /api/season/purchase` - バトルパス購入
- `POST /api/season/claim/:tier` - 報酬受け取り

UI:
- バトルパス専用ページ
- ティア進捗のビジュアル表示（横スクロール）
- 無料/有料報酬の比較表示
- 購入ボタンと価格表示

**XP獲得アクション**:
| アクション | 獲得XP |
|-----------|--------|
| 記事生成 | 100 |
| カード獲得 | 50 |
| レアカード獲得 | 100 |
| レジェンドカード獲得 | 300 |
| デイリーログイン | 25 |
| ウィークリーチャレンジ達成 | 500 |

**参考**
- Fortnite: バトルパスの元祖、100ティア構成
- Apex Legends: 無料/有料トラックの明確な分離

---

### 2. プレミアム「オーダーメイド記事」機能

**概要**
- より詳細なカスタマイズが可能なプレミアム記事生成
- 記事の長さ、難易度、対象年齢、文体を指定可能
- GPT-4oなど高性能モデルを使用
- 生成されるカードのレアリティ最低保証

**メリット**
- ビジネス: 高付加価値サービスによる収益
- ユーザー: より高品質で目的に合った記事

**実装難易度**: ★★★☆☆

**必要な変更**

データモデル:
```prisma
model PremiumArticleRequest {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  theme           String
  options         Json     // カスタムオプション
  minRarity       String   @default("rare") // 最低保証レアリティ
  model           String   @default("gpt-4o")
  knowledgeCost   Int      // 消費コイン
  articleId       String?
  article         Article? @relation(fields: [articleId], references: [id])
  status          String   @default("pending") // pending, processing, completed, failed
  createdAt       DateTime @default(now())
  completedAt     DateTime?
}
```

カスタムオプション:
```typescript
interface PremiumArticleOptions {
  length: 'short' | 'medium' | 'long' | 'extra_long';  // 500/1000/2000/3000文字
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  targetAge: 'kids' | 'teen' | 'adult' | 'academic';
  style: 'casual' | 'formal' | 'storytelling' | 'technical';
  language: 'ja' | 'en';
  focusAreas?: string[];  // 重点的に触れてほしいポイント
}
```

API:
- `POST /api/premium-article/create` - プレミアム記事リクエスト
- `GET /api/premium-article/:id` - リクエスト状態確認

UI:
- プレミアム記事作成フォーム
- オプション選択UI
- コスト計算表示
- 生成中のプログレス表示

**価格設定（コイン）**:
| オプション | 追加コスト |
|-----------|----------|
| 基本料金 | 500 |
| 長文(2000文字以上) | +200 |
| Expert難易度 | +100 |
| レアリティ保証(SR以上) | +300 |
| レアリティ保証(Legend) | +1000 |

**参考**
- ChatGPT Plus: 高性能モデルへのアクセス
- Midjourney: プランによる品質・速度の差別化

---

### 3. カード強化版課金（コスメティック）

> **アニメーション機能の詳細**: [カードアニメーション機能](./card-animation.md) — AIモデル比較・コイン価格設計を含む独立ドキュメント

**概要**
- 既存カードの「強化版」を購入できる
- ホログラフィック、アニメーション、特殊エフェクトなど
- ゲームプレイには影響しないコスメティック要素
- コレクターズアイテムとしての価値

**メリット**
- ビジネス: 既存カードからの追加収益
- ユーザー: お気に入りカードの特別化、自己表現

**実装難易度**: ★★★☆☆

**必要な変更**

データモデル:
```prisma
model CardEnhancement {
  id          String   @id @default(cuid())
  name        String   // "ホログラフィック", "アニメーション" など
  description String
  effectType  String   // "holographic", "animated", "sparkle", "rainbow"
  previewUrl  String   // エフェクトのプレビュー画像/動画
  price       Int      // コインまたは円
  priceType   String   // "knowledge" | "real_money"
  isAvailable Boolean  @default(true)
}

model UserCardEnhancement {
  id            String          @id @default(cuid())
  userId        String
  user          User            @relation(fields: [userId], references: [id])
  cardId        String
  card          Card            @relation(fields: [cardId], references: [id])
  enhancementId String
  enhancement   CardEnhancement @relation(fields: [enhancementId], references: [id])
  appliedAt     DateTime        @default(now())

  @@unique([cardId, enhancementId])
}
```

エンハンスメント種類:
| 名前 | 効果 | 価格 |
|------|------|------|
| ホログラフィック | 虹色に光る加工 | 200コイン |
| スパークル | キラキラエフェクト | 150コイン |
| アニメーション | イラストが動く | 500コイン |
| ゴールドフレーム | 金縁フレーム | 300コイン |
| シグネチャー | サイン入り風加工 | 100コイン |

API:
- `GET /api/enhancements` - 強化一覧
- `POST /api/cards/:id/enhance` - 強化適用
- `DELETE /api/cards/:id/enhance/:enhancementId` - 強化解除

UI:
- カード詳細画面に「強化」ボタン
- 強化プレビュー
- 強化済みカードの特別表示
- コレクション内でのフィルタリング

**参考**
- ポケモンカードゲーム: ホロ加工、フルアート
- Hearthstone: ゴールデンカード（アニメーション付き）
