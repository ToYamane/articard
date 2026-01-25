'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PhaseChallenge } from '@/types/adventure';

interface ChallengeCardProps {
  challenge: PhaseChallenge;
  className?: string;
}

export function ChallengeCard({ challenge, className }: ChallengeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'rounded-xl border border-gray-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-lg dark:border-gray-700 dark:from-indigo-900/20 dark:to-purple-900/20',
        className
      )}
    >
      {/* 状況説明 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-4"
      >
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          <span className="text-lg">📍</span>
          状況
        </h3>
        <p className="text-gray-700 dark:text-gray-300">{challenge.situation}</p>
      </motion.div>

      {/* チャレンジ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-4 rounded-lg border-2 border-purple-300 bg-white/80 p-4 dark:border-purple-700 dark:bg-gray-800/50"
      >
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400">
          <span className="text-lg">🎯</span>
          ミッション
        </h3>
        <p className="font-medium text-gray-900 dark:text-gray-100">
          {challenge.challenge}
        </p>
      </motion.div>

      {/* ヒント */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-start gap-2 text-sm"
      >
        <span className="text-amber-500">💡</span>
        <p className="italic text-gray-600 dark:text-gray-400">
          ヒント: {challenge.hint}
        </p>
      </motion.div>
    </motion.div>
  );
}
