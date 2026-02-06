/**
 * /api/subscription/status API テスト
 * GET - サブスクリプション状態取得
 */

import { GET } from '@/app/api/subscription/status/route';
import {
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  expectSuccessResponse,
  expectErrorResponse,
  ERROR_CODES,
} from '@/__tests__/helpers';

// 認証モック
const mockVerifyAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));

// subscription-service モック
const mockGetSubscriptionStatus = jest.fn();
jest.mock('@/lib/services/subscription-service', () => ({
  getSubscriptionStatus: (...args: unknown[]) => mockGetSubscriptionStatus(...args),
}));

describe('/api/subscription/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAuth.mockResolvedValue({
      uid: 'test-user-id-123',
      email: 'test@example.com',
      emailVerified: true,
    });
  });

  describe('GET /api/subscription/status', () => {
    describe('認証チェック', () => {
      it('未認証の場合、401を返す', async () => {
        mockVerifyAuth.mockResolvedValue(null);

        const req = createUnauthenticatedRequest('/api/subscription/status');
        const response = await GET(req);

        await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
      });
    });

    describe('正常系', () => {
      it('plusプランのステータスを取得できる', async () => {
        const expiresAt = new Date('2026-03-01T00:00:00Z');
        mockGetSubscriptionStatus.mockResolvedValue({
          tier: 'plus',
          expiresAt,
          bonusReceived: true,
          plan: {
            name: 'プラス',
            dailyFreeCoins: 150,
            freeChallenges: 10,
          },
        });

        const req = createAuthenticatedRequest('/api/subscription/status');
        const response = await GET(req);
        const data = await expectSuccessResponse(response);

        expect(data.tier).toBe('plus');
        expect(data.expiresAt).toBe(expiresAt.toISOString());
        expect(data.bonusReceived).toBe(true);
        expect(data.plan).toEqual({
          name: 'プラス',
          dailyFreeCoins: 150,
          freeChallenges: 10,
        });
        expect(mockGetSubscriptionStatus).toHaveBeenCalledWith('test-user-id-123');
      });

      it('premiumプランのステータスを取得できる（freeChallengesはInfinity→-1変換）', async () => {
        mockGetSubscriptionStatus.mockResolvedValue({
          tier: 'premium',
          expiresAt: new Date('2026-03-01T00:00:00Z'),
          bonusReceived: true,
          plan: {
            name: 'プレミアム',
            dailyFreeCoins: 300,
            freeChallenges: Infinity,
          },
        });

        const req = createAuthenticatedRequest('/api/subscription/status');
        const response = await GET(req);
        const data = await expectSuccessResponse(response);

        expect(data.tier).toBe('premium');
        expect(data.plan.freeChallenges).toBe(-1); // Infinity is converted to -1
      });

      it('サブスクなしのステータスを取得できる', async () => {
        mockGetSubscriptionStatus.mockResolvedValue({
          tier: null,
          expiresAt: null,
          bonusReceived: false,
          plan: null,
        });

        const req = createAuthenticatedRequest('/api/subscription/status');
        const response = await GET(req);
        const data = await expectSuccessResponse(response);

        expect(data.tier).toBeNull();
        expect(data.expiresAt).toBeNull();
        expect(data.bonusReceived).toBe(false);
        expect(data.plan).toBeNull();
      });
    });

    describe('エラーハンドリング', () => {
      it('サービスエラーの場合、500を返す', async () => {
        mockGetSubscriptionStatus.mockRejectedValue(new Error('Service error'));

        const req = createAuthenticatedRequest('/api/subscription/status');
        const response = await GET(req);

        await expectErrorResponse(response, 500);
      });
    });
  });
});
