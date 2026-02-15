'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { sendVerificationEmail } from '@/lib/firebase/client';

const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyEmailContent() {
  const router = useRouter();
  const { user, reloadUser, signOut } = useAuth();

  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleCheckVerification = useCallback(async () => {
    setIsChecking(true);
    setError('');
    setMessage('');
    try {
      const verified = await reloadUser();
      if (verified) {
        const registered = !!useAuthStore.getState().profile;
        router.push(registered ? '/home' : '/setup');
      } else {
        setError(
          'メールアドレスがまだ認証されていません。メール内のリンクをクリックしてください。'
        );
      }
    } catch {
      setError('確認中にエラーが発生しました。再度お試しください。');
    } finally {
      setIsChecking(false);
    }
  }, [reloadUser, router]);

  const handleResendEmail = useCallback(async () => {
    if (!user || cooldown > 0) return;
    setIsResending(true);
    setError('');
    setMessage('');
    try {
      await sendVerificationEmail(user);
      setMessage('認証メールを再送信しました。');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError('メールの送信に失敗しました。しばらく経ってから再度お試しください。');
    } finally {
      setIsResending(false);
    }
  }, [user, cooldown]);

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <svg
            className="h-8 w-8 text-blue-600 dark:text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">メール認証</h1>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium text-gray-900 dark:text-gray-100">{user?.email}</span>
          <br />
          に認証メールを送信しました。メール内のリンクをクリックして認証を完了してください。
        </p>
        <p className="text-center text-xs text-gray-500 dark:text-gray-500">
          メールが届かない場合は、迷惑メールフォルダもご確認ください。
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
          {message}
        </div>
      )}

      <div className="space-y-3">
        <Button
          className="w-full"
          onClick={handleCheckVerification}
          isLoading={isChecking}
          disabled={isChecking}
        >
          認証を確認して続ける
        </Button>

        <Button
          variant="secondary"
          className="w-full"
          onClick={handleResendEmail}
          isLoading={isResending}
          disabled={isResending || cooldown > 0}
        >
          {cooldown > 0 ? `認証メールを再送信（${cooldown}秒）` : '認証メールを再送信'}
        </Button>
      </div>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        <button onClick={signOut} className="text-blue-600 hover:underline dark:text-blue-400">
          ログアウト
        </button>
      </p>
    </div>
  );
}
