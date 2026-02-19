import Stripe from 'stripe';
import type { SubscriptionTier } from '@prisma/client';
import type { CoinPackageId } from '@/lib/constants/coins';

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
export const STRIPE_PRICE_TO_TIER: Record<string, SubscriptionTier> = {
  [process.env.STRIPE_PRICE_PLUS || '']: 'plus',
  [process.env.STRIPE_PRICE_PREMIUM || '']: 'premium',
};

/**
 * サブスクリプションTierからStripe Price IDを取得
 */
export function getPriceIdForTier(tier: SubscriptionTier): string {
  if (tier === 'plus') {
    return process.env.STRIPE_PRICE_PLUS || '';
  }
  return process.env.STRIPE_PRICE_PREMIUM || '';
}

/**
 * Stripe Price IDとコインパッケージIDのマッピング
 */
export const STRIPE_PRICE_TO_COIN_PACKAGE: Record<string, CoinPackageId> = {
  [process.env.STRIPE_PRICE_COIN_STANDARD || '']: 'standard',
  [process.env.STRIPE_PRICE_COIN_VALUE || '']: 'value',
  [process.env.STRIPE_PRICE_COIN_MEGA || '']: 'mega',
};

/**
 * コインパッケージIDからStripe Price IDを取得
 */
export function getPriceIdForCoinPackage(packageId: CoinPackageId): string {
  const map: Record<CoinPackageId, string> = {
    standard: process.env.STRIPE_PRICE_COIN_STANDARD || '',
    value: process.env.STRIPE_PRICE_COIN_VALUE || '',
    mega: process.env.STRIPE_PRICE_COIN_MEGA || '',
  };
  return map[packageId];
}
