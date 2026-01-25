// Scenario definitions for Adventure Mode

import type { ScenarioDefinition, ScenarioListItem } from '@/types/adventure';

// Space Exploration scenario
export const SPACE_EXPLORATION_SCENARIO: ScenarioDefinition = {
  id: 'space_exploration',
  title: '宇宙探査ミッション',
  description:
    '人類初の深宇宙探査船「アルテミス号」の乗組員として、未知の銀河系を探索するミッションに挑戦しよう。様々な危機を乗り越え、無事に地球に帰還できるか？',
  icon: '🚀',
  difficulty: 'normal',
  deckSize: 6,
  totalPhases: 5,
  phases: [
    {
      phaseNumber: 1,
      title: '発射準備',
      description:
        '打ち上げ直前、予期せぬ問題が発生！あなたのカードの力で解決せよ。',
      type: 'single',
      cardCount: 1,
      consumesCard: false,
      baseScore: 100,
    },
    {
      phaseNumber: 2,
      title: '太陽フレア',
      description:
        '巨大な太陽フレアが宇宙船を直撃！電子機器が危険にさらされている。',
      type: 'single',
      cardCount: 1,
      consumesCard: true,
      baseScore: 150,
    },
    {
      phaseNumber: 3,
      title: 'エイリアン遭遇',
      description:
        '未知の知的生命体と遭遇！コミュニケーションを取り、敵意がないことを証明せよ。',
      type: 'combo',
      cardCount: 2,
      consumesCard: false,
      baseScore: 200,
    },
    {
      phaseNumber: 4,
      title: '資源不足',
      description:
        '燃料と食料が予想以上に消耗している。創意工夫で乗り切れ！',
      type: 'single',
      cardCount: 1,
      consumesCard: true,
      baseScore: 150,
    },
    {
      phaseNumber: 5,
      title: '帰還',
      description:
        '地球への帰還ルートで最後の障害が！ミッションを成功させ、英雄として帰還せよ。',
      type: 'single',
      cardCount: 1,
      consumesCard: false,
      baseScore: 200,
    },
  ],
};

// All available scenarios
export const SCENARIOS: ScenarioDefinition[] = [SPACE_EXPLORATION_SCENARIO];

// Scenario map for quick lookup
export const SCENARIO_MAP: Record<string, ScenarioDefinition> = {
  [SPACE_EXPLORATION_SCENARIO.id]: SPACE_EXPLORATION_SCENARIO,
};

/**
 * Get scenario by ID
 */
export function getScenarioById(id: string): ScenarioDefinition | undefined {
  return SCENARIO_MAP[id];
}

/**
 * Get scenario list for selection page
 */
export function getScenarioList(): ScenarioListItem[] {
  return SCENARIOS.map((scenario) => ({
    id: scenario.id,
    title: scenario.title,
    description: scenario.description,
    icon: scenario.icon,
    difficulty: scenario.difficulty,
    totalPhases: scenario.totalPhases,
    deckSize: scenario.deckSize,
    isAvailable: true, // Future: can be locked based on user progress
  }));
}

/**
 * Get phase definition by scenario ID and phase number
 */
export function getPhaseDefinition(scenarioId: string, phaseNumber: number) {
  const scenario = getScenarioById(scenarioId);
  if (!scenario) return undefined;
  return scenario.phases.find((p) => p.phaseNumber === phaseNumber);
}

/**
 * Check if the scenario is complete based on current phase
 */
export function isScenarioComplete(
  scenarioId: string,
  currentPhase: number
): boolean {
  const scenario = getScenarioById(scenarioId);
  if (!scenario) return false;
  return currentPhase >= scenario.totalPhases;
}
