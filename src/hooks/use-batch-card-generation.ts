'use client';

import { useState, useCallback, useRef } from 'react';
import { apiUrl } from '@/lib/api/client';
import { getIdToken } from '@/lib/firebase/client';
import type { Card } from '@prisma/client';

export type GenerationStage = 'keyword' | 'context' | 'illustration' | 'composing';

export interface BatchGenerationState {
  /** 生成中かどうか */
  isGenerating: boolean;
  /** 要求した枚数 */
  totalCount: number;
  /** 完了した枚数 */
  completedCount: number;
  /** 生成されたカード配列 */
  cards: Card[];
  /** エラー情報 */
  errors: { index: number; message: string }[];
  /** 現在の生成ステージ */
  currentStage: GenerationStage;
  /** キャンセルされたかどうか */
  isCancelled: boolean;
}

export interface BatchEligibility {
  eligible: boolean;
  maxBatchSize: number;
  availableKeywords: number | null;
  coinBalance: number;
  costPerCard: number;
  maxAffordable: number;
}

const initialState: BatchGenerationState = {
  isGenerating: false,
  totalCount: 0,
  completedCount: 0,
  cards: [],
  errors: [],
  currentStage: 'keyword',
  isCancelled: false,
};

/**
 * バッチカード生成フック
 * 複数カードを並行してAPIで生成し、進捗をリアルタイムで更新
 */
export function useBatchCardGeneration() {
  const [state, setState] = useState<BatchGenerationState>(initialState);
  const [eligibility, setEligibility] = useState<BatchEligibility | null>(null);
  const [isLoadingEligibility, setIsLoadingEligibility] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * バッチ生成資格を取得（articleIdはオプショナル）
   */
  const checkEligibility = useCallback(async (articleId?: string) => {
    setIsLoadingEligibility(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('認証トークンの取得に失敗しました');

      const url = articleId
        ? apiUrl(`/api/cards/batch/eligibility?articleId=${articleId}`)
        : apiUrl('/api/cards/batch/eligibility');

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || '資格の確認に失敗しました');
      }

      setEligibility(data.data);
      return data.data as BatchEligibility;
    } catch (error) {
      console.error('Eligibility check error:', error);
      return null;
    } finally {
      setIsLoadingEligibility(false);
    }
  }, []);

  /**
   * バッチ生成を開始（並行処理）
   */
  const startGeneration = useCallback(
    async (articleId: string, count: number, artStyle?: string) => {
      if (state.isGenerating) return;

      // 新しいAbortControllerを作成
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setState({
        isGenerating: true,
        totalCount: count,
        completedCount: 0,
        cards: [],
        errors: [],
        currentStage: 'illustration', // 並行処理では主にイラスト生成がボトルネック
        isCancelled: false,
      });

      const token = await getIdToken();
      if (!token) {
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          errors: [{ index: 0, message: '認証トークンの取得に失敗しました' }],
        }));
        return;
      }

      // 単一カード生成関数
      const generateSingleCard = async (
        index: number
      ): Promise<{ index: number; card?: Card; error?: string }> => {
        try {
          const response = await fetch(apiUrl('/api/cards'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ articleId, ...(artStyle && { artStyle }) }),
            signal: abortController.signal,
          });

          const data = await response.json();

          if (!data.success) {
            return { index, error: data.error?.message || 'カードの生成に失敗しました' };
          }
          return { index, card: data.data };
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            return { index, error: 'キャンセルされました' };
          }
          return { index, error: error instanceof Error ? error.message : '不明なエラー' };
        }
      };

      // 全カードを並行して生成
      const promises = Array.from({ length: count }, (_, i) => generateSingleCard(i));

      // 完了順に進捗を更新
      const generatedCards: Card[] = [];
      const errors: { index: number; message: string }[] = [];
      let completedCount = 0;

      // Promise.allSettledの代わりに、各Promiseの完了を個別に監視
      const wrappedPromises = promises.map(async (promise, originalIndex) => {
        const result = await promise;
        completedCount++;

        if (result.card) {
          generatedCards.push(result.card);
        } else if (result.error) {
          errors.push({ index: result.index, message: result.error });
        }

        // 進捗を更新（完了順）
        setState((prev) => ({
          ...prev,
          completedCount,
          cards: [...generatedCards],
          errors: [...errors],
        }));

        return result;
      });

      // 全ての生成が完了するまで待機
      await Promise.all(wrappedPromises);

      // 生成完了
      setState((prev) => ({
        ...prev,
        isGenerating: false,
        cards: generatedCards,
        errors,
        isCancelled: abortController.signal.aborted,
      }));

      abortControllerRef.current = null;
    },
    [state.isGenerating]
  );

  /**
   * 生成をキャンセル
   */
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * 状態をリセット
   */
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(initialState);
  }, []);

  return {
    state,
    eligibility,
    isLoadingEligibility,
    checkEligibility,
    startGeneration,
    cancelGeneration,
    reset,
  };
}
