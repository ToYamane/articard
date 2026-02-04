# 13. レアリティ別画像生成モデル

## 13.1 概要

レアリティに応じて異なる画像生成モデルを使用し、レアカードほど高品質な画像を生成する機能。

### 目的

- レアカードの希少価値を最大化
- コスト効率の最適化（平均コスト削減）
- 各プロバイダーの特徴を活かした多様な画風

## 13.2 モデル選択ロジック

### レアリティ別モデル設定

| レアリティ | 出現率 | モデル | プロバイダー | 推定コスト | 特徴 |
|-----------|--------|--------|-------------|-----------|------|
| **legend** | 5% | DALL-E 3 HD | OpenAI | ~$0.10 | 最高品質、希少価値最大化 |
| **super_rare** | 10% | FLUX.2 Pro | BFL | ~$0.04 | 高品質FLUX |
| **rare** | 25% | Nano Banana | Google | ~$0.03 | Google品質、異なるスタイル |
| **common** | 60% | FLUX.2 Klein | BFL | ~$0.005 | 最安・最速 |

### コスト試算

```
平均コスト = 0.05×$0.10 + 0.10×$0.04 + 0.25×$0.03 + 0.60×$0.005
           = $0.005 + $0.004 + $0.0075 + $0.003
           = ~$0.0195/カード
```

**従来（FLUX 1.1 Pro一律）**: ~$0.04/カード
**新方式**: ~$0.0195/カード
**削減率**: 約51%

## 13.3 利用可能なモデル

### OpenAI DALL-E

| モデル | 品質 | 速度 | コスト | 用途 |
|--------|------|------|--------|------|
| DALL-E 3 HD | ★★★★★ | 低速 | ~$0.10 | legend |
| DALL-E 3 Standard | ★★★★ | 中速 | ~$0.04 | 予備 |

**特徴:**
- 最高品質の画像生成
- テキスト描画に優れる
- プロンプト理解度が高い

### BFL FLUX

| モデル | 品質 | 速度 | コスト | 用途 |
|--------|------|------|--------|------|
| FLUX.2 Pro | ★★★★★ | 中速 | ~$0.04 | super_rare |
| FLUX.2 Dev | ★★★★ | 中速 | ~$0.015 | 予備 |
| FLUX.2 Klein | ★★★ | 超高速 | ~$0.01 | common |
| FLUX 1.1 Pro | ★★★★ | 中速 | ~$0.04 | フォールバック |
| FLUX.1 Schnell | ★★ | 高速 | ~$0.003 | 予備 |

**特徴:**
- 高品質なイラスト生成
- トレカスタイルに適合
- 安定した品質

### Google Gemini (Nano Banana)

| モデル | 品質 | 速度 | コスト | 用途 |
|--------|------|------|--------|------|
| Gemini 2.5 Flash Image | ★★★ | 高速 | ~$0.03 | rare |
| Imagen 3 | ★★★★★ | 中速 | ~$0.13 | 予備 |

**特徴:**
- 独自のスタイル（他と差別化）
- 高速生成
- コスト効率が良い

## 13.4 アーキテクチャ

### ファイル構成

```
src/lib/
├── image-generation/
│   ├── index.ts          # 統一エクスポート
│   ├── types.ts          # 型定義・モデル設定
│   └── router.ts         # レアリティ別ルーター
├── openai/
│   ├── client.ts         # OpenAIクライアント（既存）
│   └── dalle.ts          # DALL-E 3専用クライアント
├── gemini/
│   └── client.ts         # Gemini画像生成クライアント
└── flux/
    ├── client.ts         # FLUXクライアント（更新）
    └── image-generation.ts # カードイラスト生成（更新）
```

### 型定義

