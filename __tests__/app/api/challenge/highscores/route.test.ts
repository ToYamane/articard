/**
 * /api/challenge/highscores API テスト
 * GET (ハイスコア一覧)
 */

import { GET } from '@/app/api/challenge/highscores/route';
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
const mockGetUserHighScores = jest.fn();
jest.mock('@/lib/services/challenge-service', () => ({
  getUserHighScores: (...args: unknown[]) => mockGetUserHighScores(...args),
}));

describe('/api/challenge/highscores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAuth.mockResolvedValue({
      uid: 'test-user-id-123',
      email: 'test@example.com',
      emailVerified: true,
    });
  });

  describe('GET /api/challenge/highscores', () => {
    it('未認証の場合、401を返す', async () => {
      mockVerifyAuth.mockResolvedValue(null);

      const req = createUnauthenticatedRequest('/api/challenge/highscores');
      const response = await GET(req);

      await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
    });

    it('ハイスコア一覧を取得できる', async () => {
      mockGetUserHighScores.mockResolvedValue([
        {
          scenarioId: 'space_exploration',
          highScore: 400,
          bestRank: 'A',
          playCount: 3,
          updatedAt: new Date(),
        },
        {
          scenarioId: 'time_travel',
          highScore: 250,
          bestRank: 'B',
          playCount: 1,
          updatedAt: new Date(),
        },
      ]);

      const req = createAuthenticatedRequest('/api/challenge/highscores');
      const response = await GET(req);
      const data = await expectSuccessResponse(response, 200);

      expect(data.highScores).toHaveLength(2);
      expect(data.highScores[0].scenarioId).toBe('space_exploration');
      expect(data.highScores[0].highScore).toBe(400);
      expect(mockGetUserHighScores).toHaveBeenCalledWith('test-user-id-123');
    });

    it('ハイスコアがない場合は空配列を返す', async () => {
      mockGetUserHighScores.mockResolvedValue([]);

      const req = createAuthenticatedRequest('/api/challenge/highscores');
      const response = await GET(req);
      const data = await expectSuccessResponse(response, 200);

      expect(data.highScores).toHaveLength(0);
    });
  });
});
