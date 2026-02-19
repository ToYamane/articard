/**
 * /api/stripe/checkout API テスト
 * POST - Checkoutセッション作成
 */

import { POST } from '@/app/api/stripe/checkout/route';
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

// Prismaモック
const mockUserFindUnique = jest.fn();
const mockUserUpdate = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
  },
}));

// Stripeモック
const mockCustomersCreate = jest.fn();
const mockCustomersRetrieve = jest.fn();
const mockCheckoutCreate = jest.fn();
const mockGetPriceId = jest.fn();
jest.mock('@/lib/stripe', () => ({
  stripe: {
    customers: {
      create: (...args: unknown[]) => mockCustomersCreate(...args),
      retrieve: (...args: unknown[]) => mockCustomersRetrieve(...args),
    },
    checkout: { sessions: { create: (...args: unknown[]) => mockCheckoutCreate(...args) } },
  },
  getPriceIdForTier: (...args: unknown[]) => mockGetPriceId(...args),
}));

describe('/api/stripe/checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAuth.mockResolvedValue({
      uid: 'test-user-id-123',
      email: 'test@example.com',
      emailVerified: true,
    });
    // 既存カスタマーIDは有効として返す（デフォルト）
    mockCustomersRetrieve.mockResolvedValue({ id: 'cus_existing', deleted: false });
  });

  describe('POST /api/stripe/checkout', () => {
    describe('認証チェック', () => {
      it('未認証の場合、401を返す', async () => {
        mockVerifyAuth.mockResolvedValue(null);

        const req = createUnauthenticatedRequest('/api/stripe/checkout', {
          method: 'POST',
          body: { tier: 'plus' },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
      });
    });

    describe('バリデーションチェック', () => {
      it('tierがない場合、400を返す', async () => {
        const req = createAuthenticatedRequest('/api/stripe/checkout', {
          method: 'POST',
          body: {},
        });
        const response = await POST(req);

        await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
      });

      it('無効なtierの場合、400を返す', async () => {
        const req = createAuthenticatedRequest('/api/stripe/checkout', {
          method: 'POST',
          body: { tier: 'invalid' },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
      });
    });

    describe('ユーザーチェック', () => {
      it('ユーザーが見つからない場合、404を返す', async () => {
        mockUserFindUnique.mockResolvedValue(null);

        const req = createAuthenticatedRequest('/api/stripe/checkout', {
          method: 'POST',
          body: { tier: 'plus' },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 404, 'USER_NOT_FOUND');
      });

      it('既にサブスク中の場合、400を返す', async () => {
        mockUserFindUnique.mockResolvedValue({
          id: 'test-user-id-123',
          stripeCustomerId: 'cus_test',
          subscriptionTier: 'plus',
        });

        const req = createAuthenticatedRequest('/api/stripe/checkout', {
          method: 'POST',
          body: { tier: 'premium' },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 400, 'ALREADY_SUBSCRIBED');
      });
    });

    describe('正常系', () => {
      it('既存のStripeカスタマーでCheckoutセッションを作成できる', async () => {
        mockUserFindUnique.mockResolvedValue({
          id: 'test-user-id-123',
          stripeCustomerId: 'cus_existing',
          subscriptionTier: null,
        });
        mockGetPriceId.mockReturnValue('price_plus_test');
        mockCheckoutCreate.mockResolvedValue({
          id: 'cs_test_session',
          url: 'https://checkout.stripe.com/session/cs_test_session',
        });

        const req = createAuthenticatedRequest('/api/stripe/checkout', {
          method: 'POST',
          body: { tier: 'plus' },
        });
        const response = await POST(req);
        const data = await expectSuccessResponse(response);

        expect(data.sessionId).toBe('cs_test_session');
        expect(data.url).toBe('https://checkout.stripe.com/session/cs_test_session');

        // 新しいカスタマーは作成されない
        expect(mockCustomersCreate).not.toHaveBeenCalled();
        expect(mockUserUpdate).not.toHaveBeenCalled();
      });

      it('Stripeカスタマーがない場合、新規作成してCheckoutセッションを作成する', async () => {
        mockUserFindUnique.mockResolvedValue({
          id: 'test-user-id-123',
          stripeCustomerId: null,
          subscriptionTier: null,
        });
        mockCustomersCreate.mockResolvedValue({ id: 'cus_new' });
        mockUserUpdate.mockResolvedValue({});
        mockGetPriceId.mockReturnValue('price_plus_test');
        mockCheckoutCreate.mockResolvedValue({
          id: 'cs_test_session',
          url: 'https://checkout.stripe.com/session/cs_test_session',
        });

        const req = createAuthenticatedRequest('/api/stripe/checkout', {
          method: 'POST',
          body: { tier: 'plus' },
        });
        const response = await POST(req);
        const data = await expectSuccessResponse(response);

        expect(data.sessionId).toBe('cs_test_session');

        // 新しいカスタマーが作成される
        expect(mockCustomersCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: { userId: 'test-user-id-123' },
          })
        );

        // カスタマーIDが保存される
        expect(mockUserUpdate).toHaveBeenCalledWith({
          where: { id: 'test-user-id-123' },
          data: { stripeCustomerId: 'cus_new' },
        });
      });

      it('premiumプランのCheckoutセッションを作成できる', async () => {
        mockUserFindUnique.mockResolvedValue({
          id: 'test-user-id-123',
          stripeCustomerId: 'cus_existing',
          subscriptionTier: null,
        });
        mockGetPriceId.mockReturnValue('price_premium_test');
        mockCheckoutCreate.mockResolvedValue({
          id: 'cs_premium_session',
          url: 'https://checkout.stripe.com/session/cs_premium_session',
        });

        const req = createAuthenticatedRequest('/api/stripe/checkout', {
          method: 'POST',
          body: { tier: 'premium' },
        });
        const response = await POST(req);
        const data = await expectSuccessResponse(response);

        expect(data.sessionId).toBe('cs_premium_session');
        expect(mockGetPriceId).toHaveBeenCalledWith('premium');
      });

      it('session.urlがnullの場合は空文字を返す', async () => {
        mockUserFindUnique.mockResolvedValue({
          id: 'test-user-id-123',
          stripeCustomerId: 'cus_existing',
          subscriptionTier: null,
        });
        mockGetPriceId.mockReturnValue('price_plus_test');
        mockCheckoutCreate.mockResolvedValue({
          id: 'cs_test_session',
          url: null,
        });

        const req = createAuthenticatedRequest('/api/stripe/checkout', {
          method: 'POST',
          body: { tier: 'plus' },
        });
        const response = await POST(req);
        const data = await expectSuccessResponse(response);

        expect(data.url).toBe('');
      });
    });

    describe('エラーハンドリング', () => {
      it('priceIdが見つからない場合、500を返す', async () => {
        mockUserFindUnique.mockResolvedValue({
          id: 'test-user-id-123',
          stripeCustomerId: 'cus_existing',
          subscriptionTier: null,
        });
        mockGetPriceId.mockReturnValue(''); // empty string = falsy

        const req = createAuthenticatedRequest('/api/stripe/checkout', {
          method: 'POST',
          body: { tier: 'plus' },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 500, 'PRICE_NOT_FOUND');
      });

      it('Stripeエラーの場合、500を返す', async () => {
        mockUserFindUnique.mockResolvedValue({
          id: 'test-user-id-123',
          stripeCustomerId: 'cus_existing',
          subscriptionTier: null,
        });
        mockGetPriceId.mockReturnValue('price_plus_test');
        mockCheckoutCreate.mockRejectedValue(new Error('Stripe error'));

        const req = createAuthenticatedRequest('/api/stripe/checkout', {
          method: 'POST',
          body: { tier: 'plus' },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 500);
      });
    });
  });
});
