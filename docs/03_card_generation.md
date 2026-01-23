# 03. カード生成機能

## 3.1 機能概要

生成された学習記事からキーワードをランダム抽出し、文脈に応じたレア度・イラスト・テキストを持つユニークなカードを生成する。

## 3.2 カード生成フロー

```
記事生成完了
    │
    ▼
┌─────────────────┐
│ キーワード抽出   │ ← OpenAI API
│ (ランダム選択)   │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ 文脈分析        │ ← OpenAI API
│ (シチュエーション判定)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ レア度判定      │ ← ロジック計算
│                 │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ カードテキスト生成│ ← OpenAI API
│ (100文字以内)    │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ イラスト生成    │ ← FLUX API
│ (文脈反映スタイル)│
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ カード画像合成   │ ← サーバーサイド
│ (レイアウト適用) │
└─────────────────┘
    │
    ▼
カード完成・保存
```

## 3.3 キーワード抽出

### 抽出ルール

```typescript
// OpenAIへのプロンプト
const keywordExtractionPrompt = `
以下の学習記事から、カードのテーマとして面白いキーワードを10個抽出してください。

ルール:
1. 固有名詞、専門用語、象徴的なモノを優先
2. 一般的すぎる単語（「こと」「もの」等）は除外
3. 2-10文字程度のキーワード
4. JSON配列形式で出力

記事:
{article_content}

出力形式:
["キーワード1", "キーワード2", ...]
`;
```

### ランダム選択

抽出された10個のキーワードから1つをランダムに選択。

```typescript
const selectKeyword = (keywords: string[]): string => {
  const index = Math.floor(Math.random() * keywords.length);
  return keywords[index];
};
```

### キーワード重複禁止

同じ記事から複数回カードを生成する場合、既に使用されたキーワードは除外する。

```typescript
const selectAvailableKeyword = async (
  articleId: string,
  extractedKeywords: string[]
): Promise<string> => {
  // 既存のカードで使用済みのキーワードを取得
  const existingCards = await prisma.card.findMany({
    where: { articleId },
    select: { keyword: true },
  });
  const usedKeywords = existingCards.map(c => c.keyword);

  // 未使用のキーワードのみをフィルター
  const availableKeywords = extractedKeywords.filter(
    k => !usedKeywords.includes(k)
  );

  // 利用可能なキーワードがない場合はエラー
  if (availableKeywords.length === 0) {
    throw new NoAvailableKeywordError(
      "この記事から生成できるカードはもうありません"
    );
  }

  // ランダムに1つ選択
  const index = Math.floor(Math.random() * availableKeywords.length);
  return availableKeywords[index];
};
```

### エラーハンドリング（キーワード枯渇）

| エラー種別 | ユーザー表示 | 対応 |
|-----------|-------------|------|
| キーワード枯渇 | 「この記事から生成できるカードはもうありません。別の記事でお試しください」 | 新規記事生成を促す |

## 3.4 文脈分析

### 文脈カテゴリ

キーワードが記事内でどのような文脈で使われているかを分析。

```typescript
type ContextCategory = 
  | "historical_event"    // 歴史的出来事（ニュートンのりんご）
  | "mythology"           // 神話・伝説（黄金のリンゴ）
  | "scientific"          // 科学的事象
  | "cultural"            // 文化的象徴
  | "biographical"        // 人物関連
  | "general"             // 一般的な用法
  | "metaphorical";       // 比喩的用法
```

### 文脈分析プロンプト

```typescript
const contextAnalysisPrompt = `
以下の記事において、キーワード「${keyword}」がどのような文脈で使われているか分析してください。

記事:
${article_content}

出力形式（JSON）:
{
  "context_category": "historical_event" | "mythology" | "scientific" | "cultural" | "biographical" | "general" | "metaphorical",
  "context_description": "このキーワードの文脈を1文で説明",
  "uniqueness_score": 1-10,  // この文脈での使われ方の珍しさ
  "emotional_tone": "epic" | "mysterious" | "scientific" | "warm" | "dramatic" | "neutral"
}
`;
```

## 3.5 レア度判定

### レア度定義

