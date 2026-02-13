/**
 * /api/cards API テスト
 * POST, GET
 */

import { POST, GET } from '@/app/api/cards/route';
import {
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  createRequestWithParams,
  expectSuccessResponse,
  expectErrorResponse,
  ERROR_CODES,
} from '@/__tests__/helpers';

// モックデータ（UUID形式）
const mockArticle = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  userId: 'test-user-id-123',
  theme: 'テストテーマ',
};

const mockCard = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  userId: 'test-user-id-123',
  articleId: '550e8400-e29b-41d4-a716-446655440001',
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

// 認証モック
const mockVerifyAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));

// カードサービスモック
const mockCreateCard = jest.fn();
const mockGetCardsByUser = jest.fn();
jest.mock('@/lib/services/card-service', () => ({
  createCard: (...args: unknown[]) => mockCreateCard(...args),
  getCardsByUser: (...args: unknown[]) => mockGetCardsByUser(...args),
}));

describe('/api/cards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトで認証成功
    mockVerifyAuth.mockResolvedValue({
      uid: 'test-user-id-123',
      email: 'test@example.com',
      emailVerified: true,
    });
  });

  // ==================== POST ====================
  describe('POST /api/cards', () => {
    describe('認証チェック', () => {
      it('未認証の場合、401を返す', async () => {
        mockVerifyAuth.mockResolvedValue(null);

        const req = createUnauthenticatedRequest('/api/cards', {
          method: 'POST',
          body: { articleId: mockArticle.id },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
      });
    });

    describe('バリデーションチェック', () => {
      it('articleIdがない場合、400を返す', async () => {
        const req = createAuthenticatedRequest('/api/cards', {
          method: 'POST',
          body: {},
        });
        const response = await POST(req);

        await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
      });

      it('articleIdが不正な形式の場合、400を返す', async () => {
        const req = createAuthenticatedRequest('/api/cards', {
          method: 'POST',
          body: { articleId: 'invalid-id' },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
      });
    });

    describe('正常系', () => {
      it('カードを生成できる', async () => {
        mockCreateCard.mockResolvedValue(mockCard);

        const req = createAuthenticatedRequest('/api/cards', {
          method: 'POST',
          body: { articleId: mockArticle.id },
        });
        const response = await POST(req);
        const data = await expectSuccessResponse(response, 200);

        expect(data.id).toBe(mockCard.id);
        expect(data.keyword).toBe(mockCard.keyword);
        expect(data.rarity).toBe(mockCard.rarity);
        expect(mockCreateCard).toHaveBeenCalledWith({
          userId: 'test-user-id-123',
          articleId: mockArticle.id,
        });
      });
    });

    describe('エラーハンドリング', () => {
      it('記事が見つからない場合、404を返す', async () => {
        const { ApiError } = jest.requireActual('@/lib/errors') as {
          ApiError: { notFound: (msg: string) => Error };
        };
        mockCreateCard.mockRejectedValue(ApiError.notFound('記事が見つかりません'));

        const req = createAuthenticatedRequest('/api/cards', {
          method: 'POST',
          body: { articleId: mockArticle.id },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 404, ERROR_CODES.NOT_FOUND);
      });

      it('キーワードが枯渇した場合、400を返す', async () => {
        const { ApiError } = jest.requireActual('@/lib/errors') as {
          ApiError: { noAvailableKeyword: (msg: string) => Error };
        };
        mockCreateCard.mockRejectedValue(
          ApiError.noAvailableKeyword('キーワードが枯渇したため生成できません')
        );

        const req = createAuthenticatedRequest('/api/cards', {
          method: 'POST',
          body: { articleId: mockArticle.id },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 400, 'NO_AVAILABLE_KEYWORD');
      });

      it('サービスエラーの場合、500を返す', async () => {
        mockCreateCard.mockRejectedValue(new Error('Unexpected error'));

        const req = createAuthenticatedRequest('/api/cards', {
          method: 'POST',
          body: { articleId: mockArticle.id },
        });
        const response = await POST(req);

        await expectErrorResponse(response, 500, ERROR_CODES.INTERNAL_ERROR);
      });
    });
  });

  // ==================== GET ====================
  describe('GET /api/cards', () => {
    describe('認証チェック', () => {
      it('未認証の場合、401を返す', async () => {
        mockVerifyAuth.mockResolvedValue(null);

        const req = createUnauthenticatedRequest('/api/cards');
        const response = await GET(req);

        await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
      });
    });

    describe('正常系', () => {
      it('カード一覧を取得できる', async () => {
        const cards = [mockCard, { ...mockCard, id: 'card-2' }];
        mockGetCardsByUser.mockResolvedValue({
          cards,
          hasMore: false,
          nextCursor: null,
        });

        const req = createAuthenticatedRequest('/api/cards');
        const response = await GET(req);
        const data = await expectSuccessResponse(response, 200);

        expect(data.cards).toHaveLength(2);
        expect(data.hasMore).toBeDefined();
      });

      it('レア度でフィルターできる', async () => {
        mockGetCardsByUser.mockResolvedValue({
          cards: [mockCard],
          hasMore: false,
          nextCursor: null,
        });

        const req = createRequestWithParams('/api/cards', {
          rarity: 'rare',
        });
        const response = await GET(req);

        await expectSuccessResponse(response, 200);
        expect(mockGetCardsByUser).toHaveBeenCalledWith(
          expect.objectContaining({
            rarity: 'rare',
          })
        );
      });

      it('ページネーションパラメータが正しく渡される', async () => {
        mockGetCardsByUser.mockResolvedValue({
          cards: [mockCard],
          hasMore: false,
          nextCursor: null,
        });

        const prevCardId = '550e8400-e29b-41d4-a716-446655440099';
        const req = createRequestWithParams('/api/cards', {
          limit: '10',
          cursor: prevCardId,
        });
        const response = await GET(req);

        await expectSuccessResponse(response, 200);
        expect(mockGetCardsByUser).toHaveBeenCalledWith({
          userId: 'test-user-id-123',
          cursor: prevCardId,
          limit: 10,
          rarity: undefined,
          keyword: undefined,
          sortBy: 'createdAt',
          sortOrder: 'desc',
          onlyFavorites: false,
        });
      });

      it('カードがない場合は空配列を返す', async () => {
        mockGetCardsByUser.mockResolvedValue({
          cards: [],
          hasMore: false,
          nextCursor: null,
        });

        const req = createAuthenticatedRequest('/api/cards');
        const response = await GET(req);
        const data = await expectSuccessResponse(response, 200);

        expect(data.cards).toHaveLength(0);
        expect(data.hasMore).toBe(false);
      });
    });
  });
});
