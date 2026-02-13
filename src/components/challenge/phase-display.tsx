'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PhaseDefinition } from '@/types/challenge';

interface PhaseDisplayProps {
  phase: PhaseDefinition;
  currentPhase: number;
  totalPhases: number;
  totalScore: number;
  className?: string;
}

export function PhaseDisplay({
  phase,
  currentPhase,
  totalPhases,
  totalScore,
  className,
}: PhaseDisplayProps) {
  const shouldReduceMotion = useReducedMotion();
  const progress = ((currentPhase - 1) / totalPhases) * 100;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-950',
        className
      )}
    >
      {/* 進行状況 */}
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          フェーズ {currentPhase} / {totalPhases}
        </span>
        <span className="font-bold text-blue-600 dark:text-blue-400">
          スコア: {totalScore}
        </span>
      </div>

      {/* プログレスバー */}
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-900">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
        />
      </div>

      {/* フェーズ情報 */}
      <div className="text-center">
        <motion.h2
          key={phase.phaseNumber}
          initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100"
        >
          {phase.title}
        </motion.h2>
        <motion.p
          key={`desc-${phase.phaseNumber}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm text-gray-600 dark:text-gray-400"
        >
          {phase.description}
        </motion.p>
      </div>

      {/* フェーズ詳細 */}
      <div className="mt-4 flex justify-center gap-4 text-xs text-gray-500 dark:text-gray-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          {phase.cardCount === 1 ? '1枚選択' : phase.cardCount === 2 ? '2枚選択（コンボ）' : '3枚選択（トリプル）'}
        </span>
        {phase.consumesCard && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            カード消費
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          基本点 {phase.baseScore}
        </span>
      </div>
    </motion.div>
  );
}

// フェーズインジケーター（タイムライン表示）
interface PhaseTimelineProps {
  totalPhases: number;
  currentPhase: number;
  completedPhases: number[];
  className?: string;
}

export function PhaseTimeline({
  totalPhases,
  currentPhase,
  completedPhases,
  className,
}: PhaseTimelineProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {Array.from({ length: totalPhases }).map((_, index) => {
        const phaseNumber = index + 1;
        const isCompleted = completedPhases.includes(phaseNumber);
        const isCurrent = phaseNumber === currentPhase;

        return (
          <div key={phaseNumber} className="flex items-center">
            <motion.div
              initial={shouldReduceMotion ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={shouldReduceMotion ? { duration: 0 } : { delay: index * 0.1 }}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                isCompleted
                  ? 'bg-green-500 text-white'
                  : isCurrent
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-500 dark:bg-gray-900 dark:text-gray-400'
              )}
            >
              {isCompleted ? (
                <svg
                  className="h-4 w-4"
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
              ) : (
                phaseNumber
              )}
            </motion.div>
            {phaseNumber < totalPhases && (
              <div
                className={cn(
                  'h-1 w-6',
                  isCompleted
                    ? 'bg-green-500'
                    : 'bg-gray-200 dark:bg-gray-900'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
