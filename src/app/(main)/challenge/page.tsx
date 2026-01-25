'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ScenarioCard } from '@/components/challenge';
import { LoadingSpinner, Button } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import { getIdToken } from '@/lib/firebase/client';
import type { ScenarioListItem, ChallengeSessionStatus } from '@/types/challenge';

export default function ChallengePage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [scenarios, setScenarios] = useState<ScenarioListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState<string | null>(null);
  const [existingSession, setExistingSession] = useState<{
    id: string;
    scenarioId: string;
    status: ChallengeSessionStatus;
  } | null>(null);

  // シナリオ一覧と進行中セッションを取得
  useEffect(() => {
    async function fetchData() {
      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('認証トークンの取得に失敗しました');
        }

        // シナリオ一覧とセッション一覧を並列取得
        const [scenariosRes, sessionsRes] = await Promise.all([
          fetch('/api/challenge/scenarios', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/challenge/sessions?status=in_progress&limit=1', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const scenariosData = await scenariosRes.json();
        const sessionsData = await sessionsRes.json();

        if (scenariosData.success) {
          setScenarios(scenariosData.data);
        }

        if (sessionsData.success && sessionsData.data.sessions.length > 0) {
          setExistingSession(sessionsData.data.sessions[0]);
        }

        // deck_buildingステータスのセッションもチェック
        const deckBuildingRes = await fetch(
          '/api/challenge/sessions?status=deck_building&limit=1',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const deckBuildingData = await deckBuildingRes.json();

        if (
          deckBuildingData.success &&
          deckBuildingData.data.sessions.length > 0
        ) {
          setExistingSession(deckBuildingData.data.sessions[0]);
        }
      } catch (error) {
        console.error('Fetch data error:', error);
        addToast('データの取得に失敗しました', 'error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [addToast]);

  // セッション作成
  const handleSelectScenario = useCallback(
    async (scenarioId: string) => {
      setIsCreating(scenarioId);

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('認証トークンの取得に失敗しました');
        }

        const response = await fetch('/api/challenge/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ scenarioId }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || 'セッションの作成に失敗しました');
        }

        router.push(`/challenge/${data.data.id}`);
      } catch (error) {
        console.error('Create session error:', error);
        addToast(
          error instanceof Error ? error.message : 'エラーが発生しました',
          'error'
        );
        setIsCreating(null);
      }
    },
    [router, addToast]
  );

  // 進行中セッションを続行
  const handleContinueSession = useCallback(() => {
    if (existingSession) {
      router.push(`/challenge/${existingSession.id}`);
    }
  }, [existingSession, router]);

  // 進行中セッションを中断
  const handleAbandonSession = useCallback(async () => {
    if (!existingSession) return;

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('認証トークンの取得に失敗しました');
        }

      const response = await fetch(`/api/challenge/sessions/${existingSession.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'セッションの中断に失敗しました');
      }

      setExistingSession(null);
      addToast('セッションを中断しました', 'success');
    } catch (error) {
      console.error('Abandon session error:', error);
      addToast(
        error instanceof Error ? error.message : 'エラーが発生しました',
        'error'
      );
    }
  }, [existingSession, addToast]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="py-6"
    >
      {/* ヘッダー */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          チャレンジモード
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          カードを使って冒険に挑戦しよう！
        </p>
      </div>

      {/* 進行中セッション通知 */}
      {existingSession && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">
                進行中のチャレンジがあります
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {existingSession.status === 'deck_building'
                  ? 'デッキ編成中'
                  : 'プレイ中'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={handleContinueSession} size="sm">
                続ける
              </Button>
              <Button type="button" onClick={handleAbandonSession} variant="ghost" size="sm">
                中断
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* シナリオ一覧 */}
      <div className="grid gap-6 md:grid-cols-2">
        {scenarios.map((scenario, index) => (
          <motion.div
            key={scenario.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <ScenarioCard
              scenario={scenario}
              onSelect={() => handleSelectScenario(scenario.id)}
              isLoading={isCreating === scenario.id}
            />
          </motion.div>
        ))}
      </div>

      {/* シナリオがない場合 */}
      {scenarios.length === 0 && (
        <div className="py-12 text-center">
          <div className="mb-4 text-4xl">🎮</div>
          <p className="text-gray-500 dark:text-gray-400">
            利用可能なシナリオがありません
          </p>
        </div>
      )}
    </motion.div>
  );
}
