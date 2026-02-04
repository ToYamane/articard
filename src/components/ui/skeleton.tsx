'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

/**
 * 基本スケルトンコンポーネント
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200 dark:bg-gray-700',
        className
      )}
    />
  );
}

/**
 * カード用スケルトン
 */
export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('overflow-hidden rounded-lg', className)}>
      {/* カード画像エリア */}
      <div className="aspect-[2/3] animate-pulse bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600">
        {/* シマーエフェクト */}
        <div className="relative h-full w-full overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </div>
    </div>
  );
}

/**
 * カードグリッド用スケルトン
 */
interface CardGridSkeletonProps {
  count?: number;
  className?: string;
}

export function CardGridSkeleton({ count = 8, className }: CardGridSkeletonProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * 記事リスト用スケルトン
 */
export function ArticleSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* タイトル */}
          <Skeleton className="h-5 w-3/4" />
          {/* 日付 */}
          <Skeleton className="h-4 w-24" />
        </div>
        {/* アイコン */}
        <Skeleton className="h-10 w-10 flex-shrink-0 rounded-lg" />
      </div>
    </div>
  );
}

interface ArticleListSkeletonProps {
  count?: number;
  className?: string;
}

export function ArticleListSkeleton({ count = 5, className }: ArticleListSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ArticleSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * テキスト行スケルトン
 */
interface TextSkeletonProps {
  lines?: number;
  className?: string;
}

export function TextSkeleton({ lines = 3, className }: TextSkeletonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}

/**
 * プロフィールカード用スケルトン
 */
export function ProfileSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      {/* アバター */}
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        {/* 名前 */}
        <Skeleton className="h-4 w-32" />
        {/* サブテキスト */}
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/**
 * 統計カード用スケルトン
 */
export function StatsSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800',
        className
      )}
    >
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

interface StatsGridSkeletonProps {
  count?: number;
  className?: string;
}

export function StatsGridSkeleton({ count = 4, className }: StatsGridSkeletonProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-4 md:grid-cols-4',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <StatsSkeleton key={i} />
      ))}
    </div>
  );
}
