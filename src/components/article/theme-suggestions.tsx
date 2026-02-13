'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, LoadingSpinner } from '@/components/ui';

interface SuggestedTheme {
  id: string;
  theme: string;
}

interface ThemeSuggestionsProps {
  onSelectTheme: (theme: string) => void;
  disabled?: boolean;
}

export function ThemeSuggestions({ onSelectTheme, disabled }: ThemeSuggestionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [themes, setThemes] = useState<SuggestedTheme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchThemes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/suggested-themes?count=10');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'テーマの取得に失敗しました');
      }

      setThemes(data.data.themes);
    } catch (err) {
      console.error('Fetch suggested themes error:', err);
      setError(err instanceof Error ? err.message : 'テーマの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleToggle = async () => {
    if (!isExpanded && themes.length === 0) {
      await fetchThemes();
    }
    setIsExpanded(!isExpanded);
  };

  const handleShuffle = async () => {
    await fetchThemes();
  };

  const handleSelectTheme = (theme: string) => {
    onSelectTheme(theme);
    setIsExpanded(false);
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || isLoading}
        className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-bold text-white shadow-md shadow-purple-500/20 transition hover:from-purple-400 hover:to-fuchsia-400 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 dark:from-purple-600/80 dark:to-fuchsia-600/80"
      >
        {isExpanded ? '閉じる' : 'おすすめテーマから選ぶ'}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-lg bg-gradient-to-br from-purple-100/80 to-blue-100/80 p-4 dark:from-purple-900/20 dark:to-blue-900/20">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : error ? (
                <div className="text-center text-sm text-red-500">{error}</div>
              ) : themes.length === 0 ? (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                  おすすめテーマがありません
                </div>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {themes.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => handleSelectTheme(theme.theme)}
                        disabled={disabled}
                        className="rounded-full border-2 border-purple-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-md transition-all hover:scale-105 hover:bg-purple-100 hover:text-purple-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 dark:border-purple-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-purple-900/40 dark:hover:text-purple-400"
                      >
                        {theme.theme}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleShuffle}
                      disabled={disabled || isLoading}
                      className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                    >
                      シャッフル
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
