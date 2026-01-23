import { getOpenAIClient } from './client';

const SYSTEM_PROMPT = `あなたは教育コンテンツの専門ライターです。
以下のルールに従って学習記事を生成してください。

ルール:
1. 文字数は800文字程度（750-850文字）
2. テーマに応じた適切な難易度で執筆
3. 正確な情報のみを含め、不確かな情報は含めない
4. 学習意欲を引き出す興味深い内容にする
5. 構成は自由だが、読みやすさを重視
6. 見出しや箇条書きは使用しない（本文のみ）`;

const GENERATION_MODEL = 'gpt-4o-mini';

const COMPLETION_PARAMS = {
  temperature: 0.7,
  max_tokens: 2000,
  top_p: 1,
  frequency_penalty: 0.3,
  presence_penalty: 0.3,
} as const;

export interface ArticleGenerationResult {
  content: string;
  model: string;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
}

/**
 * テーマから学習記事を生成
 */
export async function generateArticle(theme: string): Promise<ArticleGenerationResult> {
  const client = getOpenAIClient();

  const userPrompt = `テーマ: ${theme}
上記のテーマについて、学習記事を生成してください。`;

  const response = await client.chat.completions.create({
    model: GENERATION_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    ...COMPLETION_PARAMS,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error('記事の生成に失敗しました');
  }

  return {
    content: content.trim(),
    model: GENERATION_MODEL,
    tokenUsage: {
      prompt: response.usage?.prompt_tokens ?? 0,
      completion: response.usage?.completion_tokens ?? 0,
      total: response.usage?.total_tokens ?? 0,
    },
  };
}

export { GENERATION_MODEL };
