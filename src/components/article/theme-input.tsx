'use client';

import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { ThemeSuggestions } from './theme-suggestions';
import { themeSchema } from '@/lib/validations/article';
import { COIN_COSTS } from '@/lib/constants/coins';
import { CONTENT_TYPES, CONTENT_TYPE_INFO, type ContentType } from '@/types/article';

interface ThemeInputProps {
  onSubmit: (theme: string, withCard: boolean, contentType: ContentType) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

// コインアイコンコンポーネント
function CoinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <circle cx="10" cy="10" r="8" />
    </svg>
  );
}

export function ThemeInput({
  onSubmit,
  isLoading,
  disabled,
}: ThemeInputProps) {
  const [theme, setTheme] = useState('');
  const [error, setError] = useState('');
  const [contentType, setContentType] = useState<ContentType>('essay');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTheme(value);
    setError('');
  };

  const handleSelectSuggestedTheme = (selectedTheme: string) => {
    setTheme(selectedTheme);
    setError('');
  };

  const handleSubmit = (withCard: boolean) => {
    const result = themeSchema.safeParse(theme);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    onSubmit(theme, withCard, contentType);
  };

  const isValid = theme.length >= 2 && theme.length <= 30;

  return (
    <div className="w-full space-y-4">
      <Input
        label="学びたいテーマ"
        type="text"
        name="theme"
        value={theme}
        onChange={handleChange}
        error={error}
        placeholder="学びたいテーマを入力..."
        maxLength={30}
        showCharCount
        disabled={disabled || isLoading}
      />

      <p className="text-xs text-gray-500 dark:text-gray-400">
      </p>

      <ThemeSuggestions
        onSelectTheme={handleSelectSuggestedTheme}
        disabled={disabled || isLoading}
      />

      {/* 文章スタイル選択 */}
      <div className="space-y-2">
        <label
          htmlFor="contentType"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          文章スタイル
        </label>
        <select
          id="contentType"
          value={contentType}
          onChange={(e) => setContentType(e.target.value as ContentType)}
          disabled={disabled || isLoading}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-primary-400 dark:focus:ring-primary-400"
        >
          {CONTENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {CONTENT_TYPE_INFO[type].label}
            </option>
          ))}
        </select>
      </div>

      {/* 生成ボタン */}
      <div className="flex gap-3">
        {/* 記事＋カード生成ボタン */}
        <Button
          type="button"
          className="flex-1"
          isLoading={isLoading}
          disabled={disabled || isLoading || !isValid}
          onClick={() => handleSubmit(true)}
        >
          <span className="flex items-center justify-center gap-2">
            記事＋カード生成
            <span className="flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-xs">
              <CoinIcon className="h-3 w-3 text-yellow-300" />
              <span>×{COIN_COSTS.CARD_GENERATION}</span>
            </span>
          </span>
        </Button>

        {/* 記事のみ生成ボタン */}
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          isLoading={isLoading}
          disabled={disabled || isLoading || !isValid}
          onClick={() => handleSubmit(false)}
        >
          <span className="flex items-center justify-center gap-2">
            記事のみ生成
            <span className="flex items-center gap-0.5 rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-600">
              <CoinIcon className="h-3 w-3 text-gray-400" />
              <span>×0</span>
            </span>
          </span>
        </Button>
      </div>
    </div>
  );
}
