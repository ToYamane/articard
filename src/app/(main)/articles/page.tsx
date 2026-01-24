'use client';

import { motion } from 'framer-motion';
import { ArticleList } from '@/components/article';

export default function ArticlesPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          📚 記事履歴
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          これまでに生成した記事の一覧です
        </p>
      </div>

      {/* 記事一覧 */}
      <ArticleList />
    </motion.div>
  );
}
