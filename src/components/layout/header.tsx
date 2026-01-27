'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';

interface CoinData {
  freeCoins: number;
  permanentCoins: number;
  totalAvailable: number;
}

export function Header() {
  const { profile } = useAuthStore();
  const [coinData, setCoinData] = useState<CoinData | null>(null);

  // コイン残高を取得
  useEffect(() => {
    if (!profile) return;

    const fetchCoins = async () => {
      try {
        const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken();
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
      } catch (error) {
        console.error('Failed to fetch coin balance:', error);
      }
    };

    fetchCoins();

    // 30秒ごとに更新（日次リセット対応）
    const interval = setInterval(fetchCoins, 30000);
    return () => clearInterval(interval);
  }, [profile]);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/home" className="text-xl font-bold text-blue-600 dark:text-blue-400">
          Articard
        </Link>

        <div className="flex items-center gap-4">
          {/* コイン残高表示 */}
          {profile && (
            <div className="flex items-center gap-2">
              {/* 無料コイン */}
              <div
                className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 dark:bg-green-900/20"
                title="本日の無料コイン（毎日リセット）"
              >
                <svg
                  className="h-3.5 w-3.5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <circle cx="10" cy="10" r="8" />
                </svg>
                <span className="text-xs font-medium text-green-700 dark:text-green-400">
                  {coinData?.freeCoins ?? '-'}
                </span>
              </div>
              {/* 永続コイン */}
              <div
                className="flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1 dark:bg-yellow-900/20"
                title="永続コイン（報酬・購入）"
              >
                <svg
                  className="h-3.5 w-3.5 text-yellow-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <circle cx="10" cy="10" r="8" />
                </svg>
                <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
                  {coinData?.permanentCoins ?? '-'}
                </span>
              </div>
            </div>
          )}

          {/* ナビゲーション */}
          <nav className="flex items-center gap-4">
            <Link
              href="/challenge"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              チャレンジ
            </Link>
            <Link
              href="/articles"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              記事履歴
            </Link>
            <Link
              href="/collection"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              コレクション
            </Link>
            <Link
              href="/settings"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              設定
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
