import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
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
  deserializeGameState,
  serializeGameState,
} from '@/lib/challenge/game-state';
import { evaluateCardSelection, generateChallengeSummary } from '@/lib/openai';
import {
  checkChallengeLimit,
  incrementChallengeCount,
  consumeCoins,
  hasEnoughCoins,
} from '@/lib/services/coin-service';
import { processAchievementRewards } from '@/lib/challenge/rewards';
import { ApiError } from '@/lib/errors';
import { SESSION_EXPIRATION_MS } from '@/lib/constants/challenge';
import type {
  ChallengeSessionStatus,
  ScenarioDefinition,
  PhaseDefinition,
} from '@/types/challenge';
import type { ChallengeSession } from '@prisma/client';
import type { Rarity } from '@/types/database';

/**
 * セッションが期限切れかチェック
 */
function isSessionExpired(session: ChallengeSession): boolean {
  return Date.now() - session.startedAt.getTime() > SESSION_EXPIRATION_MS;
}

/**
 * 期限切れセッションを削除
 */
async function deleteExpiredSession(sessionId: string): Promise<void> {
  try {
    await prisma.challengeSession.delete({ where: { id: sessionId } });
  } catch {
    // 既に削除済みの場合は無視
  }
}

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

// 選択されたカード情報
interface SelectedCard {
  id: string;
  keyword: string;
  rarity: Rarity;
  flavorText: string;
  contextDescription: string;
  thumbnailUrl: string;
  cardImageUrl: string;
}

// セッション完了時の報酬情報
interface CompletionRewards {
  summary: string;
  achievementRewards: { rank: string; coins: number; isNew: boolean }[];
  totalCoinsAwarded: number;
  isHighScore: boolean;
}

/**
 * カード提出用のセッション検証
 * - セッション存在・所有権確認
 * - 進行状況確認
 */
async function validateSessionForSubmit(
  sessionId: string,
  userId: string
): Promise<{ session: ChallengeSession; gameState: GameState; scenario: ScenarioDefinition }> {
  const session = await prisma.challengeSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.userId !== userId) {
    throw ApiError.notFound('セッションが見つかりません');
  }

  if (session.status === 'in_progress' && isSessionExpired(session)) {
    await deleteExpiredSession(session.id);
    throw ApiError.validation(
      'セッションの有効期限が切れました。新しいセッションを開始してください'
    );
  }

  if (session.status !== 'in_progress') {
    throw ApiError.validation('ゲームが進行中ではありません');
  }

  if (session.currentPhase === 0) {
    throw ApiError.validation('デッキを設定してください');
  }

  const scenario = getScenarioById(session.scenarioId);
  if (!scenario) {
    throw ApiError.notFound('シナリオが見つかりません');
  }

  const gameState = deserializeGameState(session.gameState);

  return { session, gameState, scenario };
}

/**
 * フェーズ提出の検証
 * - フェーズ定義の存在確認
 * - カード数の検証
 * - カードの利用可能性確認
 */
function validatePhaseSubmission(
  gameState: GameState,
  cardIds: string[],
  phaseDefinition: PhaseDefinition
): SelectedCard[] {
  // カード数検証
  if (cardIds.length !== phaseDefinition.cardCount) {
    throw ApiError.validation(`このフェーズでは${phaseDefinition.cardCount}枚のカードが必要です`);
  }

  // 利用可能なカード確認
  const availableDeckCards = gameState.deck.filter((dc) => !dc.isUsed);
  const selectedDeckCards = availableDeckCards.filter((dc) => cardIds.includes(dc.cardId));

  if (selectedDeckCards.length !== cardIds.length) {
    throw ApiError.validation('選択されたカードは利用できません');
  }

  return selectedDeckCards.map((dc) => ({
    id: dc.cardId,
    keyword: dc.keyword,
    rarity: dc.rarity,
    flavorText: dc.flavorText,
    contextDescription: dc.contextDescription,
    thumbnailUrl: dc.thumbnailUrl,
    cardImageUrl: dc.cardImageUrl,
  }));
}

/**
 * フェーズ結果オブジェクトを構築
 */
function buildPhaseResult(
  currentPhase: number,
  challenge: { situation: string; challenge: string },
  cardIds: string[],
  evaluation: {
    fitScore: number;
    bonusScore: number;
    narrativeDescription: string;
    humorComment: string;
  },
  phaseScore: number
): PhaseResult {
  const aiCommentary = `${evaluation.narrativeDescription}\n\n${evaluation.humorComment}`;

  return {
    phaseNumber: currentPhase,
    challenge: `${challenge.situation}\n\n${challenge.challenge}`,
    selectedCardIds: cardIds,
    fitScore: evaluation.fitScore,
    bonusScore: evaluation.bonusScore,
    totalScore: phaseScore,
    aiCommentary,
    completedAt: new Date().toISOString(),
  };
}

/**
 * ゲーム状態を更新
 */
