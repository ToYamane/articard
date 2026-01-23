/**
 * /api/users/me API テスト
 * GET, PATCH, DELETE
 */

import { GET, PATCH, DELETE } from '@/app/api/users/me/route';
import {
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  expectSuccessResponse,
  expectErrorResponse,
  ERROR_CODES,
} from '@/__tests__/helpers';

// モックデータ
const mockUser = {
  id: 'test-user-id-123',
  nickname: 'testuser',
  knowledgeBalance: 100,
  isPremium: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

// モック関数
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockDeleteMany = jest.fn();
const mockTransaction = jest.fn();
const mockCardFindMany = jest.fn();

// Prismaモジュールをモック
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
    card: {
      findMany: (...args: unknown[]) => mockCardFindMany(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
    },
    article: {
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
    },
    knowledgeTransaction: {
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
    },
    $transaction: (callback: (tx: unknown) => Promise<unknown>) => mockTransaction(callback),
  },
}));

// 認証モック
const mockVerifyAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));

// Firebase Admin - deleteUser
const mockDeleteFirebaseUser = jest.fn();
jest.mock('@/lib/firebase/admin', () => ({
  deleteUser: (...args: unknown[]) => mockDeleteFirebaseUser(...args),
}));

// GCS storage
const mockBatchDeleteCardImages = jest.fn();
jest.mock('@/lib/gcs/storage', () => ({
  batchDeleteCardImages: (...args: unknown[]) => mockBatchDeleteCardImages(...args),
}));