```typescript
// src/lib/image-generation/types.ts

export type ImageProvider = 'openai' | 'gemini' | 'flux';

export type ImageModel =
  | 'dall-e-3-hd'
  | 'dall-e-3-standard'
  | 'nano-banana'
  | 'gemini-imagen-3'
  | 'flux-pro-1.1'
  | 'flux-2-pro'
  | 'flux-2-dev'
  | 'flux-2-klein'
  | 'flux-schnell';

export interface ModelConfig {
  provider: ImageProvider;
  model: ImageModel;
  estimatedCost: number;
  description: string;
}

export interface ImageGenerationResult {
  imageBuffer: Buffer;
  model: ImageModel;
  provider: ImageProvider;
  estimatedCost: number;
}

export const RARITY_MODEL_CONFIG: Record<Rarity, ModelConfig> = {
  legend: {
    provider: 'openai',
    model: 'dall-e-3-hd',
    estimatedCost: 0.10,
    description: 'DALL-E 3 HD - 最高品質',
  },
  super_rare: {
    provider: 'flux',
    model: 'flux-2-pro',
    estimatedCost: 0.04,
    description: 'FLUX.2 Pro - 高品質FLUX',
  },
  rare: {
    provider: 'gemini',
    model: 'nano-banana',
    estimatedCost: 0.03,
    description: 'Nano Banana - Google品質',
  },
  common: {
    provider: 'flux',
    model: 'flux-2-klein',
    estimatedCost: 0.005,
    description: 'FLUX.2 Klein - 最安・最速',
  },
};
```

### ルーターロジック

```typescript
// src/lib/image-generation/router.ts

export async function generateCardImageByRarity(
  input: ImageGenerationInput,
  rarity: Rarity
): Promise<ImageGenerationResult> {
  const primaryConfig = RARITY_MODEL_CONFIG[rarity];

  try {
    const imageBuffer = await generateWithConfig(input, primaryConfig);
    return {
      imageBuffer,
      model: primaryConfig.model,
      provider: primaryConfig.provider,
      estimatedCost: primaryConfig.estimatedCost,
    };
  } catch (primaryError) {
    // フォールバック: FLUX 1.1 Pro
    const imageBuffer = await generateWithConfig(input, FALLBACK_MODEL_CONFIG);
    return {
      imageBuffer,
      model: FALLBACK_MODEL_CONFIG.model,
      provider: FALLBACK_MODEL_CONFIG.provider,
      estimatedCost: FALLBACK_MODEL_CONFIG.estimatedCost,
    };
  }
}
```

## 13.5 フォールバック機構

### フォールバック戦略

プライマリモデルが失敗した場合、自動的にFLUX 1.1 Proにフォールバック。

```
プライマリモデル → 失敗 → FLUX 1.1 Pro → 失敗 → エラー
```

### フォールバック設定

```typescript
export const FALLBACK_MODEL_CONFIG: ModelConfig = {
  provider: 'flux',
  model: 'flux-pro-1.1',
  estimatedCost: 0.04,
  description: 'FLUX 1.1 Pro - フォールバック用',
};
```

### 失敗原因と対応

| 失敗原因 | 対応 |
|---------|------|
| APIキー未設定 | フォールバック実行 |
| レート制限 | フォールバック実行 |
| コンテンツフィルター | エラー返却（再試行不可） |
| ネットワークエラー | フォールバック実行 |

## 13.6 各クライアント実装

### DALL-E 3 クライアント

```typescript
// src/lib/openai/dalle.ts

export async function generateWithDalle3HD(
  params: DalleGenerationParams
): Promise<Buffer> {
  const client = getOpenAIClient();

  const response = await client.images.generate({
    model: 'dall-e-3',
    prompt: params.prompt,
    size: '1024x1792', // 縦長カード向け
    quality: 'hd',
    n: 1,
  });

  const imageUrl = response.data[0].url;
  return downloadImageFromUrl(imageUrl);
}
```

### Gemini (Nano Banana) クライアント

```typescript
// src/lib/gemini/client.ts

export async function generateWithNanoBanana(
  params: GeminiImageGenerationParams
): Promise<Buffer> {
  const apiKey = getApiKey();

  const response = await fetch(
    `${GEMINI_API_BASE_URL}/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Generate an image: ${params.prompt}` }] }],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
          responseMimeType: 'image/png',
        },
      }),
    }
  );

  const data = await response.json();
  const imagePart = data.candidates[0].content.parts.find(p => p.inlineData);
  return Buffer.from(imagePart.inlineData.data, 'base64');
}
```

