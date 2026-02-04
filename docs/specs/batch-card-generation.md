# 複数カード同時生成機能（バッチ生成）

## 概要

1回のテーマ入力から最大10枚のカードを同時に生成できる機能。

### 主な特徴

- **対象**: サブスク加入者（plus/premium）限定
- **最大枚数**: 10枚
- **コスト**: 30コイン × 生成枚数（割引なし）
- **キーワード**: 必ず異なるキーワードが選択される
- **生成タイミング**: テーマ入力時に枚数を選択、記事生成後に自動でカード一括生成
- **アニメーション**: 1枚ずつフリップ表示、スキップ可能

### ユーザー区分

| ユーザー種別 | 枚数選択UI | 最大枚数 |
|-------------|-----------|---------|
| 無料ユーザー | 非表示 | 1枚固定 |
| plus会員 | 表示 | 10枚 |
| premium会員 | 表示 | 10枚 |

---

## アーキテクチャ

### 生成フロー

```
┌─────────────────────────────────────────────────────────────┐
│  トップ画面（/home）                                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ テーマ入力                                              ││
│  │ ┌─────────────────────────────────────────────────────┐││
│  │ │ 学びたいテーマを入力...                              │││
│  │ └─────────────────────────────────────────────────────┘││
│  │                                                         ││
│  │ 文章スタイル: [エッセイ ▼]                              ││
│  │                                                         ││
│  │ ┌─────────────────────────────────────────────────────┐││
│  │ │ カード生成枚数: [===●=====] 3枚  ← サブスク者のみ   │││
│  │ │ 消費コイン: 90コイン (30×3)                         │││
│  │ └─────────────────────────────────────────────────────┘││
│  │                                                         ││
│  │ [記事＋カード生成 ×90] [記事のみ生成 ×0]               ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 処理シーケンス

```
User              Frontend           API              AI/DB
 │                   │                │                 │
 │ テーマ入力        │                │                 │
 │ 枚数選択(3枚)     │                │                 │
 │ 「生成」クリック   │                │                 │
 │──────────────────>│                │                 │
 │                   │                │                 │
 │                   │ POST /articles │                 │
 │                   │───────────────>│                 │
 │                   │                │ 記事生成        │
 │                   │                │────────────────>│
 │ 記事生成中...     │<───────────────│                 │
 │<──────────────────│                │                 │
 │                   │                │                 │
 │                   │ Loop: 1..3     │                 │
 │                   │                │                 │
 │                   │ POST /cards    │                 │
 │                   │───────────────>│                 │
 │                   │                │ カード生成      │
 │                   │                │────────────────>│
 │ カード 1/3 完了   │<───────────────│                 │
 │<──────────────────│                │                 │
 │                   │                │                 │
 │                   │ POST /cards    │                 │
 │                   │───────────────>│                 │
 │ カード 2/3 完了   │<───────────────│                 │
 │<──────────────────│                │                 │
 │                   │                │                 │
 │      ...          │      ...       │       ...       │
 │                   │                │                 │
 │ リビール開始      │                │                 │
 │<──────────────────│                │                 │
```

### 生成方式

フロントエンドから既存の `/api/cards` を順次呼び出す方式を採用。

```typescript
// 記事生成完了後
for (let i = 0; i < cardCount; i++) {
  const card = await POST('/api/cards', { articleId });
  updateProgress(i + 1, card);
  if (cancelled) break;
}
```

**この方式を選択した理由:**

| 課題 | 解決策 |
|------|--------|
| APIタイムアウト（10枚×30秒=5分） | 1枚ずつ呼び出しでタイムアウト回避 |
| 進捗表示 | 各カード完了時にリアルタイム更新 |
| 途中キャンセル | ループ中断で即座に対応 |
| 部分失敗 | 失敗はスキップ、成功分は保持 |

---

## API仕様

### GET /api/cards/batch/eligibility

バッチ生成の資格と制限を確認するエンドポイント。

**リクエスト:**
```
GET /api/cards/batch/eligibility?articleId={articleId}
Authorization: Bearer {token}
```

**レスポンス:**
```typescript
{
  success: true,
  data: {
    eligible: boolean;           // バッチ生成可能か（サブスク加入者のみtrue）
    maxBatchSize: number;        // 最大生成枚数（10）
    availableKeywords: number;   // この記事で利用可能なキーワード数
    coinBalance: number;         // 現在のコイン残高
    costPerCard: number;         // 1枚あたりのコスト（30）
    maxAffordable: number;       // コイン残高で生成可能な最大枚数
  }
}
```

**eligibility チェックロジック:**
1. `canUseBatchGeneration()` - サブスク加入状態を確認（plus/premium のみ true）
2. `getAvailableKeywordCount()` - 記事から未使用キーワード数を取得
3. `getBalances()` - 現在のコイン残高を取得

### POST /api/cards（既存）

カード1枚を生成。バッチ生成ではこのAPIを順次呼び出す。

---

## UIフロー

### サブスク者

```
┌─────────────────┐
│  テーマ入力画面  │  ← ThemeInput（枚数選択UI付き）
│  + 枚数スライダー │
│  + コスト表示    │
└────────┬────────┘
         │ 「記事＋カード生成」クリック
         ▼
