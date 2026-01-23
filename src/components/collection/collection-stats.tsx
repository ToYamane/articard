'use client';

import { useMemo } from 'react';
import type { Rarity } from '@/types/database';
import { RARITY_DISPLAY_NAMES } from '@/types/database';

export interface CollectionStatsData {
  totalCards: number;
  rarityBreakdown: Record<Rarity, number>;
  totalKnowledgePoints: number;
}

interface CollectionStatsProps {
  stats: CollectionStatsData;
  className?: string;
}

const RARITY_COLORS: Record<Rarity, string> = {
  common: 'bg-gray-400',
  uncommon: 'bg-green-500',
  rare: 'bg-blue-500',
  super_rare: 'bg-purple-500',
  legend: 'bg-yellow-500',
};

const RARITY_ORDER: Rarity[] = ['legend', 'super_rare', 'rare', 'uncommon', 'common'];

export function CollectionStats({ stats, className }: CollectionStatsProps) {
  const completionRate = useMemo(() => {
    const legendCount = stats.rarityBreakdown.legend || 0;
    const superRareCount = stats.rarityBreakdown.super_rare || 0;
    const rareCount = stats.rarityBreakdown.rare || 0;

    // レア度の高いカードほど重み付け
    const weightedScore = legendCount * 5 + superRareCount * 3 + rareCount * 2;
    const maxScore = stats.totalCards * 5;

    return maxScore > 0 ? Math.min(100, Math.round((weightedScore / maxScore) * 100)) : 0;
  }, [stats]);

  return (
    <div className={className}>
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        {/* 総カード数と知識ポイント */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">総カード数</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.totalCards}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">知識ポイント</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalKnowledgePoints.toLocaleString()}
            </p>
          </div>
        </div>

        {/* レア度別内訳 */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            レア度別内訳
          </p>
          <div className="space-y-1">
            {RARITY_ORDER.map((rarity) => {
              const count = stats.rarityBreakdown[rarity] || 0;
              const percentage = stats.totalCards > 0
                ? Math.round((count / stats.totalCards) * 100)
                : 0;

              return (
                <div key={rarity} className="flex items-center gap-2">
                  <span className="w-20 text-xs text-gray-600 dark:text-gray-400">
                    {RARITY_DISPLAY_NAMES[rarity]}
                  </span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full dark:bg-gray-700">
                    <div
                      className={`h-2 rounded-full ${RARITY_COLORS[rarity]}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-gray-600 dark:text-gray-400">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* コレクション充実度 */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              コレクション充実度
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {completionRate}%
            </p>
          </div>
          <div className="mt-2 h-3 bg-gray-200 rounded-full dark:bg-gray-700">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
