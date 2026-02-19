'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { useToast } from '@/hooks/use-toast';
import { Button, Input, ConfirmModal, SectionContainer } from '@/components/ui';
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
    devChargeCoins,
    fetchData,
  } = useSubscription();
  const { success, error: showError } = useToast();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [customChargeAmount, setCustomChargeAmount] = useState('');
  const [cancelAt, setCancelAt] = useState<string | null>(null);

  // Handle Stripe redirect results
  useEffect(() => {
    const subscriptionStatus = searchParams.get('subscription');
    if (subscriptionStatus === 'success') {
      success('サブスクリプションの登録が完了しました！');
      fetchData();
      window.history.replaceState({}, '', '/settings');
    } else if (subscriptionStatus === 'canceled') {
      showError('サブスクリプションの登録がキャンセルされました');
      window.history.replaceState({}, '', '/settings');
    }

    const coinsStatus = searchParams.get('coins');
    if (coinsStatus === 'success') {
      success('コインの購入が完了しました！');
      fetchData();
      window.history.replaceState({}, '', '/settings');
    } else if (coinsStatus === 'canceled') {
      showError('コインの購入がキャンセルされました');
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
      // 常にStripe Checkoutにリダイレクト
      await startSubscriptionCheckout(tier);
      // リダイレクトするのでここには到達しない
    } catch (err) {
      showError(err instanceof Error ? err.message : 'サブスクリプションの有効化に失敗しました');
    } finally {
      setProcessingAction(null);
    }
  };

  // 開発者専用：Stripeをスキップして直接有効化（テスト用）
  const handleDirectActivation = async (tier: 'plus' | 'premium') => {
    setProcessingAction(`direct-${tier}`);
    try {
      const result = await activateSubscription(tier);
      if (result.bonusCoins > 0) {
        success(
          `${tier === 'plus' ? 'プラス' : 'プレミアム'}プランに加入しました！加入ボーナス ${result.bonusCoins} コインを獲得！`
        );
      } else {
        success(`${tier === 'plus' ? 'プラス' : 'プレミアム'}プランに加入しました！`);
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
      const result = await cancelSubscription();
      if (result.cancelAt) {
        setCancelAt(result.cancelAt);
        success(
          `サブスクリプションの解約を予約しました（${new Date(result.cancelAt).toLocaleDateString('ja-JP')}まで利用可能）`
        );
      } else {
        success('サブスクリプションを解約しました');
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'サブスクリプションの解約に失敗しました');
    } finally {
      setProcessingAction(null);
    }
  };

  const handlePurchaseCoins = async (packageId: string) => {
    setProcessingAction(`purchase-${packageId}`);
    try {
      await purchaseCoins(packageId);
      // Stripe Checkoutにリダイレクトするのでここには到達しない
    } catch (err) {
      showError(err instanceof Error ? err.message : 'コインの購入に失敗しました');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDevCharge = async (amount: number) => {
    setProcessingAction(`dev-charge-${amount}`);
    try {
      const result = await devChargeCoins(amount);
      success(`${result.amount} コインをチャージしました！`);
      setCustomChargeAmount('');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'コインのチャージに失敗しました');
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">設定</h1>

      {/* Profile Section */}
      <SectionContainer variant="default" title="プロフィール" delay={0.1}>
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
      </SectionContainer>

      {/* Appearance Section */}
      <SectionContainer variant="default" title="外観" delay={0.15}>
        <div className="flex gap-3">
          {(
            [
              { value: 'light', label: 'ライト', icon: '\u2600\uFE0F' },
              { value: 'dark', label: 'ダーク', icon: '\uD83C\uDF19' },
              { value: 'system', label: 'システム', icon: '\uD83D\uDCBB' },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                mounted && theme === option.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-900'
              }`}
            >
              <span className="text-lg">{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </SectionContainer>

      {/* Account Stats Section */}
      <SectionContainer variant="default" title="アカウント情報" delay={0.2}>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">デイリーコイン（本日）</span>
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
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('ja-JP') : '-'}
            </span>
          </div>
        </div>
      </SectionContainer>

      {/* Subscription Section */}
      <SectionContainer variant="info" title="サブスクリプション" delay={0.25}>
        {/* Plan Comparison */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-200 dark:border-blue-800">
                <th className="py-2 text-left text-gray-600 dark:text-gray-400">特典</th>
                <th className="py-2 text-center text-gray-600 dark:text-gray-400">無料</th>
                <th className="py-2 text-center text-blue-600 dark:text-blue-400">プラス</th>
                <th className="py-2 text-center text-purple-600 dark:text-purple-400">
                  プレミアム
                </th>
              </tr>
            </thead>
            <tbody className="text-gray-700 dark:text-gray-300">
              <tr className="border-b border-blue-100 dark:border-blue-900">
                <td className="py-2">デイリーコイン</td>
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
              <tr className="border-b border-blue-100 dark:border-blue-900">
                <td className="py-2">カード一括生成</td>
                <td className="py-2 text-center">×</td>
                <td className="py-2 text-center font-medium text-blue-600">○</td>
                <td className="py-2 text-center font-medium text-purple-600">○</td>
              </tr>
              <tr>
                <td className="py-2">加入ボーナス</td>
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
            disabled={
              isSubscriptionLoading || processingAction !== null || subscription?.tier === 'plus'
            }
            isLoading={processingAction === 'subscribe-plus'}
            variant={subscription?.tier === 'plus' ? 'primary' : 'secondary'}
          >
            {subscription?.tier === 'plus' ? 'プラス加入中' : 'プラスに加入 (¥980/月)'}
          </Button>
          <Button
            onClick={() => handleActivateSubscription('premium')}
            disabled={
              isSubscriptionLoading || processingAction !== null || subscription?.tier === 'premium'
            }
            isLoading={processingAction === 'subscribe-premium'}
            variant={subscription?.tier === 'premium' ? 'primary' : 'secondary'}
          >
            {subscription?.tier === 'premium' ? 'プレミアム加入中' : 'プレミアムに加入 (¥2,980/月)'}
          </Button>
          {subscription?.tier && !cancelAt && (
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

        {/* Cancellation Pending Notice */}
        {cancelAt && (
          <div className="mt-3 rounded-lg border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-yellow-950/30">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              {new Date(cancelAt).toLocaleDateString('ja-JP')}
              に解約予定です。それまで現在のプランをご利用いただけます。
            </p>
          </div>
        )}

        {/* Developer Only: Direct Activation (Skip Stripe) */}
        {profile?.isDeveloper && (
          <div className="mt-4 rounded-lg border border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-950/30">
            <p className="mb-3 text-sm font-medium text-orange-700 dark:text-orange-400">
              開発者専用：Stripeスキップ（テスト用）
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleDirectActivation('plus')}
                disabled={
                  isSubscriptionLoading ||
                  processingAction !== null ||
                  subscription?.tier === 'plus'
                }
                isLoading={processingAction === 'direct-plus'}
                variant="secondary"
                className="text-sm"
              >
                プラス直接有効化
              </Button>
              <Button
                onClick={() => handleDirectActivation('premium')}
                disabled={
                  isSubscriptionLoading ||
                  processingAction !== null ||
                  subscription?.tier === 'premium'
                }
                isLoading={processingAction === 'direct-premium'}
                variant="secondary"
                className="text-sm"
              >
                プレミアム直接有効化
              </Button>
            </div>
          </div>
        )}
      </SectionContainer>

      {/* Coin Purchase Section */}
      <SectionContainer variant="default" title="コイン購入" delay={0.3}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-black"
            >
              <h3 className="mb-2 text-center font-semibold text-gray-900 dark:text-gray-100">
                {pkg.name}
              </h3>
              <p className="mb-1 text-center text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {pkg.coins.toLocaleString()}
              </p>
              <p className="mb-3 text-center text-xs text-gray-500 dark:text-gray-400">コイン</p>
              <p className="mb-3 text-center text-sm text-gray-600 dark:text-gray-400">
                ¥{pkg.price.toLocaleString()}
                <span className="ml-1 text-xs">(¥{(pkg.price / pkg.coins).toFixed(2)}/コイン)</span>
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

        {/* Developer Only: Instant Charge */}
        {profile?.isDeveloper && (
          <div className="mt-4 rounded-lg border border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-950/30">
            <p className="mb-3 text-sm font-medium text-orange-700 dark:text-orange-400">
              開発者専用：即時チャージ（テスト用）
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              {[100, 500, 1000, 5000].map((amount) => (
                <Button
                  key={amount}
                  onClick={() => handleDevCharge(amount)}
                  disabled={isSubscriptionLoading || processingAction !== null}
                  isLoading={processingAction === `dev-charge-${amount}`}
                  variant="secondary"
                  className="text-sm"
                >
                  +{amount.toLocaleString()}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                value={customChargeAmount}
                onChange={(e) => setCustomChargeAmount(e.target.value)}
                placeholder="任意の金額（1〜99999）"
                min={1}
                max={99999}
                className="flex-1"
              />
              <Button
                onClick={() => handleDevCharge(parseInt(customChargeAmount, 10))}
                disabled={
                  isSubscriptionLoading ||
                  processingAction !== null ||
                  !customChargeAmount ||
                  parseInt(customChargeAmount, 10) < 1 ||
                  parseInt(customChargeAmount, 10) > 99999 ||
                  !Number.isInteger(Number(customChargeAmount))
                }
                isLoading={processingAction === `dev-charge-${parseInt(customChargeAmount, 10)}`}
                variant="secondary"
                className="text-sm"
              >
                チャージ
              </Button>
            </div>
          </div>
        )}
      </SectionContainer>

      {/* Logout Section */}
      <SectionContainer variant="default" title="ログアウト" delay={0.35}>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          このデバイスからログアウトします。
        </p>
        <Button variant="secondary" onClick={handleLogout} disabled={isLoading}>
          ログアウト
        </Button>
      </SectionContainer>

      {/* Danger Zone */}
      <SectionContainer variant="danger" title="危険な操作" delay={0.4}>
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">
          アカウントを削除すると、すべての記事、カード、データが完全に削除されます。
          この操作は取り消せません。
        </p>
        <Button variant="danger" onClick={() => setShowDeleteModal(true)} disabled={isLoading}>
          アカウントを削除
        </Button>
      </SectionContainer>

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
