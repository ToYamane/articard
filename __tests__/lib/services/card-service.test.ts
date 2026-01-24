/**
 * card-service テスト
 */

import {
  getCardsByUser,
  getCardById,
  deleteCard,
  getCardStatsByUser,
} from '@/lib/services/card-service';

// モックデータ
const mockUser = {
  id: 'test-user-id-123',
  nickname: 'testuser',
};

const mockCard = {
  id: 'test-card-id-123',
  userId: 'test-user-id-123',
  articleId: 'test-article-id-123',
  keyword: 'テストキーワード',
  rarity: 'rare',
  flavorText: 'このカードは知識の結晶です。',
  contextCategory: 'technology',
  contextDescription: 'テストの文脈説明',
  illustrationUrl: 'https://storage.example.com/illustrations/test.jpg',
  cardImageUrl: 'https://storage.example.com/cards/test.jpg',
  thumbnailUrl: 'https://storage.example.com/thumbnails/test.jpg',
  fluxPrompt: 'test prompt for illustration',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const mockOtherCard = {
  ...mockCard,
  id: 'other-card-id-456',
  userId: 'other-user-id-456',
  articleId: 'other-article-id-456',
};

// モック関数
const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
const mockDelete = jest.fn();
const mockCount = jest.fn();
const mockGroupBy = jest.fn();

// Prismaモジュールをモック
jest.mock('@/lib/prisma', () => ({
  prisma: {
    card: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
      count: (...args: unknown[]) => mockCount(...args),
      groupBy: (...args: unknown[]) => mockGroupBy(...args),
    },
  },
}));

// GCS storage
const mockDeleteCardImages = jest.fn();
jest.mock('@/lib/gcs/storage', () => ({
  deleteCardImages: (...args: unknown[]) => mockDeleteCardImages(...args),
}));

describe('card-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== getCardsByUser ====================
  describe('getCardsByUser', () => {
    it('ユーザーのカード一覧を取得できる', async () => {
      const cards = [mockCard, { ...mockCard, id: 'card-2' }];
      mockFindMany.mockResolvedValue(cards);

      const result = await getCardsByUser({
        userId: mockUser.id,
      });

      expect(result.cards).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUser.id },
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('レア度でフィルターできる', async () => {
      mockFindMany.mockResolvedValue([mockCard]);

      await getCardsByUser({
        userId: mockUser.id,
        rarity: 'rare',
      });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: mockUser.id,
            rarity: 'rare',
          },
        })
      );
    });

    it('ページネーションが機能する', async () => {
      // limit + 1 件返す（hasMore判定用）
      const cards = Array.from({ length: 21 }, (_, i) => ({
        ...mockCard,
        id: `card-${i}`,
      }));
      mockFindMany.mockResolvedValue(cards);

      const result = await getCardsByUser({
        userId: mockUser.id,
        limit: 20,
      });

      expect(result.cards).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('card-19');
    });

    it('カーソルベースのページネーションが機能する', async () => {
      mockFindMany.mockResolvedValue([mockCard]);

      await getCardsByUser({
        userId: mockUser.id,
        cursor: 'prev-card-id',
      });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'prev-card-id' },
          skip: 1,
        })
      );
    });

    it('カードがない場合は空配列を返す', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await getCardsByUser({
        userId: mockUser.id,
      });

      expect(result.cards).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });
  });

  // ==================== getCardById ====================
  describe('getCardById', () => {
    it('カードを取得できる', async () => {
      mockFindUnique.mockResolvedValue(mockCard);

      const result = await getCardById(mockCard.id);

      expect(result).toEqual(mockCard);
    });

    it('所有者チェックが機能する', async () => {
      mockFindUnique.mockResolvedValue(mockOtherCard);

      const result = await getCardById(mockOtherCard.id, mockUser.id);

      // 所有者が異なるのでnull
      expect(result).toBeNull();
    });

    it('カードが見つからない場合はnullを返す', async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await getCardById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  // ==================== deleteCard ====================
  describe('deleteCard', () => {
    it('カードを削除できる', async () => {
      mockFindUnique.mockResolvedValue(mockCard);
      mockDelete.mockResolvedValue(mockCard);
      mockDeleteCardImages.mockResolvedValue(undefined);

      const result = await deleteCard(mockCard.id, mockUser.id);

      expect(result).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: mockCard.id },
      });
      expect(mockDeleteCardImages).toHaveBeenCalledWith(mockCard.id);
    });

    it('他のユーザーのカードは削除できない', async () => {
      mockFindUnique.mockResolvedValue(mockOtherCard);

      const result = await deleteCard(mockOtherCard.id, mockUser.id);

      expect(result).toBe(false);
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('カードが見つからない場合はfalseを返す', async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await deleteCard('non-existent-id', mockUser.id);

      expect(result).toBe(false);
    });

    it('画像削除に失敗してもカードは削除される', async () => {
      mockFindUnique.mockResolvedValue(mockCard);
      mockDelete.mockResolvedValue(mockCard);
      mockDeleteCardImages.mockRejectedValue(new Error('Storage error'));

      const result = await deleteCard(mockCard.id, mockUser.id);

      // 画像削除に失敗してもカード削除は成功
      expect(result).toBe(true);
    });
  });

  // ==================== getCardStatsByUser ====================
  describe('getCardStatsByUser', () => {
    it('カード統計を取得できる', async () => {
      mockCount.mockResolvedValue(10);
      mockGroupBy.mockResolvedValue([
        { rarity: 'common', _count: 5 },
        { rarity: 'rare', _count: 3 },
        { rarity: 'super_rare', _count: 2 },
      ]);

      const result = await getCardStatsByUser(mockUser.id);

      expect(result.total).toBe(10);
      expect(result.byRarity.common).toBe(5);
      expect(result.byRarity.rare).toBe(3);
      expect(result.byRarity.super_rare).toBe(2);
      expect(result.byRarity.legend).toBe(0);
    });

    it('全レア度の統計を取得できる', async () => {
      mockCount.mockResolvedValue(11);
      mockGroupBy.mockResolvedValue([
        { rarity: 'common', _count: 5 },
        { rarity: 'rare', _count: 3 },
        { rarity: 'super_rare', _count: 2 },
        { rarity: 'legend', _count: 1 },
      ]);

      const result = await getCardStatsByUser(mockUser.id);

      expect(result.total).toBe(11);
      expect(result.byRarity.common).toBe(5);
      expect(result.byRarity.rare).toBe(3);
      expect(result.byRarity.super_rare).toBe(2);
      expect(result.byRarity.legend).toBe(1);
    });

    it('カードがない場合は0を返す', async () => {
      mockCount.mockResolvedValue(0);
      mockGroupBy.mockResolvedValue([]);

      const result = await getCardStatsByUser(mockUser.id);

      expect(result.total).toBe(0);
      expect(result.byRarity.common).toBe(0);
      expect(result.byRarity.rare).toBe(0);
      expect(result.byRarity.super_rare).toBe(0);
      expect(result.byRarity.legend).toBe(0);
    });
  });
});
