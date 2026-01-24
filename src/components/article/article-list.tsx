'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArticleCard } from './article-card';
import { Button, LoadingSpinner } from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';
import { getIdToken } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';
import type { Article } from '@prisma/client';

type ArticleWithCount = Article & { _count?: { cards: number } };

interface ArticleListResponse {
  articles: ArticleWithCount[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function ArticleList() {
  const { user } = useAuthStore();
  const { addToast } = useToast();

  const [articles, setArticles] = useState<ArticleWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchArticles = useCallback(
    async (cursor?: string) => {
      if (!user) return;

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('認証トークンの取得に失敗しました');
        }

        const params = new URLSearchParams();
        if (cursor) {
          params.set('cursor', cursor);
        }
        params.set('limit', '20');

        const response = await fetch(`/api/articles?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || '記事の取得に失敗しました');
        }

        const result = data.data as ArticleListResponse;

        if (cursor) {
          setArticles((prev) => [...prev, ...result.articles]);
        } else {
          setArticles(result.articles);
        }

        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
      } catch (error) {
        console.error('Fetch articles error:', error);
        addToast(
          error instanceof Error ? error.message : '記事の取得に失敗しました',
          'error'
        );
      }
    },
    [user, addToast]
  );

  useEffect(() => {
    const loadInitial = async () => {
      setIsLoading(true);
      await fetchArticles();
      setIsLoading(false);
    };
    loadInitial();
  }, [fetchArticles]);

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    await fetchArticles(nextCursor);
    setIsLoadingMore(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          記事がまだありません
        </p>
        <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
          「記事作成」から新しい記事を生成してみましょう
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {articles.map((article, index) => (
        <motion.div
          key={article.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
        >
          <ArticleCard article={article} />
        </motion.div>
      ))}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleLoadMore}
            variant="secondary"
            isLoading={isLoadingMore}
          >
            もっと読み込む
          </Button>
        </div>
      )}
    </div>
  );
}
