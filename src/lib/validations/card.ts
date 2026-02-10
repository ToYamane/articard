import { z } from 'zod';

// カード生成リクエストスキーマ
export const createCardSchema = z.object({
  articleId: z.string().uuid('無効な記事IDです'),
  rarity: z.enum(['common', 'rare', 'super_rare', 'legend']).optional(),
});

// カード一覧取得クエリスキーマ
export const getCardsQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  rarity: z
    .enum(['common', 'rare', 'super_rare', 'legend'])
    .optional(),
});

// カードIDパラメータスキーマ
export const cardIdSchema = z.object({
  id: z.string().uuid('無効なカードIDです'),
});

// バッチ生成資格チェッククエリスキーマ
// articleIdはオプショナル（テーマ入力時点では記事が存在しないため）
export const batchEligibilityQuerySchema = z.object({
  articleId: z.string().uuid('無効な記事IDです').optional(),
});

// 型エクスポート
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type GetCardsQuery = z.infer<typeof getCardsQuerySchema>;
export type CardIdParam = z.infer<typeof cardIdSchema>;
export type BatchEligibilityQuery = z.infer<typeof batchEligibilityQuerySchema>;
