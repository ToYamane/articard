'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { useToast } from '@/hooks/use-toast';
import { Button, Input, ConfirmModal } from '@/components/ui';
import { ERROR_MESSAGES } from '@/lib/errors';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { profile, isLoading, updateProfile, signOut, deleteAccount } = useAuth();
  const {
    subscription,
    packages,
    freeCoins,
    permanentCoins,
    isLoading: isSubscriptionLoading,
    startSubscriptionCheckout,
    activateSubscription,
    cancelSubscription,
    purchaseCoins,
    fetchData,
  } = useSubscription();
  const { success, error: showError } = useToast();

  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // Handle Stripe redirect results
  useEffect(() => {
    const subscriptionStatus = searchParams.get('subscription');
    if (subscriptionStatus === 'success') {
      success('サブスクリプションの登録が完了しました！');
      // Refresh data to show updated subscription
      fetchData();
      // Remove query params from URL
      window.history.replaceState({}, '', '/settings');
    } else if (subscriptionStatus === 'canceled') {
      showError('サブスクリプションの登録がキャンセルされました');
      window.history.replaceState({}, '', '/settings');
    }
  }, [searchParams, success, showError, fetchData]);

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

  const handleActivateSubscription = async (tier: 'plus' | 'premium') => {
    setProcessingAction(`subscribe-${tier}`);
    try {
      // 開発者は直接有効化（テスト用）、一般ユーザーはStripe Checkout
      if (profile?.isDeveloper) {
        const result = await activateSubscription(tier);
        if (result.bonusCoins > 0) {
          success(`${tier === 'plus' ? 'プラス' : 'プレミアム'}プランに加入しました！初回ボーナス ${result.bonusCoins} コインを獲得！`);
        } else {
          success(`${tier === 'plus' ? 'プラス' : 'プレミアム'}プランに加入しました！`);
        }
      } else {
        // Stripe Checkoutにリダイレクト
        await startSubscriptionCheckout(tier);
        // リダイレクトするのでここには到達しない
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'サブスクリプションの有効化に失敗しました');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleCancelSubscription = async () => {
    setProcessingAction('cancel');
    try {
      await cancelSubscription();
      success('サブスクリプションを解約しました');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'サブスクリプションの解約に失敗しました');
    } finally {
      setProcessingAction(null);
    }
  };

  const handlePurchaseCoins = async (packageId: string) => {
    setProcessingAction(`purchase-${packageId}`);
    try {
      const result = await purchaseCoins(packageId);
      success(`${result.coins} コインを購入しました！`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'コインの購入に失敗しました');
    } finally {
      setProcessingAction(null);
    }
  };

  const getPlanDisplayName = (tier: string | null) => {
    if (tier === 'plus') return 'プラス';
    if (tier === 'premium') return 'プレミアム';
    return '無料';
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
            <span className="text-gray-600 dark:text-gray-400">無料コイン（本日）</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {freeCoins.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">永続コイン</span>
            <span className="font-medium text-yellow-600 dark:text-yellow-400">
              {permanentCoins.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">プラン</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {getPlanDisplayName(subscription?.tier ?? null)}
            </span>
          </div>
          {subscription?.expiresAt && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">有効期限</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {new Date(subscription.expiresAt).toLocaleDateString('ja-JP')}
              </span>
            </div>
          )}
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

      {/* Subscription Section */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950/30"
      >
        <h2 className="mb-4 text-lg font-semibold text-blue-700 dark:text-blue-400">
          サブスクリプション
        </h2>

          {/* Plan Comparison */}
          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-200 dark:border-blue-800">
                  <th className="py-2 text-left text-gray-600 dark:text-gray-400">特典</th>
                  <th className="py-2 text-center text-gray-600 dark:text-gray-400">無料</th>
                  <th className="py-2 text-center text-blue-600 dark:text-blue-400">プラス</th>
                  <th className="py-2 text-center text-purple-600 dark:text-purple-400">プレミアム</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 dark:text-gray-300">
                <tr className="border-b border-blue-100 dark:border-blue-900">
                  <td className="py-2">毎日コイン</td>
                  <td className="py-2 text-center">90</td>
                  <td className="py-2 text-center font-medium text-blue-600">150</td>
                  <td className="py-2 text-center font-medium text-purple-600">300</td>
                </tr>
                <tr className="border-b border-blue-100 dark:border-blue-900">
                  <td className="py-2">チャレンジ無料回数</td>
                  <td className="py-2 text-center">3回/日</td>
                  <td className="py-2 text-center font-medium text-blue-600">10回/日</td>
                  <td className="py-2 text-center font-medium text-purple-600">無制限</td>
                </tr>
                <tr>
                  <td className="py-2">初回ボーナス</td>
                  <td className="py-2 text-center">-</td>
                  <td className="py-2 text-center font-medium text-blue-600">300コイン</td>
                  <td className="py-2 text-center font-medium text-purple-600">900コイン</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Subscription Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleActivateSubscription('plus')}
              disabled={isSubscriptionLoading || processingAction !== null}
              isLoading={processingAction === 'subscribe-plus'}
              variant={subscription?.tier === 'plus' ? 'primary' : 'secondary'}
            >
              {subscription?.tier === 'plus' ? 'プラス加入中' : 'プラスに加入 (¥980/月)'}
            </Button>
            <Button
              onClick={() => handleActivateSubscription('premium')}
              disabled={isSubscriptionLoading || processingAction !== null}
              isLoading={processingAction === 'subscribe-premium'}
              variant={subscription?.tier === 'premium' ? 'primary' : 'secondary'}
            >
              {subscription?.tier === 'premium' ? 'プレミアム加入中' : 'プレミアムに加入 (¥2,980/月)'}
            </Button>
            {subscription?.tier && (
              <Button
                onClick={handleCancelSubscription}
                disabled={isSubscriptionLoading || processingAction !== null}
                isLoading={processingAction === 'cancel'}
                variant="danger"
              >
                解約
              </Button>
            )}
          </div>
        </motion.section>

      {/* Coin Purchase Section */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-900 dark:bg-yellow-950/30"
      >
        <h2 className="mb-4 text-lg font-semibold text-yellow-700 dark:text-yellow-400">
          コイン購入
        </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-lg border border-yellow-200 bg-white p-4 dark:border-yellow-800 dark:bg-gray-900"
              >
                <h3 className="mb-2 text-center font-semibold text-gray-900 dark:text-gray-100">
                  {pkg.name}
                </h3>
                <p className="mb-1 text-center text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {pkg.coins.toLocaleString()}
                </p>
                <p className="mb-3 text-center text-xs text-gray-500 dark:text-gray-400">
                  コイン
                </p>
                <p className="mb-3 text-center text-sm text-gray-600 dark:text-gray-400">
                  ¥{pkg.price.toLocaleString()}
                  <span className="ml-1 text-xs">
                    (¥{(pkg.price / pkg.coins).toFixed(2)}/コイン)
                  </span>
                </p>
                <Button
                  onClick={() => handlePurchaseCoins(pkg.id)}
                  disabled={isSubscriptionLoading || processingAction !== null}
                  isLoading={processingAction === `purchase-${pkg.id}`}
                  className="w-full"
                >
                  購入
                </Button>
              </div>
            ))}
          </div>
        </motion.section>

      {/* Logout Section */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3 }}
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
