# 12. チャレンジモード

## 12.1 機能概要

### コンセプト

チャレンジモードは、生成したカードを使って冒険に挑戦するゲームモード。

**主な特徴:**
- 6種類のシナリオ（宇宙探査、タイムトラベル、AI反乱等）から選択
- 難易度に応じたカードでデッキを編成（easy:5枚 / normal:6枚 / hard:7枚）
- 5つのフェーズのチャレンジに挑戦
- AIがカードの適合度を判定し、面白おかしく実況
- スコアを獲得してランク達成報酬（コイン）を獲得

### 実装スコープ

| 項目 | 内容 |
|------|------|
| シナリオ数 | 6つ |
| フェーズ数 | 5フェーズ |
| デッキサイズ | 難易度により5〜7枚 |
| 報酬 | スコア＋ランク達成報酬（コイン） |
| シナリオ管理 | TypeScriptで固定定義 |

## 12.2 ゲームフロー

```
シナリオ選択 → デッキ編成(難易度に応じた枚数) → フェーズ1〜5 → 結果表示
                                              ↓
                                        各フェーズ:
                                        1. チャレンジ表示(事前定義からランダム選択)
                                        2. カード選択(1-3枚)
                                        3. 評価&実況(AI)
                                        4. スコア加算
```

### 詳細フロー

1. **シナリオ選択** (`/challenge`)
   - 利用可能なシナリオ一覧を表示
   - 難易度、フェーズ数、必要デッキサイズを確認
   - 進行中のセッションがある場合は続行/中断の選択

2. **デッキ編成** (`/challenge/[sessionId]`)
   - 自分のカードコレクションから指定枚数を選択（難易度により5〜7枚）
   - 選択したカードはプレビュー表示
   - 確定後、ゲーム開始

3. **フェーズプレイ**
   - 事前定義チャレンジからランダムに1つが表示される
   - フェーズタイプに応じて1〜3枚のカードを選択
   - AIが評価し、スコアと実況を生成

4. **結果表示**
   - 全フェーズ完了後、総合スコアとランク表示
   - AIによる冒険サマリー
   - 再挑戦またはシナリオ選択に戻る

## 12.3 シナリオ定義

### シナリオ一覧

| シナリオID | タイトル | 難易度 | デッキ枚数 | アイコン |
|-----------|----------|--------|-----------|---------|
| space_exploration | 宇宙探査ミッション | normal | 6枚 | 🚀 |
| time_travel | タイムトラベル大作戦 | easy | 5枚 | ⏰ |
| ai_rebellion | AI反乱鎮圧作戦 | hard | 7枚 | 🤖 |
| demon_lord | 魔王討伐の旅 | hard | 7枚 | ⚔️ |
| desert_island | 無人島サバイバル | normal | 6枚 | 🏝️ |
| school_festival | 文化祭大作戦 | easy | 5枚 | 🎪 |

### 難易度別デッキサイズ

| 難易度 | デッキ枚数 | 説明 |
|--------|-----------|------|
| easy | 5枚 | 初心者向け、カード選択が容易 |
| normal | 6枚 | 標準難易度 |
| hard | 7枚 | 上級者向け、戦略的なカード管理が必要 |

### シナリオ定義例（宇宙探査ミッション）

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
| 2 | 太陽フレア | single | 1枚 | あり | 100 |
| 3 | エイリアン遭遇 | combo | 2枚 | なし | 100 |
| 4 | 資源不足 | single | 1枚 | あり | 100 |
| 5 | 帰還 | single | 1枚 | なし | 100 |

**フェーズタイプ:**
- `single`: 1枚のカードを選択
- `combo`: 2枚のカードを選択（シナジーボーナスあり、最大+10点）
- `triple`: 3枚のカードを選択（シナジーボーナスあり、最大+15点）

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
| レアカード | レア使用 | +3 |
| スーパーレアカード | スーパーレア使用 | +5 |
| レジェンドカード | レジェンド使用 | +10 |
| コンボシナジー | 2枚選択時、適合度に応じて | +0〜10 |
| トリプルシナジー | 3枚選択時、適合度に応じて | +0〜15 |

