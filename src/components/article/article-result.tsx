'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui';
import { ArticleView } from './article-view';
import { CardPackSection, type CardPackState } from '@/components/card';
import type { Article } from '@prisma/client';

interface ArticleResultProps {
  article: Article;
  onGenerateCard?: () => void;
  onRegenerate: () => void;
  isLoading?: boolean;
  // 自動カード生成用のプロパティ
  autoCardEnabled?: boolean;
  cardPackState?: CardPackState | 'error';
  onPackClick?: () => void;
  cardGenError?: string | null;
  onRetryCardGen?: () => void;
}

export function ArticleResult({
  article,
  onGenerateCard,
  onRegenerate,
  isLoading,
  autoCardEnabled = false,
  cardPackState,
  onPackClick,
  cardGenError,
  onRetryCardGen,
}: ArticleResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-6"
    >
      <ArticleView article={article} />

      {/* 自動カード生成が有効な場合: カードパックセクションを表示 */}
      {autoCardEnabled && cardPackState && onPackClick ? (
        <>
          <CardPackSection
            state={cardPackState}
            onPackClick={onPackClick}
            error={cardGenError}
            onRetry={onRetryCardGen}
          />
          <div className="flex justify-center">
            <Button
              onClick={onRegenerate}
              variant="secondary"
              size="sm"
              disabled={isLoading}
            >
              テーマを変えて再生成
            </Button>
          </div>
        </>
      ) : (
        /* 記事のみ生成時のアクションボタン */
        <div className="flex justify-center">
          <Button
            onClick={onRegenerate}
            variant="secondary"
            disabled={isLoading}
          >
            テーマを変えて再生成
          </Button>
        </div>
      )}
    </motion.div>
  );
}
