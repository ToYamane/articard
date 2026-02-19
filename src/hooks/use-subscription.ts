'use client';

import { useState, useCallback, useEffect } from 'react';
import { getIdToken } from '@/lib/firebase/client';
import { useAuthStore } from '@/stores/auth-store';

interface SubscriptionPlan {
  name: string;
  dailyFreeCoins: number;
  freeChallenges: number;
}

interface SubscriptionStatus {
  tier: 'plus' | 'premium' | null;
  expiresAt: string | null;
  bonusReceived: boolean;
  plan: SubscriptionPlan | null;
}

interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  price: number;
}

interface CoinData {
  freeCoins: number;
  permanentCoins: number;
  totalAvailable: number;
  subscription: SubscriptionStatus;
  packages: CoinPackage[];
}

export function useSubscription() {
  const { profile } = useAuthStore();
  const [coinData, setCoinData] = useState<CoinData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch coin and subscription data
  const fetchData = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;

      const response = await fetch('/api/coins', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCoinData(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch coin data:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile, fetchData]);

  // Start subscription checkout (redirects to Stripe)
  const startSubscriptionCheckout = useCallback(async (tier: 'plus' | 'premium') => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('認証が必要です');

      // Create Stripe Checkout session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'チェックアウトの開始に失敗しました');
      }

      // Redirect to Stripe Checkout URL
      if (data.data.url) {
        window.location.href = data.data.url;
      } else {
        throw new Error('決済ページのURLが取得できませんでした');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Legacy: Direct subscription activation (for dev/testing)
  const activateSubscription = useCallback(
    async (tier: 'plus' | 'premium') => {
      setIsLoading(true);
      setError(null);
      try {
        const token = await getIdToken();
        if (!token) throw new Error('認証が必要です');

        const response = await fetch('/api/subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tier }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || 'サブスクリプションの有効化に失敗しました');
        }

        // Refresh data after activation
        await fetchData();

        return data.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchData]
  );

  // Cancel subscription
  const cancelSubscription = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('認証が必要です');

      const response = await fetch('/api/subscription', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'サブスクリプションの解約に失敗しました');
      }

      // cancelAt があれば期間終了時解約（データはリフレッシュしない＝プラン表示を維持）
      // cancelAt が null なら即時解約（開発者直接有効化のケース）
      if (!data.data.cancelAt) {
        await fetchData();
      }

      return data.data as { message: string; cancelAt: string | null };
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchData]);

  // Purchase coins (redirects to Stripe Checkout)
  const purchaseCoins = useCallback(async (packageId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('認証が必要です');

      const response = await fetch('/api/stripe/coin-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ packageId }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'コインの購入に失敗しました');
      }

      // Redirect to Stripe Checkout URL
      if (data.data.url) {
        window.location.href = data.data.url;
      } else {
        throw new Error('決済ページのURLが取得できませんでした');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Dev charge coins (developer only)
  const devChargeCoins = useCallback(
    async (amount: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const token = await getIdToken();
        if (!token) throw new Error('認証が必要です');

        const response = await fetch('/api/coins/dev-charge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || 'コインのチャージに失敗しました');
        }

        // Refresh data after charge
        await fetchData();

        return data.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchData]
  );

  return {
    // Data
    coinData,
    subscription: coinData?.subscription ?? null,
    packages: coinData?.packages ?? [],
    freeCoins: coinData?.freeCoins ?? 0,
    permanentCoins: coinData?.permanentCoins ?? 0,
    totalCoins: coinData?.totalAvailable ?? 0,

    // State
    isLoading,
    error,

    // Actions
    fetchData,
    startSubscriptionCheckout,
    activateSubscription, // Legacy for dev/testing
    cancelSubscription,
    purchaseCoins,
    devChargeCoins,
  };
}
