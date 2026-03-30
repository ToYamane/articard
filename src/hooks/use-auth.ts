'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  subscribeToAuthState,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signInAsGuest as firebaseSignInAsGuest,
  linkWithEmail as firebaseLinkWithEmail,
  linkWithGoogle as firebaseLinkWithGoogle,
  logout,
  getIdToken,
} from '@/lib/firebase/client';
import { apiUrl } from '@/lib/api/client';
import {
  useAuthStore,
  selectIsAuthenticated,
  selectIsRegistered,
  selectIsGuest,
  selectNeedsSetup,
  selectNeedsEmailVerification,
  type UserProfile,
} from '@/stores/auth-store';

export function useAuth() {
  const router = useRouter();
  const {
    user,
    profile,
    isLoading,
    isInitialized,
    setUser,
    setProfile,
    setLoading,
    setInitialized,
    reset,
  } = useAuthStore();

  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isRegistered = useAuthStore(selectIsRegistered);
  const isGuest = useAuthStore(selectIsGuest);
  const needsSetup = useAuthStore(selectNeedsSetup);
  const needsEmailVerification = useAuthStore(selectNeedsEmailVerification);

  // Fetch profile in background (non-blocking)
  const fetchProfileInBackground = useCallback(
    async (firebaseUser: NonNullable<typeof user>) => {
      try {
        const token = await firebaseUser.getIdToken();
        const response = await fetch(apiUrl('/api/users/me'), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setProfile(data.data);
          }
        } else if (response.status === 404) {
          // User exists in Firebase but not in our DB
          setProfile(null);
        } else {
          console.error(`Failed to fetch profile: ${response.status}`);
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        setProfile(null);
      }
    },
    [setProfile]
  );

  // Initialize auth state listener
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = subscribeToAuthState(async (firebaseUser) => {
        // 匿名ユーザー（ゲスト）の場合はメール確認 reload をスキップ
        if (
          firebaseUser &&
          !firebaseUser.isAnonymous &&
          firebaseUser.providerData[0]?.providerId === 'password' &&
          !firebaseUser.emailVerified
        ) {
          await firebaseUser.reload();
        }

        // Fetch profile BEFORE triggering AuthGuard via setUser/setInitialized
        if (firebaseUser) {
          await fetchProfileInBackground(firebaseUser);
        } else {
          setProfile(null);
        }

        setUser(firebaseUser);

        if (!useAuthStore.getState().isInitialized) {
          setInitialized(true);
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('[Auth] Failed to subscribe to auth state:', error);
      setInitialized(true);
      setLoading(false);
    }

    // Timeout: placed outside try-catch so it's always registered
    const timeout = setTimeout(() => {
      if (!useAuthStore.getState().isInitialized) {
        console.warn('[Auth] Firebase auth state timeout - forcing initialization');
        setInitialized(true);
        setLoading(false);
      }
    }, 5000);

    return () => {
      unsubscribe?.();
      clearTimeout(timeout);
    };
  }, [setUser, setProfile, setLoading, setInitialized, fetchProfileInBackground]);

  // Login with email/password
  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        await signInWithEmail(email, password);
      } finally {
        setLoading(false);
      }
    },
    [setLoading]
  );

  // Register with email/password
  const registerWithEmail = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        return await signUpWithEmail(email, password);
      } finally {
        setLoading(false);
      }
    },
    [setLoading]
  );

  // Reload current user to refresh emailVerified status
  const reloadUser = useCallback(async () => {
    if (!user) return false;
    await user.reload();
    await user.getIdToken(true);
    // Fetch profile BEFORE triggering AuthGuard re-evaluation via setUser
    if (user.emailVerified) {
      await fetchProfileInBackground(user);
    }
    // Trigger store notification so selectors re-evaluate (AuthGuard will see correct profile)
    setUser(user);
    return user.emailVerified;
  }, [user, setUser, fetchProfileInBackground]);

  // Login with Google
  const loginWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  // Logout
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await logout();
      reset();
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [setLoading, reset, router]);

  // Register user in our database
  const registerUser = useCallback(
    async (nickname: string): Promise<UserProfile> => {
      setLoading(true);
      try {
        const token = await getIdToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(apiUrl('/api/auth/register'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ nickname }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || 'Registration failed');
        }

        setProfile(data.data);
        return data.data;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setProfile]
  );

  // Update user profile
  const updateProfile = useCallback(
    async (updates: Partial<Pick<UserProfile, 'nickname'>>) => {
      setLoading(true);
      try {
        const token = await getIdToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(apiUrl('/api/users/me'), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || 'Update failed');
        }

        setProfile(data.data);
        return data.data;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setProfile]
  );

  // Sign in as guest (anonymous)
  const signInAsGuestUser = useCallback(async () => {
    setLoading(true);
    try {
      const { user: guestUser } = await firebaseSignInAsGuest();
      const token = await guestUser.getIdToken();

      const response = await fetch(apiUrl('/api/auth/guest-register'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Guest registration failed');
      }

      setProfile(data.data);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setProfile]);

  // Upgrade guest account (link credentials + register)
  const upgradeGuestAccount = useCallback(
    async (
      method: 'email' | 'google',
      nickname: string,
      credentials?: { email: string; password: string }
    ): Promise<UserProfile> => {
      setLoading(true);
      try {
        // 1. Link Firebase credentials
        if (method === 'email' && credentials) {
          await firebaseLinkWithEmail(credentials.email, credentials.password);
        } else if (method === 'google') {
          await firebaseLinkWithGoogle();
        }

        // 2. Upgrade in our DB (reuse register endpoint)
        const token = await getIdToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(apiUrl('/api/auth/register'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ nickname }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error?.message || 'Account upgrade failed');
        }

        setProfile(data.data);
        return data.data;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setProfile]
  );

  // Delete account
  const deleteAccount = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(apiUrl('/api/users/me'), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Account deletion failed');
      }

      // Clear local state and redirect
      reset();
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [setLoading, reset, router]);

  return {
    // State
    user,
    profile,
    isLoading,
    isInitialized,
    isAuthenticated,
    isRegistered,
    isGuest,
    needsSetup,
    needsEmailVerification,

    // Actions
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    signInAsGuestUser,
    upgradeGuestAccount,
    signOut,
    registerUser,
    updateProfile,
    deleteAccount,
    getIdToken,
    reloadUser,
  };
}
