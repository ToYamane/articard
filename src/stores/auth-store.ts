import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from 'firebase/auth';

export interface UserProfile {
  id: string;
  nickname: string;
  knowledgeBalance: number;
  isPremium: boolean;
  premiumExpiresAt: string | null;
  createdAt: string;
}

interface AuthState {
  // Firebase user (null if not logged in)
  user: User | null;
  // App user profile (null if not registered in our DB)
  profile: UserProfile | null;
  // Loading state
  isLoading: boolean;
  // Whether the auth state has been initialized
  isInitialized: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;
}

const initialState = {
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      setInitialized: (isInitialized) => set({ isInitialized }),
      reset: () => set(initialState),
    }),
    {
      name: 'articard-auth',
      partialize: (state) => ({
        // Only persist the profile, not the Firebase user (it's handled by Firebase SDK)
        profile: state.profile,
      }),
    }
  )
);

// Selectors
export const selectIsAuthenticated = (state: AuthState) => !!state.user;
export const selectIsRegistered = (state: AuthState) => !!state.profile;
export const selectNeedsSetup = (state: AuthState) => !!state.user && !state.profile;
