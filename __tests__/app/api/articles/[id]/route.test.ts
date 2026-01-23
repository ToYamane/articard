/**
 * /api/articles/[id] API テスト
 * GET, DELETE
 */

import { GET, DELETE } from '@/app/api/articles/[id]/route';
import {
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  expectSuccessResponse,
  expectErrorResponse,
  ERROR_CODES,
} from '@/__tests__/helpers';

// モックデータ（UUID形式）
const mockArticle = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  userId: 'test-user-id-123',
  theme: 'テストテーマ',
  content: 'これはテスト記事の内容です。AIによって生成された学習記事です。',
  openaiModel: 'gpt-4o-mini',
  tokenUsage: 500,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

// 認証モック
const mockVerifyAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));

// Article service モック
const mockGetArticleById = jest.fn();
const mockDeleteArticle = jest.fn();
jest.mock('@/lib/services/article-service', () => ({
  getArticleById: (...args: unknown[]) => mockGetArticleById(...args),
  deleteArticle: (...args: unknown[]) => mockDeleteArticle(...args),
}));

// パラメータ型
type RouteParams = { params: Promise<{ id: string }> };

describe('/api/articles/[id]', () => {
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
  describe('GET /api/articles/[id]', () => {
    const validParams: RouteParams = { params: Promise.resolve({ id: mockArticle.id }) };

    describe('認証チェック', () => {
      it('未認証の場合、401を返す', async () => {
        mockVerifyAuth.mockResolvedValue(null);

        const req = createUnauthenticatedRequest(`/api/articles/${mockArticle.id}`);
        const response = await GET(req, validParams);

        await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
      });
    });

    describe('バリデーションチェック', () => {
      it('不正なIDの場合、400を返す', async () => {
        const invalidParams: RouteParams = { params: Promise.resolve({ id: 'invalid-id' }) };

        const req = createAuthenticatedRequest('/api/articles/invalid-id');
        const response = await GET(req, invalidParams);

        await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
      });
    });

    describe('正常系', () => {
      it('記事を取得できる', async () => {
        mockGetArticleById.mockResolvedValue(mockArticle);

        const req = createAuthenticatedRequest(`/api/articles/${mockArticle.id}`);
        const response = await GET(req, validParams);
        const data = await expectSuccessResponse(response, 200);

        expect(data.id).toBe(mockArticle.id);
        expect(data.theme).toBe(mockArticle.theme);
        expect(data.content).toBe(mockArticle.content);
        expect(mockGetArticleById).toHaveBeenCalledWith(mockArticle.id, 'test-user-id-123');
      });

      it('記事が見つからない場合、404を返す', async () => {
        mockGetArticleById.mockResolvedValue(null);

        const req = createAuthenticatedRequest(`/api/articles/${mockArticle.id}`);
        const response = await GET(req, validParams);

        await expectErrorResponse(response, 404, ERROR_CODES.NOT_FOUND);
      });
    });
  });

  // ==================== DELETE ====================
  describe('DELETE /api/articles/[id]', () => {
    const validParams: RouteParams = { params: Promise.resolve({ id: mockArticle.id }) };

    describe('認証チェック', () => {
      it('未認証の場合、401を返す', async () => {
        mockVerifyAuth.mockResolvedValue(null);

        const req = createUnauthenticatedRequest(`/api/articles/${mockArticle.id}`, {
          method: 'DELETE',
        });
        const response = await DELETE(req, validParams);

        await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
      });
    });

    describe('バリデーションチェック', () => {
      it('不正なIDの場合、400を返す', async () => {
        const invalidParams: RouteParams = { params: Promise.resolve({ id: 'invalid-id' }) };

        const req = createAuthenticatedRequest('/api/articles/invalid-id', {
          method: 'DELETE',
        });
        const response = await DELETE(req, invalidParams);

        await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
      });
    });

    describe('正常系', () => {
      it('記事を削除できる', async () => {
        mockDeleteArticle.mockResolvedValue(true);

        const req = createAuthenticatedRequest(`/api/articles/${mockArticle.id}`, {
          method: 'DELETE',
        });
        const response = await DELETE(req, validParams);
        const data = await expectSuccessResponse(response, 200);

        expect(data.message).toContain('削除');
        expect(mockDeleteArticle).toHaveBeenCalledWith(mockArticle.id, 'test-user-id-123');
      });

      it('記事が見つからない場合、404を返す', async () => {
        mockDeleteArticle.mockResolvedValue(false);

        const req = createAuthenticatedRequest(`/api/articles/${mockArticle.id}`, {
          method: 'DELETE',
        });
        const response = await DELETE(req, validParams);

        await expectErrorResponse(response, 404, ERROR_CODES.NOT_FOUND);
      });
    });

    describe('エラーハンドリング', () => {
      it('サービスエラーの場合、500を返す', async () => {
        mockDeleteArticle.mockRejectedValue(new Error('Service error'));

        const req = createAuthenticatedRequest(`/api/articles/${mockArticle.id}`, {
          method: 'DELETE',
        });
        const response = await DELETE(req, validParams);

        await expectErrorResponse(response, 500, ERROR_CODES.INTERNAL_ERROR);
      });
    });
  });
});
