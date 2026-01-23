// Database types for Articard

export type Rarity = 'common' | 'uncommon' | 'rare' | 'super_rare' | 'legend';

export type ContextCategory =
  | 'historical_event'
  | 'mythology'
  | 'scientific'
  | 'cultural'
  | 'biographical'
  | 'general'
  | 'metaphorical';

export type TransactionType = 'purchase' | 'bonus' | 'consume' | 'refund';

export type EmotionalTone =
  | 'epic'
  | 'mysterious'
  | 'scientific'
  | 'warm'
  | 'dramatic'
  | 'neutral';

// Rarity display names in Japanese
export const RARITY_DISPLAY_NAMES: Record<Rarity, string> = {
  common: 'コモン',
  uncommon: 'アンコモン',
  rare: 'レア',
  super_rare: 'スーパーレア',
  legend: 'レジェンド',
};

// Rarity star counts
export const RARITY_STARS: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  super_rare: 4,
  legend: 5,
};

// Context category display names in Japanese
export const CONTEXT_CATEGORY_DISPLAY_NAMES: Record<ContextCategory, string> = {
  historical_event: '歴史的出来事',
  mythology: '神話・伝説',
  scientific: '科学的事象',
  cultural: '文化的象徴',
  biographical: '人物関連',
  general: '一般的',
  metaphorical: '比喩的',
};
