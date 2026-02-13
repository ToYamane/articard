import type { ReactNode } from 'react';
import Image from 'next/image';
import { AuthGuard } from '@/components/auth';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireAuth={false} requireSetup={false}>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 dark:from-gray-950 dark:via-indigo-950/30 dark:to-gray-950">
        {/* ロゴ */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image
            src="/logo/icon.webp"
            alt=""
            width={72}
            height={72}
            className="h-18 w-18 drop-shadow-lg"
            priority
          />
          <Image
            src="/logo/text.webp"
            alt="ArtiCard"
            width={180}
            height={45}
            className="h-auto w-[180px] dark:brightness-0 dark:invert"
            priority
          />
          <p className="text-sm text-gray-500 dark:text-gray-400">学習記事からカードを生成</p>
        </div>
        {/* フォームカード */}
        <div className="w-full max-w-md rounded-2xl bg-white/80 p-8 shadow-xl backdrop-blur-sm dark:bg-gray-900/80 dark:shadow-gray-900/50">
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}
