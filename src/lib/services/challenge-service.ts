import { prisma } from '@/lib/prisma';
import {
  getScenarioById,
  getPhaseDefinition,
  isScenarioComplete,
  getRandomChallenge,
} from '@/lib/challenge';
import {
  type GameState,
  type DeckCard,
  type PhaseResult,
  createInitialGameState,
  deserializeGameState,
  serializeGameState,
  markCardsAsUsed,
  addPhaseResult,
} from '@/lib/challenge/game-state';
import {
  evaluateCardSelection,
  generateChallengeSummary,
} from '@/lib/openai';
import {
  checkChallengeLimit,
  incrementChallengeCount,
  consumeCoins,
  hasEnoughCoins,
} from '@/lib/services/coin-service';
import { processAchievementRewards } from '@/lib/challenge/rewards';
import { ApiError } from '@/lib/errors';
import type { ChallengeSessionStatus } from '@/types/challenge';
import type { Rarity } from '@/types/database';

// Response type for session details
export interface SessionDetails {
  id: string;
  userId: string;
  scenarioId: string;
  status: ChallengeSessionStatus;
  currentPhase: number;
  totalScore: number;
  startedAt: Date;
  completedAt: Date | null;
  deck: DeckCard[];
  phases: PhaseResult[];
}

/**
 * Create a new challenge session
 */
export async function createSession(
  userId: string,
  scenarioId: string
): Promise<{
  id: string;
  scenarioId: string;
  status: ChallengeSessionStatus;
  challengeInfo: { count: number; isFree: boolean; cost: number };
}> {
  const scenario = getScenarioById(scenarioId);
  if (!scenario) {
    throw new Error('シナリオが見つかりません');
  }

  // Check for existing in-progress session
  const existingSession = await prisma.challengeSession.findFirst({
    where: {
      userId,
      status: 'in_progress',
    },
  });

  if (existingSession) {
    throw new Error('進行中のセッションがあります。完了または中断してから新しいセッションを開始してください');
  }

  // Check challenge limit and charge if needed
  const challengeLimit = await checkChallengeLimit(userId);

  if (!challengeLimit.isFree) {
    const hasSufficientCoins = await hasEnoughCoins(userId, challengeLimit.cost);
    if (!hasSufficientCoins) {
      throw new ApiError(
        'INSUFFICIENT_COINS',
        `チャレンジには${challengeLimit.cost}コインが必要です`,
        400
      );
    }

    await consumeCoins(
      userId,
      challengeLimit.cost,
      `チャレンジモード参加: ${scenario.title}`
    );
  }

  // Increment challenge count
  await incrementChallengeCount(userId);

  // Initialize empty game state
  const initialGameState: GameState = {
    deck: [],
    phases: [],
    totalScore: 0,
  };

  const session = await prisma.challengeSession.create({
    data: {
      userId,
      scenarioId,
      status: 'in_progress',
      currentPhase: 0, // 0 = deck building phase
      gameState: serializeGameState(initialGameState),
    },
  });

  return {
    id: session.id,
    scenarioId: session.scenarioId,
    status: session.status as ChallengeSessionStatus,
    challengeInfo: {
      count: challengeLimit.count + 1,
      isFree: challengeLimit.isFree,
      cost: challengeLimit.cost,
    },
  };
}

/**
 * Get session by ID with full details
 */
export async function getSessionById(
  sessionId: string,
  userId: string
): Promise<SessionDetails | null> {
  const session = await prisma.challengeSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.userId !== userId) {
    return null;
  }

  const gameState = deserializeGameState(session.gameState);

  return {
    id: session.id,
    userId: session.userId,
    scenarioId: session.scenarioId,
    status: session.status as ChallengeSessionStatus,
    currentPhase: session.currentPhase,
    totalScore: gameState.totalScore,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    deck: gameState.deck,
    phases: gameState.phases,
  };
}

/**
 * Get user's sessions (simplified - only return in-progress sessions)
 */
