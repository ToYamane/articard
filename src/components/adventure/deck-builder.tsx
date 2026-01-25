'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button, LoadingSpinner } from '@/components/ui';
import { RarityBadge } from '@/components/card';
import type { Card } from '@prisma/client';
import type { Rarity } from '@/types/database';

interface DeckBuilderProps {
  availableCards: Card[];
  deckSize: number;
  onSubmit: (cardIds: string[]) => void;
  isSubmitting?: boolean;
  className?: string;
}

export function DeckBuilder({
  availableCards,
  deckSize,
  onSubmit,
  isSubmitting,
  className,
}: DeckBuilderProps) {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  const toggleCard = useCallback(
    (cardId: string) => {
      setSelectedCardIds((prev) => {
        const next = new Set(prev);
        if (next.has(cardId)) {
          next.delete(cardId);
        } else if (next.size < deckSize) {
          next.add(cardId);
        }
        return next;
      });
    },
    [deckSize]
  );

  const handleSubmit = useCallback(() => {
    if (selectedCardIds.size === deckSize) {
      onSubmit(Array.from(selectedCardIds));
    }
  }, [selectedCardIds, deckSize, onSubmit]);

  const isComplete = selectedCardIds.size === deckSize;

  return (
    <div className={cn('space-y-6', className)}>
      {/* ヘッダー */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          デッキを編成
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {deckSize}枚のカードを選択してください
        </p>
        <div className="mt-2">
          <span
            className={cn(
              'text-lg font-bold',
              isComplete
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-600 dark:text-gray-400'
            )}
          >
            {selectedCardIds.size} / {deckSize}
          </span>
        </div>
      </div>

      {/* 選択済みデッキプレビュー */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          選択中のデッキ
        </p>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: deckSize }).map((_, index) => {
            const cardId = Array.from(selectedCardIds)[index];
            const card = cardId
              ? availableCards.find((c) => c.id === cardId)
              : null;

            return (
              <motion.div
                key={index}
                layout
                className={cn(
                  'relative h-20 w-14 overflow-hidden rounded-lg border-2',
                  card
                    ? 'border-blue-500 dark:border-blue-400'
                    : 'border-dashed border-gray-300 dark:border-gray-600'
                )}
              >
                {card ? (
                  <>
                    <Image
                      src={card.thumbnailUrl}
                      alt={card.keyword}
                      fill
                      className="object-cover"
                    />
                    <button
                      onClick={() => toggleCard(card.id)}
                      className="absolute right-0 top-0 rounded-bl-lg bg-red-500 p-1 text-white hover:bg-red-600"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400">
                    <span className="text-lg">?</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* カード一覧 */}
      {availableCards.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            カードがありません
          </p>
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            まず記事を作成してカードを生成してください
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {availableCards.map((card) => {
            const isSelected = selectedCardIds.has(card.id);
            const canSelect = isSelected || selectedCardIds.size < deckSize;

            return (
              <motion.button
                key={card.id}
                whileHover={{ scale: canSelect ? 1.05 : 1 }}
                whileTap={{ scale: canSelect ? 0.95 : 1 }}
                onClick={() => canSelect && toggleCard(card.id)}
                disabled={!canSelect}
                className={cn(
                  'relative overflow-hidden rounded-lg transition-all',
                  isSelected
                    ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900'
                    : canSelect
                    ? 'opacity-100 hover:opacity-90'
                    : 'cursor-not-allowed opacity-50'
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
                  {/* 選択インジケーター */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute right-1 top-1 rounded-full bg-blue-500 p-1"
                      >
                        <svg
                          className="h-3 w-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {/* カード名とレアリティ */}
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
      )}

      {/* 送信ボタン */}
      <div className="sticky bottom-4 flex justify-center">
        <Button
          onClick={handleSubmit}
          disabled={!isComplete || isSubmitting}
          isLoading={isSubmitting}
          size="lg"
          className="shadow-lg"
        >
          {isComplete ? 'アドベンチャー開始' : `残り${deckSize - selectedCardIds.size}枚選択`}
        </Button>
      </div>
    </div>
  );
}
