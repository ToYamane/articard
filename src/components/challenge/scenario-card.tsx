'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import type { ScenarioListItem } from '@/types/challenge';
import { DIFFICULTY_DISPLAY_NAMES } from '@/types/challenge';
import { getScoreRank } from '@/lib/challenge';

interface ScenarioCardProps {
  scenario: ScenarioListItem & { highScore?: number | null };
  onSelect: () => void;
  isLoading?: boolean;
  className?: string;
}

const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function ScenarioCard({
  scenario,
  onSelect,
  isLoading,
  className,
}: ScenarioCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800',
        className
      )}
    >
      {/* ヘッダー */}
      <div className="mb-4 flex items-start justify-between">
        <div className="text-4xl">{scenario.icon}</div>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium',
            DIFFICULTY_COLORS[scenario.difficulty]
          )}
        >
          {DIFFICULTY_DISPLAY_NAMES[scenario.difficulty]}
        </span>
      </div>

      {/* タイトルと説明 */}
      <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-gray-100">
        {scenario.title}
      </h3>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        {scenario.description}
      </p>

      {/* 詳細情報 */}
      <div className="mb-4 flex gap-4 text-xs text-gray-500 dark:text-gray-500">
        <span>フェーズ: {scenario.totalPhases}</span>
        <span>デッキ: {scenario.deckSize}枚</span>
      </div>

      {/* ハイスコア */}
      {scenario.highScore !== undefined && scenario.highScore !== null && (
        <div className="mb-4 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 p-3 dark:from-amber-900/20 dark:to-yellow-900/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              ハイスコア
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-amber-600 dark:text-amber-300">
                {scenario.highScore.toLocaleString()}
              </span>
              <span className={cn('text-lg', getScoreRank(scenario.highScore).color)}>
                {getScoreRank(scenario.highScore).emoji}
                {getScoreRank(scenario.highScore).rank}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <Button
        type="button"
        onClick={onSelect}
        disabled={!scenario.isAvailable || isLoading}
        isLoading={isLoading}
        className="w-full"
      >
        {scenario.isAvailable ? '挑戦する' : '近日公開'}
      </Button>
    </motion.div>
  );
}
