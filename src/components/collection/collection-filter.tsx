'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import type { Rarity, ContextCategory } from '@/types/database';
import { RARITY_DISPLAY_NAMES, CONTEXT_CATEGORY_DISPLAY_NAMES } from '@/types/database';

export interface FilterState {
  rarity: Rarity[];
  contextCategory: ContextCategory[];
  sortBy: 'createdAt' | 'rarity' | 'keyword';
  sortOrder: 'asc' | 'desc';
}

interface CollectionFilterProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilter: FilterState;
  onApply: (filter: FilterState) => void;
}

const RARITY_OPTIONS: Rarity[] = ['common', 'uncommon', 'rare', 'super_rare', 'legend'];
const CONTEXT_OPTIONS: ContextCategory[] = [
  'historical_event',
  'mythology',
  'scientific',
  'cultural',
  'biographical',
  'general',
  'metaphorical',
];

export function CollectionFilter({
  isOpen,
  onClose,
  currentFilter,
  onApply,
}: CollectionFilterProps) {
  const [filter, setFilter] = useState<FilterState>(currentFilter);

  if (!isOpen) return null;

  const toggleRarity = (rarity: Rarity) => {
    setFilter((prev) => ({
      ...prev,
      rarity: prev.rarity.includes(rarity)
        ? prev.rarity.filter((r) => r !== rarity)
        : [...prev.rarity, rarity],
    }));
  };

  const toggleCategory = (category: ContextCategory) => {
    setFilter((prev) => ({
      ...prev,
      contextCategory: prev.contextCategory.includes(category)
        ? prev.contextCategory.filter((c) => c !== category)
        : [...prev.contextCategory, category],
    }));
  };

  const handleReset = () => {
    setFilter({
      rarity: [],
      contextCategory: [],
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  };

  const handleApply = () => {
    onApply(filter);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* バックドロップ */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* フィルターパネル */}
      <div className="relative w-full max-w-md rounded-t-2xl bg-white p-6 dark:bg-gray-900 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            フィルター
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* レア度 */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              レア度
            </h3>
            <div className="flex flex-wrap gap-2">
              {RARITY_OPTIONS.map((rarity) => (
                <button
                  key={rarity}
                  onClick={() => toggleRarity(rarity)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    filter.rarity.includes(rarity)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {RARITY_DISPLAY_NAMES[rarity]}
                </button>
              ))}
            </div>
          </div>

          {/* 文脈カテゴリ */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              文脈カテゴリ
            </h3>
            <div className="flex flex-wrap gap-2">
              {CONTEXT_OPTIONS.map((category) => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    filter.contextCategory.includes(category)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {CONTEXT_CATEGORY_DISPLAY_NAMES[category]}
                </button>
              ))}
            </div>
          </div>

          {/* 並び替え */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              並び替え
            </h3>
            <div className="flex gap-2">
              <select
                value={filter.sortBy}
                onChange={(e) =>
                  setFilter((prev) => ({
                    ...prev,
                    sortBy: e.target.value as FilterState['sortBy'],
                  }))
                }
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="createdAt">生成日</option>
                <option value="rarity">レア度</option>
                <option value="keyword">キーワード</option>
              </select>
              <select
                value={filter.sortOrder}
                onChange={(e) =>
                  setFilter((prev) => ({
                    ...prev,
                    sortOrder: e.target.value as FilterState['sortOrder'],
                  }))
                }
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="desc">新しい順</option>
                <option value="asc">古い順</option>
              </select>
            </div>
          </div>
        </div>

        {/* ボタン */}
        <div className="mt-6 flex gap-3">
          <Button onClick={handleReset} variant="secondary" className="flex-1">
            リセット
          </Button>
          <Button onClick={handleApply} className="flex-1">
            適用
          </Button>
        </div>
      </div>
    </div>
  );
}
