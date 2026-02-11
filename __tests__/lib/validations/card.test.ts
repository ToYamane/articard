import {
  createCardSchema,
  getCardsQuerySchema,
  cardIdSchema,
} from '@/lib/validations/card';

describe('createCardSchema', () => {
  it('有効なarticleIdを許可する', () => {
    const result = createCardSchema.safeParse({
      articleId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('articleIdが必須', () => {
    const result = createCardSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('無効なUUIDを拒否する', () => {
    const result = createCardSchema.safeParse({
      articleId: 'invalid-uuid',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('無効な記事ID');
    }
  });
});

describe('getCardsQuerySchema', () => {
  describe('基本的なクエリパラメータ', () => {
    it('パラメータなしで有効', () => {
      const result = getCardsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20); // デフォルト値
      }
    });

    it('有効なcursorとlimitを許可する', () => {
      const result = getCardsQuerySchema.safeParse({
        cursor: '550e8400-e29b-41d4-a716-446655440000',
        limit: '15',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(15);
      }
    });
  });

  describe('rarityフィルター', () => {
    const validRarities = ['common', 'rare', 'super_rare', 'legend'];

    validRarities.forEach((rarity) => {
      it(`レア度 ${rarity} を許可する`, () => {
        const result = getCardsQuerySchema.safeParse({ rarity });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.rarity).toBe(rarity);
        }
      });
    });

    it('無効なレア度を拒否する', () => {
      const result = getCardsQuerySchema.safeParse({ rarity: 'mythic' });
      expect(result.success).toBe(false);
    });
  });

  describe('cursorバリデーション', () => {
    it('無効なUUIDのcursorを拒否する', () => {
      const result = getCardsQuerySchema.safeParse({
        cursor: 'invalid-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('limitバリデーション', () => {
    it('limitの範囲外（0）を拒否する', () => {
      const result = getCardsQuerySchema.safeParse({ limit: '0' });
      expect(result.success).toBe(false);
    });

    it('limitの範囲外（201）を拒否する', () => {
      const result = getCardsQuerySchema.safeParse({ limit: '201' });
      expect(result.success).toBe(false);
    });

    it('limitの最小値（1）を許可する', () => {
      const result = getCardsQuerySchema.safeParse({ limit: '1' });
      expect(result.success).toBe(true);
    });

    it('limitの最大値（200）を許可する', () => {
      const result = getCardsQuerySchema.safeParse({ limit: '200' });
      expect(result.success).toBe(true);
    });
  });
});

describe('cardIdSchema', () => {
  it('有効なUUIDを許可する', () => {
    const result = cardIdSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('idが必須', () => {
    const result = cardIdSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('無効なIDを拒否する', () => {
    const result = cardIdSchema.safeParse({ id: 'invalid-id' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('無効なカードID');
    }
  });

  it('空文字を拒否する', () => {
    const result = cardIdSchema.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });
});
