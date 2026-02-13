/**
 * Rate limiter using Upstash Redis
 * Fail-open design: if Redis is unavailable, requests are allowed through
 */

import { RATE_LIMIT_TIERS } from './config';
import type { RateLimitResult } from './types';
import { logger } from '@/lib/logger';

interface RateLimiterInterface {
  limit: (identifier: string) => Promise<{ success: boolean; reset: number }>;
}

async function getRateLimiter(tier: string): Promise<RateLimiterInterface | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  // Lazy import to avoid bundling when not configured
  try {
    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis } = await import('@upstash/redis');

    const config = RATE_LIMIT_TIERS[tier as keyof typeof RATE_LIMIT_TIERS];
    if (!config) return null;

    const redis = new Redis({ url, token });

    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.limit, `${config.window} s`),
      prefix: `ratelimit:${tier}`,
    });
  } catch {
    logger.warn('Failed to initialize rate limiter');
    return null;
  }
}

/**
 * Check rate limit for a user and tier
 * Returns success: true if the request is allowed
 * Fail-open: returns success: true if Redis is unavailable
 */
export async function checkRateLimit(
  userId: string,
  tier: string
): Promise<RateLimitResult> {
  try {
    const limiter = await getRateLimiter(tier);
    if (!limiter) {
      // Fail-open: no Redis configured
      return { success: true };
    }

    const result = await limiter.limit(userId);

    if (!result.success) {
      const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
      return {
        success: false,
        retryAfter: Math.max(retryAfter, 1),
      };
    }

    return { success: true };
  } catch (error) {
    // Fail-open: Redis error
    logger.error('Rate limit check failed, allowing request', { error });
    return { success: true };
  }
}
