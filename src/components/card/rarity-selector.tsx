'use client';

import { cn } from '@/lib/utils';
import type { Rarity } from '@/types/database';
import { RARITY_DISPLAY_NAMES, RARITY_STARS } from '@/types/database';

export interface RaritySelectorProps {
  value: Rarity | undefined;
  onChange: (rarity: Rarity | undefined) => void;
  disabled?: boolean;
  className?: string;
}

const RARITIES: Rarity[] = ['common', 'rare', 'super_rare', 'legend'];

const RARITY_COLORS: Record<Rarity, string> = {
  common: 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-900',
  rare: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50',
  super_rare: 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-600 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50',
  legend: 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50',
};

const RARITY_SELECTED_COLORS: Record<Rarity, string> = {
  common: 'border-gray-500 bg-gray-200 dark:border-gray-400 dark:bg-gray-900',
  rare: 'border-blue-500 bg-blue-200 dark:border-blue-400 dark:bg-blue-800/50',
  super_rare: 'border-purple-500 bg-purple-200 dark:border-purple-400 dark:bg-purple-800/50',
  legend: 'border-yellow-500 bg-yellow-200 dark:border-yellow-400 dark:bg-yellow-800/50',
};

export function RaritySelector({
  value,
  onChange,
  disabled,
  className,
}: RaritySelectorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          レアリティ指定（開発者モード）
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            disabled={disabled}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            クリア
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {RARITIES.map((rarity) => {
          const isSelected = value === rarity;
          const stars = RARITY_STARS[rarity];
          const displayName = RARITY_DISPLAY_NAMES[rarity];

          return (
            <button
              key={rarity}
              type="button"
              onClick={() => onChange(isSelected ? undefined : rarity)}
              disabled={disabled}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-50',
                isSelected
                  ? RARITY_SELECTED_COLORS[rarity]
                  : RARITY_COLORS[rarity]
              )}
            >
              <span className="flex text-yellow-500">
                {Array.from({ length: stars }).map((_, i) => (
                  <span key={i}>★</span>
                ))}
              </span>
              <span>{displayName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
