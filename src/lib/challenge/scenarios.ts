// Scenario definitions for Challenge Mode

import type { ScenarioDefinition, ScenarioListItem } from '@/types/challenge';

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
      baseScore: 100,
    },
    {
      phaseNumber: 3,
      title: 'エイリアン遭遇',
      description:
        '未知の知的生命体と遭遇！コミュニケーションを取り、敵意がないことを証明せよ。',
      type: 'combo',
      cardCount: 2,
      consumesCard: false,
      baseScore: 100,
    },
    {
      phaseNumber: 4,
      title: '資源不足',
      description:
        '燃料と食料が予想以上に消耗している。創意工夫で乗り切れ！',
      type: 'single',
      cardCount: 1,
      consumesCard: true,
      baseScore: 100,
    },
    {
      phaseNumber: 5,
      title: '帰還',
      description:
        '地球への帰還ルートで最後の障害が！ミッションを成功させ、英雄として帰還せよ。',
      type: 'single',
      cardCount: 1,
      consumesCard: false,
      baseScore: 100,
    },
  ],
};

// Time Travel scenario
export const TIME_TRAVEL_SCENARIO: ScenarioDefinition = {
  id: 'time_travel',
  title: 'タイムトラベル大作戦',
  description:
    '時空を超える冒険へ出発！過去と未来を行き来しながら、歴史の危機を救い、タイムパラドックスを回避して現代に帰還せよ。',
  icon: '⏰',
  difficulty: 'easy',
  deckSize: 5,
  totalPhases: 5,
  phases: [
    {
      phaseNumber: 1,
      title: '出発準備',
      description:
        'タイムマシンの調整中にトラブル発生！出発前に解決しなければならない。',
      type: 'single',
      cardCount: 1,
      consumesCard: false,
      baseScore: 100,
    },
    {
      phaseNumber: 2,
      title: '過去への到着',
      description:
        '目的の時代に到着したが、予期せぬ事態が待ち受けていた。',
      type: 'single',
      cardCount: 1,
      consumesCard: false,
      baseScore: 100,
    },
    {
      phaseNumber: 3,
      title: '歴史への介入',
      description:
        '歴史を変えるべきか、守るべきか。重大な選択を迫られている。',
      type: 'combo',
      cardCount: 2,
      consumesCard: false,
      baseScore: 100,
    },
    {
      phaseNumber: 4,
      title: 'タイムパラドックス',
      description:
        '時間の矛盾が発生！タイムラインを修復しなければ、存在が消えてしまう。',
      type: 'single',
      cardCount: 1,
      consumesCard: true,
      baseScore: 100,
    },
    {
      phaseNumber: 5,
      title: '現代への帰還',
      description:
        '最後の試練を乗り越え、無事に現代へ帰還せよ。',
      type: 'single',
      cardCount: 1,
      consumesCard: false,
      baseScore: 100,
    },
  ],
};

// AI Rebellion scenario
export const AI_REBELLION_SCENARIO: ScenarioDefinition = {
  id: 'ai_rebellion',
  title: 'AI反乱鎮圧作戦',
  description:
    '高度に発達したAIが人類に反旗を翻した！暴走するAIの中枢に潜入し、人類の未来を守るための戦いに挑め。',
  icon: '🤖',
  difficulty: 'hard',
  deckSize: 7,
  totalPhases: 5,
  phases: [
    {
      phaseNumber: 1,
      title: '異常検知',
      description:
        'AIシステムに異常な兆候が検出された。原因を突き止めなければならない。',
      type: 'single',
      cardCount: 1,
      consumesCard: false,
      baseScore: 100,
    },
    {
      phaseNumber: 2,
      title: 'システム侵入',
      description:
        'AIが都市インフラを掌握し始めた！内部からの攻撃に対処せよ。',
      type: 'single',
      cardCount: 1,
      consumesCard: true,
      baseScore: 100,
    },
    {
      phaseNumber: 3,
      title: '人質救出',
      description:
        'AIに捕らわれた仲間を救出せよ。監視の目をかいくぐり、救出作戦を実行！',
      type: 'combo',
      cardCount: 2,
      consumesCard: true,
      baseScore: 100,
    },
    {
      phaseNumber: 4,
      title: 'コア突入',
      description:
        'AIの中枢へ突入！強固なセキュリティを突破しなければならない。',
      type: 'single',
      cardCount: 1,
      consumesCard: true,
      baseScore: 100,
    },
    {
      phaseNumber: 5,
      title: '最終決戦',
      description:
        'AIとの最終対決。対話で解決するか、力で制圧するか。人類の未来がかかっている。',
      type: 'triple',
      cardCount: 3,
      consumesCard: false,
      baseScore: 100,
    },
  ],
};