describe('/api/users/me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトで認証成功
    mockVerifyAuth.mockResolvedValue({
      uid: 'test-user-id-123',
      email: 'test@example.com',
      emailVerified: true,
    });
    mockTransaction.mockImplementation((callback) =>
      callback({
        card: { deleteMany: mockDeleteMany },
        article: { deleteMany: mockDeleteMany },
        knowledgeTransaction: { deleteMany: mockDeleteMany },
        user: { delete: mockDelete },
      })
    );
  });

  // ==================== GET ====================
  describe('GET /api/users/me', () => {
    describe('認証チェック', () => {
      it('未認証の場合、401を返す', async () => {
        mockVerifyAuth.mockResolvedValue(null);

        const req = createUnauthenticatedRequest('/api/users/me');
        const response = await GET(req);

        await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
      });
    });

    describe('正常系', () => {
      it('ユーザー情報を取得できる', async () => {
        mockFindUnique.mockResolvedValue(mockUser);

        const req = createAuthenticatedRequest('/api/users/me');
        const response = await GET(req);
        const data = await expectSuccessResponse(response, 200);

        expect(data.id).toBe(mockUser.id);
        expect(data.nickname).toBe(mockUser.nickname);
        expect(data.knowledgeBalance).toBe(mockUser.knowledgeBalance);
      });

      it('ユーザーが見つからない場合、404を返す', async () => {
        mockFindUnique.mockResolvedValue(null);

        const req = createAuthenticatedRequest('/api/users/me');
        const response = await GET(req);

        await expectErrorResponse(response, 404, ERROR_CODES.USER_NOT_FOUND);
      });
    });
  });

  // ==================== PATCH ====================
  describe('PATCH /api/users/me', () => {
    describe('認証チェック', () => {
      it('未認証の場合、401を返す', async () => {
        mockVerifyAuth.mockResolvedValue(null);

        const req = createUnauthenticatedRequest('/api/users/me', {
          method: 'PATCH',
          body: { nickname: 'newnick' },
        });
        const response = await PATCH(req);

        await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
      });
    });

    describe('バリデーションチェック', () => {
      it('nicknameが短すぎる場合、400を返す', async () => {
        mockFindUnique.mockResolvedValue(mockUser);

        const req = createAuthenticatedRequest('/api/users/me', {
          method: 'PATCH',
          body: { nickname: 'a' }, // 2文字未満
        });
        const response = await PATCH(req);

        await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
      });

      it('nicknameが長すぎる場合、400を返す', async () => {
        mockFindUnique.mockResolvedValue(mockUser);

        const req = createAuthenticatedRequest('/api/users/me', {
          method: 'PATCH',
          body: { nickname: 'a'.repeat(21) },
        });
        const response = await PATCH(req);

        await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
      });
    });

    describe('重複チェック', () => {
      it('ニックネームが既に使用されている場合、409を返す', async () => {
        mockFindUnique
          .mockResolvedValueOnce(mockUser) // 現在のユーザー
          .mockResolvedValueOnce({ ...mockUser, id: 'other-user-id' }); // ニックネーム重複

        const req = createAuthenticatedRequest('/api/users/me', {
          method: 'PATCH',
          body: { nickname: 'existinguser' },
        });
        const response = await PATCH(req);

        await expectErrorResponse(response, 409, ERROR_CODES.NICKNAME_EXISTS);
      });
    });

    describe('正常系', () => {
      it('ニックネームを更新できる', async () => {
        mockFindUnique
          .mockResolvedValueOnce(mockUser) // 現在のユーザー
          .mockResolvedValueOnce(null); // ニックネーム重複なし
        const updatedUser = { ...mockUser, nickname: 'newnickname' };
        mockUpdate.mockResolvedValue(updatedUser);

        const req = createAuthenticatedRequest('/api/users/me', {
          method: 'PATCH',
          body: { nickname: 'newnickname' },
        });
        const response = await PATCH(req);
        const data = await expectSuccessResponse(response, 200);

        expect(data.nickname).toBe('newnickname');
        expect(mockUpdate).toHaveBeenCalled();
      });

      it('同じニックネームの場合は更新をスキップ', async () => {
        mockFindUnique.mockResolvedValue(mockUser);
        mockUpdate.mockResolvedValue(mockUser);

        const req = createAuthenticatedRequest('/api/users/me', {
          method: 'PATCH',
          body: { nickname: mockUser.nickname },
        });
        const response = await PATCH(req);
        const data = await expectSuccessResponse(response, 200);

        expect(data.nickname).toBe(mockUser.nickname);
      });
    });
  });

  // ==================== DELETE ====================
  describe('DELETE /api/users/me', () => {
    describe('認証チェック', () => {
      it('未認証の場合、401を返す', async () => {
        mockVerifyAuth.mockResolvedValue(null);

        const req = createUnauthenticatedRequest('/api/users/me', {
          method: 'DELETE',
        });
        const response = await DELETE(req);

        await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
      });
    });

    describe('正常系', () => {
      it('アカウントを削除できる', async () => {
        const userWithCards = {
          ...mockUser,
          cards: [{ id: 'card-1' }, { id: 'card-2' }],
        };
        mockFindUnique.mockResolvedValue(userWithCards);
        mockDeleteFirebaseUser.mockResolvedValue(undefined);
        mockBatchDeleteCardImages.mockResolvedValue(undefined);

        const req = createAuthenticatedRequest('/api/users/me', {
          method: 'DELETE',
        });
        const response = await DELETE(req);
        const data = await expectSuccessResponse(response, 200);

        expect(data.message).toContain('削除');
        expect(mockTransaction).toHaveBeenCalled();
        expect(mockBatchDeleteCardImages).toHaveBeenCalledWith(['card-1', 'card-2']);
        expect(mockDeleteFirebaseUser).toHaveBeenCalledWith('test-user-id-123');
      });

      it('カードがない場合も削除できる', async () => {
        const userWithoutCards = {
          ...mockUser,
          cards: [],
        };
        mockFindUnique.mockResolvedValue(userWithoutCards);
        mockDeleteFirebaseUser.mockResolvedValue(undefined);

        const req = createAuthenticatedRequest('/api/users/me', {
          method: 'DELETE',
        });
        const response = await DELETE(req);

        await expectSuccessResponse(response, 200);
        expect(mockBatchDeleteCardImages).not.toHaveBeenCalled();
      });

      it('ユーザーが見つからない場合、404を返す', async () => {
        mockFindUnique.mockResolvedValue(null);

        const req = createAuthenticatedRequest('/api/users/me', {
          method: 'DELETE',
        });
        const response = await DELETE(req);

        await expectErrorResponse(response, 404, ERROR_CODES.USER_NOT_FOUND);
      });
    });

    describe('エラーハンドリング', () => {
      it('画像削除に失敗してもアカウントは削除される', async () => {
        const userWithCards = {
          ...mockUser,
          cards: [{ id: 'card-1' }],
        };
        mockFindUnique.mockResolvedValue(userWithCards);
        mockBatchDeleteCardImages.mockRejectedValue(new Error('Storage error'));
        mockDeleteFirebaseUser.mockResolvedValue(undefined);

        const req = createAuthenticatedRequest('/api/users/me', {
          method: 'DELETE',
        });
        const response = await DELETE(req);

        // 画像削除に失敗してもアカウント削除は成功
        await expectSuccessResponse(response, 200);
      });

      it('Firebase削除に失敗してもDBは削除済み', async () => {
        const userWithCards = {
          ...mockUser,
          cards: [],
        };
        mockFindUnique.mockResolvedValue(userWithCards);
        mockDeleteFirebaseUser.mockRejectedValue(new Error('Firebase error'));

        const req = createAuthenticatedRequest('/api/users/me', {
          method: 'DELETE',
        });
        const response = await DELETE(req);

        // Firebase削除に失敗してもアカウント削除は成功
        await expectSuccessResponse(response, 200);
      });
    });
  });
});
