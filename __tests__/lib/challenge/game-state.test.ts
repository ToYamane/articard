// game-state.ts 純粋関数テスト

import {
  isGameState,
  createInitialGameState,
  deserializeGameState,
  serializeGameState,
  markCardsAsUsed,
  addPhaseResult,
  getAvailableCards,
} from '@/lib/challenge/game-state';
import type { DeckCard, PhaseResult, GameState } from '@/lib/challenge/game-state';

// テスト用デッキカードデータ
function createDeckCard(overrides: Partial<DeckCard> = {}): DeckCard {
  return {
    cardId: 'card-1',
    keyword: 'Quantum',
    rarity: 'rare',
    flavorText: 'A quantum leap forward',
    contextDescription: 'Quantum physics research',
    thumbnailUrl: 'https://example.com/thumb1.jpg',
    cardImageUrl: 'https://example.com/card1.jpg',
    isUsed: false,
    usedInPhase: null,
    ...overrides,
  };
}

function createPhaseResult(overrides: Partial<PhaseResult> = {}): PhaseResult {
  return {
    phaseNumber: 1,
    challenge: 'Solve the crisis',
    selectedCardIds: ['card-1'],
    fitScore: 80,
    bonusScore: 5,
    totalScore: 85,
    aiCommentary: 'Great use of the card!',
    completedAt: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

function createTestDeck(): DeckCard[] {
  return [
    createDeckCard({ cardId: 'card-1', keyword: 'Quantum' }),
    createDeckCard({ cardId: 'card-2', keyword: 'Gravity', rarity: 'common' }),
    createDeckCard({ cardId: 'card-3', keyword: 'Nebula', rarity: 'super_rare' }),
    createDeckCard({ cardId: 'card-4', keyword: 'Wormhole', rarity: 'legend' }),
    createDeckCard({ cardId: 'card-5', keyword: 'Relativity', rarity: 'common' }),
    createDeckCard({ cardId: 'card-6', keyword: 'Singularity', rarity: 'rare' }),
  ];
}

describe('game-state', () => {
  describe('isGameState', () => {
    it('有効なGameStateオブジェクトを認識する', () => {
      const state: GameState = {
        deck: [createDeckCard()],
        phases: [],
        totalScore: 0,
      };
      expect(isGameState(state)).toBe(true);
    });

    it('空のデッキと空のフェーズを認識する', () => {
      const state = { deck: [], phases: [], totalScore: 0 };
      expect(isGameState(state)).toBe(true);
    });

    it('フェーズ結果を含むStateを認識する', () => {
      const state: GameState = {
        deck: [createDeckCard()],
        phases: [createPhaseResult()],
        totalScore: 85,
      };
      expect(isGameState(state)).toBe(true);
    });

    it('使用済みカードを含むStateを認識する', () => {
      const state: GameState = {
        deck: [createDeckCard({ isUsed: true, usedInPhase: 1 })],
        phases: [],
        totalScore: 0,
      };
      expect(isGameState(state)).toBe(true);
    });

    it('nullを拒否する', () => {
      expect(isGameState(null)).toBe(false);
    });

    it('undefinedを拒否する', () => {
      expect(isGameState(undefined)).toBe(false);
    });

    it('文字列を拒否する', () => {
      expect(isGameState('not a state')).toBe(false);
    });

    it('数値を拒否する', () => {
      expect(isGameState(42)).toBe(false);
    });

    it('deckが配列でない場合を拒否する', () => {
      expect(isGameState({ deck: 'not array', phases: [], totalScore: 0 })).toBe(false);
    });

    it('phasesが配列でない場合を拒否する', () => {
      expect(isGameState({ deck: [], phases: 'not array', totalScore: 0 })).toBe(false);
    });

    it('totalScoreが数値でない場合を拒否する', () => {
      expect(isGameState({ deck: [], phases: [], totalScore: '0' })).toBe(false);
    });

    it('不正なカードオブジェクトを含むdeckを拒否する', () => {
      const state = {
        deck: [{ cardId: 'card-1' }], // 不完全なカード
        phases: [],
        totalScore: 0,
      };
      expect(isGameState(state)).toBe(false);
    });

    it('不正なフェーズ結果を含む場合を拒否する', () => {
      const state = {
        deck: [],
        phases: [{ phaseNumber: 1 }], // 不完全なフェーズ
        totalScore: 0,
      };
      expect(isGameState(state)).toBe(false);
    });
  });

  describe('createInitialGameState', () => {
    it('デッキ付きの初期状態を作成する', () => {
      const deck = createTestDeck();
      const state = createInitialGameState(deck);

      expect(state.deck).toEqual(deck);
      expect(state.deck).toHaveLength(6);
      expect(state.phases).toEqual([]);
      expect(state.totalScore).toBe(0);
    });

    it('空のデッキでも初期状態を作成できる', () => {
      const state = createInitialGameState([]);

      expect(state.deck).toEqual([]);
      expect(state.phases).toEqual([]);
      expect(state.totalScore).toBe(0);
    });

    it('作成されたGameStateがisGameStateで有効と認識される', () => {
      const deck = [createDeckCard()];
      const state = createInitialGameState(deck);
      expect(isGameState(state)).toBe(true);
    });
  });

  describe('deserializeGameState', () => {
    it('有効なJSONからGameStateを復元する', () => {
      const raw = {
        deck: [createDeckCard()],
        phases: [createPhaseResult()],
        totalScore: 85,
      };
      const state = deserializeGameState(raw as unknown as import('@prisma/client').Prisma.JsonValue);

      expect(state.deck).toHaveLength(1);
      expect(state.phases).toHaveLength(1);
      expect(state.totalScore).toBe(85);
    });

    it('nullの場合はデフォルトの空状態を返す', () => {
      const state = deserializeGameState(null);

      expect(state.deck).toEqual([]);
      expect(state.phases).toEqual([]);
      expect(state.totalScore).toBe(0);
    });

    it('undefinedの場合はデフォルトの空状態を返す', () => {
      const state = deserializeGameState(undefined);

      expect(state.deck).toEqual([]);
      expect(state.phases).toEqual([]);
      expect(state.totalScore).toBe(0);
    });

    it('不正なデータの場合はデフォルトの空状態を返す', () => {
      const state = deserializeGameState('invalid' as unknown as null);

      expect(state.deck).toEqual([]);
      expect(state.phases).toEqual([]);
      expect(state.totalScore).toBe(0);
    });

    it('不完全なオブジェクトの場合はデフォルトの空状態を返す', () => {
      const state = deserializeGameState({ deck: [] } as unknown as null);

      expect(state.deck).toEqual([]);
      expect(state.phases).toEqual([]);
      expect(state.totalScore).toBe(0);
    });
  });

  describe('serializeGameState', () => {
    it('GameStateをJSON形式にシリアライズする', () => {
      const state: GameState = {
        deck: [createDeckCard()],
        phases: [createPhaseResult()],
        totalScore: 85,
      };
      const serialized = serializeGameState(state);

      // Prisma InputJsonValueとして扱える
      expect(serialized).toBeDefined();
      expect((serialized as unknown as GameState).deck).toEqual(state.deck);
      expect((serialized as unknown as GameState).phases).toEqual(state.phases);
      expect((serialized as unknown as GameState).totalScore).toBe(85);
    });

    it('シリアライズとデシリアライズが可逆的である', () => {
      const original: GameState = {
        deck: createTestDeck(),
        phases: [createPhaseResult()],
        totalScore: 85,
      };
      const serialized = serializeGameState(original);
      const deserialized = deserializeGameState(serialized as unknown as import('@prisma/client').Prisma.JsonValue);

      expect(deserialized).toEqual(original);
    });
  });

  describe('markCardsAsUsed', () => {
    it('指定されたカードを使用済みにマークする', () => {
      const deck = createTestDeck();
      const state = createInitialGameState(deck);

      const updated = markCardsAsUsed(state, ['card-1'], 1);

      const card1 = updated.deck.find(c => c.cardId === 'card-1');
      expect(card1?.isUsed).toBe(true);
      expect(card1?.usedInPhase).toBe(1);
    });

    it('指定されていないカードは変更しない', () => {
      const deck = createTestDeck();
      const state = createInitialGameState(deck);

      const updated = markCardsAsUsed(state, ['card-1'], 1);

      const card2 = updated.deck.find(c => c.cardId === 'card-2');
      expect(card2?.isUsed).toBe(false);
      expect(card2?.usedInPhase).toBeNull();
    });

    it('複数のカードを同時に使用済みにできる', () => {
      const deck = createTestDeck();
      const state = createInitialGameState(deck);

      const updated = markCardsAsUsed(state, ['card-1', 'card-3'], 2);

      const card1 = updated.deck.find(c => c.cardId === 'card-1');
      const card3 = updated.deck.find(c => c.cardId === 'card-3');
      expect(card1?.isUsed).toBe(true);
      expect(card1?.usedInPhase).toBe(2);
      expect(card3?.isUsed).toBe(true);
      expect(card3?.usedInPhase).toBe(2);
    });

    it('元のstateを変更しない（イミュータブル）', () => {
      const deck = createTestDeck();
      const state = createInitialGameState(deck);

      markCardsAsUsed(state, ['card-1'], 1);

      const originalCard = state.deck.find(c => c.cardId === 'card-1');
      expect(originalCard?.isUsed).toBe(false);
      expect(originalCard?.usedInPhase).toBeNull();
    });

    it('存在しないカードIDは無視される', () => {
      const deck = createTestDeck();
      const state = createInitialGameState(deck);

      const updated = markCardsAsUsed(state, ['nonexistent-card'], 1);

      expect(updated.deck.every(c => !c.isUsed)).toBe(true);
    });
  });

  describe('addPhaseResult', () => {
    it('フェーズ結果を追加する', () => {
      const state = createInitialGameState(createTestDeck());
      const result = createPhaseResult();

      const updated = addPhaseResult(state, result);

      expect(updated.phases).toHaveLength(1);
      expect(updated.phases[0]).toEqual(result);
    });

    it('totalScoreが加算される', () => {
      const state = createInitialGameState(createTestDeck());
      const result = createPhaseResult({ totalScore: 85 });

      const updated = addPhaseResult(state, result);

      expect(updated.totalScore).toBe(85);
    });

    it('複数フェーズの結果を累積できる', () => {
      let state = createInitialGameState(createTestDeck());

      state = addPhaseResult(state, createPhaseResult({ phaseNumber: 1, totalScore: 85 }));
      state = addPhaseResult(state, createPhaseResult({ phaseNumber: 2, totalScore: 70 }));
      state = addPhaseResult(state, createPhaseResult({ phaseNumber: 3, totalScore: 90 }));

      expect(state.phases).toHaveLength(3);
      expect(state.totalScore).toBe(245);
    });

    it('元のstateを変更しない（イミュータブル）', () => {
      const state = createInitialGameState(createTestDeck());
      const result = createPhaseResult();

      addPhaseResult(state, result);

      expect(state.phases).toHaveLength(0);
      expect(state.totalScore).toBe(0);
    });

    it('スコアが0のフェーズ結果も追加できる', () => {
      const state = createInitialGameState(createTestDeck());
      const result = createPhaseResult({ fitScore: 0, bonusScore: 0, totalScore: 0 });

      const updated = addPhaseResult(state, result);

      expect(updated.phases).toHaveLength(1);
      expect(updated.totalScore).toBe(0);
    });
  });

  describe('getAvailableCards', () => {
    it('全てのカードが未使用の場合、全てを返す', () => {
      const deck = createTestDeck();
      const state = createInitialGameState(deck);

      const available = getAvailableCards(state);

      expect(available).toHaveLength(6);
    });

    it('使用済みカードをフィルタリングする', () => {
      const deck = createTestDeck();
      const state = createInitialGameState(deck);
      const updated = markCardsAsUsed(state, ['card-1', 'card-3'], 1);

      const available = getAvailableCards(updated);

      expect(available).toHaveLength(4);
      expect(available.find(c => c.cardId === 'card-1')).toBeUndefined();
      expect(available.find(c => c.cardId === 'card-3')).toBeUndefined();
    });

    it('全てのカードが使用済みの場合、空配列を返す', () => {
      const deck = createTestDeck();
      let state = createInitialGameState(deck);
      state = markCardsAsUsed(state, deck.map(c => c.cardId), 1);

      const available = getAvailableCards(state);

      expect(available).toHaveLength(0);
    });

    it('空のデッキの場合、空配列を返す', () => {
      const state = createInitialGameState([]);

      const available = getAvailableCards(state);

      expect(available).toHaveLength(0);
    });
  });

  describe('統合テスト: ゲームフロー', () => {
    it('完全なゲームフローをシミュレートする', () => {
      // Phase 1: 初期デッキ作成
      const deck = createTestDeck();
      let state = createInitialGameState(deck);
      expect(getAvailableCards(state)).toHaveLength(6);

      // Phase 2: カードを使用してフェーズ完了
      state = markCardsAsUsed(state, ['card-1'], 1);
      state = addPhaseResult(state, createPhaseResult({
        phaseNumber: 1,
        selectedCardIds: ['card-1'],
        totalScore: 85,
      }));
      expect(getAvailableCards(state)).toHaveLength(5);
      expect(state.totalScore).toBe(85);

      // Phase 3: コンボフェーズ（2枚使用）
      state = markCardsAsUsed(state, ['card-2', 'card-3'], 2);
      state = addPhaseResult(state, createPhaseResult({
        phaseNumber: 2,
        selectedCardIds: ['card-2', 'card-3'],
        totalScore: 70,
      }));
      expect(getAvailableCards(state)).toHaveLength(3);
      expect(state.totalScore).toBe(155);

      // シリアライズ・デシリアライズ後も状態が維持される
      const serialized = serializeGameState(state);
      const restored = deserializeGameState(serialized as unknown as import('@prisma/client').Prisma.JsonValue);
      expect(restored).toEqual(state);
      expect(isGameState(restored)).toBe(true);
    });
  });
});
