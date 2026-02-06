/**
 * /api/challenge/sessions/[id]/submit API テスト
 * POST (カード提出)
 */

import { POST } from '@/app/api/challenge/sessions/[id]/submit/route';
import {
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  expectSuccessResponse,
  expectErrorResponse,
  ERROR_CODES,
} from '@/__tests__/helpers';

// 認証モック
const mockVerifyAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  verifyAuth: (...args: unknown[]) => mockVerifyAuth(...args),
}));

// Challenge service モック
const mockSubmitPhaseCards = jest.fn();
jest.mock('@/lib/services/challenge-service', () => ({
  submitPhaseCards: (...args: unknown[]) => mockSubmitPhaseCards(...args),
}));

const SESSION_ID = '550e8400-e29b-41d4-a716-446655440001';
const CARD_ID = '550e8400-e29b-41d4-a716-446655440010';

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('/api/challenge/sessions/[id]/submit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAuth.mockResolvedValue({
      uid: 'test-user-id-123',
      email: 'test@example.com',
      emailVerified: true,
    });
  });

  describe('POST /api/challenge/sessions/[id]/submit', () => {
    it('未認証の場合、401を返す', async () => {
      mockVerifyAuth.mockResolvedValue(null);

      const req = createUnauthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}/submit`, {
        method: 'POST',
        body: { cardIds: [CARD_ID] },
      });
      const response = await POST(req, makeContext(SESSION_ID));

      await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
    });

    it('cardIdsがない場合、400を返す', async () => {
      const req = createAuthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}/submit`, {
        method: 'POST',
        body: {},
      });
      const response = await POST(req, makeContext(SESSION_ID));

      await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
    });

    it('cardIdsが空の場合、400を返す', async () => {
      const req = createAuthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}/submit`, {
        method: 'POST',
        body: { cardIds: [] },
      });
      const response = await POST(req, makeContext(SESSION_ID));

      await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
    });

    it('cardIdsに無効なUUIDが含まれる場合、400を返す', async () => {
      const req = createAuthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}/submit`, {
        method: 'POST',
        body: { cardIds: ['not-a-uuid'] },
      });
      const response = await POST(req, makeContext(SESSION_ID));

      await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
    });

    it('カードを提出できる', async () => {
      mockSubmitPhaseCards.mockResolvedValue({
        phaseNumber: 1,
        challenge: 'テスト状況\n\nテストチャレンジ',
        selectedCards: [{ id: CARD_ID, keyword: 'テスト', rarity: 'common' }],
        evaluation: {
          fitScore: 80,
          bonusScore: 10,
          totalScore: 90,
          connectionExplanation: 'テスト説明',
          narrativeDescription: 'テストナラティブ',
          humorComment: 'テストユーモア',
        },
        sessionTotalScore: 90,
        isComplete: false,
        isHighScore: false,
      });

      const req = createAuthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}/submit`, {
        method: 'POST',
        body: { cardIds: [CARD_ID] },
      });
      const response = await POST(req, makeContext(SESSION_ID));
      const data = await expectSuccessResponse(response, 200);

      expect(data.phaseNumber).toBe(1);
      expect(data.evaluation.fitScore).toBe(80);
      expect(data.isComplete).toBe(false);
      expect(mockSubmitPhaseCards).toHaveBeenCalledWith(
        SESSION_ID,
        'test-user-id-123',
        [CARD_ID]
      );
    });

    it('サービスエラーの場合、500を返す', async () => {
      mockSubmitPhaseCards.mockRejectedValue(new Error('Service error'));

      const req = createAuthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}/submit`, {
        method: 'POST',
        body: { cardIds: [CARD_ID] },
      });
      const response = await POST(req, makeContext(SESSION_ID));

      await expectErrorResponse(response, 500, ERROR_CODES.INTERNAL_ERROR);
    });
  });
});
