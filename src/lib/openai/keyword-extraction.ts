import { getOpenAIClient } from './client';

const KEYWORD_EXTRACTION_PROMPT = `以下の学習記事から、カードのテーマとして面白いキーワードを10個抽出してください。

ルール:
1. 固有名詞、専門用語、象徴的なモノを優先
2. 一般的すぎる単語（「こと」「もの」等）は除外
3. 2-10文字程度のキーワード
4. JSON配列形式で出力

記事:
{content}

出力形式:
["キーワード1", "キーワード2", ...]`;

/**
 * 記事からキーワードを抽出
 */
export async function extractKeywords(articleContent: string): Promise<string[]> {
  const client = getOpenAIClient();

  const prompt = KEYWORD_EXTRACTION_PROMPT.replace('{content}', articleContent);

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error('キーワードの抽出に失敗しました');
  }

  try {
    // JSONパース
    const parsed = JSON.parse(content);

    // 配列を取得（response_format: json_objectの場合、オブジェクトとして返される可能性がある）
    const keywords = Array.isArray(parsed)
      ? parsed
      : parsed.keywords || Object.values(parsed).flat();

    if (!Array.isArray(keywords) || keywords.length === 0) {
      throw new Error('キーワードの形式が不正です');
    }

    // 文字列のみをフィルター
    return keywords.filter((k): k is string => typeof k === 'string' && k.length > 0);
  } catch (error) {
    console.error('Keyword parsing error:', error);
    throw new Error('キーワードの抽出に失敗しました');
  }
}

/**
 * 使用可能なキーワードからランダムに1つ選択
 */
export function selectRandomKeyword(
  extractedKeywords: string[],
  usedKeywords: string[]
): string | null {
  const availableKeywords = extractedKeywords.filter(
    (k) => !usedKeywords.includes(k)
  );

  if (availableKeywords.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * availableKeywords.length);
  return availableKeywords[index];
}
