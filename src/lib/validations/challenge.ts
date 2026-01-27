import { z } from 'zod';

// セッション作成スキーマ
export const createSessionSchema = z.object({
  scenarioId: z.string().min(1, 'シナリオIDは必須です'),
});

// セッションIDパラメータスキーマ
export const sessionIdSchema = z.object({
  id: z.string().uuid('無効なセッションIDです'),
});

// デッキ設定スキーマ
// Note: 実際のデッキサイズはシナリオごとに異なるため、サービス層で検証
export const setDeckSchema = z.object({
  cardIds: z
    .array(z.string().uuid('無効なカードIDです'))
    .min(1, '少なくとも1枚のカードが必要です')
    .max(10, '最大10枚までです'),
});

// カード提出スキーマ
export const submitCardsSchema = z.object({
  cardIds: z
    .array(z.string().uuid('無効なカードIDです'))
    .min(1, '少なくとも1枚のカードが必要です')
    .max(2, '最大2枚までです'),
});

// セッション一覧取得クエリスキーマ
export const getSessionsQuerySchema = z.object({
  status: z
    .enum(['in_progress', 'completed', 'abandoned'])
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// 型エクスポート
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type SessionIdParam = z.infer<typeof sessionIdSchema>;
export type SetDeckInput = z.infer<typeof setDeckSchema>;
export type SubmitCardsInput = z.infer<typeof submitCardsSchema>;
export type GetSessionsQuery = z.infer<typeof getSessionsQuerySchema>;
