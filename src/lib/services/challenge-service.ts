import { prisma } from '@/lib/prisma';
import {
  getScenarioById,
  getPhaseDefinition,
  isScenarioComplete,
  getRandomChallenge,
} from '@/lib/challenge';
import {
  evaluateCardSelection,
  generateChallengeSummary,
} from '@/lib/openai';
import type { ChallengeSessionStatus, ChallengeSessionWithDetails } from '@/types/challenge';
import type { Rarity } from '@/types/database';

// Card info type for internal use
interface CardInfo {
  id: string;
  keyword: string;
  rarity: Rarity;
  flavorText: string;
  contextDescription: string;
  thumbnailUrl: string;
  cardImageUrl: string;
}

/**
 * Create a new challenge session
 */
export async function createSession(
  userId: string,
  scenarioId: string
): Promise<{ id: string; scenarioId: string; status: ChallengeSessionStatus }> {
  const scenario = getScenarioById(scenarioId);
  if (!scenario) {
    throw new Error('シナリオが見つかりません');
  }

  // Check for existing in-progress session
  const existingSession = await prisma.challengeSession.findFirst({
    where: {
      userId,
      status: { in: ['deck_building', 'in_progress'] },
    },
  });

  if (existingSession) {
    throw new Error('進行中のセッションがあります。完了または中断してから新しいセッションを開始してください');
  }

  const session = await prisma.challengeSession.create({
    data: {
      userId,
      scenarioId,
      status: 'deck_building',
      currentPhase: 0,
      totalScore: 0,
    },
  });

  return {
    id: session.id,
    scenarioId: session.scenarioId,
    status: session.status as ChallengeSessionStatus,
  };
}

/**
 * Get session by ID with full details
 */
export async function getSessionById(
  sessionId: string,
  userId: string
): Promise<ChallengeSessionWithDetails | null> {
  const session = await prisma.challengeSession.findUnique({
    where: { id: sessionId },
    include: {
      deckCards: {
        include: {
          card: {
            select: {
              id: true,
              keyword: true,
              rarity: true,
              thumbnailUrl: true,
              cardImageUrl: true,
              flavorText: true,
              contextDescription: true,
            },
          },
        },
      },
      phases: {
        orderBy: { phaseNumber: 'asc' },
      },
    },
  });

  if (!session || session.userId !== userId) {
    return null;
  }

  return {
    id: session.id,
    userId: session.userId,
    scenarioId: session.scenarioId,
    status: session.status as ChallengeSessionStatus,
    currentPhase: session.currentPhase,
    totalScore: session.totalScore,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    deckCards: session.deckCards.map((dc) => ({
      id: dc.id,
      cardId: dc.cardId,
      isUsed: dc.isUsed,
      usedInPhase: dc.usedInPhase,
      card: dc.card,
    })),
    phases: session.phases.map((p) => ({
      id: p.id,
      phaseNumber: p.phaseNumber,
      challenge: p.challenge,
      selectedCardIds: p.selectedCardIds as string[],
      fitScore: p.fitScore,
      bonusScore: p.bonusScore,
      totalScore: p.totalScore,
      aiCommentary: p.aiCommentary,
      completedAt: p.completedAt,
    })),
  };
}

