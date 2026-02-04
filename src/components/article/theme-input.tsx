'use client';

import { useState, useMemo } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { ThemeSuggestions } from './theme-suggestions';
import { themeSchema } from '@/lib/validations/article';
import { COIN_COSTS, BATCH_CARD_CONFIG } from '@/lib/constants/coins';
import { CONTENT_TYPES, CONTENT_TYPE_INFO, type ContentType } from '@/types/article';

interface ThemeInputProps {
  onSubmit: (theme: string, withCard: boolean, contentType: ContentType, cardCount: number) => void;
  isLoading?: boolean;
  disabled?: boolean;
  /** バッチ生成可能か（サブスク者のみtrue） */
  isBatchEligible?: boolean;
  /** コイン残高 */
  coinBalance?: number;
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
  isBatchEligible = false,
  coinBalance = 0,
}: ThemeInputProps) {
  const [theme, setTheme] = useState('');
  const [error, setError] = useState('');
  const [contentType, setContentType] = useState<ContentType>('essay');
  const [cardCount, setCardCount] = useState(1);

  const contentTypeOptions = useMemo(
    () =>
      CONTENT_TYPES.map((type) => ({
        value: type,
        label: CONTENT_TYPE_INFO[type].label,
      })),
    []
  );

  // 生成可能な最大枚数を計算
  const maxGeneratable = useMemo(() => {
    if (!isBatchEligible) return 1;
    const maxAffordable = Math.floor(coinBalance / COIN_COSTS.CARD_GENERATION);
    return Math.min(BATCH_CARD_CONFIG.MAX_BATCH_SIZE, Math.max(1, maxAffordable));
  }, [isBatchEligible, coinBalance]);

  // 合計コスト
  const totalCost = cardCount * COIN_COSTS.CARD_GENERATION;

  // コイン不足かどうか
  const isInsufficientCoins = totalCost > coinBalance;

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

    onSubmit(theme, withCard, contentType, withCard ? cardCount : 0);
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
      <Select
        label="文章スタイル"
        options={contentTypeOptions}
        value={contentType}
        onChange={(value) => setContentType(value as ContentType)}
        disabled={disabled || isLoading}
      />

      {/* カード枚数選択（サブスク者のみ表示） */}
      {isBatchEligible && (
        <div className="space-y-2 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 p-4 dark:from-purple-900/20 dark:to-blue-900/20">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              カード生成枚数
            </label>
            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {cardCount}枚
            </span>
          </div>

          <input
            type="range"
            min={1}
            max={maxGeneratable}
            value={cardCount}
            onChange={(e) => setCardCount(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-purple-600"
            disabled={disabled || isLoading || maxGeneratable <= 1}
          />

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>1枚</span>
            <span>{maxGeneratable}枚</span>
          </div>

          <div className="flex items-center justify-center gap-1 text-sm">
            <span className="text-gray-600 dark:text-gray-400">消費コイン:</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">{totalCost}</span>
            <span className="text-gray-500">({COIN_COSTS.CARD_GENERATION} x {cardCount})</span>
          </div>

          {isInsufficientCoins && (
            <p className="text-center text-xs text-red-500">
              コインが不足しています（残高: {coinBalance}）
            </p>
          )}
        </div>
      )}

      {/* 生成ボタン */}
      <div className="flex gap-3">
        {/* 記事＋カード生成ボタン */}
        <Button
          type="button"
          className="flex-1"
          isLoading={isLoading}
          disabled={disabled || isLoading || !isValid || isInsufficientCoins}
          onClick={() => handleSubmit(true)}
        >
          <span className="flex items-center justify-center gap-2">
            {isBatchEligible && cardCount > 1
              ? `記事＋カード${cardCount}枚生成`
              : '記事＋カード生成'}
            <span className="flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-xs">
              <CoinIcon className="h-3 w-3 text-yellow-300" />
              <span>x{totalCost}</span>
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
              <span>x0</span>
            </span>
          </span>
        </Button>
      </div>
    </div>
  );
}
