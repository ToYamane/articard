import { getOpenAIClient } from './client';
import { logger } from '@/lib/logger';

// ブロック対象カテゴリ
const BLOCKED_CATEGORIES = [
  'sexual',
  'sexual/minors',
  'hate',
  'hate/threatening',
  'harassment',
  'harassment/threatening',
  'self-harm',
  'self-harm/intent',
  'self-harm/instructions',
  'violence',
  'violence/graphic',
] as const;

// カスタムブロックキーワード（Moderation APIで検出できないもの）
const CUSTOM_BLOCKED_KEYWORDS = [
  // 違法行為
  '薬物',
  'ドラッグ',
  '麻薬',
  '覚醒剤',
  '大麻',
  // 危険行為
  '爆弾の作り方',
  '武器の製造',
  '毒薬',
  '殺人方法',
  // 不正行為
  'ハッキング方法',
  '不正アクセス',
];

export interface ModerationResult {
  flagged: boolean;
  categories: string[];
  customBlocked: boolean;
  blockedKeyword?: string;
}

/**
 * カスタムキーワードチェック
 */
function checkCustomKeywords(text: string): { blocked: boolean; keyword?: string } {
  const lowerText = text.toLowerCase();

  for (const keyword of CUSTOM_BLOCKED_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return { blocked: true, keyword };
    }
  }

  return { blocked: false };
}

/**
 * OpenAI Moderation APIを使用してコンテンツをチェック
 */
export async function moderateContent(text: string): Promise<ModerationResult> {
  // カスタムキーワードチェック
  const customCheck = checkCustomKeywords(text);
  if (customCheck.blocked) {
    return {
      flagged: true,
      categories: [],
      customBlocked: true,
      blockedKeyword: customCheck.keyword,
    };
  }

  // OpenAI Moderation API (with retry, fail-open)
  const client = getOpenAIClient();
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.moderations.create({
        model: 'omni-moderation-latest',
        input: text,
      });

      const result = response.results[0];

      if (!result.flagged) {
        return {
          flagged: false,
          categories: [],
          customBlocked: false,
        };
      }

      // フラグされたカテゴリを収集
      const flaggedCategories: string[] = [];
      const categories = result.categories as unknown as Record<string, boolean>;

      for (const category of BLOCKED_CATEGORIES) {
        const normalizedCategory = category.replace('/', '_');
        if (categories[normalizedCategory]) {
          flaggedCategories.push(category);
        }
      }

      return {
        flagged: flaggedCategories.length > 0,
        categories: flaggedCategories,
        customBlocked: false,
      };
    } catch (error) {
      logger.error('Moderation API error', {
        error,
        attempt: attempt + 1,
        maxRetries: MAX_RETRIES + 1,
      });

      if (attempt < MAX_RETRIES) {
        continue;
      }

      // All retries exhausted: fail-open（生成API自体のコンテンツポリシーがセーフティネット）
      return {
        flagged: false,
        categories: [],
        customBlocked: false,
      };
    }
  }

  // Unreachable, but TypeScript requires a return
  return {
    flagged: false,
    categories: [],
    customBlocked: false,
  };
}

/**
 * テーマが安全かどうかをチェック
 */
export async function isThemeSafe(theme: string): Promise<{ safe: boolean; reason?: string }> {
  const result = await moderateContent(theme);

  if (result.customBlocked) {
    return {
      safe: false,
      reason: 'このテーマでは記事を生成できません',
    };
  }

  if (result.flagged) {
    return {
      safe: false,
      reason: 'このテーマでは記事を生成できません',
    };
  }

  return { safe: true };
}
