'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CardGrid } from '@/components/card';
import { Button, LoadingSpinner } from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import { getIdToken } from '@/lib/firebase/client';
import type { Card } from '@prisma/client';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addToast } = useToast();

  const [recentCards, setRecentCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // データを取得
  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('認証トークンの取得に失敗しました');
        }

        const cardsResponse = await fetch('/api/cards?limit=6&sortBy=createdAt&sortOrder=desc', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const cardsData = await cardsResponse.json();

        if (cardsData.success) {
          setRecentCards(cardsData.data.cards);
        }
      } catch (err) {
        console.error('Fetch data error:', err);
        addToast(
          err instanceof Error ? err.message : 'データの取得に失敗しました',
          'error'
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user, addToast]);

  // カードクリック時
  const handleCardClick = useCallback(
    (card: Card) => {
      router.push(`/cards/${card.id}`);
    },
    [router]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
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
      {/* ウェルカムメッセージ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          ようこそ、{user?.displayName || 'ゲスト'}さん
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          今日も新しい知識をカードにしましょう
        </p>
      </motion.div>

      {/* クイックアクション */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="mb-8 grid gap-4 sm:grid-cols-2"
      >
        <button
          onClick={() => router.push('/create')}
          className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:scale-[1.02] hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-2xl dark:bg-blue-900">
            ✍️
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              新しい記事を作成
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              テーマを入力して記事を生成
            </p>
          </div>
        </button>

        <button
          onClick={() => router.push('/collection')}
          className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:scale-[1.02] hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-2xl dark:bg-purple-900">
            📚
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              コレクションを見る
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              生成したカードを一覧表示
            </p>
          </div>
        </button>
      </motion.div>

      {/* 最近のカード */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            最近のカード
          </h2>
          {recentCards.length > 0 && (
            <Button
              onClick={() => router.push('/collection')}
              variant="ghost"
              size="sm"
            >
              すべて見る →
            </Button>
          )}
        </div>

        {recentCards.length > 0 ? (
          <CardGrid cards={recentCards} onCardClick={handleCardClick} />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-12 dark:border-gray-700">
            <div className="mb-4 text-4xl">🎴</div>
            <p className="mb-4 text-gray-500 dark:text-gray-400">
              まだカードがありません
            </p>
            <Button onClick={() => router.push('/create')}>
              最初のカードを作成
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
