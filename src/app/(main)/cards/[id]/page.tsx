'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CardDetailDisplay } from '@/components/card';
import { Button, LoadingSpinner, ConfirmModal, FavoriteButton } from '@/components/ui';
import { ShareModal } from '@/components/share';
import { ERROR_MESSAGES } from '@/lib/errors';
import { useToast } from '@/hooks/use-toast';
import { useFavorites } from '@/hooks/use-favorites';
import { useAuthStore } from '@/stores/auth-store';
import { apiUrl } from '@/lib/api/client';
import { getIdToken } from '@/lib/firebase/client';
import type { CardWithArticle } from '@/lib/services/card-service';
import type { Rarity } from '@/types/database';

export default function CardPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuthStore();

  const { isFavorite, toggleFavorite } = useFavorites('cards');

  const [card, setCard] = useState<CardWithArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // カードを取得
  useEffect(() => {
    async function fetchCard() {
      if (!user) return;

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('認証トークンの取得に失敗しました');
        }

        const response = await fetch(apiUrl(`/api/cards/${id}`), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || 'カードの取得に失敗しました');
        }

        setCard(data.data);
      } catch (error) {
        console.error('Fetch card error:', error);
        addToast(error instanceof Error ? error.message : 'カードの取得に失敗しました', 'error');
        router.push('/collection');
      } finally {
        setIsLoading(false);
      }
    }

    fetchCard();
  }, [id, user, addToast, router]);

  // カードを削除
  const handleDelete = useCallback(async () => {
    if (!user || !card) return;

    setIsDeleting(true);

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('認証トークンの取得に失敗しました');
      }

      const response = await fetch(apiUrl(`/api/cards/${id}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'カードの削除に失敗しました');
      }

      addToast('カードを削除しました', 'success');
      router.push('/collection');
    } catch (error) {
      console.error('Delete card error:', error);
      addToast(error instanceof Error ? error.message : 'カードの削除に失敗しました', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }, [id, user, card, addToast, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">カードが見つかりません</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="py-8"
    >
      <CardDetailDisplay card={card} />

      {/* 元の記事情報 */}
      {card.article && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="mx-auto mt-6 max-w-md rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950"
        >
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="mr-1">📄</span>
            元の記事: 「{card.article.theme}」
          </p>
        </motion.div>
      )}

      {/* アクションボタン */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row sm:flex-wrap"
      >
        <Button onClick={() => router.push('/collection')} variant="secondary" className="flex-1">
          コレクションに戻る
        </Button>
        {card.article && (
          <Button
            onClick={() => router.push(`/articles/${card.article!.id}`)}
            variant="secondary"
            className="flex-1"
          >
            元の記事を見る
          </Button>
        )}
        <Button onClick={() => toggleFavorite(id)} variant="secondary" className="flex-1">
          <span className="flex items-center justify-center gap-1.5">
            <FavoriteButton isFavorite={isFavorite(id)} onToggle={() => {}} size="sm" />
            {isFavorite(id) ? 'お気に入り解除' : 'お気に入り'}
          </span>
        </Button>
        <Button onClick={() => setShowShareModal(true)} className="flex-1">
          共有する
        </Button>
        <Button onClick={() => setShowDeleteModal(true)} variant="danger" className="flex-1">
          削除
        </Button>
      </motion.div>

      {/* 削除確認モーダル */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="カードの削除"
        message={ERROR_MESSAGES.CARD.DELETE_CONFIRM}
        confirmText="削除する"
        cancelText="キャンセル"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* 共有モーダル */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        cardId={card.id}
        keyword={card.keyword}
        rarity={card.rarity as Rarity}
        flavorText={card.flavorText}
        cardImageUrl={card.cardImageUrl}
      />
    </motion.div>
  );
}
