'use client';

import { cn } from '@/lib/utils';
import type { Rarity } from '@/types/database';
import { RARITY_DISPLAY_NAMES } from '@/types/database';

interface RarityBadgeProps {
  rarity: Rarity;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const RARITY_COLORS: Record<Rarity, string> = {
  common: 'bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300',
  rare: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  super_rare: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  legend: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function RarityBadge({ rarity, size = 'md', className }: RarityBadgeProps) {
  const displayName = RARITY_DISPLAY_NAMES[rarity];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        RARITY_COLORS[rarity],
        SIZE_CLASSES[size],
        className
      )}
    >
      <span>{displayName}</span>
    </span>
  );
}