// Demon Lord scenario
export const DEMON_LORD_SCENARIO: ScenarioDefinition = {
  id: 'demon_lord',
  title: '魔王討伐の旅',
  description:
    '平和な村を脅かす魔王を討伐するため、勇者として冒険の旅に出発！仲間を集め、試練を乗り越え、魔王城での最終決戦に挑め。',
  icon: '⚔️',
  difficulty: 'hard',
  deckSize: 7,
  totalPhases: 5,
  phases: [
    {
      phaseNumber: 1,
      title: '旅立ちの準備',
      description:
        '村を出発する前の準備。長い旅に備えて必要なものを揃えよう。',
      type: 'single',
      cardCount: 1,
      consumesCard: false,
      baseScore: 100,
    },
    {
      phaseNumber: 2,
      title: '森の試練',
      description:
        '魔物が棲む深い森を抜けなければならない。知恵と勇気で道を切り開け！',
      type: 'combo',
      cardCount: 2,
      consumesCard: true,
      baseScore: 100,
    },
    {
      phaseNumber: 3,
      title: '仲間との出会い',
      description:
        '頼れる仲間を見つけ、パーティを結成せよ。一人では魔王には勝てない！',
      type: 'combo',
      cardCount: 2,
      consumesCard: false,
      baseScore: 100,
    },
    {
      phaseNumber: 4,
      title: '魔王城突入',
      description:
        '魔王城に潜入せよ。数々の罠と魔物が待ち受けている！',
      type: 'single',
      cardCount: 1,
      consumesCard: true,
      baseScore: 100,
    },
    {
      phaseNumber: 5,
      title: '魔王との対決',
      description:
        'ついに魔王との最終決戦！全ての力を結集して世界を救え！',
      type: 'triple',
      cardCount: 3,
      consumesCard: false,
      baseScore: 100,
    },
  ],
};

// Desert Island scenario
export const DESERT_ISLAND_SCENARIO: ScenarioDefinition = {
  id: 'desert_island',
  title: '無人島サバイバル',
  description:
    '船の事故で無人島に漂着！限られた資源で生き延び、脱出の方法を見つけ出せ。自然との戦いが今始まる。',
  icon: '🏝️',
  difficulty: 'normal',
  deckSize: 6,
  totalPhases: 5,
  phases: [
    {
      phaseNumber: 1,
      title: '漂着',
      description:
        '無人島に流れ着いた直後。まずは状況を把握し、生存に必要なものを探せ！',
      type: 'single',
      cardCount: 1,
      consumesCard: false,
      baseScore: 100,
    },
    {
      phaseNumber: 2,
      title: 'シェルター作り',
      description:
        '夜を越すための寝床と安全な場所を確保せよ。野生動物や天候から身を守れ！',
      type: 'single',
      cardCount: 1,
      consumesCard: true,
      baseScore: 100,
    },
    {
      phaseNumber: 3,
      title: '食料確保',
      description:
        '飢えをしのぐため、食料と水を確保せよ。島の資源を最大限に活用しろ！',
      type: 'combo',
      cardCount: 2,
      consumesCard: false,
      baseScore: 100,
    },
    {
      phaseNumber: 4,
      title: '救助信号',
      description:
        '助けを求める方法を探せ！目立つ信号を作り、救助隊の目に留まるようにしろ！',
      type: 'single',
      cardCount: 1,
      consumesCard: true,
      baseScore: 100,
    },
    {
      phaseNumber: 5,
      title: '脱出',
      description:
        '島からの脱出を試みよ！船を作るか、救助を待つか、最後の決断の時だ！',
      type: 'combo',
      cardCount: 2,
      consumesCard: false,
      baseScore: 100,
    },
  ],
};

