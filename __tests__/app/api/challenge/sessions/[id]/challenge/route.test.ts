/**
 * /api/challenge/sessions/[id]/challenge API テスト
 * GET (現在のフェーズチャレンジ取得)
 */

import { GET } from '@/app/api/challenge/sessions/[id]/challenge/route';
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
const mockGetCurrentPhaseChallenge = jest.fn();
jest.mock('@/lib/services/challenge-service', () => ({
  getCurrentPhaseChallenge: (...args: unknown[]) => mockGetCurrentPhaseChallenge(...args),
}));

const SESSION_ID = '550e8400-e29b-41d4-a716-446655440001';

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('/api/challenge/sessions/[id]/challenge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAuth.mockResolvedValue({
      uid: 'test-user-id-123',
      email: 'test@example.com',
      emailVerified: true,
    });
  });

  describe('GET /api/challenge/sessions/[id]/challenge', () => {
    it('未認証の場合、401を返す', async () => {
      mockVerifyAuth.mockResolvedValue(null);

      const req = createUnauthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}/challenge`);
      const response = await GET(req, makeContext(SESSION_ID));

      await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
    });

    it('現在のフェーズチャレンジを取得できる', async () => {
      mockGetCurrentPhaseChallenge.mockResolvedValue({
        challenge: {
          situation: 'テスト状況',
          challenge: 'テストチャレンジ',
          hint: 'テストヒント',
        },
        phaseDefinition: {
          phaseNumber: 1,
          title: '発射準備',
          description: 'テスト',
          type: 'single',
          cardCount: 1,
          consumesCard: false,
          baseScore: 100,
        },
        availableCards: [
          {
            id: 'card-1',
            keyword: 'テスト',
            rarity: 'common',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            cardImageUrl: 'https://example.com/card.jpg',
            flavorText: 'テスト',
            contextDescription: 'テスト',
          },
        ],
        totalPhases: 5,
      });

      const req = createAuthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}/challenge`);
      const response = await GET(req, makeContext(SESSION_ID));
      const data = await expectSuccessResponse(response, 200);

      expect(data.challenge).toBeDefined();
      expect(data.phaseDefinition).toBeDefined();
      expect(data.availableCards).toHaveLength(1);
      expect(data.totalPhases).toBe(5);
      expect(mockGetCurrentPhaseChallenge).toHaveBeenCalledWith(SESSION_ID, 'test-user-id-123');
    });

    it('サービスエラーの場合、500を返す', async () => {
      mockGetCurrentPhaseChallenge.mockRejectedValue(new Error('Service error'));

      const req = createAuthenticatedRequest(`/api/challenge/sessions/${SESSION_ID}/challenge`);
      const response = await GET(req, makeContext(SESSION_ID));

      await expectErrorResponse(response, 500, ERROR_CODES.INTERNAL_ERROR);
    });
  });
});
