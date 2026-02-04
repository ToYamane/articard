'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArticleCard } from './article-card';
import { Button, ArticleListSkeleton } from '@/components/ui';
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
    return <ArticleListSkeleton count={5} />;
  }

  if (articles.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        {/* イラスト */}
        <div className="relative mb-6">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-orange-100 to-yellow-100 opacity-60 blur-xl dark:from-orange-900/30 dark:to-yellow-900/30" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-yellow-500 shadow-lg shadow-orange-500/25">
            <svg
              className="h-12 w-12 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          {/* 装飾 */}
          <motion.div
            animate={{ y: [0, -6, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -left-3 top-0"
          >
            <svg className="h-5 w-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </motion.div>
        </div>

        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
          記事がまだありません
        </h3>
        <p className="mb-6 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          テーマを入力して、AIが生成する学習記事を作成してみましょう。
          <br />
          記事からユニークなカードも生成できます！
        </p>

        <Button
          onClick={() => window.location.href = '/home'}
          className="gap-2 shadow-lg shadow-orange-500/25"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          記事を作成する
        </Button>
      </motion.div>
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
