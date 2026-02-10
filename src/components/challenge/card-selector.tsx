'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { RarityBadge } from '@/components/card';
import { CardDetailModal } from './card-detail-modal';
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

interface CardSelectorProps {
  availableCards: CardData[];
  requiredCount: number;
  onSubmit: (cardIds: string[]) => void;
  isSubmitting?: boolean;
  className?: string;
}

export function CardSelector({
  availableCards,
  requiredCount,
  onSubmit,
  isSubmitting,
  className,
}: CardSelectorProps) {
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [detailCard, setDetailCard] = useState<CardData | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const toggleCard = useCallback(
    (cardId: string) => {
      setSelectedCardIds((prev) => {
        if (prev.includes(cardId)) {
          return prev.filter((id) => id !== cardId);
        } else if (prev.length < requiredCount) {
          return [...prev, cardId];
        }
        return prev;
      });
    },
    [requiredCount]
  );

  const handleSubmit = useCallback(() => {
    if (selectedCardIds.length === requiredCount) {
      onSubmit(selectedCardIds);
    }
  }, [selectedCardIds, requiredCount, onSubmit]);

  const isComplete = selectedCardIds.length === requiredCount;

  return (
    <div className={cn('flex flex-col', className)}>
      {/* 選択状況 */}
      <div className="flex-shrink-0 pb-2 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          カードを{requiredCount}枚選択してください
        </p>
        <div className="mt-1 flex justify-center gap-2">
          {Array.from({ length: requiredCount }).map((_, index) => (
            <motion.div
              key={index}
              className={cn(
                'h-3 w-3 rounded-full',
                index < selectedCardIds.length
                  ? 'bg-blue-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              )}
              animate={{
                scale: index < selectedCardIds.length ? [1, 1.2, 1] : 1,
              }}
            />
          ))}
        </div>
      </div>

      {/* カード一覧 - スクロール可能 */}
      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5" role="group" aria-label="カード選択">
        {availableCards.map((card) => {
          const isSelected = selectedCardIds.includes(card.id);
          const canSelect = isSelected || selectedCardIds.length < requiredCount;
          const selectionOrder = selectedCardIds.indexOf(card.id) + 1;

          return (
            <motion.button
              key={card.id}
              whileHover={shouldReduceMotion ? undefined : { scale: canSelect ? 1.05 : 1 }}
              whileTap={shouldReduceMotion ? undefined : { scale: canSelect ? 0.95 : 1 }}
              onClick={() => canSelect && toggleCard(card.id)}
              disabled={!canSelect}
              className={cn(
                'relative overflow-hidden rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none',
                isSelected
                  ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900'
                  : canSelect
                  ? 'opacity-100 hover:opacity-90'
                  : 'cursor-not-allowed opacity-40'
              )}
            >
              <div className="relative aspect-[2/3] w-full">
                <Image
                  src={card.thumbnailUrl}
                  alt={card.keyword}
                  fill
                  className="object-cover"
                  sizes="120px"
                />

                {/* 詳細ボタン */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailCard(card);
                  }}
                  className="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs text-white hover:bg-black/70"
                  aria-label={`${card.keyword}の詳細を見る`}
                >
                  i
                </button>

                {/* 選択番号 */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-blue-500 text-lg font-bold text-white shadow-lg"
                    >
                      {selectionOrder}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* カード名 */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="truncate text-xs font-medium text-white">
                  {card.keyword}
                </p>
                <RarityBadge
                  rarity={card.rarity as Rarity}
                  size="sm"
                  className="mt-0.5"
                />
              </div>
            </motion.button>
          );
        })}
        </div>
      </div>

      {/* 送信ボタン */}
      <div className="flex flex-shrink-0 justify-center pt-2">
        <Button
          onClick={handleSubmit}
          disabled={!isComplete || isSubmitting}
          isLoading={isSubmitting}
          size="lg"
        >
          {isComplete ? 'このカードで挑戦!' : `残り${requiredCount - selectedCardIds.length}枚`}
        </Button>
      </div>

      {/* カード詳細モーダル */}
      <CardDetailModal card={detailCard} isOpen={!!detailCard} onClose={() => setDetailCard(null)} />
    </div>
  );
}
