'use client';

import { motion } from 'framer-motion';
import { CardPack, type CardPackState } from './card-pack';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface CardPackSectionProps {
  state: CardPackState | 'error';
  onPackClick: () => void;
  error?: string | null;
  onRetry?: () => void;
  onNavigateToCardPage?: () => void;
  className?: string;
}

export function CardPackSection({
  state,
  onPackClick,
  error,
  onRetry,
  onNavigateToCardPage,
  className,
}: CardPackSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className={cn(
        'mt-8 rounded-2xl bg-gradient-to-b from-gray-100 to-gray-200 p-6 dark:from-gray-800 dark:to-gray-900',
        className
      )}
    >
      <div className="flex flex-col items-center">
        {state === 'error' ? (
          <ErrorState
            error={error}
            onRetry={onRetry}
            onNavigateToCardPage={onNavigateToCardPage}
          />
        ) : (
          <CardPack
            state={state}
            onClick={onPackClick}
          />
        )}
      </div>
    </motion.div>
  );
}

interface ErrorStateProps {
  error?: string | null;
  onRetry?: () => void;
  onNavigateToCardPage?: () => void;
}

function ErrorState({ error, onRetry, onNavigateToCardPage }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-4 py-4 text-center"
    >
      {/* エラーアイコン */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <svg
          className="h-8 w-8 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      {/* エラーメッセージ */}
      <div>
        <p className="font-medium text-gray-900 dark:text-gray-100">
          カード生成に失敗しました
        </p>
        {error && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {error}
          </p>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="primary" size="sm">
            再試行する
          </Button>
        )}
        {onNavigateToCardPage && (
          <Button onClick={onNavigateToCardPage} variant="secondary" size="sm">
            後で生成する
          </Button>
        )}
      </div>
    </motion.div>
  );
}
