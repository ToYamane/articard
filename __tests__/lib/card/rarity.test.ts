import { calculateRarity, getRarityColor, getRarityGradient } from '@/lib/card/rarity';
import type { Rarity } from '@/types/database';

describe('calculateRarity', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('確率ベースのレア度決定', () => {
    it('ランダム値 < 5 の場合は legend を返す', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.04); // 4%
      expect(calculateRarity()).toBe('legend');
    });

    it('ランダム値 5-15 の場合は super_rare を返す', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.10); // 10%
      expect(calculateRarity()).toBe('super_rare');
    });

    it('ランダム値 15-40 の場合は rare を返す', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.30); // 30%
      expect(calculateRarity()).toBe('rare');
    });

    it('ランダム値 40-100 の場合は common を返す', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.60); // 60%
      expect(calculateRarity()).toBe('common');
    });
  });

  describe('境界値テスト', () => {
    it('ランダム値 0 の場合は legend を返す', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      expect(calculateRarity()).toBe('legend');
    });

    it('ランダム値 0.05 (境界) の場合は super_rare を返す', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.05);
      expect(calculateRarity()).toBe('super_rare');
    });

    it('ランダム値 0.15 (境界) の場合は rare を返す', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.15);
      expect(calculateRarity()).toBe('rare');
    });

    it('ランダム値 0.40 (境界) の場合は common を返す', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.40);
      expect(calculateRarity()).toBe('common');
    });

    it('ランダム値 0.99 の場合は common を返す', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.99);
      expect(calculateRarity()).toBe('common');
    });
  });

  describe('確率分布テスト', () => {
    it('多数回実行で期待される確率分布に近づく', () => {
      jest.restoreAllMocks(); // 実際のランダムを使用

      const counts: Record<Rarity, number> = {
        common: 0,
        rare: 0,
        super_rare: 0,
        legend: 0,
      };

      const iterations = 10000;
      for (let i = 0; i < iterations; i++) {
        const rarity = calculateRarity();
        counts[rarity]++;
      }

      // 期待値: common 60%, rare 25%, super_rare 10%, legend 5%
      // 許容誤差: ±3%
      expect(counts.common / iterations).toBeGreaterThan(0.55);
      expect(counts.common / iterations).toBeLessThan(0.65);

      expect(counts.rare / iterations).toBeGreaterThan(0.20);
      expect(counts.rare / iterations).toBeLessThan(0.30);

      expect(counts.super_rare / iterations).toBeGreaterThan(0.07);
      expect(counts.super_rare / iterations).toBeLessThan(0.13);

      expect(counts.legend / iterations).toBeGreaterThan(0.02);
      expect(counts.legend / iterations).toBeLessThan(0.08);
    });
  });
});

describe('getRarityColor', () => {
  const expectedColors: Record<Rarity, string> = {
    common: '#9CA3AF',
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
