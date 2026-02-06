/**
 * challenge-service テスト
 */

import {
  createSession,
  getSessionById,
  getUserSessions,
  getUserHighScores,
  setSessionDeck,
  getCurrentPhaseChallenge,
  submitPhaseCards,
  abandonSession,
} from '@/lib/services/challenge-service';
import { ApiError } from '@/lib/errors';

// ===== モック関数定義 =====

// Prisma モック
const mockSessionFindUnique = jest.fn();
const mockSessionFindFirst = jest.fn();
const mockSessionFindMany = jest.fn();
const mockSessionCreate = jest.fn();
const mockSessionUpdate = jest.fn();
const mockSessionDelete = jest.fn();
const mockHighScoreFindUnique = jest.fn();
const mockHighScoreFindMany = jest.fn();
const mockHighScoreCreate = jest.fn();
const mockHighScoreUpdate = jest.fn();
const mockCardFindMany = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    challengeSession: {
      findUnique: (...args: unknown[]) => mockSessionFindUnique(...args),
      findFirst: (...args: unknown[]) => mockSessionFindFirst(...args),
      findMany: (...args: unknown[]) => mockSessionFindMany(...args),
      create: (...args: unknown[]) => mockSessionCreate(...args),
      update: (...args: unknown[]) => mockSessionUpdate(...args),
      delete: (...args: unknown[]) => mockSessionDelete(...args),
    },
    challengeHighScore: {
      findUnique: (...args: unknown[]) => mockHighScoreFindUnique(...args),
      findMany: (...args: unknown[]) => mockHighScoreFindMany(...args),
      create: (...args: unknown[]) => mockHighScoreCreate(...args),
      update: (...args: unknown[]) => mockHighScoreUpdate(...args),
    },
    card: {
      findMany: (...args: unknown[]) => mockCardFindMany(...args),
    },
  },
}));

// Challenge lib モック
const mockGetScenarioById = jest.fn();
const mockGetPhaseDefinition = jest.fn();
const mockIsScenarioComplete = jest.fn();
const mockGetRandomChallenge = jest.fn();

jest.mock('@/lib/challenge', () => ({
  getScenarioById: (...args: unknown[]) => mockGetScenarioById(...args),
  getPhaseDefinition: (...args: unknown[]) => mockGetPhaseDefinition(...args),
  isScenarioComplete: (...args: unknown[]) => mockIsScenarioComplete(...args),
  getRandomChallenge: (...args: unknown[]) => mockGetRandomChallenge(...args),
}));

// Game state モック
const mockDeserializeGameState = jest.fn();
const mockSerializeGameState = jest.fn();

jest.mock('@/lib/challenge/game-state', () => ({
  deserializeGameState: (...args: unknown[]) => mockDeserializeGameState(...args),
  serializeGameState: (...args: unknown[]) => mockSerializeGameState(...args),
}));

// Coin service モック
const mockCheckChallengeLimit = jest.fn();
const mockIncrementChallengeCount = jest.fn();
const mockConsumeCoins = jest.fn();
const mockHasEnoughCoins = jest.fn();

jest.mock('@/lib/services/coin-service', () => ({
  checkChallengeLimit: (...args: unknown[]) => mockCheckChallengeLimit(...args),
  incrementChallengeCount: (...args: unknown[]) => mockIncrementChallengeCount(...args),
  consumeCoins: (...args: unknown[]) => mockConsumeCoins(...args),
  hasEnoughCoins: (...args: unknown[]) => mockHasEnoughCoins(...args),
}));

// OpenAI モック
const mockEvaluateCardSelection = jest.fn();
const mockGenerateChallengeSummary = jest.fn();

jest.mock('@/lib/openai', () => ({
  evaluateCardSelection: (...args: unknown[]) => mockEvaluateCardSelection(...args),
  generateChallengeSummary: (...args: unknown[]) => mockGenerateChallengeSummary(...args),
}));

