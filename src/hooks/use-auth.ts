'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  subscribeToAuthState,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  logout,
  resetPassword,
  getIdToken,
} from '@/lib/firebase/client';
import {
  useAuthStore,
  selectIsAuthenticated,
  selectIsRegistered,
  selectNeedsSetup,
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
  const needsSetup = useAuthStore(selectNeedsSetup);

  // Fetch profile in background (non-blocking)
  const fetchProfileInBackground = useCallback(
    async (firebaseUser: NonNullable<typeof user>) => {
      try {
        const token = await firebaseUser.getIdToken();
        const response = await fetch('/api/users/me', {
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
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      setUser(firebaseUser);

      // Set initialized immediately after Firebase auth state is confirmed
      // This prevents blocking on API calls
      if (!isInitialized) {
        setInitialized(true);
        setLoading(false);
      }

      if (firebaseUser) {
        // Fetch profile in background (non-blocking)
        fetchProfileInBackground(firebaseUser);
      } else {
        setProfile(null);
      }
    });

    return () => unsubscribe();
  }, [setUser, setProfile, setLoading, setInitialized, isInitialized, fetchProfileInBackground]);

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
        await signUpWithEmail(email, password);
      } finally {
        setLoading(false);
      }
    },
    [setLoading]
  );

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
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [setLoading, reset, router]);

  // Send password reset email
  const sendPasswordReset = useCallback(
    async (email: string) => {
      setLoading(true);
      try {
        await resetPassword(email);
      } finally {
        setLoading(false);
      }
    },
    [setLoading]
  );

  // Register user in our database
  const registerUser = useCallback(
    async (nickname: string): Promise<UserProfile> => {
      setLoading(true);
      try {
        const token = await getIdToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch('/api/auth/register', {
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

        const response = await fetch('/api/users/me', {
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

  // Delete account
  const deleteAccount = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/users/me', {
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
    needsSetup,

    // Actions
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    signOut,
    sendPasswordReset,
    registerUser,
    updateProfile,
    deleteAccount,
    getIdToken,
  };
}
