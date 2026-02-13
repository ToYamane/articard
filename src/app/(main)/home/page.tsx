'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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

interface UserStats {
  totalCards: number;
  totalArticles: number;
  totalKnowledgePoints: number;
}

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

  // ユーザー統計
  const [stats, setStats] = useState<UserStats>({ totalCards: 0, totalArticles: 0, totalKnowledgePoints: 0 });

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

  // ユーザー統計と最近のカードを取得
  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('認証トークンの取得に失敗しました');
        }

        const [cardsResponse, statsResponse] = await Promise.all([
          fetch('/api/cards?limit=6&sortBy=createdAt&sortOrder=desc', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/stats', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const cardsData = await cardsResponse.json();
        if (cardsData.success) {
          setRecentCards(cardsData.data.cards);
        }

        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats({
            totalCards: statsData.data.totalCards,
            totalArticles: statsData.data.totalArticles,
            totalKnowledgePoints: statsData.data.totalKnowledgePoints,
          });
        }
      } catch (err) {
        console.error('Fetch data error:', err);
      } finally {
        setIsLoadingCards(false);
      }
    }

    fetchData();
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

  // 記事生成（withCard 廃止: 常にカード生成を実行）
  const handleSubmit = useCallback(
    async (theme: string, contentType: ContentType, requestedCardCount: number) => {
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

        // 常にカード生成を実行
        if (requestedCardCount === 1) {
          generateSingleCard(createdArticle.id, selectedRarity);
        } else {
          startGeneration(createdArticle.id, requestedCardCount);
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
        {/* ウェルカムヘッダー */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="mb-6"
        >
          <h1 className="text-center text-3xl font-black">
            <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 bg-clip-text text-transparent dark:from-purple-400 dark:via-pink-400 dark:to-blue-400">
              ようこそ、{profile?.nickname || user?.displayName || 'ゲスト'}さん
            </span>
          </h1>
        </motion.div>

        {/* Step 2: 装飾付き生成フォーム */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="mb-8"
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
                >
                  <div className="overflow-hidden rounded-2xl border-2 border-purple-200/60 bg-gradient-to-br from-fuchsia-50 via-purple-50 to-cyan-50 shadow-xl shadow-purple-500/10 dark:border-purple-700/40 dark:from-fuchsia-950/40 dark:via-purple-950/40 dark:to-cyan-950/40">
                    <div className="h-2 animate-gradient-x bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500" />
                    <div className="space-y-4 p-6">
                      <p className="text-center text-lg font-black">
                        <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 bg-clip-text text-transparent dark:from-purple-400 dark:via-pink-400 dark:to-cyan-400">
                          テーマを入力してカードを生み出そう
                        </span>
                      </p>
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
                    </div>
                  </div>
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

        {/* Step 3: クイックアクション */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="mb-8 grid grid-cols-2 gap-3"
        >
          <Link
            href="/challenge"
            className="group flex items-center gap-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 p-4 shadow-lg shadow-red-500/30 transition hover:scale-105 hover:shadow-xl hover:shadow-red-500/40 dark:from-red-600/80 dark:to-orange-600/80"
          >
            <span className="text-3xl drop-shadow-lg">&#x2694;&#xFE0F;</span>
            <div>
              <div className="text-sm font-bold text-white">
                チャレンジ
              </div>
              <div className="text-xs text-white/80">
                カードで物語に挑む
              </div>
            </div>
          </Link>
          <Link
            href="/collection"
            className="group flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 p-4 shadow-lg shadow-blue-500/30 transition hover:scale-105 hover:shadow-xl hover:shadow-blue-500/40 dark:from-blue-600/80 dark:to-indigo-600/80"
          >
            <span className="text-3xl drop-shadow-lg">&#x1F4DA;</span>
            <div>
              <div className="text-sm font-bold text-white">
                コレクション
              </div>
              <div className="text-xs text-white/80">
                全カードを閲覧
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Step 4 & 5: 最近のカード */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-blue-400">
                最近のカード
              </span>
              {stats.totalCards > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({stats.totalCards})
                </span>
              )}
            </h2>
            {recentCards.length > 0 && (
              <Button
                onClick={() => router.push('/collection')}
                variant="ghost"
                size="sm"
              >
                すべて見る
              </Button>
            )}
          </div>

          {isLoadingCards ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : recentCards.length > 0 ? (
            <CardGrid
              cards={recentCards}
              variant="home"
              onCardClick={handleCardClick}
            />
          ) : (
            /* Step 5: 改善された空の状態 */
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-200 via-pink-100 to-blue-200 py-12 dark:from-purple-900/40 dark:via-pink-900/40 dark:to-blue-900/40">
              {/* 装飾的なプロモカード画像 */}
              <div className="pointer-events-none absolute -left-4 -top-4 opacity-30">
                <Image
                  src="/promo/card-common.webp"
                  alt=""
                  width={120}
                  height={180}
                  className="rotate-[-15deg] rounded-lg"
                />
              </div>
              <div className="pointer-events-none absolute -bottom-4 -right-4 opacity-30">
                <Image
                  src="/promo/card-rare.webp"
                  alt=""
                  width={120}
                  height={180}
                  className="rotate-[15deg] rounded-lg"
                />
              </div>

              <div className="relative flex flex-col items-center justify-center">
                <p className="text-xl font-bold text-purple-800 dark:text-purple-300">
                  最初のカードを作ってみよう
                </p>
                <p className="mt-2 text-sm text-purple-600/70 dark:text-purple-400/70">
                  テーマを入力すると、AIが記事とカードを生成します
                </p>
                <Button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="mt-4"
                  size="sm"
                >
                  カードを生成する
                </Button>
              </div>
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
