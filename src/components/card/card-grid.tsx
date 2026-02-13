'use client';

import { cn } from '@/lib/utils';
import { CardDisplay } from './card-display';
import type { Card } from '@prisma/client';

interface CardGridProps {
  cards: Card[];
  variant?: 'default' | 'home';
  onCardClick?: (card: Card) => void;
  className?: string;
}

const GRID_CLASSES = {
  default: 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
  home: 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
};

export function CardGrid({ cards, variant = 'default', onCardClick, className }: CardGridProps) {
  if (cards.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          カードがありません
        </p>
      </div>
    );
  }

  const isHome = variant === 'home';

  return (
    <div className={cn(GRID_CLASSES[variant], className)}>
      {cards.map((card) => (
        <div key={card.id} className="flex justify-center">
          <CardDisplay
            card={card}
            size={isHome ? 'home' : 'sm'}
            showInfo={isHome}
            onClick={() => onCardClick?.(card)}
          />
        </div>
      ))}
    </div>
  );
}
