'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseInfiniteScrollOptions<T> {
  fetchFn: (cursor?: string) => Promise<{
    items: T[];
    nextCursor: string | null;
    hasMore: boolean;
  }>;
  initialItems?: T[];
  initialCursor?: string | null;
}

interface UseInfiniteScrollResult<T> {
  items: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  observerRef: (node: HTMLElement | null) => void;
}

export function useInfiniteScroll<T>({
  fetchFn,
  initialItems = [],
  initialCursor = null,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollResult<T> {
  const [items, setItems] = useState<T[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);

  // 初回データ取得
  const loadInitial = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setItems(result.items);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('データの取得に失敗しました'));
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [fetchFn]);

  // 追加データ取得
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore || !cursor) return;
    loadingRef.current = true;
    setIsLoadingMore(true);

    try {
      const result = await fetchFn(cursor);
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('データの取得に失敗しました'));
    } finally {
      setIsLoadingMore(false);
      loadingRef.current = false;
    }
  }, [fetchFn, cursor, hasMore]);

  // リフレッシュ
  const refresh = useCallback(async () => {
    setCursor(null);
    setHasMore(true);
    setItems([]);
    await loadInitial();
  }, [loadInitial]);

  // Intersection Observer のセットアップ
  const setObserverRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (node) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
              loadMore();
            }
          },
          {
            rootMargin: '100px',
            threshold: 0,
          }
        );
        observerRef.current.observe(node);
      }
    },
    [loadMore, hasMore]
  );

  // 初回ロード
  useEffect(() => {
    if (initialItems.length === 0) {
      loadInitial();
    }
  }, [loadInitial, initialItems.length]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    observerRef: setObserverRef,
  };
}
