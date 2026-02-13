'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatDate } from '@/lib/utils';
import type { Article } from '@prisma/client';

interface ArticleCardProps {
  article: Article & { _count?: { cards: number } };
}

export function ArticleCard({ article }: ArticleCardProps) {
  const cardCount = article._count?.cards ?? 0;

  return (
    <Link href={`/articles/${article.id}`}>
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="group flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-black"
      >
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold text-gray-900 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
            {article.theme}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {formatDate(article.createdAt)}
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            <span className="mr-1">🃏</span>
            生成カード: {cardCount}枚
          </p>
        </div>
        <div className="ml-4 text-gray-400 transition-transform group-hover:translate-x-1">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </motion.div>
    </Link>
  );
}