function updateGameState(
  gameState: GameState,
  cardIds: string[],
  currentPhase: number,
  phaseDefinition: PhaseDefinition,
  newPhaseResult: PhaseResult,
  phaseScore: number
): GameState {
  const updatedDeck = gameState.deck.map((dc) => {
    if (phaseDefinition.consumesCard && cardIds.includes(dc.cardId)) {
      return { ...dc, isUsed: true, usedInPhase: currentPhase };
    }
    return dc;
  });

  return {
    deck: updatedDeck,
    phases: [...gameState.phases, newPhaseResult],
    totalScore: gameState.totalScore + phaseScore,
  };
}

/**
 * セッション完了処理
 * - ハイスコア更新
 * - 実績報酬処理
 * - サマリー生成
 */
async function processSessionCompletion(
  userId: string,
  sessionId: string,
  scenarioId: string,
  scenario: ScenarioDefinition,
  updatedGameState: GameState,
  newTotalScore: number
): Promise<CompletionRewards> {
  let isHighScore = false;

  // ハイスコア更新
  const existingHighScore = await prisma.challengeHighScore.findUnique({
    where: {
      userId_scenarioId: {
        userId,
        scenarioId,
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
        scenarioId,
        highScore: newTotalScore,
        bestRank,
        playCount: 1,
      },
    });
  }

  // 実績報酬処理
  const rewardResult = await processAchievementRewards(userId, scenarioId, newTotalScore);

  // サマリー生成
  const phaseResults = updatedGameState.phases.map((p) => {
    const phaseDef = getPhaseDefinition(scenarioId, p.phaseNumber);
    const cardKeywords = updatedGameState.deck
      .filter((dc) => p.selectedCardIds.includes(dc.cardId))
      .map((dc) => dc.keyword);

    return {
      phaseTitle: phaseDef?.title || `Phase ${p.phaseNumber}`,
      cardKeywords,
      fitScore: p.fitScore,
    };
  });

  const summary = await generateChallengeSummary(scenario.title, newTotalScore, phaseResults);

  // 非ハイスコア → セッション削除（データ肥大化防止）
  // ハイスコア → submitPhaseCardsで既にstatus:'completed'に更新済みのため不要
  if (!isHighScore) {
    await prisma.challengeSession.delete({
      where: { id: sessionId },
    });
  }

  return {
    summary,
    achievementRewards: rewardResult.achievements,
    totalCoinsAwarded: rewardResult.totalCoinsAwarded,
    isHighScore,
  };
}

/**
 * スコアからランクを取得
 */
