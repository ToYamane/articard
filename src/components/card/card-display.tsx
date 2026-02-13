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
  size?: 'sm' | 'md' | 'lg' | 'home';
  showInfo?: boolean;
  onClick?: () => void;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-32 h-48',
  md: 'w-48 h-72',
  lg: 'w-64 h-96',
  home: 'w-36 h-[216px]',
};

const RARITY_GLOW: Record<Rarity, string> = {
  common: '',
  rare: 'shadow-blue-500/40 hover:shadow-blue-500/60',
  super_rare: 'shadow-purple-500/50 hover:shadow-purple-500/70',
  legend: 'shadow-yellow-500/60 hover:shadow-yellow-500/80',
};

export function CardDisplay({ card, size = 'md', showInfo = false, onClick, className }: CardDisplayProps) {
  const rarity = card.rarity as Rarity;
  const hasGlow = rarity !== 'common';

  const sizeMap: Record<string, string> = {
    lg: '256px',
    md: '192px',
    home: '144px',
    sm: '128px',
  };

  return (
    <div className={showInfo ? 'flex flex-col items-center gap-1.5' : ''}>
      <motion.div
        whileHover={{ scale: 1.05, y: -8 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={cn(
          'relative cursor-pointer overflow-hidden rounded-lg transition-shadow duration-300',
          SIZE_CLASSES[size],
          hasGlow ? `shadow-xl ${RARITY_GLOW[rarity]}` : 'shadow-lg hover:shadow-2xl',
          className
        )}
      >
        {/* カード画像 */}
        <Image
          src={card.cardImageUrl}
          alt={card.keyword}
          fill
          className="object-cover"
          sizes={sizeMap[size] || '192px'}
        />

        {/* オーバーレイ情報（ホバー時、showInfo=false の場合のみ） */}
        {!showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3"
          >
            <h3 className="text-sm font-bold text-white">
              {card.keyword}
              {card.cardNumber && (
                <span className="ml-1 text-xs font-normal text-gray-400">#{card.cardNumber}</span>
              )}
            </h3>
            <RarityBadge rarity={rarity} size="sm" className="mt-1 w-fit" />
          </motion.div>
        )}
      </motion.div>

      {/* カード下の常時表示情報 */}
      {showInfo && (
        <div className="w-full text-center">
          <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
            {card.keyword}
          </p>
          <RarityBadge rarity={rarity} size="sm" className="mt-0.5" />
        </div>
      )}
    </div>
  );
}

// カード詳細表示コンポーネント（表裏並列表示対応）
interface CardDetailDisplayProps {
  card: Card;
  className?: string;
}

export function CardDetailDisplay({ card, className }: CardDetailDisplayProps) {
  const rarity = card.rarity as Rarity;
  const hasGlow = rarity !== 'common';
  const hasBackImage = !!card.cardBackImageUrl;

  return (
    <div className={cn('flex flex-col items-center gap-6', className)}>
      {/* カード名とレアリティ */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {card.keyword}
          {card.cardNumber && (
            <span className="ml-2 text-lg font-normal text-gray-500">#{card.cardNumber}</span>
          )}
        </h1>
        <RarityBadge rarity={rarity} size="lg" className="mt-2" />
      </motion.div>

      {/* カード画像（表裏並列） */}
      <div
        className={cn(
          'flex flex-col items-center gap-6',
          hasBackImage && 'md:flex-row md:items-start md:gap-8'
        )}
      >
        {/* 表面 */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
          className="flex flex-col items-center"
        >
          <p className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            表面
          </p>
          <div
            className={cn(
              'relative h-96 w-64 overflow-hidden rounded-xl shadow-xl',
              hasGlow && `shadow-2xl ${RARITY_GLOW[rarity]}`
            )}
          >
            <Image
              src={card.cardImageUrl}
              alt={`${card.keyword} - 表面`}
              fill
              className="object-cover"
              priority
            />
          </div>
        </motion.div>

        {/* 裏面（存在する場合のみ） */}
        {hasBackImage && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1, type: 'spring', stiffness: 200 }}
            className="flex flex-col items-center"
          >
            <p className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              裏面
            </p>
            <div
              className={cn(
                'relative h-96 w-64 overflow-hidden rounded-xl shadow-xl',
                hasGlow && `shadow-2xl ${RARITY_GLOW[rarity]}`
              )}
            >
              <Image
                src={card.cardBackImageUrl!}
                alt={`${card.keyword} - 裏面`}
                fill
                className="object-cover"
                priority
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* カード情報（裏面がない場合のみテキスト表示） */}
      {!hasBackImage && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="w-full max-w-md space-y-4 text-center"
        >
          <p className="text-sm italic text-gray-600 dark:text-gray-400">
            「{card.flavorText}」
          </p>

          <div className="text-xs text-gray-500 dark:text-gray-500">
            {formatRelativeTime(card.createdAt)}
          </div>
        </motion.div>
      )}

      {/* 裏面がある場合は日付のみ表示 */}
      {hasBackImage && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="text-xs text-gray-500 dark:text-gray-500"
        >
          {formatRelativeTime(card.createdAt)}
        </motion.div>
      )}
    </div>
  );
}
