'use client';

import { Modal } from '@/components/ui';
import { ShareButtons } from './share-buttons';
import type { Rarity } from '@/types/database';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
  keyword: string;
  rarity: Rarity;
  flavorText: string;
  cardImageUrl: string;
}

export function ShareModal({
  isOpen,
  onClose,
  cardId,
  keyword,
  rarity,
  flavorText,
  cardImageUrl,
}: ShareModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="カードを共有">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          「{keyword}」のカードをSNSで共有しましょう
        </p>
        <ShareButtons
          cardId={cardId}
          keyword={keyword}
          rarity={rarity}
          flavorText={flavorText}
          cardImageUrl={cardImageUrl}
        />
      </div>
    </Modal>
  );
}
