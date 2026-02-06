/**
 * /api/challenge/scenarios API テスト
 * GET (シナリオ一覧)
 */

import { GET } from '@/app/api/challenge/scenarios/route';
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

// Challenge lib モック
const mockGetScenarioList = jest.fn();
jest.mock('@/lib/challenge', () => ({
  getScenarioList: (...args: unknown[]) => mockGetScenarioList(...args),
}));

// Prisma モック
const mockHighScoreFindMany = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    challengeHighScore: {
      findMany: (...args: unknown[]) => mockHighScoreFindMany(...args),
    },
  },
}));

describe('/api/challenge/scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAuth.mockResolvedValue({
      uid: 'test-user-id-123',
      email: 'test@example.com',
      emailVerified: true,
    });
  });

  describe('GET /api/challenge/scenarios', () => {
    it('未認証の場合、401を返す', async () => {
      mockVerifyAuth.mockResolvedValue(null);

      const req = createUnauthenticatedRequest('/api/challenge/scenarios');
      const response = await GET(req);

      await expectErrorResponse(response, 401, ERROR_CODES.UNAUTHORIZED);
    });

    it('シナリオ一覧をハイスコア付きで取得できる', async () => {
      mockGetScenarioList.mockReturnValue([
        {
          id: 'space_exploration',
          title: '宇宙探査ミッション',
          description: 'テスト',
          icon: '🚀',
          difficulty: 'normal',
          totalPhases: 5,
          deckSize: 6,
          isAvailable: true,
        },
        {
          id: 'time_travel',
          title: 'タイムトラベル大作戦',
          description: 'テスト',
          icon: '⏰',
          difficulty: 'easy',
          totalPhases: 5,
          deckSize: 5,
          isAvailable: true,
        },
      ]);

      mockHighScoreFindMany.mockResolvedValue([
        {
          scenarioId: 'space_exploration',
          highScore: 400,
          bestRank: 'A',
          playCount: 3,
        },
      ]);

      const req = createAuthenticatedRequest('/api/challenge/scenarios');
      const response = await GET(req);
      const data = await expectSuccessResponse(response, 200);

      expect(data).toHaveLength(2);
      expect(data[0].id).toBe('space_exploration');
      expect(data[0].highScore).toBe(400);
      expect(data[0].bestRank).toBe('A');
      expect(data[0].playCount).toBe(3);
      // time_travel has no high score
      expect(data[1].highScore).toBeNull();
      expect(data[1].bestRank).toBeNull();
      expect(data[1].playCount).toBe(0);
    });

    it('ハイスコアがない場合はnull/0で返す', async () => {
      mockGetScenarioList.mockReturnValue([
        {
          id: 'space_exploration',
          title: '宇宙探査ミッション',
          description: 'テスト',
          icon: '🚀',
          difficulty: 'normal',
          totalPhases: 5,
          deckSize: 6,
          isAvailable: true,
        },
      ]);
      mockHighScoreFindMany.mockResolvedValue([]);

      const req = createAuthenticatedRequest('/api/challenge/scenarios');
      const response = await GET(req);
      const data = await expectSuccessResponse(response, 200);

      expect(data[0].highScore).toBeNull();
      expect(data[0].bestRank).toBeNull();
      expect(data[0].playCount).toBe(0);
    });
  });
});
