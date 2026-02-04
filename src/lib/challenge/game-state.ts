import { Prisma } from '@prisma/client';
import type { Rarity } from '@/types/database';

/**
 * デッキ内のカード情報
 */
export interface DeckCard {
  cardId: string;
  keyword: string;
  rarity: Rarity;
  flavorText: string;
  contextDescription: string;
  thumbnailUrl: string;
  cardImageUrl: string;
  isUsed: boolean;
  usedInPhase: number | null;
}

/**
 * フェーズ結果
 */
export interface PhaseResult {
  phaseNumber: number;
  challenge: string;
  selectedCardIds: string[];
  fitScore: number;
  bonusScore: number;
  totalScore: number;
  aiCommentary: string;
  completedAt: string;
}

/**
 * ゲーム状態（JSONとして保存）
 */
export interface GameState {
  deck: DeckCard[];
  phases: PhaseResult[];
  totalScore: number;
}

/**
 * DeckCardの型ガード
 */
function isDeckCard(value: unknown): value is DeckCard {
  if (typeof value !== 'object' || value === null) return false;
  const card = value as Record<string, unknown>;
  return (
    typeof card.cardId === 'string' &&
    typeof card.keyword === 'string' &&
    typeof card.rarity === 'string' &&
    typeof card.flavorText === 'string' &&
    typeof card.contextDescription === 'string' &&
    typeof card.thumbnailUrl === 'string' &&
    typeof card.cardImageUrl === 'string' &&
    typeof card.isUsed === 'boolean' &&
    (card.usedInPhase === null || typeof card.usedInPhase === 'number')
  );
}

/**
 * PhaseResultの型ガード
 */
function isPhaseResult(value: unknown): value is PhaseResult {
  if (typeof value !== 'object' || value === null) return false;
  const phase = value as Record<string, unknown>;
  return (
    typeof phase.phaseNumber === 'number' &&
    typeof phase.challenge === 'string' &&
    Array.isArray(phase.selectedCardIds) &&
    typeof phase.fitScore === 'number' &&
    typeof phase.bonusScore === 'number' &&
    typeof phase.totalScore === 'number' &&
    typeof phase.aiCommentary === 'string' &&
    typeof phase.completedAt === 'string'
  );
}

/**
 * GameStateの型ガード
 */
export function isGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as Record<string, unknown>;
  return (
    Array.isArray(state.deck) &&
    state.deck.every(isDeckCard) &&
    Array.isArray(state.phases) &&
    state.phases.every(isPhaseResult) &&
    typeof state.totalScore === 'number'
  );
}

/**
 * 初期GameStateを作成
 */
export function createInitialGameState(deck: DeckCard[]): GameState {
  return {
    deck,
    phases: [],
    totalScore: 0,
  };
}

/**
 * PrismaのJSONからGameStateをデシリアライズ
 * 不正な場合はデフォルト値を返す
 */
export function deserializeGameState(raw: Prisma.JsonValue | null | undefined): GameState {
  if (!raw || !isGameState(raw)) {
    return createInitialGameState([]);
  }
  return raw;
}

/**
 * GameStateをPrismaのJSON形式にシリアライズ
 */
export function serializeGameState(state: GameState): Prisma.InputJsonValue {
  return state as unknown as Prisma.InputJsonValue;
}

/**
 * カードを使用済みにマーク
 */
export function markCardsAsUsed(
  state: GameState,
  cardIds: string[],
  phaseNumber: number
): GameState {
  return {
    ...state,
    deck: state.deck.map((card) =>
      cardIds.includes(card.cardId)
        ? { ...card, isUsed: true, usedInPhase: phaseNumber }
        : card
    ),
  };
}

/**
 * フェーズ結果を追加
 */
export function addPhaseResult(state: GameState, result: PhaseResult): GameState {
  return {
    ...state,
    phases: [...state.phases, result],
    totalScore: state.totalScore + result.totalScore,
  };
}

/**
 * 未使用カードを取得
 */
export function getAvailableCards(state: GameState): DeckCard[] {
  return state.deck.filter((card) => !card.isUsed);
}
