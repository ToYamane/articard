'use client';

import { useState, useMemo } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { ThemeSuggestions } from './theme-suggestions';
import { themeSchema } from '@/lib/validations/article';
import { COIN_COSTS, BATCH_CARD_CONFIG } from '@/lib/constants/coins';
import { CONTENT_TYPES, CONTENT_TYPE_INFO, type ContentType } from '@/types/article';

interface ThemeInputProps {
  onSubmit: (theme: string, contentType: ContentType, cardCount: number) => void;
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

  const handleSubmit = () => {
    const result = themeSchema.safeParse(theme);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    onSubmit(theme, contentType, cardCount);
  };

  const isValid = theme.length >= 2 && theme.length <= 30;

  return (
    <div className="w-full space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-bold text-purple-700 dark:text-purple-400">
          学びたいテーマ
        </label>
        <Input
          type="text"
          name="theme"
          value={theme}
          onChange={handleChange}
          error={error}
          placeholder="学びたいテーマを入力..."
          maxLength={30}
          showCharCount
          disabled={disabled || isLoading}
          className="h-12 rounded-xl border-2 border-purple-200 bg-white/80 text-base shadow-sm focus:border-purple-500 focus:ring-purple-500/20 focus:shadow-purple-500/10 dark:border-purple-700 dark:bg-gray-800/80"
        />
      </div>

      <ThemeSuggestions
        onSelectTheme={handleSelectSuggestedTheme}
        disabled={disabled || isLoading}
      />

      {/* 文章スタイル選択 */}
      <div>
        <label className="mb-1.5 block text-sm font-bold text-purple-700 dark:text-purple-400">
          文章スタイル
        </label>
        <Select
          options={contentTypeOptions}
          value={contentType}
          onChange={(value) => setContentType(value as ContentType)}
          disabled={disabled || isLoading}
          className="h-12 rounded-xl border-2 border-purple-200 bg-white/80 text-base shadow-sm focus:border-purple-500 focus:ring-purple-500/20 dark:border-purple-700 dark:bg-gray-800/80"
        />
      </div>

      {/* カード枚数選択（サブスク者のみ表示） */}
      {isBatchEligible && (
        <div className="space-y-2 rounded-lg border border-purple-200/60 bg-gradient-to-r from-purple-100 to-blue-100 p-4 dark:border-purple-700/40 dark:from-purple-900/30 dark:to-blue-900/30">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-purple-700 dark:text-purple-400">
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
      <Button
        type="button"
        size="lg"
        className={
          isValid
            ? 'w-full h-14 rounded-xl bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 text-lg font-bold shadow-lg animate-gold-button hover:from-yellow-400 hover:via-amber-300 hover:to-yellow-400 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300'
            : 'w-full h-14 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-lg font-bold shadow-lg shadow-purple-500/30 transition-all duration-500'
        }
        isLoading={isLoading}
        disabled={disabled || isLoading || !isValid || isInsufficientCoins}
        onClick={handleSubmit}
      >
        <span className="flex items-center justify-center gap-2">
          {isBatchEligible && cardCount > 1
            ? `カード${cardCount}枚生成`
            : 'カードを生成'}
          <span className="flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs bg-white/20">
            <CoinIcon className="h-3 w-3 text-yellow-300" />
            <span>x{totalCost}</span>
          </span>
        </span>
      </Button>
    </div>
  );
}
