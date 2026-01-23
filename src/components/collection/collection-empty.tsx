'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

interface CollectionEmptyProps {
  hasFilter?: boolean;
  onClearFilter?: () => void;
}

export function CollectionEmpty({ hasFilter, onClearFilter }: CollectionEmptyProps) {
  const router = useRouter();

  if (hasFilter) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 text-6xl">🔍</div>
        <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
          該当するカードがありません
        </h3>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          フィルター条件を変更してみてください
        </p>
        {onClearFilter && (
          <Button onClick={onClearFilter} variant="secondary">
            フィルターをクリア
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-6xl">📚</div>
      <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
        まだカードがありません
      </h3>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        記事を作成して、最初のカードを生成しましょう！
      </p>
      <Button onClick={() => router.push('/create')}>
        記事を作成する
      </Button>
    </div>
  );
}
