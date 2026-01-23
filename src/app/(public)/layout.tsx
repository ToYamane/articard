import type { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Simple Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <a href="/home" className="text-xl font-bold text-blue-600 dark:text-blue-400">
            Articard
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Articard - 学習記事からAI生成カードを作成するサービス
          </p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
            &copy; {new Date().getFullYear()} Articard. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
