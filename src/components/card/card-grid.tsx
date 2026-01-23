'use client';

import { cn } from '@/lib/utils';
import { CardDisplay } from './card-display';
import type { Card } from '@prisma/client';

interface CardGridProps {
  cards: Card[];
  onCardClick?: (card: Card) => void;
  className?: string;
}

export function CardGrid({ cards, onCardClick, className }: CardGridProps) {
  if (cards.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          カードがありません
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
        className
      )}
    >
      {cards.map((card) => (
        <CardDisplay
          key={card.id}
          card={card}
          size="sm"
          onClick={() => onCardClick?.(card)}
        />
      ))}
    </div>
  );
}
