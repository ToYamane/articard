import { getOpenAIClient } from './client';
import type { ContextCategory, EmotionalTone } from '@/types/database';

const CONTEXT_ANALYSIS_PROMPT = `Analyze the context of the keyword "{keyword}" in the following Japanese article. Generate detailed image description in English for AI image generation, and a separate educational explanation in Japanese.

Article:
{content}

Output format (JSON):
{
  "context_category": "historical_event" | "mythology" | "scientific" | "cultural" | "biographical" | "general" | "metaphorical",
  "image_subject": "Main subject to illustrate - what should be drawn (15-30 words, English)",
  "image_scene": "Scene description - setting, atmosphere, background (15-25 words, English)",
  "image_details": "Visual details - colors, textures, lighting hints (15-25 words, English)",
  "uniqueness_score": 1-10,
  "emotional_tone": "epic" | "mysterious" | "scientific" | "warm" | "dramatic" | "neutral",
  "context_description_ja": "キーワードの意味・解説（日本語、記事の内容に基づいて、このキーワードが何を意味するのかを教育的に説明する。視覚的描写ではなく概念の解説。2-3文、120文字以内）"
}

Important:
- image_subject/scene/details must be in English and visually descriptive
- Focus on what can be visually represented, not abstract concepts
- Make descriptions vivid and specific for image generation
- context_description_ja is an EDUCATIONAL EXPLANATION of the keyword's meaning, NOT a visual description
- Write context_description_ja so readers can understand what the keyword means based on the article content`;

export interface ContextAnalysisResult {
  contextCategory: ContextCategory;

  // 画像生成用（英語、詳細）
  imageSubject: string;
  imageScene: string;
  imageDetails: string;

  // カード表示用（日本語）
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

    // 画像生成用（英語）
    const imageSubject = String(parsed.image_subject || 'a symbolic representation of the concept');
    const imageScene = String(parsed.image_scene || 'dramatic atmospheric setting');
    const imageDetails = String(parsed.image_details || 'vibrant colors, detailed textures');

    // カード表示用（日本語）
    const contextDescription = String(parsed.context_description_ja || '');

    return {
      contextCategory,
      imageSubject,
      imageScene,
      imageDetails,
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
