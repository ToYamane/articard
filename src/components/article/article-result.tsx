'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';
import { ArticleView } from './article-view';
import { CardPackSection, type CardPackState } from '@/components/card';
import type { Article, Card } from '@prisma/client';

interface ArticleResultProps {
  article: Article;
  onRegenerate: () => void;
  isLoading?: boolean;
  // 自動カード生成用のプロパティ
  autoCardEnabled?: boolean;
  cardPackState?: CardPackState | 'error';
  onPackClick?: () => void;
  cardGenError?: string | null;
  onRetryCardGen?: () => void;
  revealedCard?: Card | null;
}

export function ArticleResult({
  article,
  onRegenerate,
  isLoading,
  autoCardEnabled = false,
  cardPackState,
  onPackClick,
  cardGenError,
  onRetryCardGen,
  revealedCard,
}: ArticleResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-6"
    >
      <ArticleView article={article} />

      {/* 開封済み: カード画像をインライン表示 */}
      {autoCardEnabled && revealedCard ? (
        <>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="mt-8 flex flex-col items-center"
          >
            <div className="relative h-80 w-56 overflow-hidden rounded-xl shadow-2xl">
              <Image
                src={revealedCard.cardImageUrl}
                alt={revealedCard.keyword}
                fill
                className="object-cover"
              />
            </div>
            <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-400">
              {revealedCard.keyword}
            </p>
          </motion.div>
          <div className="flex justify-center">
            <Button onClick={onRegenerate} variant="secondary" size="sm" disabled={isLoading}>
              テーマを変えて再生成
            </Button>
          </div>
        </>
      ) : autoCardEnabled && cardPackState && onPackClick ? (
        /* 未開封: カードパックを表示 */
        <>
          <CardPackSection
            state={cardPackState}
            onPackClick={onPackClick}
            error={cardGenError}
            onRetry={onRetryCardGen}
          />
          <div className="flex justify-center">
            <Button onClick={onRegenerate} variant="secondary" size="sm" disabled={isLoading}>
              テーマを変えて再生成
            </Button>
          </div>
        </>
      ) : (
        /* 記事のみ生成時のアクションボタン */
        <div className="flex justify-center">
          <Button onClick={onRegenerate} variant="secondary" disabled={isLoading}>
            テーマを変えて再生成
          </Button>
        </div>
      )}
    </motion.div>
  );
}
