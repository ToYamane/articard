'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CardGrid } from '@/components/card';
import {
  CollectionFilter,
  CollectionSearch,
  CollectionStats,
  CollectionEmpty,
  type FilterState,
  type CollectionStatsData,
} from '@/components/collection';
import { Button, LoadingSpinner } from '@/components/ui';
import { useCollection } from '@/hooks/use-collection';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import { getIdToken } from '@/lib/firebase/client';
import type { Card } from '@prisma/client';

export default function CollectionPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addToast } = useToast();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [stats, setStats] = useState<CollectionStatsData | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

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

  // 統計情報を取得
  useEffect(() => {
    async function fetchStats() {
      if (!user) return;

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('認証トークンの取得に失敗しました');
        }

        const response = await fetch('/api/stats', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || '統計情報の取得に失敗しました');
        }

        setStats(data.data);
      } catch (err) {
        console.error('Fetch stats error:', err);
        addToast(
          err instanceof Error ? err.message : '統計情報の取得に失敗しました',
          'error'
        );
      } finally {
        setIsLoadingStats(false);
      }
    }

    fetchStats();
  }, [user, addToast]);

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
    executeSearch();
  }, [executeSearch]);

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          コレクション
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          あなたが生成したカードを一覧で確認できます
        </p>
      </div>

      {/* 統計情報 */}
      {!isLoadingStats && stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <CollectionStats stats={stats} className="mb-6" />
        </motion.div>
      )}

      {/* 検索・フィルターバー */}
      <div className="mb-6 flex gap-3">
        <CollectionSearch
          value={searchQuery}
          onChange={setSearchQuery}
          className="flex-1"
        />
        <Button
          onClick={handleSearch}
          variant="secondary"
          className="shrink-0"
        >
          検索
        </Button>
        <Button
          onClick={() => setIsFilterOpen(true)}
          variant="secondary"
          className="shrink-0"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
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
          <span className="text-sm text-gray-500 dark:text-gray-400">
            フィルター適用中
          </span>
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
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : cards.length === 0 ? (
        <CollectionEmpty
          hasFilter={hasActiveFilter}
          onClearFilter={clearFilter}
        />
      ) : (
        <>
          {/* カードグリッド */}
          <CardGrid cards={cards} onCardClick={handleCardClick} />

          {/* 無限スクロールトリガー */}
          {hasMore && (
            <div
              ref={observerRef}
              className="flex items-center justify-center py-8"
            >
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
