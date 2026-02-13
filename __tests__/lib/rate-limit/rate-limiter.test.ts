/**
 * Rate limiter テスト
 */

// Mock @upstash/ratelimit and @upstash/redis
const mockLimit = jest.fn();
const mockRatelimitClass = jest.fn().mockImplementation(() => ({
  limit: mockLimit,
}));
const mockSlidingWindow = jest.fn().mockReturnValue('sliding-window-config');

jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(mockRatelimitClass, {
    slidingWindow: mockSlidingWindow,
  }),
}));

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({})),
}));

import { checkRateLimit } from '@/lib/rate-limit';

describe('checkRateLimit', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'test-token',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('制限内のリクエストは success: true を返す', async () => {
    mockLimit.mockResolvedValue({ success: true, reset: Date.now() + 60000 });

    const result = await checkRateLimit('user-1', 'standard');

    expect(result.success).toBe(true);
  });

  it('制限超過時は success: false と retryAfter を返す', async () => {
    const resetTime = Date.now() + 30000; // 30 seconds from now
    mockLimit.mockResolvedValue({ success: false, reset: resetTime });

    const result = await checkRateLimit('user-1', 'expensive');

    expect(result.success).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(30);
  });

  it('Redis 未設定時はフェイルオープン（success: true）', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const result = await checkRateLimit('user-1', 'standard');

    expect(result.success).toBe(true);
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it('Redis エラー時はフェイルオープン（success: true）', async () => {
    mockLimit.mockRejectedValue(new Error('Redis connection failed'));

    const result = await checkRateLimit('user-1', 'standard');

    expect(result.success).toBe(true);
  });

  it('不明なティアの場合はフェイルオープン（success: true）', async () => {
    const result = await checkRateLimit('user-1', 'unknown_tier');

    expect(result.success).toBe(true);
  });
});
