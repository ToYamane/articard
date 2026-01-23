import { getOpenAIClient } from './client';
import type { Rarity, EmotionalTone } from '@/types/database';

const FLAVOR_TEXT_PROMPT = `以下の条件でトレーディングカードのフレーバーテキストを生成してください。

キーワード: {keyword}
文脈: {contextDescription}
レア度: {rarity}
トーン: {emotionalTone}

ルール:
1. 100文字以内
2. 詩的・印象的な表現
3. レア度が高いほどドラマチックに
4. キーワードを直接説明せず、雰囲気を伝える

出力: テキストのみ（引用符なし）`;

// レア度の日本語表示
const RARITY_JAPANESE: Record<Rarity, string> = {
  common: 'コモン',
  uncommon: 'アンコモン',
  rare: 'レア',
  super_rare: 'スーパーレア',
  legend: 'レジェンド',
};

// トーンの日本語表示
const TONE_JAPANESE: Record<EmotionalTone, string> = {
  epic: '壮大',
  mysterious: '神秘的',
  scientific: '科学的',
  warm: '温かみのある',
  dramatic: 'ドラマチック',
  neutral: '中立的',
};

export interface FlavorTextInput {
  keyword: string;
  contextDescription: string;
  rarity: Rarity;
  emotionalTone: EmotionalTone;
}

/**
 * フレーバーテキストを生成
 */
export async function generateFlavorText(input: FlavorTextInput): Promise<string> {
  const client = getOpenAIClient();

  const prompt = FLAVOR_TEXT_PROMPT.replace('{keyword}', input.keyword)
    .replace('{contextDescription}', input.contextDescription)
    .replace('{rarity}', RARITY_JAPANESE[input.rarity])
    .replace('{emotionalTone}', TONE_JAPANESE[input.emotionalTone]);

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 200,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error('フレーバーテキストの生成に失敗しました');
  }

  // 100文字に切り詰め
  const cleanedText = content.trim().replace(/^["「]|["」]$/g, '');
  return cleanedText.slice(0, 100);
}