| レア度 | 名称 | 出現確率 | 条件 |
|--------|------|---------|------|
| ★☆☆☆☆ | コモン | 50% | 一般的な文脈 + 頻出キーワード |
| ★★☆☆☆ | アンコモン | 25% | やや特殊な文脈 or やや珍しいキーワード |
| ★★★☆☆ | レア | 15% | 特殊な文脈 + 珍しいキーワード |
| ★★★★☆ | スーパーレア | 8% | 非常に特殊な文脈 |
| ★★★★★ | レジェンド | 2% | 神話・歴史的重要イベント等の極めて特殊な文脈 |

### 判定ロジック

```typescript
interface RarityInput {
  contextCategory: ContextCategory;
  uniquenessScore: number;  // 1-10
  keywordFrequency: number; // 一般的な出現頻度（低いほどレア）
}

type Rarity = "common" | "uncommon" | "rare" | "super_rare" | "legend";

const calculateRarity = (input: RarityInput): Rarity => {
  // 基本スコア計算
  let score = 0;
  
  // 文脈カテゴリによる加点
  const categoryBonus: Record<ContextCategory, number> = {
    mythology: 40,
    historical_event: 35,
    biographical: 25,
    cultural: 20,
    metaphorical: 15,
    scientific: 10,
    general: 0,
  };
  score += categoryBonus[input.contextCategory];
  
  // ユニークネススコアによる加点 (0-30)
  score += input.uniquenessScore * 3;
  
  // キーワード頻度による加点 (0-30)
  // 頻度が低いほど高スコア
  score += Math.max(0, 30 - input.keywordFrequency * 3);
  
  // ランダム要素 (±10)
  score += Math.floor(Math.random() * 21) - 10;
  
  // レア度判定
  if (score >= 80) return "legend";
  if (score >= 60) return "super_rare";
  if (score >= 40) return "rare";
  if (score >= 20) return "uncommon";
  return "common";
};
```

### レア度別の文脈例

```
「りんご」の例:

コモン: 果物の栄養素についての記事
  → 「ビタミンCが豊富な果物」

アンコモン: アップル社の歴史についての記事
  → 「革新の象徴となった果実」

レア: ウィリアム・テルの伝説についての記事
  → 「息子の頭上で運命を待つ果実」

スーパーレア: 万有引力発見についての記事
  → 「落下する瞬間、宇宙の法則を示した果実」

レジェンド: ギリシャ神話トロイア戦争についての記事
  → 「三女神の運命を分けた黄金の果実」
```

## 3.6 カードテキスト生成

### テキスト仕様

| 項目 | 仕様 |
|------|------|
| 最大文字数 | 100文字 |
| トーン | レア度と文脈に応じて変化 |
| 内容 | キーワードの文脈を表現するフレーバーテキスト |

### 生成プロンプト

```typescript
const cardTextPrompt = `
以下の条件でトレーディングカードのフレーバーテキストを生成してください。

キーワード: ${keyword}
文脈: ${contextDescription}
レア度: ${rarity}
トーン: ${emotionalTone}

ルール:
1. 100文字以内
2. 詩的・印象的な表現
3. レア度が高いほどドラマチックに
4. キーワードを直接説明せず、雰囲気を伝える

出力: テキストのみ（引用符なし）
`;
```

### レア度別テキスト例

```
キーワード: りんご

コモン:
「赤く熟した果実が、今日も誰かの健康を支えている」

レジェンド:
「最も美しき者へ——その一言が、神々の世界に戦火をもたらした」
```

## 3.7 イラスト生成

### FLUX API 設定

```typescript
interface FluxGenerationParams {
  model: "flux-1.1-pro";
  prompt: string;
  width: 512;
  height: 768;  // トレカ比率
  steps: 30;
  cfg_scale: 7.5;
}
```

### プロンプト生成

