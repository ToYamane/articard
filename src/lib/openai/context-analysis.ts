import { getOpenAIClient } from './client';
import type { ContextCategory, EmotionalTone } from '@/types/database';

const CONTEXT_ANALYSIS_PROMPT = `以下の記事において、キーワード「{keyword}」がどのような文脈で使われているか分析してください。

記事:
{content}

出力形式（JSON）:
{
  "context_category": "historical_event" | "mythology" | "scientific" | "cultural" | "biographical" | "general" | "metaphorical",
  "context_description": "このキーワードの文脈を1文で説明",
  "uniqueness_score": 1-10,
  "emotional_tone": "epic" | "mysterious" | "scientific" | "warm" | "dramatic" | "neutral"
}`;

export interface ContextAnalysisResult {
  contextCategory: ContextCategory;
  contextDescription: string;
  uniquenessScore: number;
  emotionalTone: EmotionalTone;
}

/**
 * キーワードの文脈を分析
 */
export async function analyzeContext(
  keyword: string,
  articleContent: string
): Promise<ContextAnalysisResult> {
  const client = getOpenAIClient();

  const prompt = CONTEXT_ANALYSIS_PROMPT.replace('{keyword}', keyword).replace(
    '{content}',
    articleContent
  );

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error('文脈分析に失敗しました');
  }

  try {
    const parsed = JSON.parse(content);

    // デフォルト値を設定
    const contextCategory = validateContextCategory(parsed.context_category);
    const emotionalTone = validateEmotionalTone(parsed.emotional_tone);
    const uniquenessScore = Math.min(10, Math.max(1, Number(parsed.uniqueness_score) || 5));
    const contextDescription = String(parsed.context_description || '');

    return {
      contextCategory,
      contextDescription,
      uniquenessScore,
      emotionalTone,
    };
  } catch (error) {
    console.error('Context analysis parsing error:', error);
    throw new Error('文脈分析に失敗しました');
  }
}

/**
 * 文脈カテゴリのバリデーション
 */
function validateContextCategory(value: unknown): ContextCategory {
  const validCategories: ContextCategory[] = [
    'historical_event',
    'mythology',
    'scientific',
    'cultural',
    'biographical',
    'general',
    'metaphorical',
  ];

  if (typeof value === 'string' && validCategories.includes(value as ContextCategory)) {
    return value as ContextCategory;
  }

  return 'general';
}

/**
 * 感情トーンのバリデーション
 */
function validateEmotionalTone(value: unknown): EmotionalTone {
  const validTones: EmotionalTone[] = [
    'epic',
    'mysterious',
    'scientific',
    'warm',
    'dramatic',
    'neutral',
  ];

  if (typeof value === 'string' && validTones.includes(value as EmotionalTone)) {
    return value as EmotionalTone;
  }

  return 'neutral';
}
