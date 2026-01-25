# 12. チャレンジモード

## 12.1 機能概要

### コンセプト

チャレンジモードは、生成したカードを使って冒険に挑戦するゲームモード。

**主な特徴:**
- シナリオ（例：宇宙探査）を選択
- 6枚のカードでデッキを編成
- 5つのフェーズのチャレンジに挑戦
- AIがカードの適合度を判定し、面白おかしく実況
- スコアを獲得してステージクリア

### MVPスコープ

| 項目 | 内容 |
|------|------|
| シナリオ数 | 1つ（宇宙探査ミッション） |
| フェーズ数 | 5フェーズ |
| デッキサイズ | 6枚 |
| 報酬 | スコアのみ（ナレッジ報酬なし） |
| シナリオ管理 | TypeScriptで固定定義 |

## 12.2 ゲームフロー

```
シナリオ選択 → デッキ編成(6枚) → フェーズ1〜5 → 結果表示
                                    ↓
                              各フェーズ:
                              1. チャレンジ生成(AI)
                              2. カード選択(1-2枚)
                              3. 評価&実況(AI)
                              4. スコア加算
```

### 詳細フロー

1. **シナリオ選択** (`/challenge`)
   - 利用可能なシナリオ一覧を表示
   - 難易度、フェーズ数、必要デッキサイズを確認
   - 進行中のセッションがある場合は続行/中断の選択

2. **デッキ編成** (`/challenge/[sessionId]`)
   - 自分のカードコレクションから6枚を選択
   - 選択したカードはプレビュー表示
   - 確定後、ゲーム開始

3. **フェーズプレイ**
   - AIがシナリオに応じたチャレンジを生成
   - フェーズタイプに応じて1〜2枚のカードを選択
   - AIが評価し、スコアと実況を生成

4. **結果表示**
   - 全フェーズ完了後、総合スコアとランク表示
   - AIによる冒険サマリー
   - 再挑戦またはシナリオ選択に戻る

## 12.3 シナリオ定義

### 宇宙探査ミッション

```typescript
{
  id: 'space_exploration',
  title: '宇宙探査ミッション',
  description: '人類初の深宇宙探査船「アルテミス号」の乗組員として...',
  icon: '🚀',
  difficulty: 'normal',
  deckSize: 6,
  totalPhases: 5,
  phases: [...]
}
```

### フェーズ構成

| フェーズ | タイトル | タイプ | カード数 | 消費 | 基本点 |
|---------|----------|--------|---------|------|--------|
| 1 | 発射準備 | single | 1枚 | なし | 100 |
| 2 | 太陽フレア | single | 1枚 | あり | 150 |
| 3 | エイリアン遭遇 | combo | 2枚 | なし | 200 |
| 4 | 資源不足 | single | 1枚 | あり | 150 |
| 5 | 帰還 | single | 1枚 | なし | 200 |

**フェーズタイプ:**
- `single`: 1枚のカードを選択
- `combo`: 2枚のカードを選択（シナジーボーナスあり）

**カード消費:**
- 消費ありのフェーズでは、選択したカードは以降使用不可

## 12.4 スコアリングシステム

### 基本計算

```
フェーズスコア = フェーズ基本点 × (適合度 / 100) + ボーナススコア
```

### ボーナス

| ボーナス種類 | 条件 | 点数 |
|-------------|------|------|
| レアカード | レア使用 | +10 |
| スーパーレアカード | スーパーレア使用 | +20 |
| レジェンドカード | レジェンド使用 | +30 |
| 完璧適合 | 適合度95以上 | +25 |
| コンボシナジー | 2枚選択時、良い組み合わせ | +0〜20 |

### スコアランク

| ランク | 総合スコア | 評価 |
|--------|-----------|------|
| S | 800+ | 🏆 |
| A | 600-799 | 🌟 |
| B | 400-599 | 👍 |
| C | 200-399 | 💪 |
| D | 0-199 | 🌱 |

## 12.5 AI評価・実況

### チャレンジ生成

シナリオのフェーズ情報を元に、プレイヤーの手持ちカードに合わせたチャレンジを生成。
カード名を直接参照せず、抽象的な課題を提示。

**出力:**
- `situation`: ドラマチックな状況説明（2-3文）
- `challenge`: プレイヤーが解決すべき課題（1-2文）
- `hint`: カード選択のヒント（1文）

### カード評価

選択されたカードがチャレンジをどの程度解決できるか評価。

**出力:**
- `fitScore`: 適合度（0-100）
- `connectionExplanation`: なぜこのカードが有効か
- `narrativeDescription`: 物語的描写（3-5文）
- `humorComment`: ユーモアコメント