export async function getUserSessions(
  userId: string,
  status?: ChallengeSessionStatus,
  limit = 10
) {
  const sessions = await prisma.challengeSession.findMany({
    where: {
      userId,
      ...(status && { status }),
    },
    orderBy: { startedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      scenarioId: true,
      status: true,
      currentPhase: true,
      gameState: true,
      startedAt: true,
      completedAt: true,
    },
  });

  return sessions.map((s) => {
    const gameState = deserializeGameState(s.gameState);
    return {
      id: s.id,
      scenarioId: s.scenarioId,
      status: s.status as ChallengeSessionStatus,
      currentPhase: s.currentPhase,
      totalScore: gameState.totalScore,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
    };
  });
}

/**
 * Get user's high scores
 */
export async function getUserHighScores(userId: string) {
  const highScores = await prisma.challengeHighScore.findMany({
    where: { userId },
    orderBy: { highScore: 'desc' },
  });

  return highScores.map((hs) => ({
    scenarioId: hs.scenarioId,
    highScore: hs.highScore,
    bestRank: hs.bestRank,
    playCount: hs.playCount,
    updatedAt: hs.updatedAt,
  }));
}

/**
 * Set deck cards for a session
 */
export async function setSessionDeck(
  sessionId: string,
  userId: string,
  cardIds: string[]
): Promise<void> {
  const session = await prisma.challengeSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.userId !== userId) {
    throw new Error('セッションが見つかりません');
  }

  if (session.status !== 'in_progress' || session.currentPhase !== 0) {
    throw new Error('デッキ編成は開始前のみ可能です');
  }

  const scenario = getScenarioById(session.scenarioId);
  if (!scenario) {
    throw new Error('シナリオが見つかりません');
  }

  if (cardIds.length !== scenario.deckSize) {
    throw new Error(`デッキには${scenario.deckSize}枚のカードが必要です`);
  }

  // Verify all cards belong to the user
  const cards = await prisma.card.findMany({
    where: {
      id: { in: cardIds },
      userId,
    },
    select: {
      id: true,
      keyword: true,
      rarity: true,
      flavorText: true,
      contextDescription: true,
      thumbnailUrl: true,
      cardImageUrl: true,
    },
  });

  if (cards.length !== cardIds.length) {
    throw new Error('無効なカードが含まれています');
  }

  // Check for duplicates
  const uniqueIds = new Set(cardIds);
  if (uniqueIds.size !== cardIds.length) {
    throw new Error('重複するカードは選択できません');
  }

  // Create deck cards array
  const deckCards: DeckCard[] = cardIds.map((cardId) => {
    const card = cards.find((c) => c.id === cardId)!;
    return {
      cardId: card.id,
      keyword: card.keyword,
      rarity: card.rarity as Rarity,
      flavorText: card.flavorText,
      contextDescription: card.contextDescription,
      thumbnailUrl: card.thumbnailUrl,
      cardImageUrl: card.cardImageUrl,
      isUsed: false,
      usedInPhase: null,
    };
  });

  // Update game state and move to phase 1
  const gameState: GameState = {
    deck: deckCards,
    phases: [],
    totalScore: 0,
  };

  await prisma.challengeSession.update({
    where: { id: sessionId },
    data: {
      currentPhase: 1,
      gameState: serializeGameState(gameState),
    },
  });
}

/**
 * Get the current phase challenge (generates if needed)
 */
export async function getCurrentPhaseChallenge(
  sessionId: string,
  userId: string
) {
  const session = await prisma.challengeSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.userId !== userId) {
    throw new Error('セッションが見つかりません');
  }

  if (session.status !== 'in_progress') {
    throw new Error('ゲームが進行中ではありません');
  }

  if (session.currentPhase === 0) {
    throw new Error('デッキを設定してください');
  }

  const scenario = getScenarioById(session.scenarioId);
  if (!scenario) {
    throw new Error('シナリオが見つかりません');
  }

  const currentPhase = session.currentPhase;
  const phaseDefinition = getPhaseDefinition(session.scenarioId, currentPhase);
  if (!phaseDefinition) {
    throw new Error('フェーズが見つかりません');
  }

  const gameState = deserializeGameState(session.gameState);

  // Get available cards (not used in consuming phases)
  const availableCards = gameState.deck
    .filter((dc) => !dc.isUsed)
    .map((dc) => ({
      id: dc.cardId,
      keyword: dc.keyword,
      rarity: dc.rarity,
      flavorText: dc.flavorText,
      contextDescription: dc.contextDescription,
      thumbnailUrl: dc.thumbnailUrl,
      cardImageUrl: dc.cardImageUrl,
    }));

  // Get a random predefined challenge for this phase
  const challenge = getRandomChallenge(session.scenarioId, currentPhase);

  return {
    challenge,
    phaseDefinition,
    availableCards,
    totalPhases: scenario.totalPhases,
  };
}

