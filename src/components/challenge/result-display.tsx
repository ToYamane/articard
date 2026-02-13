'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { RarityBadge } from '@/components/card';
import type { Rarity } from '@/types/database';

interface CardData {
  id: string;
  keyword: string;
  rarity: string;
  thumbnailUrl?: string;
}

interface EvaluationResult {
  fitScore: number;
  bonusScore: number;
  totalScore: number;
  connectionExplanation: string;
  narrativeDescription: string;
  humorComment: string;
}

interface ResultDisplayProps {
  phaseNumber: number;
  challenge: string;
  selectedCards: CardData[];
  evaluation: EvaluationResult;
  onContinue: () => void;
  isLastPhase?: boolean;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-500';
  if (score >= 60) return 'text-blue-500';
  if (score >= 30) return 'text-yellow-500';
  return 'text-red-500';
}

function getScoreEmoji(score: number): string {
  if (score >= 90) return '🌟';
  if (score >= 60) return '👍';
  if (score >= 30) return '🤔';
  return '😅';
}

export function ResultDisplay({
  phaseNumber,
  challenge,
  selectedCards,
  evaluation,
  onContinue,
  isLastPhase,
  className,
}: ResultDisplayProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('space-y-6', className)}
    >
      {/* スコア表示 */}
      <motion.div
        initial={shouldReduceMotion ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 200, delay: 0.2 }}
        className="text-center"
      >
        <div className="mb-2 text-4xl" aria-hidden="true">{getScoreEmoji(evaluation.fitScore)}</div>
        <div
          className={cn(
            'text-5xl font-bold',
            getScoreColor(evaluation.fitScore)
          )}
        >
          +{evaluation.totalScore}
        </div>
        <div className="mt-2 flex justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>適合度: {evaluation.fitScore}/100</span>
          {evaluation.bonusScore > 0 && (
            <span className="text-amber-500">ボーナス: +{evaluation.bonusScore}</span>
          )}
        </div>
      </motion.div>

      {/* 使用したカード */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.4 }}
        className="flex justify-center gap-4"
      >
        {selectedCards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={shouldReduceMotion ? false : { opacity: 0, x: index === 0 ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.5 + index * 0.1 }}
            className="text-center"
          >
            {card.thumbnailUrl && (
              <div className="relative mx-auto mb-2 h-16 w-11 overflow-hidden rounded-md">
                <Image
                  src={card.thumbnailUrl}
                  alt={card.keyword}
                  fill
                  className="object-cover"
                  sizes="44px"
                />
              </div>
            )}
            <div className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              {card.keyword}
            </div>
            <RarityBadge rarity={card.rarity as Rarity} size="sm" />
          </motion.div>
        ))}
      </motion.div>

      {/* AI解説 */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.6 }}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-950"
      >
        {/* 接続説明 */}
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <span aria-hidden="true">🔗</span>
            なぜこのカードが効いたのか
          </h4>
          <p className="text-gray-600 dark:text-gray-400">
            {evaluation.connectionExplanation}
          </p>
        </div>

        {/* ナラティブ */}
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <span aria-hidden="true">📖</span>
            物語
          </h4>
          <p className="whitespace-pre-line italic text-gray-700 dark:text-gray-300">
            {evaluation.narrativeDescription}
          </p>
        </div>

        {/* ユーモアコメント */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 p-4 dark:from-purple-900/20 dark:to-indigo-900/20"
        >
          <p className="flex items-start gap-2 text-sm">
            <span className="text-lg" aria-hidden="true">🎙️</span>
            <span className="text-gray-700 dark:text-gray-300">
              {evaluation.humorComment}
            </span>
          </p>
        </motion.div>
      </motion.div>

      {/* 続行ボタン */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex justify-center pt-4"
      >
        <Button onClick={onContinue} size="lg">
          {isLastPhase ? '結果を見る' : '次のフェーズへ'}
        </Button>
      </motion.div>
    </motion.div>
  );
}
