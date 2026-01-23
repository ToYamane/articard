'use client';

import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/components/ui';

interface ArticleLoadingProps {
  onCancel?: () => void;
}

export function ArticleLoading({ onCancel }: ArticleLoadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center space-y-6 py-12"
    >
      <LoadingSpinner size="lg" />

      <div className="space-y-2 text-center">
        <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
          記事を生成中...
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          学習記事を作成しています。少々お待ちください。
        </p>
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
