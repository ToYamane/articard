'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeInput, ArticleLoading, ArticleResult } from '@/components/article';
import { CardGrid, RaritySelector } from '@/components/card';
import {
  CardRevealModal,
  BatchCardRevealModal,
  BatchGenerationProgress,
  type CardPackState,
} from '@/components/card';
import { Button, LoadingSpinner } from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import { useBatchCardGeneration } from '@/hooks/use-batch-card-generation';
import { getIdToken } from '@/lib/firebase/client';
import type { Article, Card } from '@prisma/client';
import type { Rarity } from '@/types/database';
import type { ContentType } from '@/types/article';

type PageState = 'input' | 'loading' | 'result';

export default function HomePage() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { addToast } = useToast();

  // バッチカード生成フック
  const {
    state: batchState,
    eligibility,
    isLoadingEligibility,
    checkEligibility,
    startGeneration,
    cancelGeneration,
    reset: resetBatch,
  } = useBatchCardGeneration();

  // 最近のカード
  const [recentCards, setRecentCards] = useState<Card[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);

  // 記事生成の状態
  const [state, setState] = useState<PageState>('input');
  const [article, setArticle] = useState<Article | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // カード生成の状態（1枚の場合）
  const [cardCount, setCardCount] = useState(1);
  const [generatedCard, setGeneratedCard] = useState<Card | null>(null);
  const [cardGenState, setCardGenState] = useState<'idle' | 'generating' | 'ready' | 'opening'>('idle');
  const [isRevealModalOpen, setIsRevealModalOpen] = useState(false);

  // バッチリビールモーダル
  const [isBatchRevealModalOpen, setIsBatchRevealModalOpen] = useState(false);

  // 開発者モード: レアリティ指定
  const [selectedRarity, setSelectedRarity] = useState<Rarity | undefined>(undefined);

  // 初期ロード時にbatch eligibilityをチェック
  useEffect(() => {
    if (user) {
      checkEligibility();
    }
  }, [user, checkEligibility]);

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

  // バッチ生成完了時にリビールモーダルを開く
  useEffect(() => {
    if (
      cardCount > 1 &&
      !batchState.isGenerating &&
      batchState.cards.length > 0 &&
      batchState.totalCount > 0
    ) {
      setIsBatchRevealModalOpen(true);
    }
  }, [cardCount, batchState.isGenerating, batchState.cards.length, batchState.totalCount]);

  // 1枚のカード生成
  const generateSingleCard = useCallback(
    async (articleId: string, rarity?: Rarity) => {
      if (!user) return;

      setCardGenState('generating');
      setGeneratedCard(null);

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
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || 'カードの生成に失敗しました');
        }

        setGeneratedCard(data.data);
        setCardGenState('ready');
      } catch (error) {
        console.error('Card generation error:', error);
        addToast(
          error instanceof Error ? error.message : 'カードの生成に失敗しました',
          'error'
        );
        setCardGenState('idle');
      }
    },
    [user, addToast]
  );

  // 記事生成
  const handleSubmit = useCallback(
    async (theme: string, withCard: boolean, contentType: ContentType, requestedCardCount: number) => {
      if (!user) {
        addToast('ログインが必要です', 'error');
        return;
      }

      setState('loading');
      setCardCount(requestedCardCount);
      setCardGenState('idle');
      setGeneratedCard(null);
      resetBatch();

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
          body: JSON.stringify({ theme, contentType }),
          signal: controller.signal,
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || '記事の生成に失敗しました');
        }

        const createdArticle = data.data as Article;
        setArticle(createdArticle);

        // 常に記事を先に表示
        setState('result');

        // カード同時生成が選択された場合
        if (withCard && requestedCardCount > 0) {
          if (requestedCardCount === 1) {
            // 1枚の場合は従来のフロー
            generateSingleCard(createdArticle.id, selectedRarity);
          } else {
            // 複数枚の場合はバッチ生成（並行処理）
            startGeneration(createdArticle.id, requestedCardCount);
          }
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
    },
    [user, addToast, generateSingleCard, selectedRarity, startGeneration, resetBatch]
  );

  // キャンセル
  const handleCancel = useCallback(() => {
    if (abortController) {
      abortController.abort();
    }
    cancelGeneration();
    setState('input');
  }, [abortController, cancelGeneration]);

  // 再生成（トップに戻る）
  const handleRegenerate = useCallback(() => {
    setArticle(null);
    setCardGenState('idle');
    setGeneratedCard(null);
    resetBatch();
    setState('input');
    // eligibilityを再取得
    checkEligibility();
  }, [resetBatch, checkEligibility]);

  // カードパックをクリック（1枚の場合）
  const handlePackClick = useCallback(() => {
    if (cardGenState !== 'ready') return;

    setCardGenState('opening');
    setTimeout(() => {
      setIsRevealModalOpen(true);
    }, 600);
  }, [cardGenState]);

  // トップに戻る（モーダルから）
  const handleGoHome = useCallback(() => {
    setIsRevealModalOpen(false);
    setIsBatchRevealModalOpen(false);
    handleRegenerate();
  }, [handleRegenerate]);

  // コレクションを見る
  const handleViewCollection = useCallback(() => {
    router.push('/collection');
  }, [router]);

  // もう一度生成
  const handleGenerateMore = useCallback(() => {
    setIsBatchRevealModalOpen(false);
    handleRegenerate();
  }, [handleRegenerate]);

  // 記事を読む（モーダルを閉じるだけ）
  const handleReadArticle = useCallback(() => {
    setIsRevealModalOpen(false);
  }, []);

  // モーダルを閉じる
  const handleCloseModal = useCallback(() => {
    setIsRevealModalOpen(false);
  }, []);

  const handleCloseBatchModal = useCallback(() => {
    setIsBatchRevealModalOpen(false);
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
      default:
        return 'generating';
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
                    isLoading={isLoadingEligibility}
                    isBatchEligible={eligibility?.eligible ?? false}
                    coinBalance={eligibility?.coinBalance ?? 0}
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
                    onRegenerate={handleRegenerate}
                    isLoading={false}
                    // カード同時生成用のプロパティ（1枚の場合のみ）
                    autoCardEnabled={cardCount === 1 && cardGenState !== 'idle'}
                    cardPackState={cardCount === 1 ? getCardPackState() : undefined}
                    onPackClick={handlePackClick}
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

      {/* バッチカード生成進捗（フローティングオーバーレイ） */}
      <AnimatePresence>
        {batchState.isGenerating && cardCount > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4"
          >
            <BatchGenerationProgress
              state={batchState}
              onCancel={cancelGeneration}
              variant="floating"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* カード開封モーダル（1枚の場合） */}
      <CardRevealModal
        isOpen={isRevealModalOpen}
        card={generatedCard}
        onClose={handleCloseModal}
        onGoHome={handleGoHome}
        onReadArticle={handleReadArticle}
        isGenerating={cardGenState === 'generating'}
      />

      {/* バッチカードリビールモーダル（複数枚の場合） */}
      <BatchCardRevealModal
        isOpen={isBatchRevealModalOpen}
        cards={batchState.cards}
        onClose={handleCloseBatchModal}
        onViewCollection={handleViewCollection}
        onGenerateMore={handleGenerateMore}
      />
    </>
  );
}
