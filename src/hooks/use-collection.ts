'use client';

import { useCallback, useState } from 'react';
import { useInfiniteScroll } from './use-infinite-scroll';
import { getIdToken } from '@/lib/firebase/client';
import type { Card } from '@prisma/client';
import type { FilterState } from '@/components/collection';

interface UseCollectionOptions {
  initialFilter?: FilterState;
}

const DEFAULT_FILTER: FilterState = {
  rarity: [],
  sortBy: 'createdAt',
  sortOrder: 'desc',
  onlyFavorites: false,
};

export function useCollection(options: UseCollectionOptions = {}) {
  const [filter, setFilter] = useState<FilterState>(options.initialFilter || DEFAULT_FILTER);
  const [searchQuery, setSearchQuery] = useState('');

  // APIからカードを取得する関数
  const fetchCards = useCallback(
    async (cursor?: string) => {
      const token = await getIdToken();
      if (!token) {
        throw new Error('認証トークンの取得に失敗しました');
      }

      const params = new URLSearchParams();
      if (cursor) params.append('cursor', cursor);
      if (filter.rarity.length > 0) {
        params.append('rarity', filter.rarity.join(','));
      }
      if (searchQuery) {
        params.append('keyword', searchQuery);
      }
      params.append('sortBy', filter.sortBy);
      params.append('sortOrder', filter.sortOrder);
      if (filter.onlyFavorites) {
        params.append('onlyFavorites', 'true');
      }
      params.append('limit', '20');

      const response = await fetch(`/api/cards?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'カードの取得に失敗しました');
      }

      return {
        items: data.data.cards as Card[],
        nextCursor: data.data.nextCursor,
        hasMore: data.data.hasMore,
      };
    },
    [filter, searchQuery]
  );

  const {
    items: cards,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    observerRef,
  } = useInfiniteScroll({
    fetchFn: fetchCards,
  });

  // フィルター変更時にリフレッシュ
  const handleFilterChange = useCallback(
    (newFilter: FilterState) => {
      setFilter(newFilter);
      // フィルター変更後は少し遅延してリフレッシュ（状態更新を待つ）
      setTimeout(() => {
        refresh();
      }, 0);
    },
    [refresh]
  );

  // 検索クエリ変更時にリフレッシュ
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // 検索実行
  const executeSearch = useCallback(() => {
    refresh();
  }, [refresh]);

  // フィルターがアクティブかどうか
  const hasActiveFilter =
    filter.rarity.length > 0 || searchQuery.length > 0 || filter.onlyFavorites;

  // フィルタークリア
  const clearFilter = useCallback(() => {
    setFilter(DEFAULT_FILTER);
    setSearchQuery('');
    setTimeout(() => {
      refresh();
    }, 0);
  }, [refresh]);

  return {
    cards,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
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
