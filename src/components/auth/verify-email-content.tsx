'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';

const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyEmailContent() {
  const router = useRouter();
  const { user, reloadUser, signOut, getIdToken } = useAuth();

  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
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

  const handleVerifyCode = useCallback(async () => {
    if (code.length !== 6) {
      setError('6桁のコードを入力してください');
      return;
    }

    setIsVerifying(true);
    setError('');
    setMessage('');
    try {
      const token = await getIdToken();
      if (!token) {
        setError('認証情報が見つかりません。再度ログインしてください。');
        return;
      }

      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (data.success) {
        // Reload Firebase user to reflect emailVerified status
        await reloadUser();
        const registered = !!useAuthStore.getState().profile;
        router.push(registered ? '/home' : '/setup');
      } else {
        setError(data.error?.message || '認証に失敗しました');
      }
    } catch {
      setError('確認中にエラーが発生しました。再度お試しください。');
    } finally {
      setIsVerifying(false);
    }
  }, [code, getIdToken, reloadUser, router]);

  const handleResendCode = useCallback(async () => {
    if (!user || cooldown > 0) return;
    setIsResending(true);
    setError('');
    setMessage('');
    try {
      const token = await getIdToken();
      if (!token) {
        setError('認証情報が見つかりません。');
        return;
      }

      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setMessage('認証コードを再送信しました。');
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setError(data.error?.message || 'メールの送信に失敗しました。');
      }
    } catch {
      setError('メールの送信に失敗しました。しばらく経ってから再度お試しください。');
    } finally {
      setIsResending(false);
    }
  }, [user, cooldown, getIdToken]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    setError('');
  };

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
          に認証コードを送信しました。メールに届いた6桁のコードを入力してください。
        </p>
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          メールが届かない場合は、迷惑メールフォルダもご確認ください。
        </div>
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
        <Input
          label="認証コード"
          type="text"
          inputMode="numeric"
          name="code"
          value={code}
          onChange={handleCodeChange}
          placeholder="6桁のコードを入力"
          maxLength={6}
          autoComplete="one-time-code"
        />

        <Button
          className="w-full"
          onClick={handleVerifyCode}
          isLoading={isVerifying}
          disabled={isVerifying || code.length !== 6}
        >
          認証する
        </Button>

        <Button
          variant="secondary"
          className="w-full"
          onClick={handleResendCode}
          isLoading={isResending}
          disabled={isResending || cooldown > 0}
        >
          {cooldown > 0 ? `コードを再送信（${cooldown}秒）` : 'コードを再送信'}
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
