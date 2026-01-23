'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui';
import { ArticleView } from './article-view';
import type { Article } from '@prisma/client';

interface ArticleResultProps {
  article: Article;
  onGenerateCard: () => void;
  onRegenerate: () => void;
  isLoading?: boolean;
}

export function ArticleResult({
  article,
  onGenerateCard,
  onRegenerate,
  isLoading,
}: ArticleResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-6"
    >
      <ArticleView article={article} />

      {/* アクションボタン */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={onGenerateCard}
          className="flex-1"
          disabled={isLoading}
          isLoading={isLoading}
        >
          カードを生成する
        </Button>
        <Button
          onClick={onRegenerate}
          variant="secondary"
          className="flex-1"
          disabled={isLoading}
        >
          テーマを変えて再生成
        </Button>
      </div>
    </motion.div>
  );
}
