import type { ReactNode } from 'react';
import { AuthGuard } from '@/components/auth';
import { Header } from '@/components/layout';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireAuth={true} requireSetup={true}>
      <div className="min-h-screen bg-gradient-to-br from-amber-50/80 via-purple-50/60 to-sky-50/80 dark:from-gray-950 dark:via-purple-950/30 dark:to-gray-950">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </div>
    </AuthGuard>
  );
}
