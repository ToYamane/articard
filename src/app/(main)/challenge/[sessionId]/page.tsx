'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  DeckBuilder,
  PhaseDisplay,
  PhaseTimeline,
  ChallengeCard,
  CardSelector,
  ResultDisplay,
  ChallengeComplete,
} from '@/components/challenge';
import { LoadingSpinner, Button } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import { getIdToken } from '@/lib/firebase/client';
import { getScenarioById } from '@/lib/challenge';
import type { Card } from '@prisma/client';
import type {
  ChallengeSessionWithDetails,
  PhaseChallenge,
  PhaseDefinition,
} from '@/types/challenge';

type GameState =
  | 'loading'
  | 'deck_building'
  | 'loading_challenge'
  | 'challenge'
  | 'submitting'
  | 'result'
  | 'completed'
  | 'error';

interface SubmitResult {
  phaseNumber: number;
  challenge: string;
  selectedCards: Array<{ id: string; keyword: string; rarity: string }>;
  evaluation: {
    fitScore: number;
    bonusScore: number;
    totalScore: number;
    connectionExplanation: string;
    narrativeDescription: string;
    humorComment: string;
  };
  sessionTotalScore: number;
  isComplete: boolean;
  summary?: string;
}

export default function ChallengeGamePage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { addToast } = useToast();

  const [gameState, setGameState] = useState<GameState>('loading');
  const [session, setSession] = useState<ChallengeSessionWithDetails | null>(null);
  const [userCards, setUserCards] = useState<Card[]>([]);
  const [challenge, setChallenge] = useState<PhaseChallenge | null>(null);
  const [phaseDefinition, setPhaseDefinition] = useState<PhaseDefinition | null>(null);
  const [availableCards, setAvailableCards] = useState<Array<{
    id: string;
    keyword: string;
    rarity: string;
    thumbnailUrl: string;
    cardImageUrl: string;
    flavorText: string;
    contextDescription: string;
  }>>([]);
  const [lastResult, setLastResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStartingNewGame, setIsStartingNewGame] = useState(false);

  // セッション情報を取得
  const fetchSession = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) throw new Error('認証トークンの取得に失敗しました');

      const response = await fetch(`/api/challenge/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'セッションの取得に失敗しました');
      }

      setSession(data.data);
      return data.data as ChallengeSessionWithDetails;
    } catch (err) {
      throw err;
    }
  }, [sessionId]);

  // ユーザーのカード一覧を取得
  const fetchUserCards = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) throw new Error('認証トークンの取得に失敗しました');

      const response = await fetch('/api/cards?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        setUserCards(data.data.cards);
      }
    } catch (err) {
      console.error('Fetch cards error:', err);
    }
  }, []);

  // チャレンジを取得
  const fetchChallenge = useCallback(async () => {
    setGameState('loading_challenge');

    try {
      const token = await getIdToken();
      if (!token) throw new Error('認証トークンの取得に失敗しました');

      const response = await fetch(
        `/api/challenge/sessions/${sessionId}/challenge`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'チャレンジの取得に失敗しました');
      }

      setChallenge(data.data.challenge);
      setPhaseDefinition(data.data.phaseDefinition);
      setAvailableCards(data.data.availableCards);
      setGameState('challenge');
    } catch (err) {
      console.error('Fetch challenge error:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setGameState('error');
    }
  }, [sessionId]);

  // 初期化
  useEffect(() => {
    async function init() {
      try {
        const sessionData = await fetchSession();

        if (sessionData.status === 'completed') {
          setGameState('completed');
        } else if (sessionData.status === 'deck_building') {
          await fetchUserCards();
          setGameState('deck_building');
        } else if (sessionData.status === 'in_progress') {
          await fetchChallenge();
        } else {
          // abandoned
          router.push('/challenge');
        }
      } catch (err) {
        console.error('Init error:', err);
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
        setGameState('error');
      }
    }

    init();
  }, [fetchSession, fetchUserCards, fetchChallenge, router]);

  // デッキ設定
  const handleSetDeck = useCallback(
    async (cardIds: string[]) => {
      try {
        const token = await getIdToken();
        if (!token) throw new Error('認証トークンの取得に失敗しました');

        const response = await fetch(
          `/api/challenge/sessions/${sessionId}/deck`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ cardIds }),
          }
        );

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || 'デッキの設定に失敗しました');
        }

        // セッション再取得してチャレンジへ
        await fetchSession();
        await fetchChallenge();
      } catch (err) {
        console.error('Set deck error:', err);
        addToast(
          err instanceof Error ? err.message : 'エラーが発生しました',
          'error'
        );
      }
    },
    [sessionId, fetchSession, fetchChallenge, addToast]
  );

  // カード提出
  const handleSubmitCards = useCallback(
    async (cardIds: string[]) => {
      setGameState('submitting');

      try {
        const token = await getIdToken();
        if (!token) throw new Error('認証トークンの取得に失敗しました');

        const response = await fetch(
          `/api/challenge/sessions/${sessionId}/submit`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ cardIds }),
          }
        );

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || 'カードの提出に失敗しました');
        }

        setLastResult(data.data);
        await fetchSession(); // セッション情報を更新

        // 常に結果画面を表示（5フェーズ目も個別結果を見せてから最終結果へ）
        setGameState('result');
      } catch (err) {
        console.error('Submit cards error:', err);
        addToast(
          err instanceof Error ? err.message : 'エラーが発生しました',
          'error'
        );
        setGameState('challenge');
      }
    },
    [sessionId, fetchSession, addToast]
  );

  // 次のフェーズへ / 最終結果へ
  const handleContinue = useCallback(() => {
    if (lastResult?.isComplete) {
      // 最終フェーズなら完了画面へ
      setGameState('completed');
    } else {
      // 次のフェーズへ
      setLastResult(null);
      fetchChallenge();
    }
  }, [fetchChallenge, lastResult]);

  // もう一度挑戦
  const handlePlayAgain = useCallback(async () => {
    if (isStartingNewGame) return; // 実行中なら早期リターン

    setIsStartingNewGame(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('認証トークンの取得に失敗しました');

      // 新しいセッションを作成
      const response = await fetch('/api/challenge/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ scenarioId: session?.scenarioId }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'セッションの作成に失敗しました');
      }

      router.push(`/challenge/${data.data.id}`);
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'エラーが発生しました',
        'error'
      );
      setIsStartingNewGame(false);
    }
  }, [session, router, addToast, isStartingNewGame]);

  // シナリオ選択に戻る
  const handleBackToScenarios = useCallback(() => {
    router.push('/challenge');
  }, [router]);

  // シナリオ情報
  const scenario = session ? getScenarioById(session.scenarioId) : null;

  // レンダリング
  if (gameState === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (gameState === 'error') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="mb-4 text-4xl">😢</div>
        <p className="mb-4 text-gray-600 dark:text-gray-400">{error}</p>
        <Button type="button" onClick={handleBackToScenarios}>シナリオ選択に戻る</Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-6"
    >
      {/* デッキ編成 */}
      {gameState === 'deck_building' && scenario && (
        <div>
          <div className="mb-6 text-center">
            <span className="text-4xl">{scenario.icon}</span>
            <h1 className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-100">
              {scenario.title}
            </h1>
          </div>
          <DeckBuilder
            availableCards={userCards}
            deckSize={scenario.deckSize}
            onSubmit={handleSetDeck}
          />
        </div>
      )}

      {/* チャレンジ読み込み中 */}
      {gameState === 'loading_challenge' && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            チャレンジを生成中...
          </p>
        </div>
      )}

      {/* チャレンジ表示 & カード選択 */}
      {(gameState === 'challenge' || gameState === 'submitting') &&
        session &&
        scenario &&
        challenge &&
        phaseDefinition && (
          <div className="flex h-[calc(100vh-120px)] flex-col gap-3">
            {/* フェーズ進行状況 */}
            <div className="flex-shrink-0">
              <PhaseTimeline
                totalPhases={scenario.totalPhases}
                currentPhase={session.currentPhase}
                completedPhases={session.phases.map((p) => p.phaseNumber)}
              />
            </div>

            {/* フェーズ情報 */}
            <div className="flex-shrink-0">
              <PhaseDisplay
                phase={phaseDefinition}
                currentPhase={session.currentPhase}
                totalPhases={scenario.totalPhases}
                totalScore={session.totalScore}
              />
            </div>

            {/* チャレンジ */}
            <div className="flex-shrink-0">
              <ChallengeCard challenge={challenge} />
            </div>

            {/* カード選択 - 残りのスペースを使用 */}
            <div className="min-h-0 flex-1">
              <CardSelector
                availableCards={availableCards}
                requiredCount={phaseDefinition.cardCount}
                onSubmit={handleSubmitCards}
                isSubmitting={gameState === 'submitting'}
                className="h-full"
              />
            </div>
          </div>
        )}

      {/* 結果表示 */}
      {gameState === 'result' && lastResult && session && scenario && (
        <div className="space-y-6">
          <PhaseTimeline
            totalPhases={scenario.totalPhases}
            currentPhase={session.currentPhase}
            completedPhases={session.phases.map((p) => p.phaseNumber)}
          />

          <ResultDisplay
            phaseNumber={lastResult.phaseNumber}
            challenge={lastResult.challenge}
            selectedCards={lastResult.selectedCards}
            evaluation={lastResult.evaluation}
            onContinue={handleContinue}
            isLastPhase={lastResult.isComplete}
          />
        </div>
      )}

      {/* 完了画面 */}
      {gameState === 'completed' && session && scenario && (
        <ChallengeComplete
          scenarioTitle={scenario.title}
          totalScore={session.totalScore}
          phaseResults={session.phases.map((p) => ({
            phaseNumber: p.phaseNumber,
            fitScore: p.fitScore,
            totalScore: p.totalScore,
          }))}
          summary={lastResult?.summary}
          onPlayAgain={handlePlayAgain}
          onBackToScenarios={handleBackToScenarios}
          isStarting={isStartingNewGame}
        />
      )}
    </motion.div>
  );
}
