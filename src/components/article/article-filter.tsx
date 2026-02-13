'use client';

import { useState } from 'react';
import { Button, ToggleSwitch } from '@/components/ui';
import type { ArticleFilterState } from '@/hooks/use-articles';

interface ArticleFilterProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilter: ArticleFilterState;
  onApply: (filter: ArticleFilterState) => void;
}

const SORT_LABELS: Record<ArticleFilterState['sortBy'], string> = {
  createdAt: '生成日',
  cardCount: 'カード数',
};

const ORDER_LABELS: Record<ArticleFilterState['sortBy'], Record<'asc' | 'desc', string>> = {
  createdAt: { desc: '新しい順', asc: '古い順' },
  cardCount: { desc: '多い順', asc: '少ない順' },
};

export function ArticleFilter({ isOpen, onClose, currentFilter, onApply }: ArticleFilterProps) {
  const [filter, setFilter] = useState<ArticleFilterState>(currentFilter);

  if (!isOpen) return null;

  const handleReset = () => {
    setFilter({ sortBy: 'createdAt', sortOrder: 'desc', onlyFavorites: false });
  };

  const handleApply = () => {
    onApply(filter);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* バックドロップ */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* フィルターパネル */}
      <div className="relative w-full max-w-md rounded-t-2xl bg-white p-6 dark:bg-black sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">並び替え</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* お気に入りのみ */}
          <div>
            <ToggleSwitch
              checked={filter.onlyFavorites}
              onChange={(checked) => setFilter((prev) => ({ ...prev, onlyFavorites: checked }))}
              label="お気に入りのみ"
            />
          </div>

          {/* 並び替え */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              並び替え項目
            </h3>
            <div className="flex gap-2">
              <select
                value={filter.sortBy}
                onChange={(e) =>
                  setFilter((prev) => ({
                    ...prev,
                    sortBy: e.target.value as ArticleFilterState['sortBy'],
                  }))
                }
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              >
                {Object.entries(SORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={filter.sortOrder}
                onChange={(e) =>
                  setFilter((prev) => ({
                    ...prev,
                    sortOrder: e.target.value as ArticleFilterState['sortOrder'],
                  }))
                }
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
              >
                {Object.entries(ORDER_LABELS[filter.sortBy]).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
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
