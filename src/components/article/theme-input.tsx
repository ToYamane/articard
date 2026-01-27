'use client';

import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { ThemeSuggestions } from './theme-suggestions';
import { themeSchema } from '@/lib/validations/article';
import { COIN_COSTS } from '@/lib/constants/coins';

interface ThemeInputProps {
  onSubmit: (theme: string, withCard: boolean) => void;
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

    onSubmit(theme, withCard);
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
        例: 「万有引力の発見」「恐竜の絶滅」「光合成のしくみ」
      </p>

      <ThemeSuggestions
        onSelectTheme={handleSelectSuggestedTheme}
        disabled={disabled || isLoading}
      />

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
