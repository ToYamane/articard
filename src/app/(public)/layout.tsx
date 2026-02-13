import Image from 'next/image';
import type { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Simple Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-black">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <a href="/home" className="flex items-center gap-1.5 transition-opacity hover:opacity-80">
            <Image
              src="/logo/icon.webp"
              alt="ArtiCard"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <Image
              src="/logo/text.webp"
              alt="ArtiCard"
              width={120}
              height={32}
              className="h-6 w-auto"
            />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8 dark:border-gray-800 dark:bg-black">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Articard - 学習記事からAI生成カードを作成するサービス
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
            <a href="/terms" className="text-sm text-gray-500 underline-offset-4 hover:text-gray-700 hover:underline dark:text-gray-400 dark:hover:text-gray-200">利用規約</a>
            <a href="/privacy" className="text-sm text-gray-500 underline-offset-4 hover:text-gray-700 hover:underline dark:text-gray-400 dark:hover:text-gray-200">プライバシーポリシー</a>
            <a href="/commerce" className="text-sm text-gray-500 underline-offset-4 hover:text-gray-700 hover:underline dark:text-gray-400 dark:hover:text-gray-200">特定商取引法に基づく表記</a>
            <a href="/contact" className="text-sm text-gray-500 underline-offset-4 hover:text-gray-700 hover:underline dark:text-gray-400 dark:hover:text-gray-200">お問い合わせ</a>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
            &copy; {new Date().getFullYear()} Articard. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
