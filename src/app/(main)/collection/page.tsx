'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CardGrid } from '@/components/card';
import {
  CollectionFilter,
  CollectionSearch,
  CollectionEmpty,
  type FilterState,
} from '@/components/collection';
import { Button, LoadingSpinner, CardGridSkeleton } from '@/components/ui';
import { useCollection } from '@/hooks/use-collection';
import { useFavorites } from '@/hooks/use-favorites';
import type { Card } from '@prisma/client';

export default function CollectionPage() {
  const router = useRouter();

  const { favoriteIds, toggleFavorite } = useFavorites('cards');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const {
    cards,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    observerRef,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    executeSearch,
    hasActiveFilter,
    clearFilter,
  } = useCollection();

  // カードクリック時
  const handleCardClick = useCallback(
    (card: Card) => {
      router.push(`/cards/${card.id}`);
    },
    [router]
  );

  // フィルター適用
  const handleFilterApply = useCallback(
    (newFilter: FilterState) => {
      setFilter(newFilter);
    },
    [setFilter]
  );

  // 検索実行（Enterキーまたはボタンクリック時）
  const handleSearch = useCallback(() => {
    if (isSearching) return; // 実行中なら早期リターン
    setIsSearching(true);
    executeSearch();
    // isLoading が false になったら isSearching を解除
    // executeSearch は非同期ではないため、次のレンダリングで isLoading を監視
    setTimeout(() => setIsSearching(false), 500);
  }, [executeSearch, isSearching]);

  // エラー表示
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="mb-4 text-red-500">{error.message}</p>
        <Button onClick={() => window.location.reload()}>再読み込み</Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="py-6"
    >
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">コレクション</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          あなたが生成したカードを一覧で確認できます
        </p>
      </div>

      {/* 検索・フィルターバー */}
      <div className="mb-6 flex gap-3">
        <CollectionSearch value={searchQuery} onChange={setSearchQuery} className="flex-1" />
        <Button
          onClick={handleSearch}
          variant="secondary"
          className="shrink-0"
          disabled={isSearching}
          isLoading={isSearching}
        >
          検索
        </Button>
        <Button onClick={() => setIsFilterOpen(true)} variant="secondary" className="shrink-0">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
        </Button>
      </div>

      {/* アクティブフィルター表示 */}
      {hasActiveFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">フィルター適用中</span>
          <button
            onClick={clearFilter}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            クリア
          </button>
        </div>
      )}

      {/* ローディング */}
      {isLoading ? (
        <CardGridSkeleton count={10} />
      ) : cards.length === 0 ? (
        <CollectionEmpty hasFilter={hasActiveFilter} onClearFilter={clearFilter} />
      ) : (
        <>
          {/* カードグリッド */}
          <CardGrid
            cards={cards}
            onCardClick={handleCardClick}
            favoriteIds={favoriteIds}
            onFavoriteToggle={toggleFavorite}
          />

          {/* 無限スクロールトリガー */}
          {hasMore && (
            <div ref={observerRef} className="flex items-center justify-center py-8">
              {isLoadingMore && <LoadingSpinner size="md" />}
            </div>
          )}

          {/* 全件読み込み完了 */}
          {!hasMore && cards.length > 0 && (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              全てのカードを表示しました
            </p>
          )}
        </>
      )}

      {/* フィルターモーダル */}
      <CollectionFilter
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        currentFilter={filter}
        onApply={handleFilterApply}
      />
    </motion.div>
  );
}
