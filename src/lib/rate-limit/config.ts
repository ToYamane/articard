import type { RateLimitTier } from './types';

interface TierConfig {
  /** Maximum number of requests */
  limit: number;
  /** Time window in seconds */
  window: number;
}

export const RATE_LIMIT_TIERS: Record<RateLimitTier, TierConfig> = {
  expensive: { limit: 5, window: 60 },
  standard: { limit: 30, window: 60 },
  lenient: { limit: 60, window: 60 },
};
