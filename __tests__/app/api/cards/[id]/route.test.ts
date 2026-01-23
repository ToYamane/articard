/**
 * /api/cards/[id] API テスト
 * GET, DELETE
 */

import { GET, DELETE } from '@/app/api/cards/[id]/route';
import {
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  expectSuccessResponse,
  expectErrorResponse,
  ERROR_CODES,
} from '@/__tests__/helpers';

// モックデータ（UUID形式）
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

const mockOtherCard = {
  ...mockCard,
  id: '550e8400-e29b-41d4-a716-446655440002',
  userId: 'other-user-id-456',
  articleId: '550e8400-e29b-41d4-a716-446655440020',
};

// 認証モック
const mockVerifyAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));

// カードサービスモック
const mockGetCardById = jest.fn();
const mockDeleteCard = jest.fn();
jest.mock('@/lib/services/card-service', () => ({
  getCardById: (...args: unknown[]) => mockGetCardById(...args),
  deleteCard: (...args: unknown[]) => mockDeleteCard(...args),
}));

// パラメータ型
type RouteParams = { params: Promise<{ id: string }> };

describe('/api/cards/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトで認証成功
    mockVerifyAuth.mockResolvedValue({
      uid: 'test-user-id-123',
      email: 'test@example.com',
      emailVerified: true,
    });
  });

  // ==================== GET ====================
  describe('GET /api/cards/[id]', () => {
    const validParams: RouteParams = { params: Promise.resolve({ id: mockCard.id }) };

    describe('認証チェック', () => {
      it('未認証の場合、401を返す', async () => {
        mockVerifyAuth.mockResolvedValue(null);

        const req = createUnauthenticatedRequest(`/api/cards/${mockCard.id}`);
        const response = await GET(req, validParams);

        await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
      });
    });

    describe('バリデーションチェック', () => {
      it('不正なIDの場合、400を返す', async () => {
        const invalidParams: RouteParams = { params: Promise.resolve({ id: 'invalid-id' }) };

        const req = createAuthenticatedRequest('/api/cards/invalid-id');
        const response = await GET(req, invalidParams);

        await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
      });
    });

    describe('権限チェック', () => {
      it('他のユーザーのカードにアクセスできない', async () => {
        // getCardByIdはuserIdでフィルターするので、他のユーザーのカードはnullを返す
        mockGetCardById.mockResolvedValue(null);

        const req = createAuthenticatedRequest(`/api/cards/${mockOtherCard.id}`);
        const otherParams: RouteParams = { params: Promise.resolve({ id: mockOtherCard.id }) };
        const response = await GET(req, otherParams);

        await expectErrorResponse(response, 404, ERROR_CODES.NOT_FOUND);
      });
    });

    describe('正常系', () => {
      it('カードを取得できる', async () => {
        mockGetCardById.mockResolvedValue(mockCard);

        const req = createAuthenticatedRequest(`/api/cards/${mockCard.id}`);
        const response = await GET(req, validParams);
        const data = await expectSuccessResponse(response, 200);

        expect(data.id).toBe(mockCard.id);
        expect(data.keyword).toBe(mockCard.keyword);
        expect(data.rarity).toBe(mockCard.rarity);
        expect(data.flavorText).toBe(mockCard.flavorText);
      });

      it('カードが見つからない場合、404を返す', async () => {
        mockGetCardById.mockResolvedValue(null);

        const req = createAuthenticatedRequest(`/api/cards/${mockCard.id}`);
        const response = await GET(req, validParams);

        await expectErrorResponse(response, 404, ERROR_CODES.NOT_FOUND);
      });
    });
  });

  // ==================== DELETE ====================
  describe('DELETE /api/cards/[id]', () => {
    const validParams: RouteParams = { params: Promise.resolve({ id: mockCard.id }) };

    describe('認証チェック', () => {
      it('未認証の場合、401を返す', async () => {
        mockVerifyAuth.mockResolvedValue(null);

        const req = createUnauthenticatedRequest(`/api/cards/${mockCard.id}`, {
          method: 'DELETE',
        });
        const response = await DELETE(req, validParams);

        await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
      });
    });

    describe('バリデーションチェック', () => {
      it('不正なIDの場合、400を返す', async () => {
        const invalidParams: RouteParams = { params: Promise.resolve({ id: 'invalid-id' }) };

        const req = createAuthenticatedRequest('/api/cards/invalid-id', {
          method: 'DELETE',
        });
        const response = await DELETE(req, invalidParams);

        await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
      });
    });

    describe('正常系', () => {
      it('カードを削除できる', async () => {
        mockDeleteCard.mockResolvedValue(true);

        const req = createAuthenticatedRequest(`/api/cards/${mockCard.id}`, {
          method: 'DELETE',
        });
        const response = await DELETE(req, validParams);
        const data = await expectSuccessResponse(response, 200);

        expect(data.message).toContain('削除');
        expect(mockDeleteCard).toHaveBeenCalledWith(mockCard.id, 'test-user-id-123');
      });

      it('カードが見つからない場合、404を返す', async () => {
        mockDeleteCard.mockResolvedValue(false);

        const req = createAuthenticatedRequest(`/api/cards/${mockCard.id}`, {
          method: 'DELETE',
        });
        const response = await DELETE(req, validParams);

        await expectErrorResponse(response, 404, ERROR_CODES.NOT_FOUND);
      });
    });

    describe('エラーハンドリング', () => {
      it('サービスエラーの場合、500を返す', async () => {
        mockDeleteCard.mockRejectedValue(new Error('Unexpected error'));

        const req = createAuthenticatedRequest(`/api/cards/${mockCard.id}`, {
          method: 'DELETE',
        });
        const response = await DELETE(req, validParams);

        await expectErrorResponse(response, 500, ERROR_CODES.INTERNAL_ERROR);
      });
    });
  });
});
