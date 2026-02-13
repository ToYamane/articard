/**
 * /api/coins/purchase API テスト
 * POST - コイン購入（開発者のみ）
 */

import { POST } from '@/app/api/coins/purchase/route';
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
const mockTransaction = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

describe('/api/coins/purchase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAuth.mockResolvedValue({
      uid: 'test-user-id-123',
      email: 'test@example.com',
      emailVerified: true,
    });
  });

  describe('POST /api/coins/purchase', () => {
    describe('認証チェック', () => {
      it('未認証の場合、401を返す', async () => {
        mockVerifyAuth.mockResolvedValue(null);

        const req = createUnauthenticatedRequest('/api/coins/purchase', {
          method: 'POST',
          body: { packageId: 'standard' },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
      });
    });

    describe('開発者チェック', () => {
      it('開発者でない場合、403を返す', async () => {
        mockUserFindUnique.mockResolvedValue({
          isDeveloper: false,
          knowledgeBalance: 100,
          dailyFreeCoins: 90,
        });

        const req = createAuthenticatedRequest('/api/coins/purchase', {
          method: 'POST',
          body: { packageId: 'standard' },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 403, ERROR_CODES.FORBIDDEN);
      });

      it('ユーザーが見つからない場合、403を返す', async () => {
        mockUserFindUnique.mockResolvedValue(null);

        const req = createAuthenticatedRequest('/api/coins/purchase', {
          method: 'POST',
          body: { packageId: 'standard' },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 403, ERROR_CODES.FORBIDDEN);
      });
    });

    describe('バリデーションチェック', () => {
      it('packageIdがない場合、400を返す', async () => {
        mockUserFindUnique.mockResolvedValue({
          isDeveloper: true,
          knowledgeBalance: 100,
          dailyFreeCoins: 90,
        });

        const req = createAuthenticatedRequest('/api/coins/purchase', {
          method: 'POST',
          body: {},
        });
        const response = await POST(req);

        await expectErrorResponse(response, 400, 'INVALID_PACKAGE');
      });

      it('無効なpackageIdの場合、400を返す', async () => {
        mockUserFindUnique.mockResolvedValue({
          isDeveloper: true,
          knowledgeBalance: 100,
          dailyFreeCoins: 90,
        });

        const req = createAuthenticatedRequest('/api/coins/purchase', {
          method: 'POST',
          body: { packageId: 'invalid-package' },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 400, 'INVALID_PACKAGE');
      });
    });

    describe('正常系', () => {
      it('standardパッケージを購入できる', async () => {
        mockUserFindUnique.mockResolvedValue({
          isDeveloper: true,
          knowledgeBalance: 100,
          dailyFreeCoins: 90,
        });
        mockTransaction.mockResolvedValue({ newBalance: 700 }); // 100 + 600

        const req = createAuthenticatedRequest('/api/coins/purchase', {
          method: 'POST',
          body: { packageId: 'standard' },
        });
        const response = await POST(req);
        const data = await expectSuccessResponse(response);

        expect(data.coins).toBe(600);
        expect(data.newBalance).toBe(700);
      });

      it('valueパッケージを購入できる', async () => {
        mockUserFindUnique.mockResolvedValue({
          isDeveloper: true,
          knowledgeBalance: 0,
          dailyFreeCoins: 90,
        });
        mockTransaction.mockResolvedValue({ newBalance: 2100 });

        const req = createAuthenticatedRequest('/api/coins/purchase', {
          method: 'POST',
          body: { packageId: 'value' },
        });
        const response = await POST(req);
        const data = await expectSuccessResponse(response);

        expect(data.coins).toBe(2100);
        expect(data.newBalance).toBe(2100);
      });

      it('megaパッケージを購入できる', async () => {
        mockUserFindUnique.mockResolvedValue({
          isDeveloper: true,
          knowledgeBalance: 1000,
          dailyFreeCoins: 90,
        });
        mockTransaction.mockResolvedValue({ newBalance: 7000 });

        const req = createAuthenticatedRequest('/api/coins/purchase', {
          method: 'POST',
          body: { packageId: 'mega' },
        });
        const response = await POST(req);
        const data = await expectSuccessResponse(response);

        expect(data.coins).toBe(6000);
        expect(data.newBalance).toBe(7000);
      });
    });

    describe('エラーハンドリング', () => {
      it('トランザクションエラーの場合、500を返す', async () => {
        mockUserFindUnique.mockResolvedValue({
          isDeveloper: true,
          knowledgeBalance: 100,
          dailyFreeCoins: 90,
        });
        mockTransaction.mockRejectedValue(new Error('Transaction error'));

        const req = createAuthenticatedRequest('/api/coins/purchase', {
          method: 'POST',
          body: { packageId: 'standard' },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 500);
      });
    });
  });
});
