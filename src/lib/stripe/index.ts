import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

/**
 * Stripe Price IDとサブスクリプションTierのマッピング
 */
export const STRIPE_PRICE_TO_TIER: Record<string, 'plus' | 'premium'> = {
  [process.env.STRIPE_PRICE_PLUS || '']: 'plus',
  [process.env.STRIPE_PRICE_PREMIUM || '']: 'premium',
};

/**
 * サブスクリプションTierからStripe Price IDを取得
 */
export function getPriceIdForTier(tier: 'plus' | 'premium'): string {
  if (tier === 'plus') {
    return process.env.STRIPE_PRICE_PLUS || '';
  }
  return process.env.STRIPE_PRICE_PREMIUM || '';
}
