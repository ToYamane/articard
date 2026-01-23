'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { RarityBadge } from '@/components/card/rarity-badge';
import type { Rarity } from '@/types/database';

interface ShareCardData {
  id: string;
  keyword: string;
  rarity: string;
  flavorText: string;
  cardImageUrl: string;
  createdAt: string;
  owner: {
    nickname: string;
  };
}

interface ShareCardProps {
  card: ShareCardData;
  className?: string;
}

export function ShareCard({ card, className }: ShareCardProps) {
  const rarity = card.rarity as Rarity;

  return (
    <div className={cn('flex flex-col items-center gap-6', className)}>
      {/* Card Image */}
      <div className="relative h-96 w-64 overflow-hidden rounded-xl shadow-xl">
        <Image
          src={card.cardImageUrl}
          alt={card.keyword}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Card Info */}
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{card.keyword}</h1>

        <RarityBadge rarity={rarity} size="lg" />

        <p className="text-sm italic text-gray-600 dark:text-gray-400">「{card.flavorText}」</p>

        <div className="text-xs text-gray-500 dark:text-gray-500">
          作成者: {card.owner.nickname}
        </div>
      </div>
    </div>
  );
}
