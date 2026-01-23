'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeInput, ArticleLoading, ArticleResult } from '@/components/article';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import { getIdToken } from '@/lib/firebase/client';
import type { Article } from '@prisma/client';

type PageState = 'input' | 'loading' | 'result';

export default function CreatePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuthStore();

  const [state, setState] = useState<PageState>('input');
  const [article, setArticle] = useState<Article | null>(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const handleSubmit = useCallback(async (theme: string) => {
    if (!user) {
      addToast('ログインが必要です', 'error');
      return;
    }

    setState('loading');
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('認証トークンの取得に失敗しました');
      }

      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ theme }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || '記事の生成に失敗しました');
      }

      setArticle(data.data);
      setState('result');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // キャンセルされた
        setState('input');
        return;
      }

      console.error('Article generation error:', error);
      addToast(
        error instanceof Error ? error.message : '記事の生成に失敗しました',
        'error'
      );
      setState('input');
    } finally {
      setAbortController(null);
    }
  }, [user, addToast]);

  const handleCancel = useCallback(() => {
    if (abortController) {
      abortController.abort();
    }
    setState('input');
  }, [abortController]);

  const handleRegenerate = useCallback(() => {
    setArticle(null);
    setState('input');
  }, []);

  const handleGenerateCard = useCallback(async () => {
    if (!article) return;

    setIsGeneratingCard(true);
    // カード生成ページへ遷移
    router.push(`/articles/${article.id}/card`);
  }, [article, router]);

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            記事を作成
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            学びたいテーマを入力すると、AIが学習記事を生成します
          </p>
        </div>

        {state === 'input' && (
          <ThemeInput onSubmit={handleSubmit} />
        )}

        {state === 'loading' && (
          <ArticleLoading onCancel={handleCancel} />
        )}

        {state === 'result' && article && (
          <ArticleResult
            article={article}
            onGenerateCard={handleGenerateCard}
            onRegenerate={handleRegenerate}
            isLoading={isGeneratingCard}
          />
        )}
      </div>
    </div>
  );
}
