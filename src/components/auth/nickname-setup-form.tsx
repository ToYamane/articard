'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { nicknameSchema } from '@/lib/validations/user';

export function NicknameSetupForm() {
  const router = useRouter();
  const { registerUser, isLoading, user } = useAuth();

  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
    setError('');
    setGeneralError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setGeneralError('');

    // Validate
    const result = nicknameSchema.safeParse(nickname);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    try {
      await registerUser(nickname);
      router.push('/home');
    } catch (error: unknown) {
      const err = error as { message?: string };
      setGeneralError(err.message || 'ニックネームの設定に失敗しました');
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">ニックネーム設定</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Articardで使用するニックネームを設定してください
        </p>
      </div>

      {user && (
        <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            登録メールアドレス: <span className="font-medium">{user.email}</span>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {generalError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {generalError}
          </div>
        )}

        <Input
          label="ニックネーム"
          type="text"
          name="nickname"
          value={nickname}
          onChange={handleChange}
          error={error}
          placeholder="2〜20文字"
          maxLength={20}
          showCharCount
          disabled={isLoading}
        />

        <p className="text-xs text-gray-500 dark:text-gray-400">
          英数字、ひらがな、カタカナ、漢字が使用できます
        </p>

        <Button
          type="submit"
          className="w-full"
          isLoading={isLoading}
          disabled={isLoading || nickname.length < 2}
        >
          設定して始める
        </Button>
      </form>
    </div>
  );
}
