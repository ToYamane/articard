/**
 * /api/challenge/sessions API テスト
 * POST (セッション作成), GET (セッション一覧)
 */

import { POST, GET } from '@/app/api/challenge/sessions/route';
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

// Prisma モック（ゲストチェック用）
const mockUserFindUnique = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
}));

// Challenge service モック
const mockCreateSession = jest.fn();
const mockGetUserSessions = jest.fn();
jest.mock('@/lib/services/challenge-service', () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
  getUserSessions: (...args: unknown[]) => mockGetUserSessions(...args),
}));

describe('/api/challenge/sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAuth.mockResolvedValue({
      uid: 'test-user-id-123',
      email: 'test@example.com',
      emailVerified: true,
    });
    // ゲストチェック: デフォルトは正規ユーザー
    mockUserFindUnique.mockResolvedValue({ isGuest: false });
  });

  // ==================== POST ====================
  describe('POST /api/challenge/sessions', () => {
    it('未認証の場合、401を返す', async () => {
      mockVerifyAuth.mockResolvedValue(null);

      const req = createUnauthenticatedRequest('/api/challenge/sessions', {
        method: 'POST',
        body: { scenarioId: 'space_exploration' },
      });
      const response = await POST(req);

      await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
    });

    it('scenarioIdがない場合、400を返す', async () => {
      const req = createAuthenticatedRequest('/api/challenge/sessions', {
        method: 'POST',
        body: {},
      });
      const response = await POST(req);

      await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
    });

    it('scenarioIdが空の場合、400を返す', async () => {
      const req = createAuthenticatedRequest('/api/challenge/sessions', {
        method: 'POST',
        body: { scenarioId: '' },
      });
      const response = await POST(req);

      await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
    });

    it('セッションを作成できる', async () => {
      mockCreateSession.mockResolvedValue({
        id: 'session-id-001',
        scenarioId: 'space_exploration',
        status: 'in_progress',
        challengeInfo: { count: 1, isFree: true, cost: 0 },
      });

      const req = createAuthenticatedRequest('/api/challenge/sessions', {
        method: 'POST',
        body: { scenarioId: 'space_exploration' },
      });
      const response = await POST(req);
      const data = await expectSuccessResponse(response, 200);

      expect(data.id).toBe('session-id-001');
      expect(data.scenarioId).toBe('space_exploration');
      expect(mockCreateSession).toHaveBeenCalledWith('test-user-id-123', 'space_exploration');
    });

    it('サービスエラーの場合、500を返す', async () => {
      mockCreateSession.mockRejectedValue(new Error('Service error'));

      const req = createAuthenticatedRequest('/api/challenge/sessions', {
        method: 'POST',
        body: { scenarioId: 'space_exploration' },
      });
      const response = await POST(req);

      await expectErrorResponse(response, 500, ERROR_CODES.INTERNAL_ERROR);
    });
  });

  // ==================== GET ====================
  describe('GET /api/challenge/sessions', () => {
    it('未認証の場合、401を返す', async () => {
      mockVerifyAuth.mockResolvedValue(null);

      const req = createUnauthenticatedRequest('/api/challenge/sessions');
      const response = await GET(req);

      await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
    });

    it('セッション一覧を取得できる', async () => {
      mockGetUserSessions.mockResolvedValue([
        {
          id: 'session-1',
          scenarioId: 'space_exploration',
          status: 'in_progress',
          currentPhase: 2,
          totalScore: 150,
          startedAt: new Date(),
          completedAt: null,
        },
      ]);

      const req = createAuthenticatedRequest('/api/challenge/sessions');
      const response = await GET(req);
      const data = await expectSuccessResponse(response, 200);

      expect(data.sessions).toHaveLength(1);
      expect(data.sessions[0].id).toBe('session-1');
    });

    it('ステータスでフィルタリングできる', async () => {
      mockGetUserSessions.mockResolvedValue([]);

      const req = createRequestWithParams('/api/challenge/sessions', {
        status: 'completed',
      });
      const response = await GET(req);

      await expectSuccessResponse(response, 200);
      expect(mockGetUserSessions).toHaveBeenCalledWith('test-user-id-123', 'completed', 10);
    });

    it('limitパラメータが正しく渡される', async () => {
      mockGetUserSessions.mockResolvedValue([]);

      const req = createRequestWithParams('/api/challenge/sessions', {
        limit: '5',
      });
      const response = await GET(req);

      await expectSuccessResponse(response, 200);
      expect(mockGetUserSessions).toHaveBeenCalledWith('test-user-id-123', undefined, 5);
    });
  });
});
