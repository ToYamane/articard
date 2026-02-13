'use client';

import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/components/ui';

interface CardLoadingProps {
  stage?: 'keyword' | 'context' | 'illustration' | 'composing';
  onCancel?: () => void;
}

const STAGE_MESSAGES = {
  keyword: 'キーワードを選定中...',
  context: '文脈を分析中...',
  illustration: 'イラストを生成中...',
  composing: 'カードを合成中...',
};

export function CardLoading({ stage = 'keyword', onCancel }: CardLoadingProps) {
  const message = STAGE_MESSAGES[stage];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center space-y-6 py-12"
    >
      <LoadingSpinner size="lg" />

      <div className="space-y-2 text-center">
        <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
          カードを生成中...
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      </div>

      {/* プログレスステップ */}
      <div className="flex items-center gap-2">
        {(['keyword', 'context', 'illustration', 'composing'] as const).map(
          (s, index) => (
            <div
              key={s}
              className={`h-2 w-2 rounded-full ${
                Object.keys(STAGE_MESSAGES).indexOf(stage) >= index
                  ? 'bg-blue-600'
                  : 'bg-gray-300 dark:bg-gray-900'
              }`}
            />
          )
        )}
      </div>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          キャンセル
        </button>
      )}
    </motion.div>
  );
}
