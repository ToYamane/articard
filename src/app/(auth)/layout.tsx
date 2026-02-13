import type { ReactNode } from 'react';
import { AuthGuard } from '@/components/auth';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireAuth={false} requireSetup={false}>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 dark:bg-black">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">Articard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            学習記事からカードを生成
          </p>
        </div>
        {children}
      </div>
    </AuthGuard>
  );
}
