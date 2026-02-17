'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArticleView } from '@/components/article';
import { Button, LoadingSpinner, ConfirmModal } from '@/components/ui';
import { ERROR_MESSAGES } from '@/lib/errors';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import { getIdToken } from '@/lib/firebase/client';
import type { Article } from '@prisma/client';

export default function ArticlePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuthStore();

  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 記事を取得
  useEffect(() => {
    async function fetchArticle() {
      if (!user) return;

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('認証トークンの取得に失敗しました');
        }

        const response = await fetch(`/api/articles/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || '記事の取得に失敗しました');
        }

        setArticle(data.data);
      } catch (error) {
        console.error('Fetch article error:', error);
        addToast(error instanceof Error ? error.message : '記事の取得に失敗しました', 'error');
        router.push('/home');
      } finally {
        setIsLoading(false);
      }
    }

    fetchArticle();
  }, [id, user, addToast, router]);

  // 記事を削除
  const handleDelete = useCallback(async () => {
    if (!user || !article) return;

    setIsDeleting(true);

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('認証トークンの取得に失敗しました');
      }

      const response = await fetch(`/api/articles/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || '記事の削除に失敗しました');
      }

      addToast('記事を削除しました', 'success');
      router.push('/home');
    } catch (error) {
      console.error('Delete article error:', error);
      addToast(error instanceof Error ? error.message : '記事の削除に失敗しました', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }, [id, user, article, addToast, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">記事が見つかりません</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-2xl"
    >
      <ArticleView article={article} />

      {/* アクションボタン */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="mt-6"
      >
        <Button onClick={() => setShowDeleteModal(true)} variant="danger">
          記事を削除
        </Button>
      </motion.div>

      {/* 削除確認モーダル */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="記事の削除"
        message={ERROR_MESSAGES.ARTICLE.DELETE_CONFIRM}
        confirmText="削除する"
        cancelText="キャンセル"
        variant="danger"
        isLoading={isDeleting}
      />
    </motion.div>
  );
}
