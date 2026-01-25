import { getOpenAIClient } from './client';

export interface GeneratedTheme {
  theme: string;
  category: string;
}

export interface ThemeGenerationResult {
  themes: GeneratedTheme[];
  model: string;
}

/**
 * AIでおすすめテーマを生成
 */
export async function generateThemes(
  existingThemes: string[],
  count: number = 10,
  category?: string
): Promise<ThemeGenerationResult> {
  const client = getOpenAIClient();

  const categoryInstruction = category
    ? `カテゴリ「${category}」に限定してください。`
    : '様々なカテゴリ（科学、歴史、生物、テクノロジー、地理、文化、人体、宇宙、数学など）からバランスよく選んでください。';

  const prompt = `あなたは教育コンテンツのテーマ提案者です。
以下の条件で新しい学習テーマを${count}件生成してください。

【条件】
- 2〜30文字の日本語テーマ
- ${categoryInstruction}
- 知的好奇心を刺激する内容
- 小学生〜大人まで興味を持てるもの
- 既存テーマと重複しないこと

【既存テーマ一覧（これらは除外）】
${existingThemes.slice(0, 200).join('、')}

【出力形式】
以下のJSON形式で出力してください:
{
  "themes": [
    {"theme": "テーマ名", "category": "カテゴリ名"},
    ...
  ]
}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error('テーマの生成に失敗しました');
  }

  try {
    const parsed = JSON.parse(content);
    const themes = parsed.themes;

    if (!Array.isArray(themes) || themes.length === 0) {
      throw new Error('テーマの形式が不正です');
    }

    // バリデーション
    const validThemes = themes
      .filter(
        (t: unknown): t is GeneratedTheme =>
          typeof t === 'object' &&
          t !== null &&
          'theme' in t &&
          'category' in t &&
          typeof (t as GeneratedTheme).theme === 'string' &&
          typeof (t as GeneratedTheme).category === 'string' &&
          (t as GeneratedTheme).theme.length >= 2 &&
          (t as GeneratedTheme).theme.length <= 30
      )
      .filter((t) => !existingThemes.includes(t.theme));

    return {
      themes: validThemes,
      model: response.model,
    };
  } catch (error) {
    console.error('Theme generation parsing error:', error);
    throw new Error('テーマの生成に失敗しました');
  }
}
