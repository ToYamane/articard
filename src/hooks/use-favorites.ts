'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiUrl } from '@/lib/api/client';
import { getIdToken } from '@/lib/firebase/client';
import { useAuthStore } from '@/stores/auth-store';

export function useFavorites(type: 'cards' | 'articles') {
  const { user, profile } = useAuthStore();
  const isGuest = profile?.isGuest ?? false;
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const isTogglingRef = useRef(false);

  // 初回ロード（user の boolean 変化時のみ発火）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const isLoggedIn = !!user;
  useEffect(() => {
    async function fetchFavorites() {
      if (!user || isTogglingRef.current) {
        if (!user) setIsLoading(false);
        return;
      }

      try {
        const token = await getIdToken();
        if (!token) return;

        const response = await fetch(apiUrl(`/api/favorites/${type}`), {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (data.success) {
          setFavoriteIds(new Set(data.data.ids));
        }
      } catch {
        // お気に入り取得失敗は無視
      } finally {
        setIsLoading(false);
      }
    }

    fetchFavorites();
  }, [isLoggedIn, type]);

  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds]);

  const toggleFavorite = useCallback(
    async (id: string) => {
      if (isGuest) return; // ゲストはお気に入り登録不可
      isTogglingRef.current = true;
      // 楽観的更新
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });

      try {
        const token = await getIdToken();
        if (!token) return;

        const bodyKey = type === 'cards' ? 'cardId' : 'articleId';
        const response = await fetch(apiUrl(`/api/favorites/${type}`), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ [bodyKey]: id }),
        });

        const data = await response.json();
        if (!data.success) {
          // ロールバック
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
              next.delete(id);
            } else {
              next.add(id);
            }
            return next;
          });
        }
      } catch {
        // ロールバック
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return next;
        });
      } finally {
        isTogglingRef.current = false;
      }
    },
    [type, isGuest]
  );

  return {
    favoriteIds,
    isFavorite,
    toggleFavorite,
    isLoading,
    isGuest,
  };
}
