'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArticleCard } from '@/components/article';
import { ArticleFilter } from '@/components/article/article-filter';
import { ArticleEmpty } from '@/components/article/article-empty';
import { CollectionSearch } from '@/components/collection';
import { Button, LoadingSpinner, ArticleListSkeleton } from '@/components/ui';
import { useArticles } from '@/hooks/use-articles';
import { useFavorites } from '@/hooks/use-favorites';
import type { ArticleFilterState } from '@/hooks/use-articles';

export default function ArticlesPage() {
  const { isFavorite, toggleFavorite } = useFavorites('articles');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const {
    articles,
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
  } = useArticles();

  // フィルター適用
  const handleFilterApply = useCallback(
    (newFilter: ArticleFilterState) => {
      setFilter(newFilter);
    },
    [setFilter]
  );

  // 検索実行
  const handleSearch = useCallback(() => {
    if (isSearching) return;
    setIsSearching(true);
    executeSearch();
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">記事履歴</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          これまでに生成した記事の一覧です
        </p>
      </div>

      {/* 検索・フィルターバー */}
      <div className="mb-6 flex gap-3">
        <CollectionSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="テーマを検索..."
          className="flex-1"
        />
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
        <ArticleListSkeleton count={5} />
      ) : articles.length === 0 ? (
        <ArticleEmpty hasFilter={hasActiveFilter} onClearFilter={clearFilter} />
      ) : (
        <>
          {/* 記事一覧 */}
          <div className="space-y-4">
            {articles.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <ArticleCard
                  article={article}
                  isFavorite={isFavorite(article.id)}
                  onFavoriteToggle={() => toggleFavorite(article.id)}
                />
              </motion.div>
            ))}
          </div>

          {/* 無限スクロールトリガー */}
          {hasMore && (
            <div ref={observerRef} className="flex items-center justify-center py-8">
              {isLoadingMore && <LoadingSpinner size="md" />}
            </div>
          )}

          {/* 全件読み込み完了 */}
          {!hasMore && articles.length > 0 && (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              全ての記事を表示しました
            </p>
          )}
        </>
      )}

      {/* フィルターモーダル */}
      <ArticleFilter
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        currentFilter={filter}
        onApply={handleFilterApply}
      />
    </motion.div>
  );
}
