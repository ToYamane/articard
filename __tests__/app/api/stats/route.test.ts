/**
 * /api/stats API テスト
 * GET
 */

import { GET } from '@/app/api/stats/route';
import {
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  expectSuccessResponse,
  expectErrorResponse,
  ERROR_CODES,
} from '@/__tests__/helpers';

// モック関数
const mockCount = jest.fn();
const mockGroupBy = jest.fn();
const mockAggregate = jest.fn();

// Prismaモジュールをモック - インラインでオブジェクトを定義
jest.mock('@/lib/prisma', () => {
  const prismaInstance = {
    card: {
      count: (...args: unknown[]) => mockCount(...args),
      groupBy: (...args: unknown[]) => mockGroupBy(...args),
    },
    knowledgeTransaction: {
      aggregate: (...args: unknown[]) => mockAggregate(...args),
    },
  };
  return {
    __esModule: true,
    default: prismaInstance,
    prisma: prismaInstance,
  };
});

// 認証モック
const mockVerifyAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));

describe('/api/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトで認証成功
    mockVerifyAuth.mockResolvedValue({
      uid: 'test-user-id-123',
      email: 'test@example.com',
      emailVerified: true,
    });
    // デフォルトでknowledge aggregateを0にする
    mockAggregate.mockResolvedValue({ _sum: { amount: 0 } });
  });

  describe('GET /api/stats', () => {
    describe('認証チェック', () => {
      it('未認証の場合、401を返す', async () => {
        mockVerifyAuth.mockResolvedValue(null);

        const req = createUnauthenticatedRequest('/api/stats');
        const response = await GET(req);

        await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
      });
    });

    describe('正常系', () => {
      it('統計情報を取得できる', async () => {
        mockCount.mockResolvedValue(10);
        mockGroupBy.mockResolvedValue([
          { rarity: 'common', _count: { rarity: 5 } },
          { rarity: 'uncommon', _count: { rarity: 3 } },
          { rarity: 'rare', _count: { rarity: 2 } },
        ]);

        const req = createAuthenticatedRequest('/api/stats');
        const response = await GET(req);
        const data = await expectSuccessResponse(response, 200);

        expect(data.totalCards).toBe(10);
        expect(data.rarityBreakdown).toBeDefined();
        expect(data.rarityBreakdown.common).toBe(5);
        expect(data.rarityBreakdown.uncommon).toBe(3);
        expect(data.rarityBreakdown.rare).toBe(2);
      });

      it('カードがない場合は0を返す', async () => {
        mockCount.mockResolvedValue(0);
        mockGroupBy.mockResolvedValue([]);

        const req = createAuthenticatedRequest('/api/stats');
        const response = await GET(req);
        const data = await expectSuccessResponse(response, 200);

        expect(data.totalCards).toBe(0);
        expect(data.rarityBreakdown).toBeDefined();
        expect(data.rarityBreakdown.common).toBe(0);
        expect(data.rarityBreakdown.uncommon).toBe(0);
        expect(data.rarityBreakdown.rare).toBe(0);
        expect(data.rarityBreakdown.super_rare).toBe(0);
        expect(data.rarityBreakdown.legend).toBe(0);
      });

      it('全てのレア度が統計に含まれる', async () => {
        mockCount.mockResolvedValue(15);
        mockGroupBy.mockResolvedValue([
          { rarity: 'common', _count: { rarity: 5 } },
          { rarity: 'uncommon', _count: { rarity: 4 } },
          { rarity: 'rare', _count: { rarity: 3 } },
          { rarity: 'super_rare', _count: { rarity: 2 } },
          { rarity: 'legend', _count: { rarity: 1 } },
        ]);

        const req = createAuthenticatedRequest('/api/stats');
        const response = await GET(req);
        const data = await expectSuccessResponse(response, 200);

        expect(data.totalCards).toBe(15);
        expect(data.rarityBreakdown.common).toBe(5);
        expect(data.rarityBreakdown.uncommon).toBe(4);
        expect(data.rarityBreakdown.rare).toBe(3);
        expect(data.rarityBreakdown.super_rare).toBe(2);
        expect(data.rarityBreakdown.legend).toBe(1);
      });
    });

    describe('エラーハンドリング', () => {
      it('データベースエラーの場合、500を返す', async () => {
        mockCount.mockRejectedValue(new Error('Database error'));

        const req = createAuthenticatedRequest('/api/stats');
        const response = await GET(req);

        await expectErrorResponse(response, 500, ERROR_CODES.INTERNAL_ERROR);
      });
    });
  });
});
