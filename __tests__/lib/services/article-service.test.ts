/**
 * article-service テスト
 */

import {
  createArticle,
  getArticlesByUser,
  getArticleById,
  deleteArticle,
  getArticleCountByUser,
} from '@/lib/services/article-service';

// モックデータ
const mockUser = {
  id: 'test-user-id-123',
  nickname: 'testuser',
  knowledgeBalance: 100,
  isPremium: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const mockArticle = {
  id: 'test-article-id-123',
  userId: 'test-user-id-123',
  theme: 'テストテーマ',
  content: 'これはテスト記事の内容です。AIによって生成された学習記事です。',
  openaiModel: 'gpt-4o-mini',
  tokenUsage: 500,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const mockOtherArticle = {
  ...mockArticle,
  id: 'other-article-id-456',
  userId: 'other-user-id-456',
};

const mockCard = {
  id: 'test-card-id-123',
  userId: 'test-user-id-123',
  articleId: 'test-article-id-123',
  keyword: 'テストキーワード',
  rarity: 'rare',
  flavorText: 'このカードは知識の結晶です。',
};

// モック関数
const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
const mockCreate = jest.fn();
const mockDelete = jest.fn();
const mockDeleteMany = jest.fn();
const mockCount = jest.fn();
const mockTransaction = jest.fn((callback) =>
  callback({
    card: { deleteMany: mockDeleteMany },
    article: { delete: mockDelete },
  })
);
const mockCardFindMany = jest.fn();

// Prismaモジュールをモック
jest.mock('@/lib/prisma', () => ({
  prisma: {
    article: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
    card: {
      findMany: (...args: unknown[]) => mockCardFindMany(...args),
    },
    $transaction: (callback: (tx: unknown) => Promise<unknown>) => mockTransaction(callback),
  },
}));

// OpenAI モック
const mockIsThemeSafe = jest.fn();
const mockGenerateArticle = jest.fn();
jest.mock('@/lib/openai', () => ({
  isThemeSafe: (...args: unknown[]) => mockIsThemeSafe(...args),
  generateArticle: (...args: unknown[]) => mockGenerateArticle(...args),
}));

// GCS storage
const mockBatchDeleteCardImages = jest.fn();
jest.mock('@/lib/gcs/storage', () => ({
  batchDeleteCardImages: (...args: unknown[]) => mockBatchDeleteCardImages(...args),
}));

describe('article-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== createArticle ====================
  describe('createArticle', () => {
    it('記事を生成して保存できる', async () => {
      mockIsThemeSafe.mockResolvedValue({ safe: true });
      mockGenerateArticle.mockResolvedValue({
        content: '生成された記事',
        model: 'gpt-4o-mini',
        tokenUsage: { total: 500 },
      });
      mockCreate.mockResolvedValue(mockArticle);

      const result = await createArticle({
        userId: mockUser.id,
        theme: 'テストテーマ',
      });

      expect(result.id).toBe(mockArticle.id);
      expect(mockIsThemeSafe).toHaveBeenCalledWith('テストテーマ');
      expect(mockGenerateArticle).toHaveBeenCalledWith('テストテーマ');
      expect(mockCreate).toHaveBeenCalled();
    });

    it('不適切なテーマの場合、エラーをスロー', async () => {
      mockIsThemeSafe.mockResolvedValue({
        safe: false,
        reason: '不適切なコンテンツです',
      });

      await expect(
        createArticle({
          userId: mockUser.id,
          theme: '不適切なテーマ',
        })
      ).rejects.toThrow('不適切なコンテンツです');

      expect(mockGenerateArticle).not.toHaveBeenCalled();
    });

    it('OpenAIエラーの場合、エラーをスロー', async () => {
      mockIsThemeSafe.mockResolvedValue({ safe: true });
      mockGenerateArticle.mockRejectedValue(new Error('OpenAI API error'));

      await expect(
        createArticle({
          userId: mockUser.id,
          theme: 'テストテーマ',
        })
      ).rejects.toThrow('OpenAI API error');
    });
  });

  // ==================== getArticlesByUser ====================
  describe('getArticlesByUser', () => {
    it('ユーザーの記事一覧を取得できる', async () => {
      const articles = [mockArticle, { ...mockArticle, id: 'article-2' }];
      mockFindMany.mockResolvedValue(articles);

      const result = await getArticlesByUser({
        userId: mockUser.id,
      });

      expect(result.articles).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUser.id },
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('ページネーションが機能する', async () => {
      // limit + 1 件返す（hasMore判定用）
      const articles = Array.from({ length: 11 }, (_, i) => ({
        ...mockArticle,
        id: `article-${i}`,
      }));
      mockFindMany.mockResolvedValue(articles);

      const result = await getArticlesByUser({
        userId: mockUser.id,
        limit: 10,
      });

      expect(result.articles).toHaveLength(10);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('article-9');
    });

    it('カーソルベースのページネーションが機能する', async () => {
      mockFindMany.mockResolvedValue([mockArticle]);

      await getArticlesByUser({
        userId: mockUser.id,
        cursor: 'prev-article-id',
      });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'prev-article-id' },
          skip: 1,
        })
      );
    });

    it('記事がない場合は空配列を返す', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await getArticlesByUser({
        userId: mockUser.id,
      });

      expect(result.articles).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });
  });

  // ==================== getArticleById ====================
  describe('getArticleById', () => {
    it('記事を取得できる', async () => {
      mockFindUnique.mockResolvedValue(mockArticle);

      const result = await getArticleById(mockArticle.id);

      expect(result).toEqual(mockArticle);
    });

    it('所有者チェックが機能する', async () => {
      mockFindUnique.mockResolvedValue(mockOtherArticle);

      const result = await getArticleById(mockOtherArticle.id, mockUser.id);

      // 所有者が異なるのでnull
      expect(result).toBeNull();
    });

    it('記事が見つからない場合はnullを返す', async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await getArticleById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  // ==================== deleteArticle ====================
  describe('deleteArticle', () => {
    it('記事を削除できる', async () => {
      mockFindUnique.mockResolvedValue(mockArticle);
      mockCardFindMany.mockResolvedValue([mockCard]);
      mockBatchDeleteCardImages.mockResolvedValue(undefined);

      const result = await deleteArticle(mockArticle.id, mockUser.id);

      expect(result).toBe(true);
      expect(mockTransaction).toHaveBeenCalled();
      expect(mockBatchDeleteCardImages).toHaveBeenCalledWith([mockCard.id]);
    });

    it('他のユーザーの記事は削除できない', async () => {
      mockFindUnique.mockResolvedValue(mockOtherArticle);

      const result = await deleteArticle(mockOtherArticle.id, mockUser.id);

      expect(result).toBe(false);
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('記事が見つからない場合はfalseを返す', async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await deleteArticle('non-existent-id', mockUser.id);

      expect(result).toBe(false);
    });

    it('画像削除に失敗しても記事は削除される', async () => {
      mockFindUnique.mockResolvedValue(mockArticle);
      mockCardFindMany.mockResolvedValue([mockCard]);
      mockBatchDeleteCardImages.mockRejectedValue(new Error('Storage error'));

      const result = await deleteArticle(mockArticle.id, mockUser.id);

      // 画像削除に失敗しても記事削除は成功
      expect(result).toBe(true);
    });
  });

  // ==================== getArticleCountByUser ====================
  describe('getArticleCountByUser', () => {
    it('記事数を取得できる', async () => {
      mockCount.mockResolvedValue(5);

      const result = await getArticleCountByUser(mockUser.id);

      expect(result).toBe(5);
      expect(mockCount).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });
    });

    it('記事がない場合は0を返す', async () => {
      mockCount.mockResolvedValue(0);

      const result = await getArticleCountByUser(mockUser.id);

      expect(result).toBe(0);
    });
  });
});