function getRankFromScore(score: number): string {
  if (score >= 450) return 'S';
  if (score >= 350) return 'A';
  if (score >= 250) return 'B';
  return 'C';
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
    throw ApiError.notFound('シナリオが見つかりません');
  }

  // Check for existing in-progress session
  const existingSession = await prisma.challengeSession.findFirst({
    where: {
      userId,
      status: 'in_progress',
    },
  });

  if (existingSession) {
    // 期限切れなら自動削除して続行
    if (isSessionExpired(existingSession)) {
      await deleteExpiredSession(existingSession.id);
    } else {
      throw ApiError.validation(
        '進行中のセッションがあります。完了または中断してから新しいセッションを開始してください'
      );
    }
  }

  // Check challenge limit (charge is deferred to setSessionDeck)
  const challengeLimit = await checkChallengeLimit(userId);

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

  // 期限切れチェック（in_progress のみ）
  if (session.status === 'in_progress' && isSessionExpired(session)) {
    await deleteExpiredSession(session.id);
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
export async function getUserSessions(userId: string, status?: ChallengeSessionStatus, limit = 10) {
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

  // 期限切れセッションをフィルタ & バックグラウンド削除
  const expiredIds: string[] = [];
  const activeSessions = sessions.filter((s) => {
    if (s.status === 'in_progress' && isSessionExpired(s as unknown as ChallengeSession)) {
      expiredIds.push(s.id);
      return false;
    }
    return true;
  });

  // 期限切れセッションを非同期で削除（レスポンスを待たない）
  if (expiredIds.length > 0) {
    prisma.challengeSession
      .deleteMany({
        where: { id: { in: expiredIds } },
      })
      .catch((error) => {
        logger.warn('Failed to delete expired challenge sessions', { expiredIds, error });
      });
  }

  return activeSessions.map((s) => {
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
    throw ApiError.notFound('セッションが見つかりません');
  }

  if (session.status !== 'in_progress' || session.currentPhase !== 0) {
    throw ApiError.validation('デッキ編成は開始前のみ可能です');
  }

  const scenario = getScenarioById(session.scenarioId);
  if (!scenario) {
    throw ApiError.notFound('シナリオが見つかりません');
  }

  if (cardIds.length !== scenario.deckSize) {
    throw ApiError.validation(`デッキには${scenario.deckSize}枚のカードが必要です`);
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
    throw ApiError.validation('無効なカードが含まれています');
  }

  // Check for duplicates
  const uniqueIds = new Set(cardIds);
  if (uniqueIds.size !== cardIds.length) {
    throw ApiError.validation('重複するカードは選択できません');
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

  // チャレンジ回数チェック・消費（デッキ確定=チャレンジ開始時に課金）
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
    await consumeCoins(userId, challengeLimit.cost, `チャレンジモード参加: ${scenario.title}`);
  }
  await incrementChallengeCount(userId);

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
export async function getCurrentPhaseChallenge(sessionId: string, userId: string) {
  const session = await prisma.challengeSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.userId !== userId) {
    throw ApiError.notFound('セッションが見つかりません');
  }

  if (session.status === 'in_progress' && isSessionExpired(session)) {
    await deleteExpiredSession(session.id);
    throw ApiError.validation(
      'セッションの有効期限が切れました。新しいセッションを開始してください'
    );
  }

  if (session.status !== 'in_progress') {
    throw ApiError.validation('ゲームが進行中ではありません');
  }

  if (session.currentPhase === 0) {
    throw ApiError.validation('デッキを設定してください');
  }

  const scenario = getScenarioById(session.scenarioId);
  if (!scenario) {
    throw ApiError.notFound('シナリオが見つかりません');
  }

  const currentPhase = session.currentPhase;
  const phaseDefinition = getPhaseDefinition(session.scenarioId, currentPhase);
  if (!phaseDefinition) {
    throw ApiError.notFound('フェーズが見つかりません');
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
export async function submitPhaseCards(sessionId: string, userId: string, cardIds: string[]) {
  // 1. セッション検証
  const { session, gameState, scenario } = await validateSessionForSubmit(sessionId, userId);

  const currentPhase = session.currentPhase;
  const phaseDefinition = getPhaseDefinition(session.scenarioId, currentPhase);
  if (!phaseDefinition) {
    throw ApiError.notFound('フェーズが見つかりません');
  }

  // 2. フェーズ提出検証
  const selectedCards = validatePhaseSubmission(gameState, cardIds, phaseDefinition);

  // 3. チャレンジ取得・カード評価
  const challenge = getRandomChallenge(session.scenarioId, currentPhase);
  const evaluation = await evaluateCardSelection(
    challenge.situation,
    challenge.challenge,
    selectedCards,
    phaseDefinition.type
  );

  // 4. スコア計算
  const phaseScore = Math.round(
    (phaseDefinition.baseScore * evaluation.fitScore) / 100 + evaluation.bonusScore
  );

  // 5. フェーズ結果構築
  const newPhaseResult = buildPhaseResult(currentPhase, challenge, cardIds, evaluation, phaseScore);

  // 6. ゲーム状態更新
  const updatedGameState = updateGameState(
    gameState,
    cardIds,
    currentPhase,
    phaseDefinition,
    newPhaseResult,
    phaseScore
  );

  const newTotalScore = updatedGameState.totalScore;
  const nextPhase = currentPhase + 1;
  const isComplete = isScenarioComplete(session.scenarioId, nextPhase - 1);

  // 7. セッション更新
  await prisma.challengeSession.update({
    where: { id: sessionId },
    data: {
      currentPhase: isComplete ? currentPhase : nextPhase,
      status: isComplete ? 'completed' : 'in_progress',
      completedAt: isComplete ? new Date() : null,
      gameState: serializeGameState(updatedGameState),
    },
  });

  // 8. 完了処理（報酬・サマリー）
  let completionRewards: CompletionRewards | undefined;

  if (isComplete) {
    completionRewards = await processSessionCompletion(
      userId,
      sessionId,
      session.scenarioId,
      scenario,
      updatedGameState,
      newTotalScore
    );
  }

  // 9. レスポンス構築
  return {
    phaseNumber: currentPhase,
    challenge: `${challenge.situation}\n\n${challenge.challenge}`,
    selectedCards: selectedCards.map((c) => ({
      id: c.id,
      keyword: c.keyword,
      rarity: c.rarity,
      thumbnailUrl: c.thumbnailUrl,
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
    // 完了時のみ全フェーズ結果を含める（フロントエンドがfetchSession不要になる）
    phases: isComplete
      ? updatedGameState.phases.map((p) => ({
          phaseNumber: p.phaseNumber,
          fitScore: p.fitScore,
          bonusScore: p.bonusScore,
          totalScore: p.totalScore,
        }))
      : undefined,
    isHighScore: completionRewards?.isHighScore ?? false,
    summary: completionRewards?.summary,
    achievementRewards: completionRewards?.achievementRewards,
    totalCoinsAwarded: completionRewards?.totalCoinsAwarded ?? 0,
  };
}

/**
 * Abandon a session
 */
export async function abandonSession(sessionId: string, userId: string): Promise<void> {
  const session = await prisma.challengeSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.userId !== userId) {
    throw ApiError.notFound('セッションが見つかりません');
  }

  if (session.status === 'completed' || session.status === 'abandoned') {
    throw ApiError.validation('このセッションは既に終了しています');
  }

  // Delete the session instead of marking as abandoned
  await prisma.challengeSession.delete({
    where: { id: sessionId },
  });
}
