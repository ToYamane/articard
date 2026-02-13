'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';
import { OAuthButtons } from './oauth-buttons';
import { useAuth } from '@/hooks/use-auth';
import { loginSchema, type LoginInput } from '@/lib/validations/user';

export function LoginForm() {
  const router = useRouter();
  const { loginWithEmail, loginWithGoogle, isLoading, needsSetup } = useAuth();

  const [formData, setFormData] = useState<LoginInput>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});
  const [generalError, setGeneralError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setGeneralError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    // Validate
    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof LoginInput, string>> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof LoginInput] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await loginWithEmail(formData.email, formData.password);
      // Navigation is handled by auth state listener
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'auth/invalid-credential') {
        setGeneralError('メールアドレスまたはパスワードが正しくありません');
      } else if (firebaseError.code === 'auth/too-many-requests') {
        setGeneralError('ログイン試行回数が多すぎます。しばらく待ってから再度お試しください');
      } else {
        setGeneralError('ログインに失敗しました。再度お試しください');
      }
    }
  };

  const handleOAuthSuccess = () => {
    // Check if user needs setup after OAuth login
    if (needsSetup) {
      router.push('/setup');
    } else {
      router.push('/home');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      handleOAuthSuccess();
    } catch {
      setGeneralError('Googleログインに失敗しました');
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex flex-col items-center gap-3">
        <Image
          src="/logo/icon.webp"
          alt="ArtiCard"
          width={80}
          height={80}
          className="h-20 w-20"
        />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">ログイン</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Articardへようこそ
        </p>
      </div>

      {/* OAuth Buttons */}
      <OAuthButtons
        onGoogleClick={handleGoogleLogin}
        disabled={isLoading}
      />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500 dark:bg-black dark:text-gray-400">
            または
          </span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {generalError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {generalError}
          </div>
        )}

        <Input
          label="メールアドレス"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          placeholder="example@email.com"
          disabled={isLoading}
        />

        <Input
          label="パスワード"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          placeholder="8文字以上"
          disabled={isLoading}
        />

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            パスワードをお忘れですか？
          </Link>
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading} disabled={isLoading}>
          ログイン
        </Button>
      </form>

      {/* Register Link */}
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        アカウントをお持ちでないですか？{' '}
        <Link href="/register" className="text-blue-600 hover:underline dark:text-blue-400">
          新規登録
        </Link>
      </p>
    </div>
  );
}
