import { z } from 'zod';

// 特殊文字パターン（絵文字は許可）
const SPECIAL_CHARS_PATTERN = /[<>{}[\]\\|`~^]/;

// テーマバリデーション
export const themeSchema = z
  .string()
  .min(2, 'テーマは2文字以上で入力してください')
  .max(30, 'テーマは30文字以内で入力してください')
  .refine((val) => !SPECIAL_CHARS_PATTERN.test(val), {
    message: '使用できない文字が含まれています',
  });

// 記事生成リクエストスキーマ
export const createArticleSchema = z.object({
  theme: themeSchema,
});

// 記事一覧取得クエリスキーマ
export const getArticlesQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// 記事IDパラメータスキーマ
export const articleIdSchema = z.object({
  id: z.string().uuid('無効な記事IDです'),
});

// 型エクスポート
export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type GetArticlesQuery = z.infer<typeof getArticlesQuerySchema>;
export type ArticleIdParam = z.infer<typeof articleIdSchema>;
