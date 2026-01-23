import { z } from 'zod';

// Nickname validation
export const nicknameSchema = z
  .string()
  .min(2, 'ニックネームは2文字以上で入力してください')
  .max(20, 'ニックネームは20文字以内で入力してください')
  .regex(
    /^[a-zA-Z0-9ぁ-んァ-ヶー一-龠々]+$/,
    '使用できない文字が含まれています（英数字、ひらがな、カタカナ、漢字のみ使用可能）'
  );

// User registration schema
export const registerUserSchema = z.object({
  nickname: nicknameSchema,
});

// User profile update schema
export const updateUserSchema = z.object({
  nickname: nicknameSchema.optional(),
});

// Email validation (for reference)
export const emailSchema = z.string().email('有効なメールアドレスを入力してください');

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'パスワードは8文字以上で入力してください')
  .max(100, 'パスワードは100文字以内で入力してください');

// Login form schema
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Registration form schema (includes password confirmation)
export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

// Type exports
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
