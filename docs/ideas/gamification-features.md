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

