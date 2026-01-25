'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';

interface PhaseResult {
  phaseNumber: number;
  fitScore: number;
  totalScore: number;
}

interface AdventureCompleteProps {
  scenarioTitle: string;
  totalScore: number;
  phaseResults: PhaseResult[];
  summary?: string;
  onPlayAgain: () => void;
  onBackToScenarios: () => void;
  className?: string;
}

function getScoreRank(score: number): {
  rank: string;
  emoji: string;
  color: string;
} {
  if (score >= 800) return { rank: 'S', emoji: '🏆', color: 'text-yellow-500' };
  if (score >= 600) return { rank: 'A', emoji: '🌟', color: 'text-purple-500' };
  if (score >= 400) return { rank: 'B', emoji: '👍', color: 'text-blue-500' };
  if (score >= 200) return { rank: 'C', emoji: '💪', color: 'text-green-500' };
  return { rank: 'D', emoji: '🌱', color: 'text-gray-500' };
}

export function AdventureComplete({
  scenarioTitle,
  totalScore,
  phaseResults,
  summary,
  onPlayAgain,
  onBackToScenarios,
  className,
}: AdventureCompleteProps) {
  const { rank, emoji, color } = getScoreRank(totalScore);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('space-y-8 py-8 text-center', className)}
    >
      {/* 完了表示 */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        <div className="mb-4 text-6xl">{emoji}</div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          アドベンチャー完了!
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{scenarioTitle}</p>
      </motion.div>

      {/* スコアとランク */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-2"
      >
        <div className={cn('text-6xl font-bold', color)}>{totalScore}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">総合スコア</div>
        <div
          className={cn(
            'mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-full border-4 text-2xl font-bold',
            color,
            rank === 'S'
              ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
              : rank === 'A'
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
              : rank === 'B'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : rank === 'C'
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-400 bg-gray-50 dark:bg-gray-800'
          )}
        >
          {rank}
        </div>
      </motion.div>

      {/* フェーズ別結果 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
      >
        <h3 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">
          フェーズ別スコア
        </h3>
        <div className="space-y-3">
          {phaseResults.map((result, index) => (
            <motion.div
              key={result.phaseNumber}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-gray-600 dark:text-gray-400">
                フェーズ {result.phaseNumber}
              </span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.fitScore}%` }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                    className={cn(
                      'h-full rounded-full',
                      result.fitScore >= 90
                        ? 'bg-green-500'
                        : result.fitScore >= 60
                        ? 'bg-blue-500'
                        : result.fitScore >= 30
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    )}
                  />
                </div>
                <span className="w-12 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                  +{result.totalScore}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* AIサマリー */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mx-auto max-w-md rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 dark:border-purple-800 dark:from-purple-900/20 dark:to-indigo-900/20"
        >
          <div className="mb-3 text-2xl">🎙️</div>
          <p className="whitespace-pre-line text-gray-700 dark:text-gray-300">
            {summary}
          </p>
        </motion.div>
      )}

      {/* アクションボタン */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex flex-col items-center gap-3 pt-4"
      >
        <Button onClick={onPlayAgain} size="lg">
          もう一度挑戦
        </Button>
        <Button onClick={onBackToScenarios} variant="ghost">
          シナリオ選択に戻る
        </Button>
      </motion.div>
    </motion.div>
  );
}
