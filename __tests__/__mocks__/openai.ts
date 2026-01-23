// OpenAI API モック

export const mockOpenAIClient = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
  moderations: {
    create: jest.fn(),
  },
};

// 記事生成のモックレスポンス
export const mockArticleResponse = {
  choices: [
    {
      message: {
        content: `# 人工知能の歴史と未来

人工知能（AI）は、1950年代にアラン・チューリングが「機械は考えることができるか」という問いを投げかけたことから始まりました。

## AIの発展

1956年のダートマス会議で「人工知能」という用語が生まれ、研究分野として確立されました。初期のAIは、チェスや定理証明などの問題に取り組みましたが、1970年代には「AIの冬」と呼ばれる停滞期を経験しました。

## 現代のAI

2010年代以降、ディープラーニングの発展により、AIは画像認識、自然言語処理、ゲームプレイなど多くの分野で人間を超える性能を達成しています。

## 未来への展望

汎用人工知能（AGI）の実現に向けた研究が進む中、AIの倫理的な使用や社会への影響についての議論も活発化しています。`,
      },
    },
  ],
  model: 'gpt-4',
  usage: {
    prompt_tokens: 100,
    completion_tokens: 500,
    total_tokens: 600,
  },
};

// キーワード抽出のモックレスポンス
export const mockKeywordExtractionResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          keywords: [
            { keyword: 'アラン・チューリング', score: 9, frequency: 2 },
            { keyword: 'ダートマス会議', score: 8, frequency: 1 },
            { keyword: 'ディープラーニング', score: 7, frequency: 3 },
            { keyword: 'AIの冬', score: 8, frequency: 1 },
            { keyword: '汎用人工知能', score: 9, frequency: 1 },
          ],
        }),
      },
    },
  ],
};

// 文脈分析のモックレスポンス
export const mockContextAnalysisResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          contextCategory: 'historical_event',
          contextDescription: 'コンピュータ科学の歴史における重要な転換点を示す会議',
          uniquenessScore: 8,
          emotionalTone: 'informative',
        }),
      },
    },
  ],
};

// フレーバーテキスト生成のモックレスポンス
export const mockFlavorTextResponse = {
  choices: [
    {
      message: {
        content: '知性の火花が最初に灯された場所、それは歴史の転換点となった。',
      },
    },
  ],
};

// モデレーションのモックレスポンス（安全）
export const mockModerationSafeResponse = {
  results: [
    {
      flagged: false,
      categories: {
        hate: false,
        'hate/threatening': false,
        'self-harm': false,
        sexual: false,
        'sexual/minors': false,
        violence: false,
        'violence/graphic': false,
      },
    },
  ],
};

// モデレーションのモックレスポンス（危険）
export const mockModerationUnsafeResponse = {
  results: [
    {
      flagged: true,
      categories: {
        hate: true,
        'hate/threatening': false,
        'self-harm': false,
        sexual: false,
        'sexual/minors': false,
        violence: false,
        'violence/graphic': false,
      },
    },
  ],
};

// モック設定ヘルパー
export function setupOpenAIMock() {
  return mockOpenAIClient;
}

export function mockArticleGeneration() {
  mockOpenAIClient.chat.completions.create.mockResolvedValue(mockArticleResponse);
}

export function mockKeywordExtraction() {
  mockOpenAIClient.chat.completions.create.mockResolvedValue(mockKeywordExtractionResponse);
}

export function mockContextAnalysis() {
  mockOpenAIClient.chat.completions.create.mockResolvedValue(mockContextAnalysisResponse);
}

export function mockFlavorTextGeneration() {
  mockOpenAIClient.chat.completions.create.mockResolvedValue(mockFlavorTextResponse);
}

export function mockModerationSafe() {
  mockOpenAIClient.moderations.create.mockResolvedValue(mockModerationSafeResponse);
}

export function mockModerationUnsafe() {
  mockOpenAIClient.moderations.create.mockResolvedValue(mockModerationUnsafeResponse);
}

export function resetOpenAIMock() {
  mockOpenAIClient.chat.completions.create.mockReset();
  mockOpenAIClient.moderations.create.mockReset();
}
