import {
  themeSchema,
  createArticleSchema,
  getArticlesQuerySchema,
  articleIdSchema,
} from '@/lib/validations/article';

describe('themeSchema', () => {
  describe('正常系', () => {
    it('2文字のテーマを許可する', () => {
      const result = themeSchema.safeParse('AI');
      expect(result.success).toBe(true);
    });

    it('30文字のテーマを許可する', () => {
      const theme = 'あ'.repeat(30);
      const result = themeSchema.safeParse(theme);
      expect(result.success).toBe(true);
    });

    it('日本語テーマを許可する', () => {
      const result = themeSchema.safeParse('人工知能の歴史');
      expect(result.success).toBe(true);
    });

    it('絵文字を許可する', () => {
      const result = themeSchema.safeParse('宇宙探索🚀');
      expect(result.success).toBe(true);
    });
  });

  describe('異常系', () => {
    it('1文字のテーマを拒否する', () => {
      const result = themeSchema.safeParse('A');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('2文字以上');
      }
    });

    it('31文字以上のテーマを拒否する', () => {
      const theme = 'あ'.repeat(31);
      const result = themeSchema.safeParse(theme);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('30文字以内');
      }
    });

    it('特殊文字 < を拒否する', () => {
      const result = themeSchema.safeParse('テスト<script>');
      expect(result.success).toBe(false);
    });

    it('特殊文字 > を拒否する', () => {
      const result = themeSchema.safeParse('テスト>hello');
      expect(result.success).toBe(false);
    });

    it('特殊文字 { } を拒否する', () => {
      const result = themeSchema.safeParse('テスト{hello}');
      expect(result.success).toBe(false);
    });

    it('特殊文字 [ ] を拒否する', () => {
      const result = themeSchema.safeParse('テスト[hello]');
      expect(result.success).toBe(false);
    });

    it('バックスラッシュを拒否する', () => {
      const result = themeSchema.safeParse('テスト\\path');
      expect(result.success).toBe(false);
    });
  });
});

describe('createArticleSchema', () => {
  it('有効なテーマを許可する', () => {
    const result = createArticleSchema.safeParse({ theme: '人工知能' });
    expect(result.success).toBe(true);
  });

  it('themeが必須', () => {
    const result = createArticleSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('getArticlesQuerySchema', () => {
  it('パラメータなしで有効', () => {
    const result = getArticlesQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20); // デフォルト値
    }
  });

  it('有効なcursorとlimitを許可する', () => {
    const result = getArticlesQuerySchema.safeParse({
      cursor: '550e8400-e29b-41d4-a716-446655440000',
      limit: '10',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
    }
  });

  it('無効なUUIDのcursorを拒否する', () => {
    const result = getArticlesQuerySchema.safeParse({
      cursor: 'invalid-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('limitの範囲外（0）を拒否する', () => {
    const result = getArticlesQuerySchema.safeParse({ limit: '0' });
    expect(result.success).toBe(false);
  });

  it('limitの範囲外（51）を拒否する', () => {
    const result = getArticlesQuerySchema.safeParse({ limit: '51' });
    expect(result.success).toBe(false);
  });
});

describe('articleIdSchema', () => {
  it('有効なUUIDを許可する', () => {
    const result = articleIdSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('無効なIDを拒否する', () => {
    const result = articleIdSchema.safeParse({ id: 'invalid-id' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('無効な記事ID');
    }
  });
});
