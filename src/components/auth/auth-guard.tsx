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
const publicRoutes = ['/', '/login', '/register', '/share', '/terms', '/privacy', '/commerce', '/contact'];

// Routes that require authentication but NOT setup
const authOnlyRoutes = ['/setup'];

export function AuthGuard({ children, requireAuth = true, requireSetup = true }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isRegistered, isInitialized } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;

    const isPublicRoute = publicRoutes.some(
      (route) => pathname === route || pathname.startsWith('/share/')
    );
    const isAuthOnlyRoute = authOnlyRoutes.some((route) => pathname.startsWith(route));

    // If user is not authenticated and route requires auth
    if (requireAuth && !isAuthenticated && !isPublicRoute) {
      router.push('/login');
      return;
    }

    // If user is authenticated but on a public route (login/register)
    if (isAuthenticated && (pathname === '/login' || pathname === '/register' || pathname === '/')) {
      if (isRegistered) {
        router.push('/home');
      } else {
        router.push('/setup');
      }
      return;
    }

    // If user is authenticated but not registered (needs setup)
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

    // If user is registered and on setup page
    if (isAuthenticated && isRegistered && pathname === '/setup') {
      router.push('/home');
      return;
    }
  }, [isInitialized, isAuthenticated, isRegistered, pathname, router, requireAuth, requireSetup]);

  // Show loading only during initial auth check (not during API calls)
  if (!isInitialized) {
    return <FullPageLoader message="認証情報を確認中..." />;
  }

  return <>{children}</>;
}
