'use client';

import { useCallback, useState } from 'react';
import { useInfiniteScroll } from './use-infinite-scroll';
import { apiUrl } from '@/lib/api/client';
import { getIdToken } from '@/lib/firebase/client';
import type { Article } from '@prisma/client';

type ArticleWithCount = Article & { _count?: { cards: number } };

export interface ArticleFilterState {
  sortBy: 'createdAt' | 'cardCount';
  sortOrder: 'asc' | 'desc';
  onlyFavorites: boolean;
}

const DEFAULT_FILTER: ArticleFilterState = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
  onlyFavorites: false,
};

export function useArticles() {
  const [filter, setFilter] = useState<ArticleFilterState>(DEFAULT_FILTER);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchArticles = useCallback(
    async (cursor?: string) => {
      const token = await getIdToken();
      if (!token) {
        throw new Error('認証トークンの取得に失敗しました');
      }

      const params = new URLSearchParams();
      if (cursor) params.append('cursor', cursor);
      if (searchQuery) params.append('search', searchQuery);
      params.append('sortBy', filter.sortBy);
      params.append('sortOrder', filter.sortOrder);
      if (filter.onlyFavorites) {
        params.append('onlyFavorites', 'true');
      }
      params.append('limit', '20');

      const response = await fetch(apiUrl(`/api/articles?${params.toString()}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || '記事の取得に失敗しました');
      }

      return {
        items: data.data.articles as ArticleWithCount[],
        nextCursor: data.data.nextCursor,
        hasMore: data.data.hasMore,
      };
    },
    [filter, searchQuery]
  );

  const {
    items: articles,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    refresh,
    observerRef,
  } = useInfiniteScroll({
    fetchFn: fetchArticles,
  });

  // フィルター変更時にリフレッシュ
  const handleFilterChange = useCallback(
    (newFilter: ArticleFilterState) => {
      setFilter(newFilter);
      // フィルター変更後は少し遅延してリフレッシュ（状態更新を待つ）
      setTimeout(() => {
        refresh();
      }, 0);
    },
    [refresh]
  );

  // 検索クエリ変更
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // 検索実行
  const executeSearch = useCallback(() => {
    refresh();
  }, [refresh]);

  // フィルターがアクティブかどうか
  const hasActiveFilter =
    searchQuery.length > 0 ||
    filter.sortBy !== 'createdAt' ||
    filter.sortOrder !== 'desc' ||
    filter.onlyFavorites;

  // フィルタークリア
  const clearFilter = useCallback(() => {
    setFilter(DEFAULT_FILTER);
    setSearchQuery('');
    setTimeout(() => {
      refresh();
    }, 0);
  }, [refresh]);

  return {
    articles,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    observerRef,
    filter,
    setFilter: handleFilterChange,
    searchQuery,
    setSearchQuery: handleSearchChange,
    executeSearch,
    hasActiveFilter,
    clearFilter,
  };
}
