import { getOpenAIClient } from './client';
import type { ContentType } from '@/types/article';
import { CONTENT_TYPE_INFO } from '@/types/article';

// 各コンテンツタイプ用のシステムプロンプト
const SYSTEM_PROMPTS: Record<ContentType, string> = {
  essay: `あなたは教育コンテンツの専門ライターです。
以下のルールに従って学習記事を生成してください。

ルール:
1. 文字数は800文字程度（750-850文字）
2. テーマに応じた適切な難易度で執筆
3. 正確な情報のみを含め、不確かな情報は含めない
4. 学習意欲を引き出す興味深い内容にする
5. 構成は自由だが、読みやすさを重視
6. 見出しや箇条書きは使用しない（本文のみ）`,

  story: `あなたは教育コンテンツの専門ライターです。
テーマを学べる短編物語を生成してください。

ルール:
1. 文字数は800文字程度（750-850文字）
2. 登場人物を設定し、ストーリーの中で自然に知識が身につく内容にする
3. 物語として面白く、読者を引き込む展開にする
4. 正確な情報を物語に織り込む
5. 見出しや箇条書きは使用しない（本文のみ）`,

  dialogue: `あなたは教育コンテンツの専門ライターです。
先生と生徒の会話形式で学習記事を生成してください。

ルール:
1. 文字数は800文字程度（750-850文字）
2. 生徒の素朴な疑問に先生がわかりやすく答える形式
3. 会話を通じて段階的に理解が深まる構成にする
4. 正確な情報を対話に織り込む
5. 先生と生徒の発言を「先生：」「生徒：」の形式で記載`,

  poem: `あなたは詩人です。
テーマについての詩を生成してください。

ルール:
1. 文字数は300文字程度（250-350文字）
2. リズムや韻を意識し、美しい言葉で知識を表現する
3. テーマの本質や魅力を詩的に伝える
4. 読者の心に響く表現を心がける
5. 見出しは使用しない`,

  explanation: `あなたは小学校の先生です。
小学生にもわかるように、やさしい言葉で解説してください。

ルール:
1. 文字数は600文字程度（550-650文字）
2. 難しい言葉は使わず、平易な表現を使う
3. 難しい漢字にはふりがなをつける（例：宇宙（うちゅう））
4. 例え話を交えて、身近なものと結びつけて説明する
5. 読者の好奇心を引き出す内容にする
6. 見出しや箇条書きは使用しない（本文のみ）`,
};

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
export async function generateArticle(
  theme: string,
  contentType: ContentType = 'essay'
): Promise<ArticleGenerationResult> {
  const client = getOpenAIClient();
  const systemPrompt = SYSTEM_PROMPTS[contentType];
  const contentTypeInfo = CONTENT_TYPE_INFO[contentType];

  const userPrompt = `テーマ: ${theme}
上記のテーマについて、${contentTypeInfo.label}で学習記事を生成してください。`;

  const response = await client.chat.completions.create({
    model: GENERATION_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
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