```typescript
const generateImagePrompt = (
  keyword: string,
  context: ContextAnalysis,
  rarity: Rarity
): string => {
  // スタイル修飾子（レア度による）
  const styleModifiers: Record<Rarity, string> = {
    common: "simple illustration, clean lines, bright colors",
    uncommon: "detailed illustration, vibrant colors, dynamic composition",
    rare: "highly detailed art, dramatic lighting, rich colors",
    super_rare: "epic fantasy art, cinematic lighting, intricate details, masterpiece",
    legend: "legendary masterpiece, divine lighting, mythological atmosphere, ultra detailed, golden accents",
  };
  
  // トーン修飾子
  const toneModifiers: Record<string, string> = {
    epic: "epic scale, heroic atmosphere",
    mysterious: "mysterious atmosphere, ethereal glow",
    scientific: "technical precision, educational style",
    warm: "warm colors, friendly atmosphere",
    dramatic: "dramatic lighting, intense mood",
    neutral: "balanced composition, clear presentation",
  };
  
  return `
    ${keyword}, ${context.contextDescription},
    ${styleModifiers[rarity]},
    ${toneModifiers[context.emotionalTone]},
    trading card art style, centered composition,
    no text, no watermark, high quality
  `.trim();
};
```

### 安全性

- FLUX APIのデフォルトフィルターを使用
- 追加のフィルタリングは実施しない

## 3.8 カードレイアウト

### カードサイズ

```
┌───────────────────────┐
│                       │  幅: 512px
│                       │  高さ: 768px
│                       │  比率: 2:3（トレカ標準）
│                       │
└───────────────────────┘
```

### レイアウト構成

```
┌───────────────────────┐
│ ┌───────────────────┐ │ ← 余白: 16px
│ │                   │ │
│ │                   │ │
│ │    イラスト領域    │ │ ← 高さ: 480px
│ │    (512x480)      │ │
│ │                   │ │
│ │                   │ │
│ └───────────────────┘ │
│ ┌───────────────────┐ │
│ │  キーワード名     │ │ ← フォント: 24px Bold
│ │  ★★★☆☆ レア     │ │ ← フォント: 14px
│ └───────────────────┘ │
│ ┌───────────────────┐ │
│ │                   │ │
│ │  フレーバーテキスト │ │ ← フォント: 12px
│ │  (最大100文字)    │ │
│ │                   │ │
│ └───────────────────┘ │
│        2025.01.22    │ ← 生成日付: 10px
└───────────────────────┘
```

### レア度別デザイン

| レア度 | 枠色 | 背景効果 |
|--------|------|---------|
| コモン | グレー | なし |
| アンコモン | 緑 | 薄い輝き |
| レア | 青 | グロー効果 |
| スーパーレア | 紫 | 強いグロー |
| レジェンド | 金 | 虹色グラデーション + パーティクル |

## 3.9 カード画像合成

### サーバーサイド処理

```typescript
// Sharp または Canvas APIを使用
import sharp from 'sharp';

const composeCard = async (
  illustrationBuffer: Buffer,
  cardData: CardData
): Promise<Buffer> => {
  // 1. ベースカード画像（テンプレート）読み込み
  // 2. イラストを配置
  // 3. テキストを描画
  // 4. レア度に応じた装飾を追加
  // 5. 最終画像を出力
};
```

## 3.10 データ保存

```typescript
interface Card {
  id: string;              // UUID
  
  // 関連
  userId: string;          // 所有ユーザー
  articleId: string;       // 元記事
  
  // カード情報
  keyword: string;         // キーワード
  rarity: Rarity;          // レア度
  flavorText: string;      // フレーバーテキスト（100文字以内）
  
  // 文脈情報
  contextCategory: ContextCategory;
  contextDescription: string;
  
  // 画像
  illustrationUrl: string; // 生成イラストURL（Cloud Storage）
  cardImageUrl: string;    // 完成カード画像URL（Cloud Storage）
  
  // メタデータ
  createdAt: Date;
  fluxPrompt: string;      // 使用したプロンプト（デバッグ用）
}
```

## 3.11 課金連携

### 基本ルール

- 1記事につき1枚は無料で生成可能
- 追加カード生成にはサービス内通貨「ナレッジ」が必要
- 消費量は Phase 2 で決定

```typescript
// Phase 2 で実装
interface CardGenerationCost {
  baseGeneration: 0;        // 1枚目は無料
  additionalGeneration: number; // 追加生成のナレッジ消費量（未定）
}
```
