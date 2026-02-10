'use client';

import { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button, LoadingSpinner } from '@/components/ui';
import { RarityBadge } from '@/components/card';
import { CardDetailModal } from './card-detail-modal';
import type { Card } from '@prisma/client';
import type { Rarity } from '@/types/database';

const RARITY_OPTIONS: { value: Rarity | 'all'; label: string }[] = [
  { value: 'all', label: '全て' },
  { value: 'common', label: 'コモン' },
  { value: 'rare', label: 'レア' },
  { value: 'super_rare', label: 'Sレア' },
  { value: 'legend', label: 'レジェンド' },
];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'all'>('all');
  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const shouldReduceMotion = useReducedMotion();

  // フィルタリングされたカード一覧
  const filteredCards = useMemo(() => {
    return availableCards.filter((card) => {
      // カード名検索
      if (searchQuery && !card.keyword.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // レアリティフィルター
      if (rarityFilter !== 'all' && card.rarity !== rarityFilter) {
        return false;
      }
      return true;
    });
  }, [availableCards, searchQuery, rarityFilter]);

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
                  'relative h-24 w-16 overflow-hidden rounded-lg border-2',
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
                      aria-label="カードを外す"
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
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 検索・フィルター */}
      <div className="space-y-3">
        {/* カード名検索 */}
        <div className="relative">
          <input
            type="text"
            placeholder="カード名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pl-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* レアリティフィルター */}
        <div className="flex flex-wrap gap-2">
          {RARITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRarityFilter(option.value)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                rarityFilter === option.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* フィルター結果数 */}
        {(searchQuery || rarityFilter !== 'all') && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {filteredCards.length}件のカードが見つかりました
          </p>
        )}
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
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6" role="group" aria-label="カード一覧">
          {filteredCards.map((card) => {
            const isSelected = selectedCardIds.has(card.id);
            const canSelect = isSelected || selectedCardIds.size < deckSize;

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

                  {/* 選択インジケーター */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute left-1 top-1 rounded-full bg-blue-500 p-1"
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
          {isComplete ? 'チャレンジ開始' : `残り${deckSize - selectedCardIds.size}枚選択`}
        </Button>
      </div>

      {/* カード詳細モーダル */}
      <CardDetailModal
        card={detailCard ? {
          id: detailCard.id,
          keyword: detailCard.keyword,
          rarity: detailCard.rarity,
          thumbnailUrl: detailCard.thumbnailUrl,
          cardImageUrl: detailCard.cardImageUrl,
          flavorText: detailCard.flavorText,
          contextDescription: detailCard.contextDescription,
        } : null}
        isOpen={!!detailCard}
        onClose={() => setDetailCard(null)}
      />
    </div>
  );
}
