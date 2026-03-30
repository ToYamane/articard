'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiUrl } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

/**
 * 次のJST 0:00までの残り時間を計算
 */
function getTimeUntilReset(): string {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffset);

  // JSTでの翌日0:00
  const jstTomorrow = new Date(
    Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate() + 1)
  );
  // UTCに戻す
  const nextResetUTC = new Date(jstTomorrow.getTime() - jstOffset);

  const diffMs = nextResetUTC.getTime() - now.getTime();
  if (diffMs <= 0) return '間もなく';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}時間${minutes}分`;
}

interface CoinData {
  freeCoins: number;
  permanentCoins: number;
  totalAvailable: number;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: '/home',
    label: 'ホーム',
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    href: '/challenge',
    label: 'チャレンジ',
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    href: '/articles',
    label: '記事履歴',
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
  },
  {
    href: '/collection',
    label: 'コレクション',
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: '設定',
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function Header() {
  const pathname = usePathname();
  const { profile } = useAuthStore();
  const [coinData, setCoinData] = useState<CoinData | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState(() => getTimeUntilReset());

  // パスがアクティブかどうかを判定
  const isActive = (href: string) => {
    if (href === '/home') {
      return pathname === '/home' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  // コイン残高を取得
  useEffect(() => {
    if (!profile) return;

    const fetchCoins = async () => {
      try {
        const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken();
        if (!token) return;

        const response = await fetch(apiUrl('/api/coins'), {
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

  // リセットまでのカウントダウン更新（1分ごと）
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUntilReset(getTimeUntilReset());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // モバイルメニューが開いている時はスクロールを無効化
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-black/80">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        {/* ロゴ */}
        <Link
          href="/home"
          className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
        >
          <Image src="/logo/icon.webp" alt="ArtiCard" width={32} height={32} className="h-8 w-8" />
          <Image
            src="/logo/text.webp"
            alt="ArtiCard"
            width={120}
            height={32}
            className="h-6 w-auto"
            priority
          />
        </Link>

        <div className="flex items-center gap-3">
          {/* ゲスト: アカウント登録ボタン */}
          {profile?.isGuest && (
            <Link
              href="/upgrade"
              className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:shadow-md"
            >
              アカウント登録
            </Link>
          )}

          {/* コイン残高表示 */}
          {profile && (
            <div className="group relative flex items-center gap-2">
              {/* 無料コイン */}
              <div className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 transition-colors hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30">
                <svg className="h-3.5 w-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="8" />
                </svg>
                <span className="text-xs font-medium text-green-700 dark:text-green-400">
                  {coinData?.freeCoins ?? '-'}
                </span>
              </div>
              {/* 永続コイン */}
              <div className="flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1 transition-colors hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30">
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

              {/* ホバーポップアップ */}
              <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
                <div className="w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-950">
                  {/* 矢印 */}
                  <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950" />

                  <div className="space-y-2.5">
                    {/* 無料コイン行 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <svg
                          className="h-3.5 w-3.5 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <circle cx="10" cy="10" r="8" />
                        </svg>
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          デイリーコイン
                        </span>
                      </div>
                      <span className="text-sm font-bold text-green-700 dark:text-green-400">
                        {coinData?.freeCoins ?? '-'}
                      </span>
                    </div>

                    {/* 永続コイン行 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <svg
                          className="h-3.5 w-3.5 text-yellow-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <circle cx="10" cy="10" r="8" />
                        </svg>
                        <span className="text-xs text-gray-600 dark:text-gray-300">永続コイン</span>
                      </div>
                      <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400">
                        {coinData?.permanentCoins ?? '-'}
                      </span>
                    </div>

                    {/* 区切り線 */}
                    <div className="border-t border-gray-100 dark:border-gray-700" />

                    {/* リセットまでの時間 */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        デイリーコイン補充
                      </span>
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                        あと {timeUntilReset}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* デスクトップナビゲーション */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  isActive(item.href)
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-950 dark:hover:text-gray-100'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* モバイルメニューボタン */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-950 md:hidden"
            aria-label="メニューを開く"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* モバイルメニュー */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* オーバーレイ */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 top-14 z-40 bg-black/20 backdrop-blur-sm md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* メニューパネル */}
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 right-0 top-14 z-50 border-b border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-black md:hidden"
            >
              <div className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-all',
                      isActive(item.href)
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-950 dark:hover:text-gray-100'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {isActive(item.href) && (
                      <motion.div
                        layoutId="mobile-active-indicator"
                        className="ml-auto h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400"
                      />
                    )}
                  </Link>
                ))}
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