### FLUX クライアント（更新）

```typescript
// src/lib/flux/client.ts

export type FluxModel =
  | 'flux-pro-1.1'
  | 'flux-2-pro'
  | 'flux-2-dev'
  | 'flux-2-klein'
  | 'flux-schnell';

const MODEL_ENDPOINTS: Record<FluxModel, string> = {
  'flux-pro-1.1': 'flux-pro-1.1',
  'flux-2-pro': 'flux-2-pro',
  'flux-2-dev': 'flux-2-dev',
  'flux-2-klein': 'flux-2-klein',
  'flux-schnell': 'flux-schnell',
};

export async function requestImageGeneration(
  params: FluxGenerationParams
): Promise<FluxRequestResult> {
  const model = params.model || 'flux-pro-1.1';
  const endpoint = MODEL_ENDPOINTS[model];

  const response = await fetch(`${BFL_API_BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Key': apiKey,
    },
    body: JSON.stringify({
      prompt: params.prompt,
      width: params.width || 512,
      height: params.height || 768,
      // ...
    }),
  });

  const data = await response.json();
  return { taskId: data.id, pollingUrl: data.polling_url };
}
```

## 13.7 環境変数

### 必要な環境変数

```env
# OpenAI (既存)
OPENAI_API_KEY=""

# FLUX (既存)
BFL_API_KEY=""

# Google Gemini (新規)
GOOGLE_GEMINI_API_KEY=""
```

### APIキー取得先

| プロバイダー | 取得先 |
|-------------|--------|
| OpenAI | https://platform.openai.com/api-keys |
| BFL (FLUX) | https://bfl.ai/ |
| Google Gemini | https://aistudio.google.com/ |

## 13.8 使用方法

### カード生成での使用

```typescript
// src/lib/flux/image-generation.ts

export async function generateCardIllustration(
  input: ImageGenerationInput
): Promise<CardIllustrationResult> {
  const prompt = generateImagePrompt(input);

  // レアリティに基づいてモデルを選択し、画像を生成
  const result = await generateCardImageByRarity(
    { prompt, width: 512, height: 768 },
    input.rarity
  );

  return {
    imageBuffer: result.imageBuffer,
    prompt,
    model: result.model,
    provider: result.provider,
    estimatedCost: result.estimatedCost,
  };
}
```

### ログ出力

カード生成時に使用したモデルとコストがログに出力される:

```
Image generated with dall-e-3-hd (openai), estimated cost: $0.1000
Image generated with flux-2-klein (flux), estimated cost: $0.0050
```

## 13.9 テスト

### ユニットテスト

各クライアントのモック:

```typescript
jest.mock('@/lib/openai/dalle', () => ({
  generateWithDalle3HD: jest.fn().mockResolvedValue(Buffer.from('mock')),
}));

jest.mock('@/lib/gemini/client', () => ({
  generateWithNanoBanana: jest.fn().mockResolvedValue(Buffer.from('mock')),
}));
```

### E2Eテスト

1. 各レアリティでカード生成を実行
2. 正しいモデルが選択されることを確認
3. フォールバック動作を確認
4. 生成画像の品質を目視確認

## 13.10 将来の拡張

### 追加可能なモデル

| プロバイダー | モデル | コスト | 特徴 |
|-------------|--------|--------|------|
| Runware | 各種モデル | $0.0006-0.01 | 最安オプション |
| Stability AI | SDXL | ~$0.02 | 安定した品質 |
| Midjourney | API | ~$0.05 | アート志向 |

### 設定のカスタマイズ

将来的にユーザーが好みのモデルを選択できるオプション:

```typescript
// 将来の拡張例
interface UserPreferences {
  preferredProvider?: ImageProvider;
  allowFallback?: boolean;
  budgetLimit?: number;
}
```

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-24 | 初版作成 |
