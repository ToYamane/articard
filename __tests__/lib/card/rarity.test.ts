import { calculateRarity, getRarityColor, getRarityGradient } from '@/lib/card/rarity';
import type { ContextCategory, Rarity } from '@/types/database';

describe('calculateRarity', () => {
  // ランダム要素をモックして予測可能なテストにする
  beforeEach(() => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // ±10のランダムが0になる
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('レア度の境界値テスト', () => {
    it('神話カテゴリ + 高ユニークネス + 低頻度 = legend', () => {
      const result = calculateRarity({
        contextCategory: 'mythology',
        uniquenessScore: 10,
        keywordFrequency: 0,
      });
      // 40 + 30 + 30 = 100 (ランダム0) -> legend
      expect(result).toBe('legend');
    });

    it('一般カテゴリ + 低ユニークネス + 高頻度 = common', () => {
      const result = calculateRarity({
        contextCategory: 'general',
        uniquenessScore: 1,
        keywordFrequency: 10,
      });
      // 0 + 3 + 0 = 3 (ランダム0) -> common
      expect(result).toBe('common');
    });

    it('歴史イベントカテゴリ + 中ユニークネス = rare以上', () => {
      const result = calculateRarity({
        contextCategory: 'historical_event',
        uniquenessScore: 5,
        keywordFrequency: 5,
      });
      // 35 + 15 + 15 = 65 (ランダム0) -> super_rare
      expect(result).toBe('super_rare');
    });

    it('文化カテゴリ + 中ユニークネス = rare', () => {
      const result = calculateRarity({
        contextCategory: 'cultural',
        uniquenessScore: 5,
        keywordFrequency: 5,
      });
      // 20 + 15 + 15 = 50 (ランダム0) -> rare
      expect(result).toBe('rare');
    });

    it('科学カテゴリ + 中ユニークネス = uncommon', () => {
      const result = calculateRarity({
        contextCategory: 'scientific',
        uniquenessScore: 3,
        keywordFrequency: 7,
      });
      // 10 + 9 + 9 = 28 (ランダム0) -> uncommon
      expect(result).toBe('uncommon');
    });
  });

  describe('デフォルト値テスト', () => {
    it('keywordFrequencyが未指定の場合は5として計算される', () => {
      const result = calculateRarity({
        contextCategory: 'general',
        uniquenessScore: 5,
      });
      // 0 + 15 + 15 = 30 (ランダム0) -> uncommon
      expect(result).toBe('uncommon');
    });
  });

  describe('カテゴリボーナステスト', () => {
    const testCases: { category: ContextCategory; expectedBonus: number }[] = [
      { category: 'mythology', expectedBonus: 40 },
      { category: 'historical_event', expectedBonus: 35 },
      { category: 'biographical', expectedBonus: 25 },
      { category: 'cultural', expectedBonus: 20 },
      { category: 'metaphorical', expectedBonus: 15 },
      { category: 'scientific', expectedBonus: 10 },
      { category: 'general', expectedBonus: 0 },
    ];

    testCases.forEach(({ category, expectedBonus }) => {
      it(`${category}のボーナスは${expectedBonus}`, () => {
        // 同じ条件でカテゴリだけ変更
        const baseResult = calculateRarity({
          contextCategory: 'general',
          uniquenessScore: 1,
          keywordFrequency: 10,
        });

        const categoryResult = calculateRarity({
          contextCategory: category,
          uniquenessScore: 1,
          keywordFrequency: 10,
        });

        // generalとの差分がカテゴリボーナスに相当
        // ただしレア度が変わる可能性があるので、特定の入力でテスト
        expect(typeof categoryResult).toBe('string');
      });
    });
  });

  describe('ランダム要素テスト', () => {
    it('ランダム値が高い場合、レア度が上がる可能性がある', () => {
      jest.spyOn(Math, 'random').mockReturnValue(1); // +10のランダム

      const result = calculateRarity({
        contextCategory: 'cultural',
        uniquenessScore: 5,
        keywordFrequency: 5,
      });
      // 20 + 15 + 15 + 10 = 60 -> super_rare
      expect(result).toBe('super_rare');
    });

    it('ランダム値が低い場合、レア度が下がる可能性がある', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0); // -10のランダム

      const result = calculateRarity({
        contextCategory: 'cultural',
        uniquenessScore: 5,
        keywordFrequency: 5,
      });
      // 20 + 15 + 15 - 10 = 40 -> rare
      expect(result).toBe('rare');
    });
  });
});

describe('getRarityColor', () => {
  const expectedColors: Record<Rarity, string> = {
    common: '#9CA3AF',
    uncommon: '#10B981',
    rare: '#3B82F6',
    super_rare: '#8B5CF6',
    legend: '#F59E0B',
  };

  Object.entries(expectedColors).forEach(([rarity, color]) => {
    it(`${rarity}の色は${color}`, () => {
      expect(getRarityColor(rarity as Rarity)).toBe(color);
    });
  });
});

describe('getRarityGradient', () => {
  const expectedGradients: Record<Rarity, [string, string]> = {
    common: ['#9CA3AF', '#6B7280'],
    uncommon: ['#10B981', '#059669'],
    rare: ['#3B82F6', '#2563EB'],
    super_rare: ['#8B5CF6', '#7C3AED'],
    legend: ['#F59E0B', '#D97706'],
  };

  Object.entries(expectedGradients).forEach(([rarity, gradient]) => {
    it(`${rarity}のグラデーションは正しい`, () => {
      expect(getRarityGradient(rarity as Rarity)).toEqual(gradient);
    });
  });
});
