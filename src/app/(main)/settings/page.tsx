'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button, Input, ConfirmModal } from '@/components/ui';
import { ERROR_MESSAGES } from '@/lib/errors';

export default function SettingsPage() {
  const { profile, isLoading, updateProfile, signOut, deleteAccount } = useAuth();
  const { success, error: showError } = useToast();

  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleUpdateProfile = async () => {
    if (!nickname.trim()) {
      showError(ERROR_MESSAGES.USER.NICKNAME_REQUIRED);
      return;
    }

    if (nickname === profile?.nickname) {
      return;
    }

    setIsUpdating(true);
    try {
      await updateProfile({ nickname: nickname.trim() });
      success('ニックネームを更新しました');
    } catch (err) {
      showError(err instanceof Error ? err.message : ERROR_MESSAGES.GENERAL.UNKNOWN);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      success(ERROR_MESSAGES.USER.DELETE_SUCCESS);
    } catch (err) {
      showError(err instanceof Error ? err.message : ERROR_MESSAGES.USER.DELETE_FAILED);
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      showError(err instanceof Error ? err.message : ERROR_MESSAGES.GENERAL.UNKNOWN);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        設定
      </h1>

      {/* Profile Section */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          プロフィール
        </h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="nickname"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              ニックネーム
            </label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="ニックネームを入力"
              disabled={isLoading || isUpdating}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleUpdateProfile}
              disabled={isLoading || isUpdating || nickname === profile?.nickname}
              isLoading={isUpdating}
            >
              更新
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Account Stats Section */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          アカウント情報
        </h2>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">知識残高</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {profile?.knowledgeBalance ?? 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">プラン</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {profile?.isPremium ? 'プレミアム' : '無料'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">登録日</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString('ja-JP')
                : '-'}
            </span>
          </div>
        </div>
      </motion.section>

      {/* Logout Section */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          ログアウト
        </h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          このデバイスからログアウトします。
        </p>
        <Button variant="secondary" onClick={handleLogout} disabled={isLoading}>
          ログアウト
        </Button>
      </motion.section>

      {/* Danger Zone */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30"
      >
        <h2 className="mb-4 text-lg font-semibold text-red-700 dark:text-red-400">
          危険な操作
        </h2>
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">
          アカウントを削除すると、すべての記事、カード、データが完全に削除されます。
          この操作は取り消せません。
        </p>
        <Button
          variant="danger"
          onClick={() => setShowDeleteModal(true)}
          disabled={isLoading}
        >
          アカウントを削除
        </Button>
      </motion.section>

      {/* Delete Account Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="アカウントを削除しますか？"
        message={ERROR_MESSAGES.USER.DELETE_CONFIRM}
        confirmText="削除する"
        cancelText="キャンセル"
        variant="danger"
        isLoading={isDeleting}
      />
    </motion.div>
  );
}
