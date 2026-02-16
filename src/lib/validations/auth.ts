import { z } from 'zod';
import { emailSchema, passwordSchema } from './user';

export const verifyCodeSchema = z.object({
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, '6桁の数字を入力してください'),
});

export const sendPasswordResetSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
  newPassword: passwordSchema,
});

export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type SendPasswordResetInput = z.infer<typeof sendPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
