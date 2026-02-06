// scenarios.ts 純粋関数テスト

import {
  SCENARIOS,
  SCENARIO_MAP,
  getScenarioById,
  getScenarioList,
  getPhaseDefinition,
  isScenarioComplete,
  getScoreRank,
  SPACE_EXPLORATION_SCENARIO,
  TIME_TRAVEL_SCENARIO,
  AI_REBELLION_SCENARIO,
  DEMON_LORD_SCENARIO,
  DESERT_ISLAND_SCENARIO,
  SCHOOL_FESTIVAL_SCENARIO,
} from '@/lib/challenge/scenarios';

describe('scenarios', () => {
  describe('シナリオ定義', () => {
    it('6つのシナリオが定義されている', () => {
      expect(SCENARIOS).toHaveLength(6);
    });

    it('全てのシナリオIDがユニークである', () => {
      const ids = SCENARIOS.map(s => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('SCENARIO_MAPに全シナリオが登録されている', () => {
      expect(Object.keys(SCENARIO_MAP)).toHaveLength(6);
      for (const scenario of SCENARIOS) {
        expect(SCENARIO_MAP[scenario.id]).toBe(scenario);
      }
    });

    it.each([
      ['space_exploration', SPACE_EXPLORATION_SCENARIO],
      ['time_travel', TIME_TRAVEL_SCENARIO],
      ['ai_rebellion', AI_REBELLION_SCENARIO],
      ['demon_lord', DEMON_LORD_SCENARIO],
      ['desert_island', DESERT_ISLAND_SCENARIO],
      ['school_festival', SCHOOL_FESTIVAL_SCENARIO],
    ])('シナリオ"%s"が正しいIDを持つ', (id, scenario) => {
      expect(scenario.id).toBe(id);
    });

    it('全てのシナリオが必須フィールドを持つ', () => {
      for (const scenario of SCENARIOS) {
        expect(scenario.id).toBeDefined();
        expect(scenario.title).toBeDefined();
        expect(scenario.description).toBeDefined();
        expect(scenario.icon).toBeDefined();
        expect(scenario.difficulty).toBeDefined();
        expect(scenario.deckSize).toBeGreaterThan(0);
        expect(scenario.totalPhases).toBeGreaterThan(0);
        expect(scenario.phases).toHaveLength(scenario.totalPhases);
      }
    });

    it('全フェーズが連番のphaseNumberを持つ', () => {
      for (const scenario of SCENARIOS) {
        scenario.phases.forEach((phase, index) => {
          expect(phase.phaseNumber).toBe(index + 1);
        });
      }
    });

    it('全フェーズが有効なtypeを持つ', () => {
      const validTypes = ['single', 'combo', 'triple'];
      for (const scenario of SCENARIOS) {
        for (const phase of scenario.phases) {
          expect(validTypes).toContain(phase.type);
        }
      }
    });

    it('全フェーズのcardCountがtypeに整合する', () => {
      for (const scenario of SCENARIOS) {
        for (const phase of scenario.phases) {
          if (phase.type === 'single') expect(phase.cardCount).toBe(1);
          if (phase.type === 'combo') expect(phase.cardCount).toBe(2);
          if (phase.type === 'triple') expect(phase.cardCount).toBe(3);
        }
      }
    });

    it('難易度が正しく設定されている', () => {
      expect(SPACE_EXPLORATION_SCENARIO.difficulty).toBe('normal');
      expect(TIME_TRAVEL_SCENARIO.difficulty).toBe('easy');
      expect(AI_REBELLION_SCENARIO.difficulty).toBe('hard');
      expect(DEMON_LORD_SCENARIO.difficulty).toBe('hard');
      expect(DESERT_ISLAND_SCENARIO.difficulty).toBe('normal');
      expect(SCHOOL_FESTIVAL_SCENARIO.difficulty).toBe('easy');
    });

    it('デッキサイズが難易度に応じて設定されている', () => {
      // easy: 5, normal: 6, hard: 7
      expect(TIME_TRAVEL_SCENARIO.deckSize).toBe(5);
      expect(SCHOOL_FESTIVAL_SCENARIO.deckSize).toBe(5);
      expect(SPACE_EXPLORATION_SCENARIO.deckSize).toBe(6);
      expect(DESERT_ISLAND_SCENARIO.deckSize).toBe(6);
      expect(AI_REBELLION_SCENARIO.deckSize).toBe(7);
      expect(DEMON_LORD_SCENARIO.deckSize).toBe(7);
    });
  });

  describe('getScenarioById', () => {
    it('存在するシナリオIDで正しいシナリオを返す', () => {
      const scenario = getScenarioById('space_exploration');
      expect(scenario).toBe(SPACE_EXPLORATION_SCENARIO);
      expect(scenario?.title).toBe('宇宙探査ミッション');
    });

    it('全てのシナリオIDで取得できる', () => {
      for (const scenario of SCENARIOS) {
        expect(getScenarioById(scenario.id)).toBe(scenario);
      }
    });

    it('存在しないIDの場合undefinedを返す', () => {
      expect(getScenarioById('nonexistent')).toBeUndefined();
    });

    it('空文字列の場合undefinedを返す', () => {
      expect(getScenarioById('')).toBeUndefined();
    });
  });

  describe('getScenarioList', () => {
    it('全シナリオのリストアイテムを返す', () => {
      const list = getScenarioList();
      expect(list).toHaveLength(6);
    });

    it('リストアイテムが必須フィールドを持つ', () => {
      const list = getScenarioList();
      for (const item of list) {
        expect(item.id).toBeDefined();
        expect(item.title).toBeDefined();
        expect(item.description).toBeDefined();
        expect(item.icon).toBeDefined();
        expect(item.difficulty).toBeDefined();
        expect(item.totalPhases).toBeGreaterThan(0);
        expect(item.deckSize).toBeGreaterThan(0);
        expect(item.isAvailable).toBe(true);
      }
    });

    it('シナリオの順序がSCENARIOS配列と一致する', () => {
      const list = getScenarioList();
      for (let i = 0; i < SCENARIOS.length; i++) {
        expect(list[i].id).toBe(SCENARIOS[i].id);
      }
    });
  });

  describe('getPhaseDefinition', () => {
    it('存在するシナリオとフェーズ番号で正しいフェーズを返す', () => {
      const phase = getPhaseDefinition('space_exploration', 1);
      expect(phase).toBeDefined();
      expect(phase?.phaseNumber).toBe(1);
      expect(phase?.title).toBe('発射準備');
    });

    it('最後のフェーズを取得できる', () => {
      const phase = getPhaseDefinition('space_exploration', 5);
      expect(phase).toBeDefined();
      expect(phase?.phaseNumber).toBe(5);
      expect(phase?.title).toBe('帰還');
    });

    it('存在しないシナリオIDの場合undefinedを返す', () => {
      const phase = getPhaseDefinition('nonexistent', 1);
      expect(phase).toBeUndefined();
    });

    it('存在しないフェーズ番号の場合undefinedを返す', () => {
      const phase = getPhaseDefinition('space_exploration', 99);
      expect(phase).toBeUndefined();
    });

    it('フェーズ番号0の場合undefinedを返す', () => {
      const phase = getPhaseDefinition('space_exploration', 0);
      expect(phase).toBeUndefined();
    });

    it('各シナリオの全フェーズを取得できる', () => {
      for (const scenario of SCENARIOS) {
        for (let i = 1; i <= scenario.totalPhases; i++) {
          const phase = getPhaseDefinition(scenario.id, i);
          expect(phase).toBeDefined();
          expect(phase?.phaseNumber).toBe(i);
        }
      }
    });
  });

  describe('isScenarioComplete', () => {
    it('現在のフェーズがtotalPhases以上の場合trueを返す', () => {
      expect(isScenarioComplete('space_exploration', 5)).toBe(true);
    });

    it('現在のフェーズがtotalPhasesを超えている場合もtrueを返す', () => {
      expect(isScenarioComplete('space_exploration', 10)).toBe(true);
    });

    it('現在のフェーズがtotalPhases未満の場合falseを返す', () => {
      expect(isScenarioComplete('space_exploration', 4)).toBe(false);
    });

    it('フェーズ0（未開始）の場合falseを返す', () => {
      expect(isScenarioComplete('space_exploration', 0)).toBe(false);
    });

    it('存在しないシナリオの場合falseを返す', () => {
      expect(isScenarioComplete('nonexistent', 5)).toBe(false);
    });

    it('各シナリオのtotalPhasesで完了判定される', () => {
      for (const scenario of SCENARIOS) {
        expect(isScenarioComplete(scenario.id, scenario.totalPhases)).toBe(true);
        expect(isScenarioComplete(scenario.id, scenario.totalPhases - 1)).toBe(false);
      }
    });
  });

  describe('getScoreRank', () => {
    it('450以上でSランクを返す', () => {
      const result = getScoreRank(450);
      expect(result.rank).toBe('S');
      expect(result.emoji).toBe('🏆');
    });

    it('500でもSランクを返す', () => {
      expect(getScoreRank(500).rank).toBe('S');
    });

    it('350-449でAランクを返す', () => {
      expect(getScoreRank(350).rank).toBe('A');
      expect(getScoreRank(350).emoji).toBe('🌟');
      expect(getScoreRank(449).rank).toBe('A');
    });

    it('250-349でBランクを返す', () => {
      expect(getScoreRank(250).rank).toBe('B');
      expect(getScoreRank(250).emoji).toBe('👍');
      expect(getScoreRank(349).rank).toBe('B');
    });

    it('250未満でCランクを返す', () => {
      expect(getScoreRank(249).rank).toBe('C');
      expect(getScoreRank(249).emoji).toBe('💪');
      expect(getScoreRank(0).rank).toBe('C');
    });

    it('各ランクにcolorが設定されている', () => {
      expect(getScoreRank(500).color).toBe('text-yellow-500');
      expect(getScoreRank(400).color).toBe('text-purple-500');
      expect(getScoreRank(300).color).toBe('text-blue-500');
      expect(getScoreRank(100).color).toBe('text-green-500');
    });

    it('境界値が正しく処理される', () => {
      // 正確な閾値のテスト
      expect(getScoreRank(449).rank).toBe('A');
      expect(getScoreRank(450).rank).toBe('S');
      expect(getScoreRank(349).rank).toBe('B');
      expect(getScoreRank(350).rank).toBe('A');
      expect(getScoreRank(249).rank).toBe('C');
      expect(getScoreRank(250).rank).toBe('B');
    });
  });
});
