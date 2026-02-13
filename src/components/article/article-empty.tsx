'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui';

interface ArticleEmptyProps {
  hasFilter?: boolean;
  onClearFilter?: () => void;
}

export function ArticleEmpty({ hasFilter, onClearFilter }: ArticleEmptyProps) {
  if (hasFilter) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        {/* 虫眼鏡アイコン */}
        <div className="relative mb-6">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 opacity-50 blur-xl dark:from-gray-800 dark:to-gray-700" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
            <svg
              className="h-12 w-12 text-gray-400 dark:text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-lg font-bold text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400"
          >
            ?
          </motion.div>
        </div>

        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
          該当する記事がありません
        </h3>
        <p className="mb-6 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          検索条件やフィルターを変更して、もう一度お試しください
        </p>

        {onClearFilter && (
          <Button onClick={onClearFilter} variant="secondary" className="gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            フィルターをクリア
          </Button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      {/* 本アイコン */}
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