┌─────────────────┐
│   記事生成中     │  ← ArticleLoading
└────────┬────────┘
         │ 記事生成完了
         ▼
┌─────────────────┐
│ カード一括生成中  │  ← BatchGenerationProgress
│  プログレスバー   │
│  サムネイル表示   │
│  キャンセルボタン │
└────────┬────────┘
         │ 全カード生成完了
         ▼
┌─────────────────┐
│  リビールモーダル │  ← BatchCardRevealModal
│  1枚ずつフリップ  │
│  3秒自動進行     │
│  タップで次へ    │
│  全スキップボタン │
└────────┬────────┘
         │ 全カード表示 or スキップ
         ▼
┌─────────────────┐
│   サマリー画面   │  ← BatchSummary (モーダル内)
│  カードグリッド   │
│  レアリティ集計   │
│  アクションボタン │
└─────────────────┘
```

### 無料ユーザー

```
┌─────────────────┐
│  テーマ入力画面  │  ← ThemeInput（枚数選択UI非表示）
└────────┬────────┘
         │ 「記事＋カード生成」クリック
         ▼
┌─────────────────┐
│   記事生成中     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  カード1枚生成   │  ← 従来どおりの1枚生成フロー
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  リビールモーダル │  ← CardRevealModal（既存）
└─────────────────┘
```

---

## ファイル構成

### 新規作成ファイル

| ファイル | 説明 | 行数 |
|---------|------|------|
| `src/app/api/cards/batch/eligibility/route.ts` | バッチ生成資格チェックAPI | ~62行 |
| `src/components/card/batch-generation-progress.tsx` | 生成進捗表示（プログレスバー、サムネイル） | ~148行 |
| `src/components/card/batch-card-reveal-modal.tsx` | 連続リビールモーダル + サマリー | ~566行 |
| `src/hooks/use-batch-card-generation.ts` | バッチ生成ロジックのカスタムフック | ~209行 |

### 修正ファイル

| ファイル | 変更内容 |
|---------|----------|
| `src/lib/constants/coins.ts` | `BATCH_CARD_CONFIG` 定数追加 |
| `src/lib/services/subscription-service.ts` | `canUseBatchGeneration()` 関数追加 |
| `src/lib/services/card-service.ts` | `getAvailableKeywordCount()` 関数追加 |
| `src/lib/validations/card.ts` | `batchEligibilityQuerySchema` 追加 |
| `src/components/card/index.ts` | 新コンポーネントのエクスポート追加 |
| `src/components/article/theme-input.tsx` | 枚数選択UI追加（サブスク者のみ表示） |
| `src/app/(main)/home/page.tsx` | バッチ生成対応（複数枚カード生成フロー） |

### 削除済みファイル

| ファイル | 理由 | 状態 |
|---------|------|------|
| `src/app/(main)/articles/[id]/card/page.tsx` | 記事詳細からのカード生成機能廃止 | 削除完了 |
| `src/components/card/batch-card-selector.tsx` | 枚数選択はThemeInputに統合 | 未作成（不要） |

---

## 主要コンポーネント詳細

### ThemeInput（修正）

テーマ入力と枚数選択を統合したコンポーネント。

**変更点:**

```typescript
interface ThemeInputProps {
  onSubmit: (
    theme: string,
    withCard: boolean,
    contentType: ContentType,
    cardCount: number  // 追加: カード生成枚数
  ) => void;
  isLoading?: boolean;
  disabled?: boolean;
  isBatchEligible?: boolean;  // 追加: バッチ生成可能か
  coinBalance?: number;       // 追加: コイン残高
}
// 注: maxBatchSizeはpropsではなくBATCH_CARD_CONFIG.MAX_BATCH_SIZEを直接参照
```

**表示ロジック:**

```typescript
// サブスク者のみ枚数選択UIを表示
{isBatchEligible && (
  <div className="space-y-2">
    <label>カード生成枚数</label>
    <input
      type="range"
      min={1}
      max={maxGeneratable}
      value={cardCount}
      onChange={(e) => setCardCount(Number(e.target.value))}
    />
    <p>消費コイン: {cardCount * COIN_COSTS.CARD_GENERATION}コイン</p>
  </div>
)}
```

### useBatchCardGeneration フック

バッチカード生成のコアロジックを管理するカスタムフック。

```typescript
interface BatchGenerationState {
  isGenerating: boolean;      // 生成中フラグ
  totalCount: number;         // 要求枚数
  completedCount: number;     // 完了枚数
  cards: Card[];              // 生成済みカード配列
  errors: { index: number; message: string }[];
  currentStage: GenerationStage;  // keyword | context | illustration | composing
  isCancelled: boolean;
}

