import { prisma } from '@/lib/prisma';
import {
  extractKeywords,
  selectRandomKeyword,
  analyzeContext,
  generateFlavorText,
} from '@/lib/openai';
import { calculateRarity } from '@/lib/card/rarity';
import { generateCardIllustration } from '@/lib/flux/image-generation';
import { composeCardImage } from '@/lib/card/image-composer';
import {
  uploadCardIllustration,
  uploadCardImage,
  uploadThumbnail,
  deleteCardImages,
} from '@/lib/gcs/storage';
import type { Card } from '@prisma/client';

export interface CreateCardParams {
  userId: string;
  articleId: string;
}

export interface CardListParams {
  userId: string;
  cursor?: string;
  limit?: number;
  rarity?: string;
}

export interface CardListResult {
  cards: Card[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * 記事からカードを生成
 */
export async function createCard({
  userId,
  articleId,
}: CreateCardParams): Promise<Card> {
  // 記事を取得
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  if (!article || article.userId !== userId) {
    throw new Error('記事が見つかりません');
  }

  // 既存のカードで使用されたキーワードを取得
  const existingCards = await prisma.card.findMany({
    where: { articleId },
    select: { keyword: true },
  });
  const usedKeywords = existingCards.map((c) => c.keyword);

  // キーワード抽出
  const extractedKeywords = await extractKeywords(article.content);

  // 使用可能なキーワードを選択
  const keyword = selectRandomKeyword(extractedKeywords, usedKeywords);

  if (!keyword) {
    throw new Error(
      'この記事から生成できるカードはもうありません。別の記事でお試しください'
    );
  }

  // 文脈分析
  const contextAnalysis = await analyzeContext(keyword, article.content);

  // レア度計算
  const rarity = calculateRarity({
    contextCategory: contextAnalysis.contextCategory,
    uniquenessScore: contextAnalysis.uniquenessScore,
  });

  // フレーバーテキスト生成
  const flavorText = await generateFlavorText({
    keyword,
    contextDescription: contextAnalysis.contextDescription,
    rarity,
    emotionalTone: contextAnalysis.emotionalTone,
  });

  // イラスト生成
  const { imageBuffer: illustrationBuffer, prompt: fluxPrompt } =
    await generateCardIllustration({
      keyword,
      contextDescription: contextAnalysis.contextDescription,
      rarity,
      emotionalTone: contextAnalysis.emotionalTone,
    });

  // 仮のカードIDを生成（UUIDは後で取得）
  const tempCardId = crypto.randomUUID();

  // カード画像合成
  const { cardImageBuffer, thumbnailBuffer } = await composeCardImage({
    illustrationBuffer,
    keyword,
    rarity,
    flavorText,
    createdAt: new Date(),
  });

  // 画像をアップロード（GCS SDKのストリーム競合を避けるため順次実行）
  const illustrationUpload = await uploadCardIllustration(illustrationBuffer, tempCardId);
  const cardImageUpload = await uploadCardImage(cardImageBuffer, tempCardId);
  const thumbnailUpload = await uploadThumbnail(thumbnailBuffer, tempCardId);

  // データベースに保存
  const card = await prisma.card.create({
    data: {
      id: tempCardId,
      userId,
      articleId,
      keyword,
      rarity,
      flavorText,
      contextCategory: contextAnalysis.contextCategory,
      contextDescription: contextAnalysis.contextDescription,
      illustrationUrl: illustrationUpload.url,
      cardImageUrl: cardImageUpload.url,
      thumbnailUrl: thumbnailUpload.url,
      fluxPrompt,
    },
  });

  return card;
}

/**
 * ユーザーのカード一覧を取得（カーソルベースページネーション）
 */
export async function getCardsByUser({
  userId,
  cursor,
  limit = 20,
  rarity,
}: CardListParams): Promise<CardListResult> {
  const cards = await prisma.card.findMany({
    where: {
      userId,
      ...(rarity && { rarity }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
  });

  const hasMore = cards.length > limit;
  const resultCards = hasMore ? cards.slice(0, -1) : cards;
  const nextCursor = hasMore ? resultCards[resultCards.length - 1].id : null;

  return {
    cards: resultCards,
    nextCursor,
    hasMore,
  };
}

/**
 * カードを取得
 */
export async function getCardById(
  cardId: string,
  userId?: string
): Promise<Card | null> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
  });

  // ユーザーIDが指定されている場合は所有者チェック
  if (card && userId && card.userId !== userId) {
    return null;
  }

  return card;
}

/**
 * カードを削除
 */
export async function deleteCard(
  cardId: string,
  userId: string
): Promise<boolean> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
  });

  if (!card || card.userId !== userId) {
    return false;
  }

  // データベースから削除
  await prisma.card.delete({
    where: { id: cardId },
  });

  // ストレージから画像を削除
  try {
    await deleteCardImages(cardId);
  } catch (error) {
    // 画像削除に失敗してもDBは削除済みなのでログのみ
    console.error('Failed to delete card images:', error);
  }

  return true;
}

/**
 * ユーザーのカード統計を取得
 */
export async function getCardStatsByUser(userId: string) {
  const [totalCount, rarityStats] = await Promise.all([
    prisma.card.count({
      where: { userId },
    }),
    prisma.card.groupBy({
      by: ['rarity'],
      where: { userId },
      _count: true,
    }),
  ]);

  const byRarity: Record<string, number> = {
    common: 0,
    uncommon: 0,
    rare: 0,
    super_rare: 0,
    legend: 0,
  };

  rarityStats.forEach((stat) => {
    byRarity[stat.rarity] = stat._count;
  });

  return {
    total: totalCount,
    byRarity,
  };
}
