'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import { RarityBadge } from './rarity-badge';
import type { Card } from '@prisma/client';
import type { Rarity } from '@/types/database';

interface CardDisplayProps {
  card: Card;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-32 h-48',
  md: 'w-48 h-72',
  lg: 'w-64 h-96',
};

const RARITY_GLOW: Record<Rarity, string> = {
  common: '',
  uncommon: 'shadow-green-500/20',
  rare: 'shadow-blue-500/30',
  super_rare: 'shadow-purple-500/40',
  legend: 'shadow-yellow-500/50',
};

export function CardDisplay({ card, size = 'md', onClick, className }: CardDisplayProps) {
  const rarity = card.rarity as Rarity;
  const hasGlow = rarity !== 'common';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative cursor-pointer overflow-hidden rounded-lg',
        SIZE_CLASSES[size],
        hasGlow && `shadow-lg ${RARITY_GLOW[rarity]}`,
        className
      )}
    >
      {/* カード画像 */}
      <Image
        src={card.cardImageUrl}
        alt={card.keyword}
        fill
        className="object-cover"
        sizes={size === 'lg' ? '256px' : size === 'md' ? '192px' : '128px'}
      />

      {/* オーバーレイ情報（ホバー時） */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3"
      >
        <h3 className="text-sm font-bold text-white">{card.keyword}</h3>
        <RarityBadge rarity={rarity} size="sm" className="mt-1 w-fit" />
      </motion.div>
    </motion.div>
  );
}

// カード詳細表示コンポーネント
interface CardDetailDisplayProps {
  card: Card;
  className?: string;
}

export function CardDetailDisplay({ card, className }: CardDetailDisplayProps) {
  const rarity = card.rarity as Rarity;
  const hasGlow = rarity !== 'common';

  return (
    <div className={cn('flex flex-col items-center gap-6', className)}>
      {/* カード画像（大） */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
        className={cn(
          'relative h-96 w-64 overflow-hidden rounded-xl shadow-xl',
          hasGlow && `shadow-2xl ${RARITY_GLOW[rarity]}`
        )}
      >
        <Image
          src={card.cardImageUrl}
          alt={card.keyword}
          fill
          className="object-cover"
          priority
        />
      </motion.div>

      {/* カード情報 */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="w-full max-w-md space-y-4 text-center"
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {card.keyword}
        </h1>

        <RarityBadge rarity={rarity} size="lg" />

        <p className="text-sm italic text-gray-600 dark:text-gray-400">
          「{card.flavorText}」
        </p>

        <div className="text-xs text-gray-500 dark:text-gray-500">
          {formatRelativeTime(card.createdAt)}
        </div>
      </motion.div>
    </div>
  );
}
