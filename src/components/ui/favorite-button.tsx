'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZE_MAP = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
};

const BUTTON_SIZE_MAP = {
  sm: 'p-1',
  md: 'p-1.5',
};

export function FavoriteButton({
  isFavorite,
  onToggle,
  size = 'md',
  className,
}: FavoriteButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggle();
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileTap={{ scale: 0.8 }}
      className={cn(
        'rounded-full transition-colors',
        BUTTON_SIZE_MAP[size],
        isFavorite ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-400',
        className
      )}
    >
      <motion.svg
        animate={isFavorite ? { scale: [1, 1.3, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
        className={SIZE_MAP[size]}
        viewBox="0 0 24 24"
        fill={isFavorite ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        />
      </motion.svg>
    </motion.button>
  );
}
