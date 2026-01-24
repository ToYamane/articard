import type { ReactNode } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireAuth={true} requireSetup={true}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* ヘッダー */}
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
            <Link href="/home" className="text-xl font-bold text-blue-600 dark:text-blue-400">
              Articard
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/articles"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                記事履歴
              </Link>
              <Link
                href="/collection"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                コレクション
              </Link>
              <Link
                href="/settings"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                設定
              </Link>
            </nav>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </div>
    </AuthGuard>
  );
}
