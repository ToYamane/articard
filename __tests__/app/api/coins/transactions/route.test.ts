/**
 * /api/coins/transactions API テスト
 * GET - トランザクション履歴取得
 */

import { GET } from '@/app/api/coins/transactions/route';
import {
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  createRequestWithParams,
  expectSuccessResponse,
  expectErrorResponse,
  ERROR_CODES,
} from '@/__tests__/helpers';

// 認証モック
const mockVerifyAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));

// coin-service モック
const mockGetTransactions = jest.fn();
jest.mock('@/lib/services/coin-service', () => ({
  getTransactions: (...args: unknown[]) => mockGetTransactions(...args),
}));

describe('/api/coins/transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAuth.mockResolvedValue({
      uid: 'test-user-id-123',
      email: 'test@example.com',
      emailVerified: true,
    });
  });

  describe('GET /api/coins/transactions', () => {
    describe('認証チェック', () => {
      it('未認証の場合、401を返す', async () => {
        mockVerifyAuth.mockResolvedValue(null);

        const req = createUnauthenticatedRequest('/api/coins/transactions');
        const response = await GET(req);

        await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
      });
    });

    describe('正常系', () => {
      it('トランザクション一覧を取得できる', async () => {
        const mockTxns = {
          transactions: [
            {
              id: 'txn-1',
              amount: 300,
              transactionType: 'bonus',
              description: 'プラスプラン初回特典',
              balanceAfter: 400,
              createdAt: new Date('2026-01-15T10:00:00Z'),
            },
            {
              id: 'txn-2',
              amount: -30,
              transactionType: 'consume',
              description: 'カード生成',
              balanceAfter: 370,
              createdAt: new Date('2026-01-15T11:00:00Z'),
            },
          ],
          nextCursor: null,
          hasMore: false,
        };
        mockGetTransactions.mockResolvedValue(mockTxns);

        const req = createAuthenticatedRequest('/api/coins/transactions');
        const response = await GET(req);
        const data = await expectSuccessResponse(response);

        expect(data.transactions).toHaveLength(2);
        expect(data.hasMore).toBe(false);
        expect(mockGetTransactions).toHaveBeenCalledWith('test-user-id-123', {
          limit: undefined,
          cursor: undefined,
        });
      });

      it('ページネーションパラメータが正しく渡される', async () => {
        mockGetTransactions.mockResolvedValue({
          transactions: [],
          nextCursor: null,
          hasMore: false,
        });

        const req = createRequestWithParams('/api/coins/transactions', {
          limit: '10',
          cursor: 'txn-prev',
        });
        const response = await GET(req);

        await expectSuccessResponse(response);
        expect(mockGetTransactions).toHaveBeenCalledWith('test-user-id-123', {
          limit: 10,
          cursor: 'txn-prev',
        });
      });

      it('トランザクションがない場合は空配列を返す', async () => {
        mockGetTransactions.mockResolvedValue({
          transactions: [],
          nextCursor: null,
          hasMore: false,
        });

        const req = createAuthenticatedRequest('/api/coins/transactions');
        const response = await GET(req);
        const data = await expectSuccessResponse(response);

        expect(data.transactions).toHaveLength(0);
        expect(data.hasMore).toBe(false);
      });
    });

    describe('エラーハンドリング', () => {
      it('サービスエラーの場合、500を返す', async () => {
        mockGetTransactions.mockRejectedValue(new Error('Service error'));

        const req = createAuthenticatedRequest('/api/coins/transactions');
        const response = await GET(req);

        await expectErrorResponse(response, 500);
      });
    });
  });
});
