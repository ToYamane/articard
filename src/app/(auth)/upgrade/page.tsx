'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';
import { AuthGuard } from '@/components/auth';
import { useAuth } from '@/hooks/use-auth';
import { nicknameSchema, emailSchema, passwordSchema } from '@/lib/validations/user';

type UpgradeStep = 'credentials' | 'nickname';
type UpgradeMethod = 'email' | 'google';

export default function UpgradePage() {
  const router = useRouter();
  const { isGuest, upgradeGuestAccount, isLoading } = useAuth();

  const [step, setStep] = useState<UpgradeStep>('credentials');
  const [method, setMethod] = useState<UpgradeMethod>('email');

  // Email form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Nickname
  const [nickname, setNickname] = useState('');

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  // ゲストでない場合はホームへリダイレクト
  if (!isGuest) {
    router.push('/home');
    return null;
  }

  const handleEmailNext = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');

    const fieldErrors: Record<string, string> = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      fieldErrors.email = emailResult.error.issues[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      fieldErrors.password = passwordResult.error.issues[0].message;
    }

    if (password !== confirmPassword) {
      fieldErrors.confirmPassword = 'パスワードが一致しません';
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setMethod('email');
    setStep('nickname');
  };

  const handleGoogleNext = async () => {
    setMethod('google');
    setStep('nickname');
  };

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');

    const nicknameResult = nicknameSchema.safeParse(nickname);
    if (!nicknameResult.success) {
      setErrors({ nickname: nicknameResult.error.issues[0].message });
      return;
    }

    try {
      await upgradeGuestAccount(
        method,
        nickname,
        method === 'email' ? { email, password } : undefined
      );
      router.push('/home');
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'auth/email-already-in-use') {
        setGeneralError('このメールアドレスは既に登録されています');
        setStep('credentials');
      } else if (firebaseError.code === 'auth/credential-already-in-use') {
        setGeneralError('このアカウントは既に別のユーザーに紐づいています');
        setStep('credentials');
      } else if (firebaseError.code === 'auth/popup-closed-by-user') {
        setStep('credentials');
      } else {
        setGeneralError(firebaseError.message || 'アカウント登録に失敗しました');
      }
    }
  };

  return (
    <AuthGuard requireAuth={true} requireSetup={false}>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">アカウント登録</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            登録すると300コインボーナスと全機能が使えるようになります
          </p>
        </div>

        {generalError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {generalError}
          </div>
        )}

        {step === 'credentials' && (
          <div className="space-y-4">
            {/* Google */}
            <button
              onClick={handleGoogleNext}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Googleで登録
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                  または
                </span>
              </div>
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailNext} className="space-y-3">
              <Input
                label="メールアドレス"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                required
              />
              <Input
                label="パスワード"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                required
              />
              <Input
                label="パスワード（確認）"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                required
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                次へ
              </Button>
            </form>
          </div>
        )}

        {step === 'nickname' && (
          <form onSubmit={handleUpgrade} className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ニックネームを設定してください（2〜20文字）
            </p>
            <Input
              label="ニックネーム"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              error={errors.nickname}
              maxLength={20}
              required
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '登録中...' : 'アカウント登録を完了する'}
            </Button>
            <button
              type="button"
              onClick={() => setStep('credentials')}
              className="w-full text-center text-sm text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              戻る
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          ゲストモードで作成した記事・カードは引き継がれます
        </p>
      </div>
    </AuthGuard>
  );
}