**シナジーボーナス計算:**
- コンボ: `Math.round((fitScore / 100) * 10)`
- トリプル: `Math.round((fitScore / 100) * 15)`

### スコアランク

| ランク | 総合スコア | 評価 |
|--------|-----------|------|
| S | 450+ | 🏆 |
| A | 350-449 | 🌟 |
| B | 250-349 | 👍 |
| C | 0-249 | 💪 |

## 12.5 AI評価・実況

### チャレンジ選択

各シナリオ×各フェーズに5パターンの事前定義チャレンジが用意されている。
プレイ時にランダムに1つが選択される。

**管理ファイル**: `src/lib/challenge/predefined-challenges.ts`

**チャレンジ構造:**
- `situation`: ドラマチックな状況説明（2-3文）
- `challenge`: プレイヤーが解決すべき課題（1-2文）
- `hint`: カード選択のヒント（1文）

### カード評価（AI）

選択されたカードがチャレンジをどの程度解決できるかをAI（GPT-4o-mini）が評価。
AIは創造的にカードとチャレンジの関連性を見つけ、ユーモラスに実況する。

**出力:**
- `fitScore`: 適合度（0-100）
- `connectionExplanation`: なぜこのカードが有効か
- `narrativeDescription`: 物語的描写（3-5文）
- `humorComment`: ユーモアコメント

### チャレンジ完了サマリー（AI）

全フェーズ完了後、AIが冒険全体のサマリーを生成。
各フェーズのハイライトや最終ランクに応じたコメントを含む。

### 実況スタイル

```
高スコア(90+): 「まさに完璧な選択だ！『重力』のカードで隕石を軌道から逸らすとは...」
中スコア(60-89): 「なるほど...『寿司職人』の精密な手さばきで小惑星サンプルを採取とは、意外だが効果的だ！」
低スコア(30-59): 「えーと...『ハムスター』で宇宙船を動かす？まあ、ハムスターホイールで...理論上は可能...かな？」
```

## 12.6 データベーススキーマ

### ChallengeSession

ゲームセッションを管理。デッキカードとフェーズ結果は `gameState` JSON フィールドに格納。

```prisma
model ChallengeSession {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId       String    @map("user_id") @db.VarChar(128)
  scenarioId   String    @map("scenario_id") @db.VarChar(50)
  status       String    @db.VarChar(20)  // in_progress | completed | abandoned
  currentPhase Int       @default(0) @map("current_phase")
  totalScore   Int       @default(0) @map("total_score")
  gameState    Json      @default("{}") @map("game_state")
  startedAt    DateTime  @default(now()) @map("started_at") @db.Timestamptz
  completedAt  DateTime? @map("completed_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("challenge_sessions")
}
```

**ステータス説明:**
- `in_progress`: プレイ中（`currentPhase=0` の場合はデッキ編成フェーズ）
- `completed`: 全フェーズ完了
- `abandoned`: 中断

**gameState構造:**
```typescript
{
  deck: DeckCard[];      // デッキに入れたカード情報
  phases: PhaseResult[]; // 各フェーズの結果
}
```

### ChallengeHighScore

ユーザーごと・シナリオごとのハイスコアを記録。

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
│   ├── scenarios.ts              # シナリオ定義
│   ├── predefined-challenges.ts  # 事前定義チャレンジ（各シナリオ×フェーズ×5パターン）
│   ├── rewards.ts                # 達成報酬ロジック
│   └── index.ts
├── openai/
│   └── challenge-ai.ts           # AI評価・実況生成
├── services/
│   └── challenge-service.ts      # ビジネスロジック
└── validations/
    └── challenge.ts              # Zodスキーマ
```

### API

```
src/app/api/challenge/
├── scenarios/
│   └── route.ts          # GET - シナリオ一覧
├── highscores/
│   └── route.ts          # GET - ユーザーのハイスコア一覧
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

- [x] ~~追加シナリオ（タイムトラベル、AI反乱、魔王討伐等）~~ ※実装済み
- [x] ~~ナレッジ報酬システム~~ ※コインシステムとして実装済み
- [ ] リーダーボード
- [ ] マルチプレイヤー対戦
- [ ] シナリオ解放条件
- [ ] 追加シナリオ（海底探検、宇宙ステーション建設等）
