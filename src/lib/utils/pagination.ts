/**
 * カーソルベースページネーション共通ユーティリティ
 */

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * デフォルトのページサイズ
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * カーソルベースページネーションの結果を処理
 *
 * @param items - 取得したアイテム配列（limit + 1 件取得した状態）
 * @param limit - 1ページあたりの件数
 * @returns ページネーション結果
 */
export function processPaginationResult<T extends { id: string }>(
  items: T[],
  limit: number
): PaginatedResult<T> {
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, -1) : items;
  const nextCursor = hasMore ? resultItems[resultItems.length - 1]?.id ?? null : null;

  return {
    items: resultItems,
    nextCursor,
    hasMore,
  };
}

/**
 * Prismaクエリ用のカーソルオプションを生成
 *
 * @param cursor - カーソルID
 * @returns Prisma findMany用のオプション
 */
export function buildCursorOptions(cursor?: string): { cursor?: { id: string }; skip?: number } {
  if (!cursor) return {};
  return {
    cursor: { id: cursor },
    skip: 1,
  };
}
