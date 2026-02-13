import { z } from 'zod';

// Stripe Checkout 用スキーマ
export const checkoutTierSchema = z.object({
  tier: z.enum(['plus', 'premium'], {
    error: '無効なプランです（plus または premium を指定してください）',
  }),
});

// POST /api/subscription 用スキーマ（開発者のみ）
export const subscriptionTierSchema = z.object({
  tier: z.enum(['plus', 'premium'], {
    error: '無効なプランです（plus または premium を指定してください）',
  }),
});

// コイン購入パッケージスキーマ
export const coinPurchaseSchema = z.object({
  packageId: z.enum(['standard', 'value', 'mega'], {
    error: '無効なパッケージです（standard, value, mega のいずれかを指定してください）',
  }),
});

// 開発者チャージスキーマ
export const devChargeSchema = z.object({
  amount: z
    .number({ error: '金額は数値で指定してください' })
    .int('金額は整数で指定してください')
    .min(1, '金額は1以上で指定してください')
    .max(99999, '金額は99999以下で指定してください'),
});

// 型エクスポート
export type CheckoutTierInput = z.infer<typeof checkoutTierSchema>;
export type SubscriptionTierInput = z.infer<typeof subscriptionTierSchema>;
export type CoinPurchaseInput = z.infer<typeof coinPurchaseSchema>;
export type DevChargeInput = z.infer<typeof devChargeSchema>;
