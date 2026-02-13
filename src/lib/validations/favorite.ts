import { z } from 'zod';

export const toggleFavoriteCardSchema = z.object({
  cardId: z.string().uuid('無効なカードIDです'),
});

export const toggleFavoriteArticleSchema = z.object({
  articleId: z.string().uuid('無効な記事IDです'),
});

export type ToggleFavoriteCardInput = z.infer<typeof toggleFavoriteCardSchema>;
export type ToggleFavoriteArticleInput = z.infer<typeof toggleFavoriteArticleSchema>;
