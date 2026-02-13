export type RateLimitTier = 'expensive' | 'standard' | 'lenient';

export interface RateLimitResult {
  success: boolean;
  /** Seconds until the rate limit resets */
  retryAfter?: number;
}
