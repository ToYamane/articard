/**
 * /api/challenge/sessions/[id]/deck API テスト
 * POST (デッキ設定)
 */

import { POST } from '@/app/api/challenge/sessions/[id]/deck/route';
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
const mockSetSessionDeck = jest.fn();
jest.mock('@/lib/services/challenge-service', () => ({
  setSessionDeck: (...args: unknown[]) => mockSetSessionDeck(...args),
}));

const SESSION_ID = '550e8400-e29b-41d4-a716-446655440001';
const CARD_IDS = [
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440011',
  '550e8400-e29b-41d4-a716-446655440012',
  '550e8400-e29b-41d4-a716-446655440013',
  '550e8400-e29b-41d4-a716-446655440014',
  '550e8400-e29b-41d4-a716-446655440015',
];

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('/api/challenge/sessions/[id]/deck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAuth.mockResolvedValue({
      uid: 'test-user-id-123',
      email: 'test@example.com',
      emailVerified: true,
    });
  });

  describe('POST /api/challenge/sessions/[id]/deck', () => {
    it('未認証の場合、401を返す', async () => {
      mockVerifyAuth.mockResolvedValue(null);

      const req = createUnauthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}/deck`, {
        method: 'POST',
        body: { cardIds: CARD_IDS },
      });
      const response = await POST(req, makeContext(SESSION_ID));

      await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
    });

    it('cardIdsがない場合、400を返す', async () => {
      const req = createAuthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}/deck`, {
        method: 'POST',
        body: {},
      });
      const response = await POST(req, makeContext(SESSION_ID));

      await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
    });

    it('cardIdsが空の場合、400を返す', async () => {
      const req = createAuthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}/deck`, {
        method: 'POST',
        body: { cardIds: [] },
      });
      const response = await POST(req, makeContext(SESSION_ID));

      await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
    });

    it('cardIdsに無効なUUIDが含まれる場合、400を返す', async () => {
      const req = createAuthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}/deck`, {
        method: 'POST',
        body: { cardIds: ['not-a-uuid'] },
      });
      const response = await POST(req, makeContext(SESSION_ID));

      await expectErrorResponse(response, 400, ERROR_CODES.VALIDATION_ERROR);
    });

    it('デッキを設定できる', async () => {
      mockSetSessionDeck.mockResolvedValue(undefined);

      const req = createAuthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}/deck`, {
        method: 'POST',
        body: { cardIds: CARD_IDS },
      });
      const response = await POST(req, makeContext(SESSION_ID));
      const data = await expectSuccessResponse(response, 200);

      expect(data.message).toBeDefined();
      expect(mockSetSessionDeck).toHaveBeenCalledWith(
        SESSION_ID,
        'test-user-id-123',
        CARD_IDS
      );
    });

    it('サービスエラーの場合、500を返す', async () => {
      mockSetSessionDeck.mockRejectedValue(new Error('Service error'));

      const req = createAuthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}/deck`, {
        method: 'POST',
        body: { cardIds: CARD_IDS },
      });
      const response = await POST(req, makeContext(SESSION_ID));

      await expectErrorResponse(response, 500, ERROR_CODES.INTERNAL_ERROR);
    });
  });
});
