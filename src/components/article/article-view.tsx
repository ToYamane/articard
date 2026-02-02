'use client';

import ReactMarkdown from 'react-markdown';
import { formatRelativeTime } from '@/lib/utils';
import type { Article } from '@prisma/client';

interface ArticleViewProps {
  article: Article;
}

export function ArticleView({ article }: ArticleViewProps) {
  return (
    <div className="w-full space-y-4">
      {/* ヘッダー */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {article.theme}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {formatRelativeTime(article.createdAt)}
        </p>
      </div>

      {/* 記事本文 */}
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
        <div className="prose prose-gray dark:prose-invert max-w-none leading-relaxed">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>
      </div>

      {/* メタ情報 */}
      <div className="text-right text-xs text-gray-400 dark:text-gray-500">
        {article.content.length}文字
      </div>
    </div>
  );
}
