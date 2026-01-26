'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeInput, ArticleLoading, ArticleResult } from '@/components/article';
import { CardGrid, RaritySelector } from '@/components/card';
import { CardRevealModal, type CardPackState } from '@/components/card';
import { Button, LoadingSpinner } from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import { getIdToken } from '@/lib/firebase/client';
import type { Article, Card } from '@prisma/client';
import type { Rarity } from '@/types/database';

type PageState = 'input' | 'loading' | 'result';
type CardGenState = 'idle' | 'generating' | 'ready' | 'opening' | 'error';

const STORAGE_KEY = 'articard-auto-card-enabled';

export default function HomePage() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { addToast } = useToast();

  // 最近のカード
  const [recentCards, setRecentCards] = useState<Card[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);

  // 記事生成の状態
  const [state, setState] = useState<PageState>('input');
  const [article, setArticle] = useState<Article | null>(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // 自動カード生成の状態
  const [autoCardEnabled, setAutoCardEnabled] = useState<boolean>(false);
  const [cardGenState, setCardGenState] = useState<CardGenState>('idle');
  const [generatedCard, setGeneratedCard] = useState<Card | null>(null);
  const [cardGenError, setCardGenError] = useState<string | null>(null);
  const [isRevealModalOpen, setIsRevealModalOpen] = useState(false);

  // 開発者モード: レアリティ指定
  const [selectedRarity, setSelectedRarity] = useState<Rarity | undefined>(undefined);

  // カード生成用のAbortController
  const cardAbortControllerRef = useRef<AbortController | null>(null);

  // localStorageからトグル設定を読み込み
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      setAutoCardEnabled(saved === 'true');
    }
  }, []);

  // 最近のカードを取得
  useEffect(() => {
    async function fetchRecentCards() {
      if (!user) return;

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('認証トークンの取得に失敗しました');
        }

        const cardsResponse = await fetch('/api/cards?limit=6&sortBy=createdAt&sortOrder=desc', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const cardsData = await cardsResponse.json();

        if (cardsData.success) {
          setRecentCards(cardsData.data.cards);
        }
      } catch (err) {
        console.error('Fetch cards error:', err);
      } finally {
        setIsLoadingCards(false);
      }
    }

    fetchRecentCards();
  }, [user]);

  // トグル設定をlocalStorageに保存
  const handleAutoCardToggle = useCallback((enabled: boolean) => {
    setAutoCardEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    }
  }, []);

  // カード生成（バックグラウンド）
  const generateCard = useCallback(async (articleId: string, rarity?: Rarity) => {
    if (!user) return;

    setCardGenState('generating');
    setCardGenError(null);
    setGeneratedCard(null);

    const controller = new AbortController();
    cardAbortControllerRef.current = controller;

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('認証トークンの取得に失敗しました');
      }

      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ articleId, ...(rarity && { rarity }) }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'カードの生成に失敗しました');
      }

      setGeneratedCard(data.data);
      setCardGenState('ready');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setCardGenState('idle');
        return;
      }

      console.error('Card generation error:', error);
      setCardGenError(
        error instanceof Error ? error.message : 'カードの生成に失敗しました'
      );
      setCardGenState('error');
      addToast(
        error instanceof Error ? error.message : 'カードの生成に失敗しました',
        'error'
      );
    } finally {
      cardAbortControllerRef.current = null;
    }
  }, [user, addToast]);

  // 記事生成
  const handleSubmit = useCallback(async (theme: string) => {
    if (!user) {
      addToast('ログインが必要です', 'error');
      return;
    }

    setState('loading');
    // カード生成状態をリセット
    setCardGenState('idle');
    setGeneratedCard(null);
    setCardGenError(null);

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

      const createdArticle = data.data as Article;
      setArticle(createdArticle);
      setState('result');

      // 自動カード生成が有効な場合、バックグラウンドでカード生成開始
      if (autoCardEnabled) {
        generateCard(createdArticle.id, selectedRarity);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
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
  }, [user, addToast, autoCardEnabled, generateCard, selectedRarity]);

  // キャンセル
  const handleCancel = useCallback(() => {
    if (abortController) {
      abortController.abort();
    }
    if (cardAbortControllerRef.current) {
      cardAbortControllerRef.current.abort();
    }
    setState('input');
  }, [abortController]);

  // 再生成
  const handleRegenerate = useCallback(() => {
    if (cardAbortControllerRef.current) {
      cardAbortControllerRef.current.abort();
    }
    setArticle(null);
    setCardGenState('idle');
    setGeneratedCard(null);
    setCardGenError(null);
    setState('input');
  }, []);

  // カード生成ページへ遷移（従来動作）
  const handleGenerateCard = useCallback(async () => {
    if (!article) return;

    setIsGeneratingCard(true);
    router.push(`/articles/${article.id}/card`);
  }, [article, router]);

  // カードパックをクリック
  const handlePackClick = useCallback(() => {
    if (cardGenState !== 'ready') return;

    setCardGenState('opening');
    // 開封アニメーション後にモーダルを開く
    setTimeout(() => {
      setIsRevealModalOpen(true);
    }, 600);
  }, [cardGenState]);

  // カード生成リトライ
  const handleRetryCardGen = useCallback(() => {
    if (article) {
      generateCard(article.id, selectedRarity);
    }
  }, [article, generateCard, selectedRarity]);

  // トップに戻る
  const handleGoHome = useCallback(() => {
    setIsRevealModalOpen(false);
    handleRegenerate();
  }, [handleRegenerate]);

  // この記事でもう一枚生成
  const handleCreateAnotherFromArticle = useCallback(() => {
    setIsRevealModalOpen(false);
    if (article) {
      // 状態をリセットしてカード生成開始
      setCardGenState('idle');
      setGeneratedCard(null);
      setCardGenError(null);
      generateCard(article.id, selectedRarity);
    }
  }, [article, generateCard, selectedRarity]);

  // 記事を読む（モーダルを閉じるだけ）
  const handleReadArticle = useCallback(() => {
    setIsRevealModalOpen(false);
  }, []);

  // モーダルを閉じる
  const handleCloseModal = useCallback(() => {
    setIsRevealModalOpen(false);
  }, []);

  // カードクリック時
  const handleCardClick = useCallback(
    (card: Card) => {
      router.push(`/cards/${card.id}`);
    },
    [router]
  );

  // CardPackStateに変換
  const getCardPackState = (): CardPackState | 'error' => {
    switch (cardGenState) {
      case 'generating':
        return 'generating';
      case 'ready':
        return 'ready';
      case 'opening':
        return 'opening';
      case 'error':
        return 'error';
      default:
        return 'generating'; // idle状態でも表示する場合はgenerating
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="py-6"
      >
        {/* ウェルカムメッセージ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="mb-8 text-center"
        >
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            ようこそ、{user?.displayName || 'ゲスト'}さん
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            学びたいテーマを入力すると、AIが学習記事を生成します
          </p>
        </motion.div>

        {/* 記事作成フォーム */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="mb-12"
        >
          <div className="mx-auto max-w-xl">
            <AnimatePresence mode="wait">
              {state === 'input' && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <ThemeInput
                    onSubmit={handleSubmit}
                    autoCardEnabled={autoCardEnabled}
                    onAutoCardToggle={handleAutoCardToggle}
                  />
                  {/* 開発者モード: レアリティ指定 */}
                  {profile?.isDeveloper && (
                    <RaritySelector
                      value={selectedRarity}
                      onChange={setSelectedRarity}
                    />
                  )}
                </motion.div>
              )}

              {state === 'loading' && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <ArticleLoading onCancel={handleCancel} />
                </motion.div>
              )}

              {state === 'result' && article && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ArticleResult
                    article={article}
                    onGenerateCard={handleGenerateCard}
                    onRegenerate={handleRegenerate}
                    isLoading={isGeneratingCard}
                    // 自動カード生成用のプロパティ
                    autoCardEnabled={autoCardEnabled}
                    cardPackState={autoCardEnabled ? getCardPackState() : undefined}
                    onPackClick={handlePackClick}
                    cardGenError={cardGenError}
                    onRetryCardGen={handleRetryCardGen}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* 最近のカード */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              最近のカード
            </h2>
            {recentCards.length > 0 && (
              <Button
                onClick={() => router.push('/collection')}
                variant="ghost"
                size="sm"
              >
                すべて見る →
              </Button>
            )}
          </div>

          {isLoadingCards ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : recentCards.length > 0 ? (
            <CardGrid cards={recentCards} onCardClick={handleCardClick} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-12 dark:border-gray-700">
              <div className="mb-4 text-4xl">🎴</div>
              <p className="text-gray-500 dark:text-gray-400">
                まだカードがありません
              </p>
              <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                上のフォームからテーマを入力して、最初のカードを作成しましょう
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* カード開封モーダル */}
      <CardRevealModal
        isOpen={isRevealModalOpen}
        card={generatedCard}
        onClose={handleCloseModal}
        onGoHome={handleGoHome}
        onCreateAnotherFromArticle={handleCreateAnotherFromArticle}
        onReadArticle={handleReadArticle}
        isGenerating={cardGenState === 'generating'}
      />
    </>
  );
}
