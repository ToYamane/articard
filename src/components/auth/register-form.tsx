'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';
import { OAuthButtons } from './oauth-buttons';
import { useAuth } from '@/hooks/use-auth';
import { signUpSchema, type SignUpInput } from '@/lib/validations/user';

export function RegisterForm() {
  const router = useRouter();
  const { registerWithEmail, loginWithGoogle, isLoading } = useAuth();

  const [formData, setFormData] = useState<SignUpInput>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SignUpInput, string>>>({});
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
    const result = signUpSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof SignUpInput, string>> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof SignUpInput] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await registerWithEmail(formData.email, formData.password);
      // User will be redirected to setup page after auth state updates
      router.push('/setup');
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'auth/email-already-in-use') {
        setGeneralError('このメールアドレスは既に登録されています');
      } else if (firebaseError.code === 'auth/weak-password') {
        setGeneralError('パスワードが弱すぎます。より強力なパスワードを設定してください');
      } else {
        setGeneralError('登録に失敗しました。再度お試しください');
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      router.push('/setup');
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">新規登録</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Articardで学習カードを集めよう
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
          <span className="bg-white px-2 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
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

        <Input
          label="パスワード（確認）"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          placeholder="パスワードを再入力"
          disabled={isLoading}
        />

        <Button type="submit" className="w-full" isLoading={isLoading} disabled={isLoading}>
          登録する
        </Button>
      </form>

      {/* Login Link */}
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        すでにアカウントをお持ちですか？{' '}
        <Link href="/login" className="text-blue-600 hover:underline dark:text-blue-400">
          ログイン
        </Link>
      </p>
    </div>
  );
}
