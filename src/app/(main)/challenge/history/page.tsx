'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LoadingSpinner, Button } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import { getIdToken } from '@/lib/firebase/client';
import { getScenarioById } from '@/lib/challenge';
import { getScoreRank } from '@/lib/challenge';
import { cn } from '@/lib/utils';

interface HistorySession {
  id: string;
  scenarioId: string;
  status: string;
  currentPhase: number;
  totalScore: number;
  startedAt: string;
  completedAt: string | null;
}

export default function ChallengeHistoryPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const token = await getIdToken();
        if (!token) throw new Error('認証トークンの取得に失敗しました');

        const response = await fetch('/api/challenge/sessions?status=completed&limit=50', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();

        if (data.success) {
          setSessions(data.data.sessions);
        }
      } catch (error) {
        console.error('Fetch history error:', error);
        addToast('履歴の取得に失敗しました', 'error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistory();
  }, [addToast]);

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
      className="py-6"
    >
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            チャレンジ履歴
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            過去のチャレンジ結果を確認
          </p>
        </div>
        <Button type="button" onClick={() => router.push('/challenge')} variant="ghost" size="sm">
          シナリオ選択へ
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mb-4 text-4xl" aria-hidden="true">📜</div>
          <p className="text-gray-500 dark:text-gray-400">
            まだチャレンジ履歴がありません
          </p>
          <Button
            type="button"
            onClick={() => router.push('/challenge')}
            className="mt-4"
          >
            チャレンジを始める
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session, index) => {
            const scenario = getScenarioById(session.scenarioId);
            const { rank, color } = getScoreRank(session.totalScore);
            const completedDate = session.completedAt
              ? new Date(session.completedAt).toLocaleDateString('ja-JP')
              : '';

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-950"
              >
                {/* Scenario icon */}
                <div className="text-3xl" aria-hidden="true">
                  {scenario?.icon || '🎮'}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {scenario?.title || session.scenarioId}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {completedDate}
                  </p>
                </div>

                {/* Score & Rank */}
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {session.totalScore}
                    </div>
                    <div className="text-xs text-gray-500">スコア</div>
                  </div>
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold',
                      color,
                      rank === 'S'
                        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                        : rank === 'A'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : rank === 'B'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : rank === 'C'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-400 bg-gray-50 dark:bg-gray-950'
                    )}
                  >
                    {rank}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