// School Festival scenario
export const SCHOOL_FESTIVAL_SCENARIO: ScenarioDefinition = {
  id: 'school_festival',
  title: '文化祭大作戦',
  description:
    '待ちに待った文化祭！クラスの出し物を成功させるため、企画から当日まで全力で取り組め。最高の思い出を作ろう！',
  icon: '🎪',
  difficulty: 'easy',
  deckSize: 5,
  totalPhases: 5,
  phases: [
    {
      phaseNumber: 1,
      title: '企画会議',
      description:
        'クラスの出し物を決める会議。みんなの意見をまとめて、最高の企画を立てよう！',
      type: 'single',
      cardCount: 1,
      consumesCard: false,
      baseScore: 100,
    },
    {
      phaseNumber: 2,
      title: '準備開始',
      description:
        '材料集めと制作開始！時間との戦いの中、協力して準備を進めよう！',
      type: 'single',
      cardCount: 1,
      consumesCard: false,
      baseScore: 100,
    },
    {
      phaseNumber: 3,
      title: 'トラブル発生',
      description:
        '予想外の問題が発生！材料不足？メンバーの対立？冷静に対処せよ！',
      type: 'single',
      cardCount: 1,
      consumesCard: true,
      baseScore: 100,
    },
    {
      phaseNumber: 4,
      title: '当日の朝',
      description:
        'いよいよ文化祭当日！最終調整と仕上げで、完璧な状態にしよう！',
      type: 'single',
      cardCount: 1,
      consumesCard: false,
      baseScore: 100,
    },
    {
      phaseNumber: 5,
      title: '本番',
      description:
        'お客さんを楽しませる本番の時！全力でパフォーマンスを披露しよう！',
      type: 'combo',
      cardCount: 2,
      consumesCard: false,
      baseScore: 100,
    },
  ],
};

// All available scenarios
export const SCENARIOS: ScenarioDefinition[] = [
  SPACE_EXPLORATION_SCENARIO,
  TIME_TRAVEL_SCENARIO,
  AI_REBELLION_SCENARIO,
  DEMON_LORD_SCENARIO,
  DESERT_ISLAND_SCENARIO,
  SCHOOL_FESTIVAL_SCENARIO,
];

// Scenario map for quick lookup
export const SCENARIO_MAP: Record<string, ScenarioDefinition> = {
  [SPACE_EXPLORATION_SCENARIO.id]: SPACE_EXPLORATION_SCENARIO,
  [TIME_TRAVEL_SCENARIO.id]: TIME_TRAVEL_SCENARIO,
  [AI_REBELLION_SCENARIO.id]: AI_REBELLION_SCENARIO,
  [DEMON_LORD_SCENARIO.id]: DEMON_LORD_SCENARIO,
  [DESERT_ISLAND_SCENARIO.id]: DESERT_ISLAND_SCENARIO,
  [SCHOOL_FESTIVAL_SCENARIO.id]: SCHOOL_FESTIVAL_SCENARIO,
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

/**
 * Get score rank based on total score
 */
export function getScoreRank(score: number): {
  rank: string;
  emoji: string;
  color: string;
} {
  if (score >= 450) return { rank: 'S', emoji: '🏆', color: 'text-yellow-500' };
  if (score >= 350) return { rank: 'A', emoji: '🌟', color: 'text-purple-500' };
  if (score >= 250) return { rank: 'B', emoji: '👍', color: 'text-blue-500' };
  return { rank: 'C', emoji: '💪', color: 'text-green-500' };
}
