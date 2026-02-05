# ゲーミフィケーション強化

ゲーム要素を追加し、より魅力的な体験を提供する機能群。

---

## アイデア一覧

### 1. 難易度ラダーシステム

**概要**
- 記事生成の難易度をランク制に
- 低ランクから始まり、クイズ正解で昇格
- 高ランクほど専門的な記事が生成され、レアカード確率アップ
- 降格もあり、緊張感のある体験

**メリット**
- ビジネス: 継続的な挑戦の動機付け
- ユーザー: 達成感、段階的な成長実感

**実装難易度**: ★★★☆☆

**必要な変更**

データモデル:
```prisma
model UserRank {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  rank        String   @default("bronze") // bronze, silver, gold, platinum, diamond, master
  points      Int      @default(0)
  highestRank String   @default("bronze")
  updatedAt   DateTime @updatedAt
}

model RankHistory {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  fromRank  String
  toRank    String
  reason    String   // "promotion", "demotion"
  createdAt DateTime @default(now())
}
```

ランク設定:
| ランク | 必要ポイント | レアカード確率補正 | 記事難易度 |
|--------|-------------|-------------------|-----------|
| Bronze | 0 | ×1.0 | 初級 |
| Silver | 500 | ×1.1 | 初中級 |
| Gold | 1,500 | ×1.2 | 中級 |
| Platinum | 3,500 | ×1.3 | 中上級 |
| Diamond | 7,000 | ×1.5 | 上級 |
| Master | 15,000 | ×2.0 | 専門 |

ポイント獲得/減少:
- クイズ全問正解: +100
- クイズ8割正解: +50
- クイズ5割以下: -30

API:
- `GET /api/rank` - 現在のランク
- `GET /api/rank/history` - ランク履歴
- `GET /api/rank/leaderboard` - ランキング

UI:
- ホーム画面にランク表示
- ランクアップ/ダウン演出
- ランキングページ
- ランク別の記事難易度説明

**参考**
- Valorant/LoL: ランクシステム
- Chess.com: ELOレーティング

---

### 2. カード「耐久度」システム

**概要**
- カードに耐久度（使用回数制限）を設定
- 復習クイズでカードを「使用」、正解で耐久度維持/回復
- 不正解や放置で耐久度減少
- 耐久度0でカードが「休眠」状態に

**メリット**
- ビジネス: 復習の動機付け、継続的なエンゲージメント
- ユーザー: 忘却曲線に沿った効果的な学習

**実装難易度**: ★★★☆☆

**必要な変更**

データモデル:
```prisma
model CardDurability {
  id            String   @id @default(cuid())
  cardId        String   @unique
  card          Card     @relation(fields: [cardId], references: [id])
  maxDurability Int      @default(100)
  current       Int      @default(100)
  lastUsedAt    DateTime?
  dormantAt     DateTime? // 休眠状態になった日時
  revivedCount  Int      @default(0) // 復活回数
}
```

耐久度ルール:
| 状態 | 耐久度 | 効果 |
|------|--------|------|
| 完全 | 80-100 | 通常表示 |
| 磨耗 | 50-79 | 少し色褪せた表示 |
| 危険 | 20-49 | 警告マーク表示 |
| 休眠 | 0-19 | コレクションで非表示、復活クイズ必要 |

耐久度変動:
- 復習クイズ正解: +10
- 復習クイズ不正解: -15
- 3日間未使用: -5/日
- 7日間未使用: -10/日

API:
- `GET /api/cards/:id/durability` - 耐久度確認
- `POST /api/cards/:id/review` - 復習クイズ実行
- `POST /api/cards/:id/revive` - 休眠カード復活（コイン消費）

UI:
- カード表示に耐久度ゲージ
- 復習が必要なカードの通知
- 休眠カード一覧
- 復活クイズ画面

**参考**
- Anki: スペースドリピティション
- たまごっち: お世話要素

---

### 3. ニューゲーム+（NG+）機能

**概要**
- 全カード収集後の「周回」要素
- 2周目以降はカードに特別なマーク
- 周回ボーナス（レアリティ確率アップなど）
- 累計周回数の表示

**メリット**
- ビジネス: コンプリート後の継続プレイ
- ユーザー: やりこみ要素、達成感

**実装難易度**: ★★☆☆☆

**必要な変更**

データモデル:
```prisma
model UserCycle {
  id           String   @id @default(cuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id])
  currentCycle Int      @default(1)
  cycleStartedAt DateTime @default(now())
  totalCards   Int      @default(0) // 累計獲得カード数
}

// Card モデルに追加
model Card {
  // ... 既存フィールド
  cycleNumber  Int      @default(1) // 何周目で獲得したか
  isStarred    Boolean  @default(false) // 2周目以降のマーク
}
```

周回ボーナス:
| 周回 | レア確率 | SR確率 | Legend確率 | 特典 |
|------|---------|--------|-----------|------|
| 1周目 | 25% | 10% | 5% | なし |
| 2周目 | 27% | 11% | 6% | ★マーク |
| 3周目 | 30% | 12% | 7% | ★★マーク |
| 5周目以上 | 35% | 15% | 10% | 虹色★マーク |

API:
- `GET /api/cycle` - 現在の周回情報
- `POST /api/cycle/reset` - 周回リセット（条件達成時）

UI:
- プロフィールに周回数表示
- カードに周回マーク
- 周回達成時の特別演出
- 周回履歴

**参考**
- ダークソウル: NG+の元祖
- ディアブロ: トーメントレベル
