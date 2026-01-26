'use client';

import { useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CardLoading, CardResult } from '@/components/card';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import { getIdToken } from '@/lib/firebase/client';
import type { Card } from '@prisma/client';

type PageState = 'loading' | 'result' | 'error';

export default function CardGenerationPage() {
  const params = useParams<{ id: string }>();
  const articleId = params.id;
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuthStore();

  const [state, setState] = useState<PageState>('loading');
  const [card, setCard] = useState<Card | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<
    'keyword' | 'context' | 'illustration' | 'composing'
  >('keyword');

  // カード生成を開始
  const generateCard = useCallback(async () => {
    if (isGenerating) return; // 実行中なら早期リターン

    if (!user) {
      addToast('ログインが必要です', 'error');
      router.push('/login');
      return;
    }

    setIsGenerating(true);
    setState('loading');
    setGenerationStage('keyword');

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('認証トークンの取得に失敗しました');
      }

      // ステージを順番に更新（実際のAPIは一括処理だが、UX向上のため段階的に表示）
      const stageInterval = setInterval(() => {
        setGenerationStage((current) => {
          if (current === 'keyword') return 'context';
          if (current === 'context') return 'illustration';
          if (current === 'illustration') return 'composing';
          return current;
        });
      }, 2000);

      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ articleId }),
      });

      clearInterval(stageInterval);

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'カードの生成に失敗しました');
      }

      setCard(data.data);
      setState('result');
    } catch (error) {
      console.error('Card generation error:', error);
      addToast(
        error instanceof Error ? error.message : 'カードの生成に失敗しました',
        'error'
      );
      setState('error');
    } finally {
      setIsGenerating(false);
    }
  }, [user, articleId, addToast, router, isGenerating]);

  // 初回レンダリング時にカード生成を開始
  useState(() => {
    generateCard();
  });

  const handleViewCollection = useCallback(() => {
    router.push('/collection');
  }, [router]);

  const handleGenerateAnother = useCallback(() => {
    generateCard();
  }, [generateCard]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <CardLoading stage={generationStage} />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-gray-500 dark:text-gray-400">
          カードの生成に失敗しました
        </p>
        <button
          onClick={handleGenerateAnother}
          className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
        >
          再試行する
        </button>
      </div>
    );
  }

  if (state === 'result' && card) {
    return (
      <div className="py-8">
        <CardResult
          card={card}
          onViewCollection={handleViewCollection}
          onGenerateAnother={handleGenerateAnother}
        />
      </div>
    );
  }

  return null;
}
