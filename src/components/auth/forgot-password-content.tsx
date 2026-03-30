'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';
import { apiUrl } from '@/lib/api/client';
import { emailSchema, passwordSchema } from '@/lib/validations/user';

type Step = 'email' | 'code' | 'done';

const RESEND_COOLDOWN_SECONDS = 60;

export function ForgotPasswordContent() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSendCode = async () => {
    setError('');

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(apiUrl('/api/auth/send-password-reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (data.success) {
        setStep('code');
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setError(data.error?.message || 'エラーが発生しました');
      }
    } catch {
      setError('送信に失敗しました。再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0) return;
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch(apiUrl('/api/auth/send-password-reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (data.success) {
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setError(data.error?.message || 'エラーが発生しました');
      }
    } catch {
      setError('送信に失敗しました。再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');

    if (code.length !== 6) {
      setError('6桁のコードを入力してください');
      return;
    }

    const passwordResult = passwordSchema.safeParse(newPassword);
    if (!passwordResult.success) {
      setError(passwordResult.error.issues[0].message);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(apiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await response.json();
      if (data.success) {
        setStep('done');
      } else {
        setError(data.error?.message || 'パスワードのリセットに失敗しました');
      }
    } catch {
      setError('エラーが発生しました。再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    setError('');
  };

  if (step === 'done') {
    return (
      <div className="w-full space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg
              className="h-8 w-8 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            パスワードを変更しました
          </h1>
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            新しいパスワードでログインしてください。
          </p>
        </div>
        <Link href="/login">
          <Button className="w-full">ログインへ</Button>
        </Link>
      </div>
    );
  }

  if (step === 'code') {
    return (
      <div className="w-full space-y-6">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            パスワードリセット
          </h1>
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-gray-100">{email}</span>
            <br />
            に送信された6桁のコードと新しいパスワードを入力してください。
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
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

          <Input
            label="新しいパスワード"
            type="password"
            name="newPassword"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setError('');
            }}
            placeholder="8文字以上"
          />

          <Input
            label="新しいパスワード（確認）"
            type="password"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError('');
            }}
            placeholder="パスワードを再入力"
          />

          <Button
            className="w-full"
            onClick={handleResetPassword}
            isLoading={isLoading}
            disabled={isLoading || code.length !== 6}
          >
            パスワードを変更する
          </Button>

          <Button
            variant="secondary"
            className="w-full"
            onClick={handleResendCode}
            isLoading={isLoading}
            disabled={isLoading || cooldown > 0}
          >
            {cooldown > 0 ? `コードを再送信（${cooldown}秒）` : 'コードを再送信'}
          </Button>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          <button
            onClick={() => {
              setStep('email');
              setCode('');
              setNewPassword('');
              setConfirmPassword('');
              setError('');
            }}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            メールアドレスを変更する
          </button>
        </p>
      </div>
    );
  }

  // Step: email
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">パスワードリセット</h1>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          登録したメールアドレスを入力してください。パスワードリセット用のコードを送信します。
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <Input
          label="メールアドレス"
          type="email"
          name="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          placeholder="example@email.com"
          disabled={isLoading}
        />

        <Button
          className="w-full"
          onClick={handleSendCode}
          isLoading={isLoading}
          disabled={isLoading}
        >
          コードを送信する
        </Button>
      </div>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        <Link href="/login" className="text-blue-600 hover:underline dark:text-blue-400">
          ログインに戻る
        </Link>
      </p>
    </div>
  );
}
