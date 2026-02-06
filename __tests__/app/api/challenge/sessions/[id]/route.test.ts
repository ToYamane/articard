/**
 * /api/challenge/sessions/[id] API テスト
 * GET (セッション詳細), DELETE (セッション中断)
 */

import { GET, DELETE } from '@/app/api/challenge/sessions/[id]/route';
import {
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  expectSuccessResponse,
  expectErrorResponse,
  ERROR_CODES,
} from '@/__tests__/helpers';
import { ApiError } from '@/lib/errors';

// 認証モック
const mockVerifyAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));

// Challenge service モック
const mockGetSessionById = jest.fn();
const mockAbandonSession = jest.fn();
jest.mock('@/lib/services/challenge-service', () => ({
  getSessionById: (...args: unknown[]) => mockGetSessionById(...args),
  abandonSession: (...args: unknown[]) => mockAbandonSession(...args),
}));

const SESSION_ID = '550e8400-e29b-41d4-a716-446655440001';

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('/api/challenge/sessions/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAuth.mockResolvedValue({
      uid: 'test-user-id-123',
      email: 'test@example.com',
      emailVerified: true,
    });
  });

  // ==================== GET ====================
  describe('GET /api/challenge/sessions/[id]', () => {
    it('未認証の場合、401を返す', async () => {
      mockVerifyAuth.mockResolvedValue(null);

      const req = createUnauthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}`);
      const response = await GET(req, makeContext(SESSION_ID));

      await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
    });

    it('セッション詳細を取得できる', async () => {
      mockGetSessionById.mockResolvedValue({
        id: SESSION_ID,
        userId: 'test-user-id-123',
        scenarioId: 'space_exploration',
        status: 'in_progress',
        currentPhase: 2,
        totalScore: 100,
        startedAt: new Date(),
        completedAt: null,
        deck: [],
        phases: [],
      });

      const req = createAuthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}`);
      const response = await GET(req, makeContext(SESSION_ID));
      const data = await expectSuccessResponse(response, 200);

      expect(data.id).toBe(SESSION_ID);
      expect(data.scenarioId).toBe('space_exploration');
      expect(mockGetSessionById).toHaveBeenCalledWith(SESSION_ID, 'test-user-id-123');
    });

    it('セッションが見つからない場合、404を返す', async () => {
      mockGetSessionById.mockResolvedValue(null);

      const req = createAuthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}`);
      const response = await GET(req, makeContext(SESSION_ID));

      await expectErrorResponse(response, 404, ERROR_CODES.NOT_FOUND);
    });
  });

  // ==================== DELETE ====================
  describe('DELETE /api/challenge/sessions/[id]', () => {
    it('未認証の場合、401を返す', async () => {
      mockVerifyAuth.mockResolvedValue(null);

      const req = createUnauthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}`, {
        method: 'DELETE',
      });
      const response = await DELETE(req, makeContext(SESSION_ID));

      await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
    });

    it('セッションを中断できる', async () => {
      mockAbandonSession.mockResolvedValue(undefined);

      const req = createAuthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}`, {
        method: 'DELETE',
      });
      const response = await DELETE(req, makeContext(SESSION_ID));
      const data = await expectSuccessResponse(response, 200);

      expect(data.message).toBeDefined();
      expect(mockAbandonSession).toHaveBeenCalledWith(SESSION_ID, 'test-user-id-123');
    });

    it('サービスエラーの場合、500を返す', async () => {
      mockAbandonSession.mockRejectedValue(new Error('Service error'));

      const req = createAuthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}`, {
        method: 'DELETE',
      });
      const response = await DELETE(req, makeContext(SESSION_ID));

      await expectErrorResponse(response, 500, ERROR_CODES.INTERNAL_ERROR);
    });
  });
});
