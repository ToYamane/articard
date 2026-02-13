'use client';

import Image from 'next/image';
import { Modal } from '@/components/ui/modal';
import { RarityBadge } from '@/components/card';
import type { Rarity } from '@/types/database';

interface CardData {
  id: string;
  keyword: string;
  rarity: string;
  thumbnailUrl: string;
  cardImageUrl: string;
  flavorText: string;
  contextDescription: string;
}

interface CardDetailModalProps {
  card: CardData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CardDetailModal({ card, isOpen, onClose }: CardDetailModalProps) {
  if (!card) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={card.keyword}>
      <div className="space-y-4">
        {/* Card Image */}
        <div className="relative mx-auto aspect-[2/3] w-48 overflow-hidden rounded-lg">
          <Image
            src={card.cardImageUrl}
            alt={card.keyword}
            fill
            className="object-cover"
            sizes="192px"
          />
        </div>

        {/* Rarity */}
        <div className="flex justify-center">
          <RarityBadge rarity={card.rarity as Rarity} />
        </div>

        {/* Flavor Text */}
        {card.flavorText && (
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-950">
            <p className="text-sm italic text-gray-600 dark:text-gray-400">
              {card.flavorText}
            </p>
          </div>
        )}

        {/* Context Description */}
        {card.contextDescription && (
          <div>
            <h4 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
              説明
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {card.contextDescription}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