// 戻り値
{
  state: BatchGenerationState;
  startGeneration: (articleId: string, count: number) => Promise<void>;
  cancelGeneration: () => void;
  reset: () => void;
}
```

### BatchGenerationProgress

生成進捗表示コンポーネント。

**表示要素:**

- メインスピナー（中央に完了数/総数を表示）
- 進捗メッセージ（「3枚目を生成中...」）
- ステージ表示（キーワード選定中... → イラスト生成中...）
- プログレスバー（グラデーション）
- 生成済みカードのサムネイル（レアリティ色のドット付き）
- エラー表示（最大3件 + 「他X件」）
- キャンセルボタン

### BatchCardRevealModal

連続リビールモーダル + サマリー表示。

**リビール機能:**

- **自動進行**: 3秒間隔で次のカードへ（`AUTO_ADVANCE_DELAY = 3000`）
- **タップ進行**: カードクリックで即座に次へ
- **全スキップ**: ボタンでサマリーへ直行
- **進捗インジケーター**: ドット表示で現在位置を表示

**レアリティ別エフェクト:**

| レアリティ | エフェクト |
|-----------|-----------|
| Legend | 放射状パーティクル16個 + 金色グロー + ぼかし背景 |
| Super Rare | 放射状パーティクル10個 + 紫グロー |
| Rare | ランダム位置スパークル6個 + 青グロー |
| Common | シンプルなシャドウ |

**サマリー表示:**

- レアリティ別カウント（legend×1, rare×2 のようなバッジ表示）
- カードグリッド（3-4列）
- 「コレクションを見る」「トップに戻る」ボタン

---

## 定数設定

### BATCH_CARD_CONFIG (`src/lib/constants/coins.ts`)

```typescript
export const BATCH_CARD_CONFIG = {
  /** 最大同時生成枚数 */
  MAX_BATCH_SIZE: 10,
  /** 1枚あたりのコスト（既存と同じ） */
  COST_PER_CARD: COIN_COSTS.CARD_GENERATION, // 30
} as const;
```

---

## エラーハンドリング

### キーワード不足

- 生成開始前に `availableKeywords` を取得
- 記事生成後、利用可能なキーワード数が要求枚数より少ない場合は警告
- 可能な枚数分だけ生成を続行

### 途中失敗

- 失敗したカードはスキップして継続
- 成功したカードは全て保持
- エラー数をUIに表示

### コイン不足

- 生成開始前に残高チェック
- 不足時は生成ボタンを無効化
- 警告メッセージ表示

### 途中キャンセル

- `cancelRef` でキャンセルフラグを管理
- ループ内でチェックして即座に中断
- 生成済みカードは保持

---

## テストシナリオ

### 正常系

| No | シナリオ | 期待結果 |
|----|---------|---------|
| 1 | サブスク者が5枚選択して生成 | 記事生成 → 5枚連続生成 → リビール → サマリー |
| 2 | 無料ユーザーが生成 | 枚数選択UI非表示、1枚のみ生成 |
| 3 | 最大10枚生成 | 10枚全て生成完了、サマリーにグリッド表示 |
| 4 | リビール中に「全スキップ」 | 即座にサマリー画面へ遷移 |
| 5 | リビール中にタップで次へ | 自動進行を待たず次のカードへ |

### 制限系

| No | シナリオ | 期待結果 |
|----|---------|---------|
| 6 | コイン残高60で3枚選択 | 生成可能、ボタン有効 |
| 7 | コイン残高60で5枚選択 | コイン不足警告、ボタン無効 |
| 8 | サブスク切れユーザー | 枚数選択UI非表示、1枚固定 |

### エラー系

| No | シナリオ | 期待結果 |
|----|---------|---------|
| 9 | 生成途中でキャンセル | 生成済みカードは保持、リビールへ遷移 |
| 10 | 5枚中2枚目でAPI失敗 | エラーをスキップ、残り3枚は生成続行 |
| 11 | 認証トークン期限切れ | エラーメッセージ表示、再ログイン促進 |

---

## 実装日

2025年2月4日（実装完了）

### 実装フェーズ（全完了）

1. **Phase 1: バックエンド** ✅
   - `BATCH_CARD_CONFIG` 定数
   - `canUseBatchGeneration()` サブスク判定
   - `getAvailableKeywordCount()` キーワード数取得
   - `batchEligibilityQuerySchema` バリデーション
   - `/api/cards/batch/eligibility` エンドポイント

2. **Phase 2: フロントエンド基盤** ✅
   - `useBatchCardGeneration` フック
   - `BatchGenerationProgress` コンポーネント
   - `ThemeInput` に枚数選択UI追加

3. **Phase 3: アニメーション** ✅
   - `BatchCardRevealModal` コンポーネント
   - レアリティ別エフェクト（Legend/SuperRare/Rare/Common）
   - フリップアニメーション
   - サマリー画面

4. **Phase 4: 統合・削除** ✅
   - `src/app/(main)/home/page.tsx` バッチ生成対応
   - `src/app/(main)/articles/[id]/card/page.tsx` 削除済み

---

## 今後の拡張案

- 枚数に応じた割引システム
- レアリティ確率アップキャンペーン
- バッチ生成専用のアニメーションバリエーション
