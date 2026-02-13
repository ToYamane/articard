/**
 * /api/subscription API テスト
 * POST - サブスク有効化（開発者のみ）
 * DELETE - サブスク解約
 */

import { POST, DELETE } from '@/app/api/subscription/route';
import {
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  expectSuccessResponse,
  expectErrorResponse,
  ERROR_CODES,
} from '@/__tests__/helpers';

// Stripeモック（モジュールレベルのenv checkを回避）
const mockStripeSubscriptionsCancel = jest.fn();
jest.mock('@/lib/stripe', () => ({
  stripe: {
    subscriptions: {
      cancel: (...args: unknown[]) => mockStripeSubscriptionsCancel(...args),
    },
  },
}));

// 認証モック
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

// subscription-service モック
const mockActivateSubscription = jest.fn();
const mockCancelSubscription = jest.fn();
jest.mock('@/lib/services/subscription-service', () => ({
  activateSubscription: (...args: unknown[]) => mockActivateSubscription(...args),
  cancelSubscription: (...args: unknown[]) => mockCancelSubscription(...args),
}));

describe('/api/subscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAuth.mockResolvedValue({
      uid: 'test-user-id-123',
      email: 'test@example.com',
      emailVerified: true,
    });
  });

  // ==================== POST ====================
  describe('POST /api/subscription', () => {
    describe('認証チェック', () => {
      it('未認証の場合、401を返す', async () => {
        mockVerifyAuth.mockResolvedValue(null);

        const req = createUnauthenticatedRequest('/api/subscription', {
          method: 'POST',
          body: { tier: 'plus' },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
      });
    });

    describe('開発者チェック', () => {
      it('開発者でない場合、403を返す', async () => {
        mockUserFindUnique.mockResolvedValue({ isDeveloper: false });

        const req = createAuthenticatedRequest('/api/subscription', {
          method: 'POST',
          body: { tier: 'plus' },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 403, ERROR_CODES.FORBIDDEN);
      });

      it('ユーザーが見つからない場合、403を返す', async () => {
        mockUserFindUnique.mockResolvedValue(null);

        const req = createAuthenticatedRequest('/api/subscription', {
          method: 'POST',
          body: { tier: 'plus' },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 403, ERROR_CODES.FORBIDDEN);
      });
    });

    describe('バリデーションチェック', () => {
      it('tierがない場合、400を返す', async () => {
        mockUserFindUnique.mockResolvedValue({ isDeveloper: true });

        const req = createAuthenticatedRequest('/api/subscription', {
          method: 'POST',
          body: {},
        });
        const response = await POST(req);

        await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
      });

      it('無効なtierの場合、400を返す', async () => {
        mockUserFindUnique.mockResolvedValue({ isDeveloper: true });

        const req = createAuthenticatedRequest('/api/subscription', {
          method: 'POST',
          body: { tier: 'invalid' },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
      });
    });

    describe('正常系', () => {
      it('plusプランを有効化できる', async () => {
        mockUserFindUnique.mockResolvedValue({ isDeveloper: true });
        const expiresAt = new Date('2026-03-01T00:00:00Z');
        mockActivateSubscription.mockResolvedValue({
          success: true,
          tier: 'plus',
          bonusCoins: 300,
          expiresAt,
        });

        const req = createAuthenticatedRequest('/api/subscription', {
          method: 'POST',
          body: { tier: 'plus' },
        });
        const response = await POST(req);
        const data = await expectSuccessResponse(response);

        expect(data.tier).toBe('plus');
        expect(data.bonusCoins).toBe(300);
        expect(data.expiresAt).toBe(expiresAt.toISOString());
        expect(mockActivateSubscription).toHaveBeenCalledWith('test-user-id-123', 'plus');
      });

      it('premiumプランを有効化できる', async () => {
        mockUserFindUnique.mockResolvedValue({ isDeveloper: true });
        const expiresAt = new Date('2026-03-01T00:00:00Z');
        mockActivateSubscription.mockResolvedValue({
          success: true,
          tier: 'premium',
          bonusCoins: 900,
          expiresAt,
        });

        const req = createAuthenticatedRequest('/api/subscription', {
          method: 'POST',
          body: { tier: 'premium' },
        });
        const response = await POST(req);
        const data = await expectSuccessResponse(response);

        expect(data.tier).toBe('premium');
        expect(data.bonusCoins).toBe(900);
      });
    });

    describe('エラーハンドリング', () => {
      it('サービスエラーの場合、500を返す', async () => {
        mockUserFindUnique.mockResolvedValue({ isDeveloper: true });
        mockActivateSubscription.mockRejectedValue(new Error('Service error'));

        const req = createAuthenticatedRequest('/api/subscription', {
          method: 'POST',
          body: { tier: 'plus' },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 500);
      });
    });
  });

  // ==================== DELETE ====================
  describe('DELETE /api/subscription', () => {
    describe('認証チェック', () => {
      it('未認証の場合、401を返す', async () => {
        mockVerifyAuth.mockResolvedValue(null);

        const req = createUnauthenticatedRequest('/api/subscription', {
          method: 'DELETE',
        });
        const response = await DELETE(req);

        await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
      });
    });

    describe('正常系', () => {
      it('サブスクリプションを解約できる', async () => {
        mockCancelSubscription.mockResolvedValue(undefined);

        const req = createAuthenticatedRequest('/api/subscription', {
          method: 'DELETE',
        });
        const response = await DELETE(req);
        const data = await expectSuccessResponse(response);

        expect(data.message).toBe('サブスクリプションを解約しました');
        expect(mockCancelSubscription).toHaveBeenCalledWith('test-user-id-123');
      });
    });

    describe('エラーハンドリング', () => {
      it('サービスエラーの場合、500を返す', async () => {
        mockCancelSubscription.mockRejectedValue(new Error('Service error'));

        const req = createAuthenticatedRequest('/api/subscription', {
          method: 'DELETE',
        });
        const response = await DELETE(req);

        await expectErrorResponse(response, 500);
      });
    });
  });
});