// Rewards モック
const mockProcessAchievementRewards = jest.fn();

jest.mock('@/lib/challenge/rewards', () => ({
  processAchievementRewards: (...args: unknown[]) => mockProcessAchievementRewards(...args),
}));

// ===== テストデータ =====

const TEST_USER_ID = 'test-user-id-123';
const OTHER_USER_ID = 'other-user-id-456';
const TEST_SESSION_ID = 'session-id-001';
const TEST_SCENARIO_ID = 'space_exploration';

const mockScenario = {
  id: TEST_SCENARIO_ID,
  title: '宇宙探査ミッション',
  description: 'テスト用シナリオ',
  icon: '🚀',
  difficulty: 'normal',
  deckSize: 6,
  totalPhases: 5,
  phases: [
    { phaseNumber: 1, title: '発射準備', description: 'テスト', type: 'single', cardCount: 1, consumesCard: false, baseScore: 100 },
    { phaseNumber: 2, title: '太陽フレア', description: 'テスト', type: 'single', cardCount: 1, consumesCard: true, baseScore: 100 },
    { phaseNumber: 3, title: 'エイリアン遭遇', description: 'テスト', type: 'combo', cardCount: 2, consumesCard: false, baseScore: 100 },
    { phaseNumber: 4, title: '資源不足', description: 'テスト', type: 'single', cardCount: 1, consumesCard: true, baseScore: 100 },
    { phaseNumber: 5, title: '帰還', description: 'テスト', type: 'single', cardCount: 1, consumesCard: false, baseScore: 100 },
  ],
};

function makeDeckCard(id: string, overrides = {}) {
  return {
    cardId: id,
    keyword: `keyword-${id}`,
    rarity: 'common' as const,
    flavorText: `flavor-${id}`,
    contextDescription: `context-${id}`,
    thumbnailUrl: `https://example.com/thumb/${id}.jpg`,
    cardImageUrl: `https://example.com/card/${id}.jpg`,
    isUsed: false,
    usedInPhase: null,
    ...overrides,
  };
}

const mockDeck = [
  makeDeckCard('card-1'),
  makeDeckCard('card-2'),
  makeDeckCard('card-3'),
  makeDeckCard('card-4'),
  makeDeckCard('card-5'),
  makeDeckCard('card-6'),
];

const mockGameState = {
  deck: mockDeck,
  phases: [],
  totalScore: 0,
};

const mockSession = {
  id: TEST_SESSION_ID,
  userId: TEST_USER_ID,
  scenarioId: TEST_SCENARIO_ID,
  status: 'in_progress',
  currentPhase: 1,
  gameState: { /* serialized */ },
  startedAt: new Date('2026-01-15T10:00:00Z'),
  completedAt: null,
};

