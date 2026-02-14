'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FullPageLoader } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireSetup?: boolean;
}

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/share',
  '/terms',
  '/privacy',
  '/commerce',
  '/contact',
];

// Routes that require authentication but NOT setup
const authOnlyRoutes = ['/setup', '/verify-email'];

export function AuthGuard({ children, requireAuth = true, requireSetup = true }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isRegistered, isInitialized, needsEmailVerification } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;

    const isPublicRoute = publicRoutes.some(
      (route) => pathname === route || pathname.startsWith('/share/')
    );
    const isAuthOnlyRoute = authOnlyRoutes.some((route) => pathname.startsWith(route));

    // 1. If user is not authenticated and route requires auth
    if (requireAuth && !isAuthenticated && !isPublicRoute) {
      router.push('/login');
      return;
    }

    // 2. If user is authenticated but on a public route (login/register)
    if (
      isAuthenticated &&
      (pathname === '/login' || pathname === '/register' || pathname === '/')
    ) {
      if (needsEmailVerification) {
        router.push('/verify-email');
      } else if (isRegistered) {
        router.push('/home');
      } else {
        router.push('/setup');
      }
      return;
    }

    // 3. If user is authenticated but email not verified (redirect to verify-email)
    if (isAuthenticated && needsEmailVerification && pathname !== '/verify-email') {
      router.push('/verify-email');
      return;
    }

    // 4. If user is authenticated, email verified, but on verify-email page
    if (isAuthenticated && !needsEmailVerification && pathname === '/verify-email') {
      if (isRegistered) {
        router.push('/home');
      } else {
        router.push('/setup');
      }
      return;
    }

    // 5. If user is authenticated but not registered (needs setup)
    if (
      requireAuth &&
      requireSetup &&
      isAuthenticated &&
      !isRegistered &&
      !isAuthOnlyRoute &&
      !isPublicRoute
    ) {
      router.push('/setup');
      return;
    }

    // 6. If user is registered and on setup page
    if (isAuthenticated && isRegistered && pathname === '/setup') {
      router.push('/home');
      return;
    }
  }, [
    isInitialized,
    isAuthenticated,
    isRegistered,
    needsEmailVerification,
    pathname,
    router,
    requireAuth,
    requireSetup,
  ]);

  // Show loading only during initial auth check (not during API calls)
  if (!isInitialized) {
    return <FullPageLoader message="認証情報を確認中..." />;
  }

  return <>{children}</>;
}
