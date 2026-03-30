/**
 * POST /api/auth/register API テスト
 */

import { NextRequest, NextResponse } from 'next/server';

// モック関数を先に定義
const mockVerifyIdToken = jest.fn();
const mockFindUnique = jest.fn();
const mockTxUserCreate = jest.fn();
const mockTxCoinTransactionCreate = jest.fn();
const mockTransaction = jest.fn();

// モックをセットアップ
jest.mock('@/lib/firebase/admin', () => ({
  verifyIdToken: (token: string) => mockVerifyIdToken(token),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

// インポートはモック定義後
import { POST } from '@/app/api/auth/register/route';

// モックデータ
const mockUser = {
  id: 'test-user-id-123',
  nickname: 'testuser',
  coinBalance: 300,
  isPremium: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

// トランザクション内のPrismaモック
const mockTxPrisma = {
  user: {
    create: (...args: unknown[]) => mockTxUserCreate(...args),
  },
  coinTransaction: {
    create: (...args: unknown[]) => mockTxCoinTransactionCreate(...args),
  },
};

// ヘルパー関数（ヘッダーはプレーンオブジェクトで渡す必要あり）
function createAuthenticatedRequest(
  url: string,
  options: { method?: string; body?: unknown; token?: string } = {}
): NextRequest {
  const { method = 'GET', body, token = 'mock-id-token' } = options;

  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
  };
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

function createUnauthenticatedRequest(
  url: string,
  options: { method?: string; body?: unknown } = {}
): NextRequest {
  const { method = 'GET', body } = options;

  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
  };
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  USER_EXISTS: 'USER_EXISTS',
  NICKNAME_EXISTS: 'NICKNAME_EXISTS',
  AUTH_ERROR: 'AUTH_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトで認証成功
    mockVerifyIdToken.mockResolvedValue({
      uid: 'test-user-id-123',
      email: 'test@example.com',
    });
    // デフォルトでユーザーが存在しない
    mockFindUnique.mockResolvedValue(null);
    // デフォルトでトランザクション成功
    mockTransaction.mockImplementation(async (cb: (tx: typeof mockTxPrisma) => Promise<unknown>) =>
      cb(mockTxPrisma)
    );
    mockTxCoinTransactionCreate.mockResolvedValue({});
  });

  describe('認証チェック', () => {
    it('認証ヘッダーがない場合、401を返す', async () => {
      const req = createUnauthenticatedRequest('/api/auth/register', {
        method: 'POST',
        body: { nickname: 'testuser' },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe(ERROR_CODES.UNAUTHORIZED);
    });

    it('Firebaseトークン検証に失敗した場合、401を返す', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Firebase: Token expired'));

      const req = createAuthenticatedRequest('/api/auth/register', {
        method: 'POST',
        body: { nickname: 'testuser' },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe(ERROR_CODES.AUTH_ERROR);
    });
  });

  describe('バリデーションチェック', () => {
    it('nicknameがない場合、400を返す', async () => {
      const req = createAuthenticatedRequest('/api/auth/register', {
        method: 'POST',
        body: {},
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it('nicknameが空文字の場合、400を返す', async () => {
      const req = createAuthenticatedRequest('/api/auth/register', {
        method: 'POST',
        body: { nickname: '' },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it('nicknameが短すぎる場合、400を返す', async () => {
      const req = createAuthenticatedRequest('/api/auth/register', {
        method: 'POST',
        body: { nickname: 'a' }, // 2文字未満
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it('nicknameが長すぎる場合、400を返す', async () => {
      const req = createAuthenticatedRequest('/api/auth/register', {
        method: 'POST',
        body: { nickname: 'a'.repeat(21) }, // 20文字超
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });
  });

  describe('重複チェック', () => {
    it('ユーザーが既に登録されている場合、既存ユーザーを200で返す', async () => {
      mockFindUnique.mockResolvedValue(mockUser); // ユーザーが既に存在

      const req = createAuthenticatedRequest('/api/auth/register', {
        method: 'POST',
        body: { nickname: 'newuser' },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockUser.id);
    });

    it('ニックネームが既に使用されている場合、409を返す', async () => {
      // 最初のfindUnique（ユーザーID）は見つからない
      mockFindUnique
        .mockResolvedValueOnce(null)
        // 2回目のfindUnique（ニックネーム）は見つかる
        .mockResolvedValueOnce({ ...mockUser, id: 'other-user-id' });

      const req = createAuthenticatedRequest('/api/auth/register', {
        method: 'POST',
        body: { nickname: 'existinguser' },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.code).toBe(ERROR_CODES.NICKNAME_EXISTS);
    });
  });

  describe('正常系', () => {
    it('新規ユーザーを登録できる', async () => {
      mockTxUserCreate.mockResolvedValue(mockUser);

      const req = createAuthenticatedRequest('/api/auth/register', {
        method: 'POST',
        body: { nickname: 'newuser' },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockUser.id);
      expect(data.data.nickname).toBe(mockUser.nickname);
      expect(mockTxUserCreate).toHaveBeenCalledWith({
        data: {
          id: 'test-user-id-123',
          nickname: 'newuser',
          coinBalance: 300,
        },
      });
    });

    it('日本語のニックネームで登録できる', async () => {
      const japaneseNickname = 'テストユーザー';
      mockTxUserCreate.mockResolvedValue({ ...mockUser, nickname: japaneseNickname });

      const req = createAuthenticatedRequest('/api/auth/register', {
        method: 'POST',
        body: { nickname: japaneseNickname },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.nickname).toBe(japaneseNickname);
    });
  });

  describe('エラーハンドリング', () => {
    it('データベースエラーの場合、500を返す', async () => {
      mockTransaction.mockRejectedValue(new Error('Database error'));

      const req = createAuthenticatedRequest('/api/auth/register', {
        method: 'POST',
        body: { nickname: 'testuser' },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    });
  });
});