/**
 * Submit cards for the current phase
 */
export async function submitPhaseCards(
  sessionId: string,
  userId: string,
  cardIds: string[]
) {
  const session = await prisma.challengeSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.userId !== userId) {
    throw new Error('セッションが見つかりません');
  }

  if (session.status !== 'in_progress') {
    throw new Error('ゲームが進行中ではありません');
  }

  if (session.currentPhase === 0) {
    throw new Error('デッキを設定してください');
  }

  const scenario = getScenarioById(session.scenarioId);
  if (!scenario) {
    throw new Error('シナリオが見つかりません');
  }

  const currentPhase = session.currentPhase;
  const phaseDefinition = getPhaseDefinition(session.scenarioId, currentPhase);
  if (!phaseDefinition) {
    throw new Error('フェーズが見つかりません');
  }

  // Validate card count
  if (cardIds.length !== phaseDefinition.cardCount) {
    throw new Error(`このフェーズでは${phaseDefinition.cardCount}枚のカードが必要です`);
  }

  const gameState = deserializeGameState(session.gameState);

  // Verify cards are in the deck and available
  const availableDeckCards = gameState.deck.filter((dc) => !dc.isUsed);
  const selectedDeckCards = availableDeckCards.filter((dc) =>
    cardIds.includes(dc.cardId)
  );

  if (selectedDeckCards.length !== cardIds.length) {
    throw new Error('選択されたカードは利用できません');
  }

  const selectedCards = selectedDeckCards.map((dc) => ({
    id: dc.cardId,
    keyword: dc.keyword,
    rarity: dc.rarity,
    flavorText: dc.flavorText,
    contextDescription: dc.contextDescription,
    thumbnailUrl: dc.thumbnailUrl,
    cardImageUrl: dc.cardImageUrl,
  }));

  // Get a random predefined challenge for evaluation context
  const challenge = getRandomChallenge(session.scenarioId, currentPhase);

  // Evaluate the cards
  const evaluation = await evaluateCardSelection(
    challenge.situation,
    challenge.challenge,
    selectedCards,
    phaseDefinition.type
  );

  // Calculate final score with base score
  const phaseScore = Math.round(
    (phaseDefinition.baseScore * evaluation.fitScore) / 100 + evaluation.bonusScore
  );

  // Combine AI commentary
  const aiCommentary = `${evaluation.narrativeDescription}\n\n${evaluation.humorComment}`;

  // Update game state
  const updatedDeck = gameState.deck.map((dc) => {
    if (phaseDefinition.consumesCard && cardIds.includes(dc.cardId)) {
      return { ...dc, isUsed: true, usedInPhase: currentPhase };
    }
    return dc;
  });

  const newPhaseResult: PhaseResult = {
    phaseNumber: currentPhase,
    challenge: `${challenge.situation}\n\n${challenge.challenge}`,
    selectedCardIds: cardIds,
    fitScore: evaluation.fitScore,
    bonusScore: evaluation.bonusScore,
    totalScore: phaseScore,
    aiCommentary,
    completedAt: new Date().toISOString(),
  };

  const newTotalScore = gameState.totalScore + phaseScore;
  const nextPhase = currentPhase + 1;
  const isComplete = isScenarioComplete(session.scenarioId, nextPhase - 1);

  const updatedGameState: GameState = {
    deck: updatedDeck,
    phases: [...gameState.phases, newPhaseResult],
    totalScore: newTotalScore,
  };

  // Update session
  await prisma.challengeSession.update({
    where: { id: sessionId },
    data: {
      currentPhase: isComplete ? currentPhase : nextPhase,
      status: isComplete ? 'completed' : 'in_progress',
      completedAt: isComplete ? new Date() : null,
      gameState: serializeGameState(updatedGameState),
    },
  });

  // Generate summary and process rewards if complete
  let summary: string | undefined;
  let achievementRewards: { rank: string; coins: number; isNew: boolean }[] | undefined;
  let totalCoinsAwarded = 0;
  let isHighScore = false;

  if (isComplete) {
    // Update or create high score
    const existingHighScore = await prisma.challengeHighScore.findUnique({
      where: {
        userId_scenarioId: {
          userId,
          scenarioId: session.scenarioId,
        },
      },
    });

    const bestRank = getRankFromScore(newTotalScore);

    if (existingHighScore) {
      if (newTotalScore > existingHighScore.highScore) {
        isHighScore = true;
        await prisma.challengeHighScore.update({
          where: { id: existingHighScore.id },
          data: {
            highScore: newTotalScore,
            bestRank,
            playCount: existingHighScore.playCount + 1,
          },
        });
      } else {
        await prisma.challengeHighScore.update({
          where: { id: existingHighScore.id },
          data: {
            playCount: existingHighScore.playCount + 1,
          },
        });
      }
    } else {
      isHighScore = true;
      await prisma.challengeHighScore.create({
        data: {
          userId,
          scenarioId: session.scenarioId,
          highScore: newTotalScore,
          bestRank,
          playCount: 1,
        },
      });
    }

    // Process achievement rewards
    const rewardResult = await processAchievementRewards(
      userId,
      session.scenarioId,
      newTotalScore
    );
    achievementRewards = rewardResult.achievements;
    totalCoinsAwarded = rewardResult.totalCoinsAwarded;

    // Generate summary
    const phaseResults = updatedGameState.phases.map((p) => {
      const phaseDef = getPhaseDefinition(session.scenarioId, p.phaseNumber);
      const cardKeywords = updatedGameState.deck
        .filter((dc) => p.selectedCardIds.includes(dc.cardId))
        .map((dc) => dc.keyword);

      return {
        phaseTitle: phaseDef?.title || `Phase ${p.phaseNumber}`,
        cardKeywords,
        fitScore: p.fitScore,
      };
    });

    summary = await generateChallengeSummary(
      scenario.title,
      newTotalScore,
      phaseResults
    );

    // Update session status to completed (don't delete to allow result display)
    await prisma.challengeSession.update({
      where: { id: sessionId },
      data: { status: 'completed' },
    });
  }

  return {
    phaseNumber: currentPhase,
    challenge: `${challenge.situation}\n\n${challenge.challenge}`,
    selectedCards: selectedCards.map((c) => ({
      id: c.id,
      keyword: c.keyword,
      rarity: c.rarity,
    })),
    evaluation: {
      fitScore: evaluation.fitScore,
      bonusScore: evaluation.bonusScore,
      totalScore: phaseScore,
      connectionExplanation: evaluation.connectionExplanation,
      narrativeDescription: evaluation.narrativeDescription,
      humorComment: evaluation.humorComment,
    },
    sessionTotalScore: newTotalScore,
    isComplete,
    isHighScore,
    summary,
    achievementRewards,
    totalCoinsAwarded,
  };
}

/**
 * Get rank from score
 */
function getRankFromScore(score: number): string {
  if (score >= 450) return 'S';
  if (score >= 350) return 'A';
  if (score >= 250) return 'B';
  return 'C';
}

/**
 * Abandon a session
 */
export async function abandonSession(
  sessionId: string,
  userId: string
): Promise<void> {
  const session = await prisma.challengeSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.userId !== userId) {
    throw new Error('セッションが見つかりません');
  }

  if (session.status === 'completed' || session.status === 'abandoned') {
    throw new Error('このセッションは既に終了しています');
  }

  // Delete the session instead of marking as abandoned
  await prisma.challengeSession.delete({
    where: { id: sessionId },
  });
}
