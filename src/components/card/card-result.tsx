'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui';
import { CardDetailDisplay } from './card-display';
import type { Card } from '@prisma/client';

interface CardResultProps {
  card: Card;
  onViewCollection: () => void;
  onGenerateAnother?: () => void;
  isLoading?: boolean;
}

export function CardResult({
  card,
  onViewCollection,
  onGenerateAnother,
  isLoading,
}: CardResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', duration: 0.5 }}
      className="flex flex-col items-center gap-8"
    >
      {/* 獲得メッセージ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center"
      >
        <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
          新しいカードを獲得しました！
        </p>
      </motion.div>

      {/* カード表示 */}
      <CardDetailDisplay card={card} />

      {/* アクションボタン */}
      <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
        <Button onClick={onViewCollection} className="flex-1">
          コレクションを見る
        </Button>
        {onGenerateAnother && (
          <Button
            onClick={onGenerateAnother}
            variant="secondary"
            className="flex-1"
            disabled={isLoading}
            isLoading={isLoading}
          >
            もう一枚生成
          </Button>
        )}
      </div>
    </motion.div>
  );
}
