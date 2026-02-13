/**
 * /api/coins API テスト
 * GET - コイン残高取得（withAuthラッパー使用）
 */

import { GET } from '@/app/api/coins/route';
import {
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  expectSuccessResponse,
  expectErrorResponse,
  ERROR_CODES,
} from '@/__tests__/helpers';

// 認証モック (withAuth internally calls verifyAuth)
const mockVerifyAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));

// Prismaモック
const mockUserFindUnique = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
}));

// coin-service モック
const mockGetBalances = jest.fn();
const mockCheckChallengeLimit = jest.fn();
jest.mock('@/lib/services/coin-service', () => ({
  getBalances: (...args: unknown[]) => mockGetBalances(...args),
  checkChallengeLimit: (...args: unknown[]) => mockCheckChallengeLimit(...args),
}));

describe('/api/coins', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAuth.mockResolvedValue({
      uid: 'test-user-id-123',
      email: 'test@example.com',
      emailVerified: true,
    });
  });

  describe('GET /api/coins', () => {
    describe('認証チェック', () => {
      it('未認証の場合、401を返す', async () => {
        mockVerifyAuth.mockResolvedValue(null);

        const req = createUnauthenticatedRequest('/api/coins');
        const response = await GET(req);

        await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
      });
    });

    describe('正常系', () => {
      it('無料ユーザーのコイン残高を取得できる', async () => {
        mockGetBalances.mockResolvedValue({
          freeCoins: 90,
          permanentCoins: 100,
          totalAvailable: 190,
        });
        mockCheckChallengeLimit.mockResolvedValue({
          count: 1,
          remainingFree: 2,
          isFree: true,
          cost: 0,
        });
        mockUserFindUnique.mockResolvedValue({
          subscriptionTier: null,
          premiumExpiresAt: null,
          subscriptionBonusReceived: false,
        });

        const req = createAuthenticatedRequest('/api/coins');
        const response = await GET(req);
        const data = await expectSuccessResponse(response);

        expect(data.freeCoins).toBe(90);
        expect(data.permanentCoins).toBe(100);
        expect(data.totalAvailable).toBe(190);
        expect(data.challenge.count).toBe(1);
        expect(data.challenge.remainingFree).toBe(2);
        expect(data.challenge.isFree).toBe(true);
        expect(data.challenge.nextCost).toBe(0);
        expect(data.subscription.tier).toBeNull();
        expect(data.subscription.plan).toBeNull();
        expect(data.packages).toBeDefined();
        expect(data.packages.length).toBe(3); // standard, value, premium
      });

      it('plusプランユーザーのコイン残高を取得できる', async () => {
        mockGetBalances.mockResolvedValue({
          freeCoins: 150,
          permanentCoins: 400,
          totalAvailable: 550,
        });
        mockCheckChallengeLimit.mockResolvedValue({
          count: 5,
          remainingFree: 5,
          isFree: true,
          cost: 0,
        });
        const expiresAt = new Date('2026-03-01T00:00:00Z');
        mockUserFindUnique.mockResolvedValue({
          subscriptionTier: 'plus',
          premiumExpiresAt: expiresAt,
          subscriptionBonusReceived: true,
        });

        const req = createAuthenticatedRequest('/api/coins');
        const response = await GET(req);
        const data = await expectSuccessResponse(response);

        expect(data.subscription.tier).toBe('plus');
        expect(data.subscription.expiresAt).toBe(expiresAt.toISOString());
        expect(data.subscription.bonusReceived).toBe(true);
        expect(data.subscription.plan.name).toBe('プラス');
        expect(data.subscription.plan.dailyFreeCoins).toBe(150);
        expect(data.subscription.plan.freeChallenges).toBe(10);
      });

      it('premiumプランのfreeChallengesはInfinity→-1に変換される', async () => {
        mockGetBalances.mockResolvedValue({
          freeCoins: 300,
          permanentCoins: 1000,
          totalAvailable: 1300,
        });
        mockCheckChallengeLimit.mockResolvedValue({
          count: 0,
          remainingFree: Infinity,
          isFree: true,
          cost: 0,
        });
        mockUserFindUnique.mockResolvedValue({
          subscriptionTier: 'premium',
          premiumExpiresAt: new Date('2026-03-01T00:00:00Z'),
          subscriptionBonusReceived: true,
        });

        const req = createAuthenticatedRequest('/api/coins');
        const response = await GET(req);
        const data = await expectSuccessResponse(response);

        expect(data.challenge.remainingFree).toBe(-1); // Infinity -> -1
        expect(data.subscription.plan.freeChallenges).toBe(-1); // Infinity -> -1
      });

      it('パッケージ情報が正しく含まれる', async () => {
        mockGetBalances.mockResolvedValue({
          freeCoins: 90,
          permanentCoins: 0,
          totalAvailable: 90,
        });
        mockCheckChallengeLimit.mockResolvedValue({
          count: 0,
          remainingFree: 3,
          isFree: true,
          cost: 0,
        });
        mockUserFindUnique.mockResolvedValue({
          subscriptionTier: null,
          premiumExpiresAt: null,
          subscriptionBonusReceived: false,
        });

        const req = createAuthenticatedRequest('/api/coins');
        const response = await GET(req);
        const data = await expectSuccessResponse(response);

        const standardPkg = data.packages.find((p: { id: string }) => p.id === 'standard');
        expect(standardPkg).toBeDefined();
        expect(standardPkg.coins).toBe(600);
        expect(standardPkg.price).toBe(980);

        const valuePkg = data.packages.find((p: { id: string }) => p.id === 'value');
        expect(valuePkg).toBeDefined();
        expect(valuePkg.coins).toBe(2100);

        const megaPkg = data.packages.find((p: { id: string }) => p.id === 'mega');
        expect(megaPkg).toBeDefined();
        expect(megaPkg.coins).toBe(6000);
      });
    });

    describe('エラーハンドリング', () => {
      it('サービスエラーの場合、500を返す', async () => {
        mockGetBalances.mockRejectedValue(new Error('Service error'));

        const req = createAuthenticatedRequest('/api/coins');
        const response = await GET(req);

        await expectErrorResponse(response, 500);
      });
    });
  });
});
