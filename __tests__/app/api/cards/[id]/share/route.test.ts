/**
 * /api/cards/[id]/share API テスト
 * GET (認証不要の公開エンドポイント)
 */

import { GET } from '@/app/api/cards/[id]/share/route';
import {
  createUnauthenticatedRequest,
  expectSuccessResponse,
  expectErrorResponse,
  ERROR_CODES,
} from '@/__tests__/helpers';

// モックデータ（UUID形式）
const mockUser = {
  id: 'test-user-id-123',
  nickname: 'testuser',
};

const mockCard = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  userId: 'test-user-id-123',
  articleId: '550e8400-e29b-41d4-a716-446655440010',
  keyword: 'テストキーワード',
  rarity: 'rare',
  flavorText: 'このカードは知識の結晶です。',
  contextCategory: 'technology',
  contextDescription: 'テストの文脈説明',
  illustrationUrl: 'https://storage.example.com/illustrations/test.jpg',
  cardImageUrl: 'https://storage.example.com/cards/test.jpg',
  thumbnailUrl: 'https://storage.example.com/thumbnails/test.jpg',
  fluxPrompt: 'test prompt for illustration',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

// モック関数
const mockFindUnique = jest.fn();

// Prismaモジュールをモック
jest.mock('@/lib/prisma', () => {
  const prismaInstance = {
    card: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  };
  return {
    __esModule: true,
    default: prismaInstance,
    prisma: prismaInstance,
  };
});

// パラメータ型
type RouteParams = { params: Promise<{ id: string }> };

describe('/api/cards/[id]/share', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/cards/[id]/share', () => {
    const validParams: RouteParams = { params: Promise.resolve({ id: mockCard.id }) };

    describe('バリデーションチェック', () => {
      it('不正なIDの場合、400を返す', async () => {
        const invalidParams: RouteParams = { params: Promise.resolve({ id: 'invalid-id' }) };

        const req = createUnauthenticatedRequest('/api/cards/invalid-id/share');
        const response = await GET(req, invalidParams);

        await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
      });
    });

    describe('正常系', () => {
      it('認証なしでカード情報を取得できる', async () => {
        const cardWithUser = {
          ...mockCard,
          user: mockUser,
        };
        mockFindUnique.mockResolvedValue(cardWithUser);

        const req = createUnauthenticatedRequest(`/api/cards/${mockCard.id}/share`);
        const response = await GET(req, validParams);
        const data = await expectSuccessResponse(response, 200);

        expect(data.id).toBe(mockCard.id);
        expect(data.keyword).toBe(mockCard.keyword);
        expect(data.rarity).toBe(mockCard.rarity);
        expect(data.flavorText).toBe(mockCard.flavorText);
        expect(data.cardImageUrl).toBe(mockCard.cardImageUrl);
        expect(data.owner).toBeDefined();
        expect(data.owner.nickname).toBe(mockUser.nickname);
        expect(data.ogp).toBeDefined();
      });

      it('OGPメタデータが正しく生成される', async () => {
        const cardWithUser = {
          ...mockCard,
          user: mockUser,
        };
        mockFindUnique.mockResolvedValue(cardWithUser);

        const req = createUnauthenticatedRequest(`/api/cards/${mockCard.id}/share`);
        const response = await GET(req, validParams);
        const data = await expectSuccessResponse(response, 200);

        expect(data.ogp.title).toContain(mockCard.keyword);
        expect(data.ogp.description).toBe(mockCard.flavorText);
        expect(data.ogp.imageUrl).toBe(mockCard.cardImageUrl);
      });

      it('カードが見つからない場合、404を返す', async () => {
        mockFindUnique.mockResolvedValue(null);

        const req = createUnauthenticatedRequest(`/api/cards/${mockCard.id}/share`);
        const response = await GET(req, validParams);

        await expectErrorResponse(response, 404, ERROR_CODES.NOT_FOUND);
      });
    });

    describe('エラーハンドリング', () => {
      it('データベースエラーの場合、500を返す', async () => {
        mockFindUnique.mockRejectedValue(new Error('Database error'));

        const req = createUnauthenticatedRequest(`/api/cards/${mockCard.id}/share`);
        const response = await GET(req, validParams);

        await expectErrorResponse(response, 500, ERROR_CODES.INTERNAL_ERROR);
      });
    });
  });
});
