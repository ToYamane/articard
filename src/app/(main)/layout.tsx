import type { ReactNode } from 'react';
import { AuthGuard } from '@/components/auth';
import { Header } from '@/components/layout';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireAuth={true} requireSetup={true}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </div>
    </AuthGuard>
  );
}