/**
 * Get user's sessions
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
      totalScore: true,
      startedAt: true,
      completedAt: true,
    },
  });

  return sessions.map((s) => ({
    ...s,
    status: s.status as ChallengeSessionStatus,
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

  if (session.status !== 'deck_building') {
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
  });

  if (cards.length !== cardIds.length) {
    throw new Error('無効なカードが含まれています');
  }

  // Check for duplicates
  const uniqueIds = new Set(cardIds);
  if (uniqueIds.size !== cardIds.length) {
    throw new Error('重複するカードは選択できません');
  }

  // Transaction: Clear existing deck and add new cards, then update status
  await prisma.$transaction(async (tx) => {
    // Remove existing deck cards
    await tx.challengeSessionCard.deleteMany({
      where: { sessionId },
    });

    // Add new deck cards
    await tx.challengeSessionCard.createMany({
      data: cardIds.map((cardId) => ({
        sessionId,
        cardId,
        isUsed: false,
      })),
    });

    // Update session status to in_progress
    await tx.challengeSession.update({
      where: { id: sessionId },
      data: {
        status: 'in_progress',
        currentPhase: 1,
      },
    });
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
    include: {
      deckCards: {
        include: {
          card: {
            select: {
              id: true,
              keyword: true,
              rarity: true,
              flavorText: true,
              contextDescription: true,
              thumbnailUrl: true,
              cardImageUrl: true,
            },
          },
        },
      },
      phases: true,
    },
  });

  if (!session || session.userId !== userId) {
    throw new Error('セッションが見つかりません');
  }

  if (session.status !== 'in_progress') {
    throw new Error('ゲームが進行中ではありません');
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

  // Get available cards (not used in consuming phases)
  const availableCards = session.deckCards
    .filter((dc) => !dc.isUsed)
    .map((dc) => dc.card as CardInfo);

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
    include: {
      deckCards: {
        include: {
          card: {
            select: {
              id: true,
              keyword: true,
              rarity: true,
              flavorText: true,
              contextDescription: true,
              thumbnailUrl: true,
              cardImageUrl: true,
            },
          },
        },
      },
      phases: true,
    },
  });

  if (!session || session.userId !== userId) {
    throw new Error('セッションが見つかりません');
  }

  if (session.status !== 'in_progress') {
    throw new Error('ゲームが進行中ではありません');
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

  // Verify cards are in the deck and available
  const availableDeckCards = session.deckCards.filter((dc) => !dc.isUsed);
  const selectedDeckCards = availableDeckCards.filter((dc) =>
    cardIds.includes(dc.cardId)
  );

  if (selectedDeckCards.length !== cardIds.length) {
    throw new Error('選択されたカードは利用できません');
  }

  const selectedCards = selectedDeckCards.map((dc) => dc.card as CardInfo);

  // Get a random predefined challenge for evaluation context
  // Note: This may be different from what was shown to the user, but evaluation still works
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

  // Transaction: Save phase result and update session
  const result = await prisma.$transaction(async (tx) => {
    // Create phase result
    const phaseResult = await tx.challengeSessionPhase.create({
      data: {
        sessionId,
        phaseNumber: currentPhase,
        challenge: `${challenge.situation}\n\n${challenge.challenge}`,
        selectedCardIds: cardIds,
        fitScore: evaluation.fitScore,
        bonusScore: evaluation.bonusScore,
        totalScore: phaseScore,
        aiCommentary,
      },
    });

    // Mark cards as used if phase consumes cards
    if (phaseDefinition.consumesCard) {
      await tx.challengeSessionCard.updateMany({
        where: {
          sessionId,
          cardId: { in: cardIds },
        },
        data: {
          isUsed: true,
          usedInPhase: currentPhase,
        },
      });
    }

    // Update session
    const nextPhase = currentPhase + 1;
    const isComplete = isScenarioComplete(session.scenarioId, nextPhase - 1);
    const newTotalScore = session.totalScore + phaseScore;

    const updatedSession = await tx.challengeSession.update({
      where: { id: sessionId },
      data: {
        currentPhase: isComplete ? currentPhase : nextPhase,
        totalScore: newTotalScore,
        status: isComplete ? 'completed' : 'in_progress',
        completedAt: isComplete ? new Date() : null,
      },
    });

    return {
      phaseResult,
      isComplete,
      newTotalScore,
      updatedSession,
    };
  });

  // Generate summary if complete
  let summary: string | undefined;
  if (result.isComplete) {
    const allPhases = await prisma.challengeSessionPhase.findMany({
      where: { sessionId },
      orderBy: { phaseNumber: 'asc' },
    });

    const phaseResults = allPhases.map((p) => {
      const phaseDef = getPhaseDefinition(session.scenarioId, p.phaseNumber);
      const cardKeywords = session.deckCards
        .filter((dc) => (p.selectedCardIds as string[]).includes(dc.cardId))
        .map((dc) => (dc.card as CardInfo).keyword);

      return {
        phaseTitle: phaseDef?.title || `Phase ${p.phaseNumber}`,
        cardKeywords,
        fitScore: p.fitScore,
      };
    });

    summary = await generateChallengeSummary(
      scenario.title,
      result.newTotalScore,
      phaseResults
    );
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
    sessionTotalScore: result.newTotalScore,
    isComplete: result.isComplete,
    summary,
  };
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

  await prisma.challengeSession.update({
    where: { id: sessionId },
    data: {
      status: 'abandoned',
      completedAt: new Date(),
    },
  });
}
