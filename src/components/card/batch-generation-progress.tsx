'use client';

import { motion } from 'framer-motion';
import { LoadingSpinner, Button } from '@/components/ui';
import type { BatchGenerationState, GenerationStage } from '@/hooks/use-batch-card-generation';
import type { Card } from '@prisma/client';

interface BatchGenerationProgressProps {
  state: BatchGenerationState;
  onCancel: () => void;
  /** 表示バリエーション: 'default' = 全画面, 'floating' = フローティングカード */
  variant?: 'default' | 'floating';
}

const STAGE_MESSAGES: Record<GenerationStage, string> = {
  keyword: 'キーワードを選定中...',
  context: '文脈を分析中...',
  illustration: 'イラストを生成中...',
  composing: 'カードを合成中...',
};

export function BatchGenerationProgress({
  state,
  onCancel,
  variant = 'default',
}: BatchGenerationProgressProps) {
  const { totalCount, completedCount, cards, currentStage, errors } = state;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isProcessing = completedCount < totalCount;

  // 並行処理では待ち時間はほぼ一定（1枚分程度）
  // ただし表示上は残り枚数を表示
  const remainingCards = totalCount - completedCount;

  // フローティングバリエーション
  if (variant === 'floating') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="flex items-center gap-4">
          {/* スピナー */}
          <div className="relative flex-shrink-0">
            <LoadingSpinner size="md" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-600">
                {completedCount}/{totalCount}
              </span>
            </div>
          </div>

          {/* 進捗情報 */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {isProcessing
                ? `カードを生成中... (${completedCount}/${totalCount})`
                : '生成完了!'}
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* キャンセルボタン */}
          {isProcessing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="flex-shrink-0 text-gray-500 hover:text-gray-700"
            >
              ✕
            </Button>
          )}
        </div>

        {/* 生成済みカードのサムネイル（コンパクト表示） */}
        {cards.length > 0 && (
          <div className="mt-3 flex gap-1.5 overflow-x-auto">
            {cards.map((card) => (
              <motion.img
                key={card.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                src={card.thumbnailUrl}
                alt={card.keyword}
                className="h-10 w-7 flex-shrink-0 rounded border border-gray-200 object-cover dark:border-gray-700"
              />
            ))}
          </div>
        )}

        {/* エラー表示（コンパクト） */}
        {errors.length > 0 && (
          <p className="mt-2 text-xs text-red-500">
            {errors.length}件のエラーが発生しました
          </p>
        )}
      </motion.div>
    );
  }

  // デフォルト（全画面）バリエーション
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6 py-8"
    >
      {/* メインスピナーと進捗 */}
      <div className="relative">
        <LoadingSpinner size="lg" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-blue-600">
            {completedCount}/{totalCount}
          </span>
        </div>
      </div>

      {/* 進捗メッセージ */}
      <div className="text-center">
        <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {isProcessing
            ? `${totalCount}枚を並行生成中...`
            : '生成完了!'}
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {isProcessing ? STAGE_MESSAGES[currentStage] : `${cards.length}枚のカードを生成しました`}
        </p>
      </div>

      {/* プログレスバー */}
      <div className="w-full max-w-md">
        <div className="h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-gray-500">
          <span>{completedCount}枚完了</span>
          {isProcessing && remainingCards > 0 && (
            <span>残り{remainingCards}枚</span>
          )}
        </div>
      </div>

      {/* 生成済みカードのサムネイル */}
      {cards.length > 0 && (
        <div className="w-full max-w-md">
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            生成済みカード
          </p>
          <div className="flex flex-wrap gap-2">
            {cards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <img
                  src={card.thumbnailUrl}
                  alt={card.keyword}
                  className="h-16 w-12 rounded border border-gray-200 object-cover dark:border-gray-700"
                />
                <div
                  className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900 ${
                    card.rarity === 'legend'
                      ? 'bg-yellow-500'
                      : card.rarity === 'super_rare'
                      ? 'bg-purple-500'
                      : card.rarity === 'rare'
                      ? 'bg-blue-500'
                      : 'bg-gray-400'
                  }`}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {errors.length > 0 && (
        <div className="w-full max-w-md rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            {errors.length}件のエラーが発生しました
          </p>
          <ul className="mt-1 text-xs text-red-500">
            {errors.slice(0, 3).map((error) => (
              <li key={error.index}>
                カード{error.index + 1}: {error.message}
              </li>
            ))}
            {errors.length > 3 && (
              <li>...他{errors.length - 3}件</li>
            )}
          </ul>
        </div>
      )}

      {/* キャンセルボタン */}
      {isProcessing && (
        <Button
          variant="ghost"
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          キャンセル
        </Button>
      )}
    </motion.div>
  );
}
