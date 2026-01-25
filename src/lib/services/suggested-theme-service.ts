import { prisma } from '@/lib/prisma';

export interface SuggestedThemeResult {
  id: string;
  theme: string;
}

export interface SuggestedThemeWithCategory {
  id: string;
  theme: string;
  category: string | null;
}

export interface CreateThemeInput {
  theme: string;
  category?: string;
}

/**
 * ランダムにおすすめテーマを取得
 */
export async function getRandomSuggestedThemes(
  count: number = 10
): Promise<SuggestedThemeResult[]> {
  // PostgreSQLの ORDER BY RANDOM() を使用してランダムに取得
  const themes = await prisma.$queryRaw<SuggestedThemeResult[]>`
    SELECT id, theme
    FROM suggested_themes
    WHERE is_active = true
    ORDER BY RANDOM()
    LIMIT ${count}
  `;

  return themes;
}

/**
 * 全てのアクティブなテーマを取得（重複チェック用）
 */
export async function getAllSuggestedThemes(): Promise<SuggestedThemeWithCategory[]> {
  const themes = await prisma.$queryRaw<SuggestedThemeWithCategory[]>`
    SELECT id, theme, category
    FROM suggested_themes
    WHERE is_active = true
    ORDER BY category, theme
  `;

  return themes;
}

/**
 * テーマを一括登録
 */
export async function createSuggestedThemes(
  themes: CreateThemeInput[]
): Promise<number> {
  if (themes.length === 0) {
    return 0;
  }

  const result = await prisma.suggestedTheme.createMany({
    data: themes.map((t) => ({
      theme: t.theme,
      category: t.category || null,
    })),
    skipDuplicates: true,
  });

  return result.count;
}
