import { z } from 'zod';

// おすすめテーマ取得クエリスキーマ
export const getSuggestedThemesQuerySchema = z.object({
  count: z.coerce.number().int().min(1).max(20).default(10),
});

// 型エクスポート
export type GetSuggestedThemesQuery = z.infer<typeof getSuggestedThemesQuerySchema>;
