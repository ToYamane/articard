# UX改善

ユーザー体験を向上させる機能群。

---

## アイデア一覧

### 1. カード物理プリント連携

**概要**
- デジタルカードを物理カードとして印刷・配送
- 高品質な印刷（ホログラム加工オプションあり）
- 単品、デッキセット、コレクションブックなど
- QRコードでデジタル版とリンク

**メリット**
- ビジネス: 高単価商品、ブランド認知向上
- ユーザー: 実物を所有する喜び、ギフト用途

**実装難易度**: ★★★★☆

**必要な変更**

データモデル:
```prisma
model PrintOrder {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  orderNumber   String   @unique
  status        String   @default("pending") // pending, processing, printing, shipped, delivered
  totalPrice    Int      // 円
  shippingPrice Int
  shippingAddress Json
  paymentId     String?  // Stripe等の決済ID
  trackingNumber String?
  createdAt     DateTime @default(now())
  shippedAt     DateTime?
  deliveredAt   DateTime?

  items PrintOrderItem[]
}

model PrintOrderItem {
  id          String     @id @default(cuid())
  orderId     String
  order       PrintOrder @relation(fields: [orderId], references: [id])
  cardId      String
  card        Card       @relation(fields: [cardId], references: [id])
  productType String     // "single", "deck", "poster", "book"
  options     Json       // { holographic: true, size: "standard" }
  quantity    Int        @default(1)
  unitPrice   Int
}

model PrintProduct {
  id          String  @id @default(cuid())
  name        String  // "スタンダードカード", "ホログラムカード" など
  description String?
  basePrice   Int
  options     Json    // 利用可能オプション
  isAvailable Boolean @default(true)
}
```

商品ラインナップ:
| 商品 | 価格 | 説明 |
|------|------|------|
| スタンダードカード | ¥300 | マット加工、標準サイズ |
| プレミアムカード | ¥500 | ホログラム加工 |
| 5枚デッキセット | ¥1,200 | 専用ケース付き |
| A4ポスター | ¥1,500 | カードを大判印刷 |
| コレクションブック | ¥3,000 | 最大20枚収納、専用バインダー |

技術要件:
- 印刷業者API連携（printful, printify等）
- 高解像度画像生成（300dpi以上）
- 決済システム（Stripe）
- 配送追跡連携

API:
- `GET /api/print/products` - 商品一覧
- `POST /api/print/preview` - 印刷プレビュー生成
- `POST /api/print/orders` - 注文作成
- `GET /api/print/orders` - 注文履歴
- `GET /api/print/orders/:id` - 注文詳細

UI:
- カード詳細に「印刷注文」ボタン
- 商品選択画面
- 印刷プレビュー
- 配送先入力フォーム
- 決済画面
- 注文履歴・追跡

**QRコード機能**:
- 物理カードにQRコードを印刷
- スキャンでデジタル版カードページにアクセス
- 所有者認証でボーナス付与

**参考**
- Pokemon GO: 実物ポケモンカードとの連携
- Shutterfly: オンデマンド印刷サービス

---

### 2. ダークモード＆テーマカスタマイズ

**概要**
- ダークモード/ライトモード切り替え
- アクセントカラーのカスタマイズ
- プレミアムテーマ（シーズン限定など）
- カードコレクション画面の背景カスタマイズ

**メリット**
- ビジネス: プレミアムテーマの販売
- ユーザー: 目の疲れ軽減、パーソナライゼーション

**実装難易度**: ★☆☆☆☆

**必要な変更**

データモデル:
```prisma
model UserThemeSettings {
  id           String   @id @default(cuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id])
  mode         String   @default("system") // light, dark, system
  accentColor  String   @default("blue") // blue, purple, green, orange, pink
  customThemeId String?
  customTheme   Theme?   @relation(fields: [customThemeId], references: [id])
  backgroundId  String?
  updatedAt    DateTime @updatedAt
}

model Theme {
  id          String  @id @default(cuid())
  name        String
  description String?
  previewUrl  String
  colors      Json    // { primary, secondary, background, text, accent }
  isPremium   Boolean @default(false)
  price       Int?    // コインまたは円
  seasonId    String? // シーズン限定の場合
  isAvailable Boolean @default(true)

  users UserThemeSettings[]
}

model CollectionBackground {
  id          String  @id @default(cuid())
  name        String
  previewUrl  String
  imageUrl    String
  isPremium   Boolean @default(false)
  price       Int?
}
```

基本カラーパレット:
```typescript
const themes = {
  light: {
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#1a1a1a',
    textSecondary: '#666666',
  },
  dark: {
    background: '#1a1a1a',
    surface: '#2d2d2d',
    text: '#ffffff',
    textSecondary: '#a0a0a0',
  },
};

const accentColors = {
  blue: '#3b82f6',
  purple: '#8b5cf6',
  green: '#22c55e',
  orange: '#f97316',
  pink: '#ec4899',
};
```

API:
- `GET /api/settings/theme` - 現在のテーマ設定
- `PUT /api/settings/theme` - テーマ設定更新
- `GET /api/themes` - 利用可能テーマ一覧
- `POST /api/themes/:id/purchase` - プレミアムテーマ購入

UI:
- 設定画面にテーマセクション
- ライト/ダーク/システム切り替え
- アクセントカラーピッカー
- プレミアムテーマギャラリー
- プレビュー機能

**実装アプローチ**:
```typescript
// Tailwind CSS dark mode
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  // ...
};

// CSS変数でアクセントカラー
:root {
  --accent-color: theme('colors.blue.500');
}

.dark {
  --background: #1a1a1a;
  --surface: #2d2d2d;
}
```

**プレミアムテーマ例**:
| テーマ名 | 価格 | 特徴 |
|---------|------|------|
| オーロラ | 300コイン | グラデーション背景 |
| サイバーパンク | 500コイン | ネオンカラー |
| 和風 | 300コイン | 和柄背景 |
| シーズン限定 | 無料（期間中） | 季節イベント |

**参考**
- Discord: カスタムテーマ、Nitro限定テーマ
- Twitter/X: ダークモード、アクセントカラー
