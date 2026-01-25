'use client';

import { useState } from 'react';
import { Button, Input, ToggleSwitch } from '@/components/ui';
import { ThemeSuggestions } from './theme-suggestions';
import { themeSchema } from '@/lib/validations/article';

interface ThemeInputProps {
  onSubmit: (theme: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  autoCardEnabled?: boolean;
  onAutoCardToggle?: (enabled: boolean) => void;
}

export function ThemeInput({
  onSubmit,
  isLoading,
  disabled,
  autoCardEnabled = false,
  onAutoCardToggle,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = themeSchema.safeParse(theme);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    onSubmit(theme);
  };

  const isValid = theme.length >= 2 && theme.length <= 30;

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
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

      {/* カード同時生成トグル */}
      {onAutoCardToggle && (
        <div className="flex items-center justify-center rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
          <ToggleSwitch
            checked={autoCardEnabled}
            onChange={onAutoCardToggle}
            label="カード同時生成"
            disabled={disabled || isLoading}
          />
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        isLoading={isLoading}
        disabled={disabled || isLoading || !isValid}
      >
        記事を生成する
      </Button>
    </form>
  );
}