describe('challenge-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSerializeGameState.mockImplementation((state: unknown) => state);
  });

  // ==================== createSession ====================
  describe('createSession', () => {
    it('新しいセッションを作成できる', async () => {
      mockGetScenarioById.mockReturnValue(mockScenario);
      mockSessionFindFirst.mockResolvedValue(null);
      mockCheckChallengeLimit.mockResolvedValue({
        count: 0,
        isFree: true,
        cost: 0,
        remainingFree: 3,
      });
      mockIncrementChallengeCount.mockResolvedValue(1);
      mockSessionCreate.mockResolvedValue({
        id: TEST_SESSION_ID,
        scenarioId: TEST_SCENARIO_ID,
        status: 'in_progress',
      });

      const result = await createSession(TEST_USER_ID, TEST_SCENARIO_ID);

      expect(result.id).toBe(TEST_SESSION_ID);
      expect(result.scenarioId).toBe(TEST_SCENARIO_ID);
      expect(result.status).toBe('in_progress');
      expect(result.challengeInfo.isFree).toBe(true);
      expect(result.challengeInfo.count).toBe(1);
      expect(mockConsumeCoins).not.toHaveBeenCalled();
    });

    it('シナリオが存在しない場合エラーを投げる', async () => {
      mockGetScenarioById.mockReturnValue(undefined);

      await expect(
        createSession(TEST_USER_ID, 'nonexistent')
      ).rejects.toThrow('シナリオが見つかりません');
    });

    it('進行中のセッションがある場合エラーを投げる', async () => {
      mockGetScenarioById.mockReturnValue(mockScenario);
      mockSessionFindFirst.mockResolvedValue({ id: 'existing-session' });

      await expect(
        createSession(TEST_USER_ID, TEST_SCENARIO_ID)
      ).rejects.toThrow('進行中のセッションがあります');
    });

    it('無料回数を超えた場合はコインを消費する', async () => {
      mockGetScenarioById.mockReturnValue(mockScenario);
      mockSessionFindFirst.mockResolvedValue(null);
      mockCheckChallengeLimit.mockResolvedValue({
        count: 3,
        isFree: false,
        cost: 10,
        remainingFree: 0,
      });
      mockHasEnoughCoins.mockResolvedValue(true);
      mockConsumeCoins.mockResolvedValue({});
      mockIncrementChallengeCount.mockResolvedValue(4);
      mockSessionCreate.mockResolvedValue({
        id: TEST_SESSION_ID,
        scenarioId: TEST_SCENARIO_ID,
        status: 'in_progress',
      });

      const result = await createSession(TEST_USER_ID, TEST_SCENARIO_ID);

      expect(mockConsumeCoins).toHaveBeenCalledWith(
        TEST_USER_ID,
        10,
        expect.stringContaining('チャレンジモード参加')
      );
      expect(result.challengeInfo.isFree).toBe(false);
      expect(result.challengeInfo.cost).toBe(10);
    });

    it('コインが足りない場合ApiErrorを投げる', async () => {
      mockGetScenarioById.mockReturnValue(mockScenario);
      mockSessionFindFirst.mockResolvedValue(null);
      mockCheckChallengeLimit.mockResolvedValue({
        count: 3,
        isFree: false,
        cost: 10,
        remainingFree: 0,
      });
      mockHasEnoughCoins.mockResolvedValue(false);

      try {
        await createSession(TEST_USER_ID, TEST_SCENARIO_ID);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe('INSUFFICIENT_COINS');
      }
    });
  });

  // ==================== getSessionById ====================
  describe('getSessionById', () => {
    it('セッション詳細を取得できる', async () => {
      mockSessionFindUnique.mockResolvedValue(mockSession);
      mockDeserializeGameState.mockReturnValue(mockGameState);

      const result = await getSessionById(TEST_SESSION_ID, TEST_USER_ID);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(TEST_SESSION_ID);
      expect(result!.scenarioId).toBe(TEST_SCENARIO_ID);
      expect(result!.deck).toEqual(mockDeck);
      expect(result!.phases).toEqual([]);
    });

    it('他のユーザーのセッションはnullを返す', async () => {
      mockSessionFindUnique.mockResolvedValue({
        ...mockSession,
        userId: OTHER_USER_ID,
      });

      const result = await getSessionById(TEST_SESSION_ID, TEST_USER_ID);

      expect(result).toBeNull();
    });

    it('存在しないセッションはnullを返す', async () => {
      mockSessionFindUnique.mockResolvedValue(null);

      const result = await getSessionById('nonexistent', TEST_USER_ID);

      expect(result).toBeNull();
    });
  });

  // ==================== getUserSessions ====================
  describe('getUserSessions', () => {
    it('ユーザーのセッション一覧を取得できる', async () => {
      mockSessionFindMany.mockResolvedValue([mockSession]);
      mockDeserializeGameState.mockReturnValue(mockGameState);

      const result = await getUserSessions(TEST_USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(TEST_SESSION_ID);
      expect(result[0].totalScore).toBe(0);
    });

    it('ステータスでフィルタリングできる', async () => {
      mockSessionFindMany.mockResolvedValue([]);
      mockDeserializeGameState.mockReturnValue(mockGameState);

      await getUserSessions(TEST_USER_ID, 'completed');

      expect(mockSessionFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: TEST_USER_ID,
            status: 'completed',
          },
        })
      );
    });

    it('limitを指定できる', async () => {
      mockSessionFindMany.mockResolvedValue([]);

      await getUserSessions(TEST_USER_ID, undefined, 5);

      expect(mockSessionFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });
  });

  // ==================== getUserHighScores ====================
  describe('getUserHighScores', () => {
    it('ハイスコア一覧を取得できる', async () => {
      const mockHighScores = [
        {
          scenarioId: TEST_SCENARIO_ID,
          highScore: 400,
          bestRank: 'A',
          playCount: 3,
          updatedAt: new Date('2026-01-15T10:00:00Z'),
        },
      ];
      mockHighScoreFindMany.mockResolvedValue(mockHighScores);

      const result = await getUserHighScores(TEST_USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].scenarioId).toBe(TEST_SCENARIO_ID);
      expect(result[0].highScore).toBe(400);
      expect(result[0].bestRank).toBe('A');
    });

    it('ハイスコアがない場合は空配列を返す', async () => {
      mockHighScoreFindMany.mockResolvedValue([]);

      const result = await getUserHighScores(TEST_USER_ID);

      expect(result).toHaveLength(0);
    });
  });

  // ==================== setSessionDeck ====================
  describe('setSessionDeck', () => {
    it('デッキを設定できる', async () => {
      const session = { ...mockSession, currentPhase: 0 };
      mockSessionFindUnique.mockResolvedValue(session);
      mockGetScenarioById.mockReturnValue(mockScenario);

      const cardIds = ['card-1', 'card-2', 'card-3', 'card-4', 'card-5', 'card-6'];
      const mockCards = cardIds.map((id) => ({
        id,
        keyword: `keyword-${id}`,
        rarity: 'common',
        flavorText: `flavor-${id}`,
        contextDescription: `context-${id}`,
        thumbnailUrl: `https://example.com/thumb/${id}.jpg`,
        cardImageUrl: `https://example.com/card/${id}.jpg`,
      }));
      mockCardFindMany.mockResolvedValue(mockCards);
      mockSessionUpdate.mockResolvedValue({});

      await setSessionDeck(TEST_SESSION_ID, TEST_USER_ID, cardIds);

      expect(mockSessionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_SESSION_ID },
          data: expect.objectContaining({
            currentPhase: 1,
          }),
        })
      );
    });

    it('他のユーザーのセッションにはデッキを設定できない', async () => {
      mockSessionFindUnique.mockResolvedValue({
        ...mockSession,
        userId: OTHER_USER_ID,
        currentPhase: 0,
      });

      await expect(
        setSessionDeck(TEST_SESSION_ID, TEST_USER_ID, ['card-1'])
      ).rejects.toThrow('セッションが見つかりません');
    });

    it('存在しないセッションにはデッキを設定できない', async () => {
      mockSessionFindUnique.mockResolvedValue(null);

      await expect(
        setSessionDeck('nonexistent', TEST_USER_ID, ['card-1'])
      ).rejects.toThrow('セッションが見つかりません');
    });

    it('currentPhaseが0以外の場合エラーを投げる', async () => {
      mockSessionFindUnique.mockResolvedValue({ ...mockSession, currentPhase: 1 });

      await expect(
        setSessionDeck(TEST_SESSION_ID, TEST_USER_ID, ['card-1'])
      ).rejects.toThrow('デッキ編成は開始前のみ可能です');
    });

    it('進行中でないセッションにはデッキを設定できない', async () => {
      mockSessionFindUnique.mockResolvedValue({
        ...mockSession,
        status: 'completed',
        currentPhase: 0,
      });

      await expect(
        setSessionDeck(TEST_SESSION_ID, TEST_USER_ID, ['card-1'])
      ).rejects.toThrow('デッキ編成は開始前のみ可能です');
    });

    it('デッキサイズが合わない場合エラーを投げる', async () => {
      mockSessionFindUnique.mockResolvedValue({ ...mockSession, currentPhase: 0 });
      mockGetScenarioById.mockReturnValue(mockScenario); // deckSize: 6

      await expect(
        setSessionDeck(TEST_SESSION_ID, TEST_USER_ID, ['card-1', 'card-2'])
      ).rejects.toThrow('デッキには6枚のカードが必要です');
    });

    it('他ユーザーのカードが含まれている場合エラーを投げる', async () => {
      mockSessionFindUnique.mockResolvedValue({ ...mockSession, currentPhase: 0 });
      mockGetScenarioById.mockReturnValue(mockScenario);

      const cardIds = ['card-1', 'card-2', 'card-3', 'card-4', 'card-5', 'card-6'];
      // Only 5 cards found (one doesn't belong to user)
      mockCardFindMany.mockResolvedValue(
        cardIds.slice(0, 5).map((id) => ({
          id,
          keyword: `keyword-${id}`,
          rarity: 'common',
          flavorText: '',
          contextDescription: '',
          thumbnailUrl: '',
          cardImageUrl: '',
        }))
      );

      await expect(
        setSessionDeck(TEST_SESSION_ID, TEST_USER_ID, cardIds)
      ).rejects.toThrow('無効なカードが含まれています');
    });

    it('重複するカードIDがある場合エラーを投げる', async () => {
      mockSessionFindUnique.mockResolvedValue({ ...mockSession, currentPhase: 0 });
      mockGetScenarioById.mockReturnValue(mockScenario);

      // cardIds has 6 items with a duplicate; findMany with { in: cardIds } returns
      // only unique matches, so cards.length (5) !== cardIds.length (6) -> "invalid cards" error.
      // The duplicate check happens AFTER the count check, so this test verifies the count check
      // catches the inconsistency when duplicates cause fewer DB results.
      const cardIds = ['card-1', 'card-1', 'card-3', 'card-4', 'card-5', 'card-6'];
      const mockCards = ['card-1', 'card-3', 'card-4', 'card-5', 'card-6'].map((id) => ({
        id,
        keyword: `keyword-${id}`,
        rarity: 'common',
        flavorText: '',
        contextDescription: '',
        thumbnailUrl: '',
        cardImageUrl: '',
      }));
      mockCardFindMany.mockResolvedValue(mockCards);

      await expect(
        setSessionDeck(TEST_SESSION_ID, TEST_USER_ID, cardIds)
      ).rejects.toThrow('無効なカードが含まれています');
    });
  });

  // ==================== getCurrentPhaseChallenge ====================
  describe('getCurrentPhaseChallenge', () => {
    it('現在のフェーズチャレンジを取得できる', async () => {
      mockSessionFindUnique.mockResolvedValue(mockSession);
      mockGetScenarioById.mockReturnValue(mockScenario);
      mockGetPhaseDefinition.mockReturnValue(mockScenario.phases[0]);
      mockDeserializeGameState.mockReturnValue(mockGameState);
      mockGetRandomChallenge.mockReturnValue({
        situation: 'テスト状況',
        challenge: 'テストチャレンジ',
        hint: 'テストヒント',
      });

      const result = await getCurrentPhaseChallenge(TEST_SESSION_ID, TEST_USER_ID);

      expect(result.challenge).toBeDefined();
      expect(result.phaseDefinition).toBeDefined();
      expect(result.availableCards).toHaveLength(6);
      expect(result.totalPhases).toBe(5);
    });

    it('他のユーザーのセッションにはアクセスできない', async () => {
      mockSessionFindUnique.mockResolvedValue({
        ...mockSession,
        userId: OTHER_USER_ID,
      });

      await expect(
        getCurrentPhaseChallenge(TEST_SESSION_ID, TEST_USER_ID)
      ).rejects.toThrow('セッションが見つかりません');
    });

    it('進行中でないセッションにはアクセスできない', async () => {
      mockSessionFindUnique.mockResolvedValue({
        ...mockSession,
        status: 'completed',
      });

      await expect(
        getCurrentPhaseChallenge(TEST_SESSION_ID, TEST_USER_ID)
      ).rejects.toThrow('ゲームが進行中ではありません');
    });

    it('デッキ未設定の場合エラーを投げる', async () => {
      mockSessionFindUnique.mockResolvedValue({
        ...mockSession,
        currentPhase: 0,
      });

      await expect(
        getCurrentPhaseChallenge(TEST_SESSION_ID, TEST_USER_ID)
      ).rejects.toThrow('デッキを設定してください');
    });

    it('使用済みカードはavailableCardsに含まれない', async () => {
      mockSessionFindUnique.mockResolvedValue(mockSession);
      mockGetScenarioById.mockReturnValue(mockScenario);
      mockGetPhaseDefinition.mockReturnValue(mockScenario.phases[0]);

      const gameStateWithUsedCards = {
        ...mockGameState,
        deck: [
          ...mockDeck.slice(0, 4),
          makeDeckCard('card-5', { isUsed: true, usedInPhase: 1 }),
          makeDeckCard('card-6', { isUsed: true, usedInPhase: 2 }),
        ],
      };
      mockDeserializeGameState.mockReturnValue(gameStateWithUsedCards);
      mockGetRandomChallenge.mockReturnValue({
        situation: 'テスト',
        challenge: 'テスト',
        hint: 'テスト',
      });

      const result = await getCurrentPhaseChallenge(TEST_SESSION_ID, TEST_USER_ID);

      expect(result.availableCards).toHaveLength(4);
    });
  });

  // ==================== submitPhaseCards ====================
  describe('submitPhaseCards', () => {
    const mockChallenge = {
      situation: 'テスト状況',
      challenge: 'テストチャレンジ',
      hint: 'テストヒント',
    };

    const mockEvaluation = {
      fitScore: 80,
      bonusScore: 10,
      connectionExplanation: 'テスト説明',
      narrativeDescription: 'テストナラティブ',
      humorComment: 'テストユーモア',
    };

    beforeEach(() => {
      // 共通セットアップ
      mockGetScenarioById.mockReturnValue(mockScenario);
      mockGetPhaseDefinition.mockReturnValue(mockScenario.phases[0]); // phase 1, single, cardCount: 1
      mockDeserializeGameState.mockReturnValue(mockGameState);
      mockGetRandomChallenge.mockReturnValue(mockChallenge);
      mockEvaluateCardSelection.mockResolvedValue(mockEvaluation);
      mockIsScenarioComplete.mockReturnValue(false);
      mockSessionUpdate.mockResolvedValue({});
      mockSerializeGameState.mockImplementation((state: unknown) => state);
    });

    it('カードを提出してフェーズを完了できる', async () => {
      mockSessionFindUnique.mockResolvedValue(mockSession);

      const result = await submitPhaseCards(TEST_SESSION_ID, TEST_USER_ID, ['card-1']);

      expect(result.phaseNumber).toBe(1);
      expect(result.evaluation.fitScore).toBe(80);
      expect(result.evaluation.bonusScore).toBe(10);
      expect(result.isComplete).toBe(false);
      expect(result.selectedCards).toHaveLength(1);
      expect(result.selectedCards[0].keyword).toBe('keyword-card-1');
    });

    it('フェーズスコアが正しく計算される', async () => {
      mockSessionFindUnique.mockResolvedValue(mockSession);

      const result = await submitPhaseCards(TEST_SESSION_ID, TEST_USER_ID, ['card-1']);

      // baseScore=100, fitScore=80 => (100 * 80 / 100) + 10 = 90
      expect(result.evaluation.totalScore).toBe(90);
    });

    it('他のユーザーのセッションにはカードを提出できない', async () => {
      mockSessionFindUnique.mockResolvedValue({
        ...mockSession,
        userId: OTHER_USER_ID,
      });

      await expect(
        submitPhaseCards(TEST_SESSION_ID, TEST_USER_ID, ['card-1'])
      ).rejects.toThrow('セッションが見つかりません');
    });

    it('進行中でないセッションにはカードを提出できない', async () => {
      mockSessionFindUnique.mockResolvedValue({
        ...mockSession,
        status: 'completed',
      });

      await expect(
        submitPhaseCards(TEST_SESSION_ID, TEST_USER_ID, ['card-1'])
      ).rejects.toThrow('ゲームが進行中ではありません');
    });

    it('デッキ未設定の場合エラーを投げる', async () => {
      mockSessionFindUnique.mockResolvedValue({
        ...mockSession,
        currentPhase: 0,
      });

      await expect(
        submitPhaseCards(TEST_SESSION_ID, TEST_USER_ID, ['card-1'])
      ).rejects.toThrow('デッキを設定してください');
    });

    it('カード数が合わない場合エラーを投げる', async () => {
      mockSessionFindUnique.mockResolvedValue(mockSession);
      // Phase 1 requires 1 card, submit 2
      await expect(
        submitPhaseCards(TEST_SESSION_ID, TEST_USER_ID, ['card-1', 'card-2'])
      ).rejects.toThrow('1枚のカードが必要です');
    });

    it('利用できないカードを提出するとエラーを投げる', async () => {
      mockSessionFindUnique.mockResolvedValue(mockSession);

      // Card is already used
      const gameStateWithUsedCard = {
        ...mockGameState,
        deck: [
          makeDeckCard('card-1', { isUsed: true, usedInPhase: 1 }),
          ...mockDeck.slice(1),
        ],
      };
      mockDeserializeGameState.mockReturnValue(gameStateWithUsedCard);

      await expect(
        submitPhaseCards(TEST_SESSION_ID, TEST_USER_ID, ['card-1'])
      ).rejects.toThrow('選択されたカードは利用できません');
    });

    it('シナリオが完了した場合、完了処理が実行される', async () => {
      mockSessionFindUnique.mockResolvedValue({
        ...mockSession,
        currentPhase: 5,
      });
      mockGetPhaseDefinition.mockReturnValue(mockScenario.phases[4]); // phase 5
      mockIsScenarioComplete.mockReturnValue(true);

      // 完了処理モック
      mockHighScoreFindUnique.mockResolvedValue(null);
      mockHighScoreCreate.mockResolvedValue({});
      mockProcessAchievementRewards.mockResolvedValue({
        achievements: [{ rank: 'B', coins: 30, isNew: true }],
        totalCoinsAwarded: 30,
      });
      mockGenerateChallengeSummary.mockResolvedValue('テストサマリー');
      mockSessionUpdate.mockResolvedValue({});

      const result = await submitPhaseCards(TEST_SESSION_ID, TEST_USER_ID, ['card-1']);

      expect(result.isComplete).toBe(true);
      expect(result.summary).toBe('テストサマリー');
      expect(result.achievementRewards).toBeDefined();
      expect(result.totalCoinsAwarded).toBe(30);
    });

    it('ハイスコアが更新される場合、isHighScoreがtrueになる', async () => {
      mockSessionFindUnique.mockResolvedValue({
        ...mockSession,
        currentPhase: 5,
      });
      mockGetPhaseDefinition.mockReturnValue(mockScenario.phases[4]);
      mockIsScenarioComplete.mockReturnValue(true);

      // 既存のハイスコアが低い
      mockHighScoreFindUnique.mockResolvedValue({
        id: 'hs-1',
        highScore: 50,
        bestRank: 'C',
        playCount: 1,
      });
      mockHighScoreUpdate.mockResolvedValue({});
      mockProcessAchievementRewards.mockResolvedValue({
        achievements: [],
        totalCoinsAwarded: 0,
      });
      mockGenerateChallengeSummary.mockResolvedValue('サマリー');
      mockSessionUpdate.mockResolvedValue({});

      const result = await submitPhaseCards(TEST_SESSION_ID, TEST_USER_ID, ['card-1']);

      expect(result.isComplete).toBe(true);
      expect(result.isHighScore).toBe(true);
    });

    it('ハイスコアが更新されない場合、プレイ回数のみ増加する', async () => {
      mockSessionFindUnique.mockResolvedValue({
        ...mockSession,
        currentPhase: 5,
      });
      mockGetPhaseDefinition.mockReturnValue(mockScenario.phases[4]);
      mockIsScenarioComplete.mockReturnValue(true);

      // 既存のハイスコアが高い
      mockHighScoreFindUnique.mockResolvedValue({
        id: 'hs-1',
        highScore: 9999,
        bestRank: 'S',
        playCount: 5,
      });
      mockHighScoreUpdate.mockResolvedValue({});
      mockProcessAchievementRewards.mockResolvedValue({
        achievements: [],
        totalCoinsAwarded: 0,
      });
      mockGenerateChallengeSummary.mockResolvedValue('サマリー');
      mockSessionUpdate.mockResolvedValue({});

      const result = await submitPhaseCards(TEST_SESSION_ID, TEST_USER_ID, ['card-1']);

      expect(result.isHighScore).toBe(false);
      // playCount only update
      expect(mockHighScoreUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { playCount: 6 },
        })
      );
    });

    it('comboフェーズでは複数カードを提出できる', async () => {
      mockSessionFindUnique.mockResolvedValue({
        ...mockSession,
        currentPhase: 3,
      });
      mockGetPhaseDefinition.mockReturnValue(mockScenario.phases[2]); // combo, cardCount: 2

      const result = await submitPhaseCards(TEST_SESSION_ID, TEST_USER_ID, ['card-1', 'card-2']);

      expect(result.selectedCards).toHaveLength(2);
    });
  });

  // ==================== abandonSession ====================
  describe('abandonSession', () => {
    it('セッションを中断できる', async () => {
      mockSessionFindUnique.mockResolvedValue(mockSession);
      mockSessionDelete.mockResolvedValue({});

      await abandonSession(TEST_SESSION_ID, TEST_USER_ID);

      expect(mockSessionDelete).toHaveBeenCalledWith({
        where: { id: TEST_SESSION_ID },
      });
    });

    it('他のユーザーのセッションは中断できない', async () => {
      mockSessionFindUnique.mockResolvedValue({
        ...mockSession,
        userId: OTHER_USER_ID,
      });

      await expect(
        abandonSession(TEST_SESSION_ID, TEST_USER_ID)
      ).rejects.toThrow('セッションが見つかりません');
    });

    it('存在しないセッションは中断できない', async () => {
      mockSessionFindUnique.mockResolvedValue(null);

      await expect(
        abandonSession('nonexistent', TEST_USER_ID)
      ).rejects.toThrow('セッションが見つかりません');
    });

    it('完了済みセッションは中断できない', async () => {
      mockSessionFindUnique.mockResolvedValue({
        ...mockSession,
        status: 'completed',
      });

      await expect(
        abandonSession(TEST_SESSION_ID, TEST_USER_ID)
      ).rejects.toThrow('このセッションは既に終了しています');
    });

    it('中断済みセッションは再度中断できない', async () => {
      mockSessionFindUnique.mockResolvedValue({
        ...mockSession,
        status: 'abandoned',
      });

      await expect(
        abandonSession(TEST_SESSION_ID, TEST_USER_ID)
      ).rejects.toThrow('このセッションは既に終了しています');
    });
  });
});