### 実況スタイル

```
高スコア(90+): 「まさに完璧な選択だ！『重力』のカードで隕石を軌道から逸らすとは...」
中スコア(60-89): 「なるほど...『寿司職人』の精密な手さばきで小惑星サンプルを採取とは、意外だが効果的だ！」
低スコア(30-59): 「えーと...『ハムスター』で宇宙船を動かす？まあ、ハムスターホイールで...理論上は可能...かな？」
```

## 12.6 データベーススキーマ

### ChallengeSession

ゲームセッションを管理。

```prisma
model ChallengeSession {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId       String    @map("user_id") @db.VarChar(128)
  scenarioId   String    @map("scenario_id") @db.VarChar(50)
  status       String    @db.VarChar(20)  // deck_building | in_progress | completed | abandoned
  currentPhase Int       @default(0) @map("current_phase")
  totalScore   Int       @default(0) @map("total_score")
  startedAt    DateTime  @default(now()) @map("started_at") @db.Timestamptz
  completedAt  DateTime? @map("completed_at") @db.Timestamptz

  user      User                    @relation(...)
  deckCards ChallengeSessionCard[]
  phases    ChallengeSessionPhase[]

  @@map("challenge_sessions")
}
```

### ChallengeSessionCard

デッキに入れたカードを管理。

```prisma
model ChallengeSessionCard {
  id          String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sessionId   String  @map("session_id") @db.Uuid
  cardId      String  @map("card_id") @db.Uuid
  isUsed      Boolean @default(false) @map("is_used")
  usedInPhase Int?    @map("used_in_phase")

  session ChallengeSession @relation(...)
  card    Card             @relation(...)

  @@unique([sessionId, cardId])
  @@map("challenge_session_cards")
}
```

### ChallengeSessionPhase

各フェーズの結果を記録。

```prisma
model ChallengeSessionPhase {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sessionId       String   @map("session_id") @db.Uuid
  phaseNumber     Int      @map("phase_number")
  challenge       String   @db.Text
  selectedCardIds Json     @map("selected_card_ids")
  fitScore        Int      @map("fit_score")
  bonusScore      Int      @default(0) @map("bonus_score")
  totalScore      Int      @map("total_score")
  aiCommentary    String   @map("ai_commentary") @db.Text
  completedAt     DateTime @default(now()) @map("completed_at") @db.Timestamptz

  session ChallengeSession @relation(...)

  @@unique([sessionId, phaseNumber])
  @@map("challenge_session_phases")
}
```

## 12.7 ディレクトリ構造

### 型定義

```
src/types/
└── challenge.ts          # セッション、フェーズ、スコアリング等の型
```

### バックエンド

```
src/lib/
├── challenge/
│   ├── scenarios.ts      # シナリオ定義
│   └── index.ts
├── openai/
│   └── challenge-ai.ts   # AI評価・実況生成
├── services/
│   └── challenge-service.ts  # ビジネスロジック
└── validations/
    └── challenge.ts      # Zodスキーマ
```

### API

```
src/app/api/challenge/
├── scenarios/
│   └── route.ts          # GET - シナリオ一覧
└── sessions/
    ├── route.ts          # POST/GET - セッション作成/一覧
    └── [id]/
        ├── route.ts      # GET/DELETE - セッション詳細/中断
        ├── deck/
        │   └── route.ts  # POST - デッキ設定
        ├── challenge/
        │   └── route.ts  # GET - 現在のチャレンジ取得
        └── submit/
            └── route.ts  # POST - カード提出
```

### フロントエンド

```
src/app/(main)/challenge/
├── page.tsx              # シナリオ選択ページ
└── [sessionId]/
    └── page.tsx          # ゲームプレイページ

src/components/challenge/
├── scenario-card.tsx     # シナリオ表示
├── deck-builder.tsx      # デッキ編成UI
├── phase-display.tsx     # フェーズ進行表示
├── challenge-card.tsx    # チャレンジ表示
├── card-selector.tsx     # カード選択UI
├── result-display.tsx    # 結果&AI実況表示
├── challenge-complete.tsx # 完了画面
└── index.ts
```

## 12.8 セットアップ手順

```bash
# 1. Prisma Clientを再生成
npx prisma generate

# 2. データベーススキーマを適用
npm run db:push

# 3. 開発サーバー起動
npm run dev
```

## 12.9 今後の拡張予定

- 追加シナリオ（海底探検、タイムトラベル等）
- ナレッジ報酬システム
- リーダーボード
- マルチプレイヤー対戦
- シナリオ解放条件
