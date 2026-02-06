import { prisma } from '@/lib/prisma';
import {
  extractKeywords,
  selectRandomKeyword,
  analyzeContext,
  generateFlavorText,
  type ContextAnalysisResult,
} from '@/lib/openai';
import { calculateRarity } from '@/lib/card/rarity';
import { generateCardIllustration } from '@/lib/flux/image-generation';
import { composeCardImage } from '@/lib/card/image-composer';
import {
  uploadCardIllustration,
  uploadCardImage,
  uploadCardBackImage,
  uploadThumbnail,
  deleteCardImages,
} from '@/lib/gcs/storage';
import { hasEnoughCoins, consumeCoins } from '@/lib/services/coin-service';
import { COIN_COSTS } from '@/lib/constants/coins';
import { ApiError } from '@/lib/errors';
import {
  processPaginationResult,
  buildCursorOptions,
  DEFAULT_PAGE_SIZE,
} from '@/lib/utils/pagination';
import type { Card, Article } from '@prisma/client';
import type { Rarity } from '@/types/database';

export interface CreateCardParams {
  userId: string;
  articleId: string;
  specifiedRarity?: Rarity;
}

export interface CardListParams {
  userId: string;
  cursor?: string;
  limit?: number;
  rarity?: Rarity;
}

export interface CardListResult {
  cards: Card[];
  nextCursor: string | null;
  hasMore: boolean;
}

// カード生成時の画像URL
interface CardImageUrls {
  illustrationUrl: string;
  cardImageUrl: string;
  cardBackImageUrl: string;
  thumbnailUrl: string;
}

// カード生成時のコンテンツ
interface CardContent {
  contextAnalysis: ContextAnalysisResult;
  rarity: Rarity;
  flavorText: string;
}

/**
 * カード生成前の検証
 * - コイン残高チェック
 * - 記事の存在・所有権確認
 */
async function validateCardCreation(
  userId: string,
  articleId: string
): Promise<{ article: Article; cost: number }> {
  const cost = COIN_COSTS.CARD_GENERATION;
  const hasCoins = await hasEnoughCoins(userId, cost);

  if (!hasCoins) {
    throw new ApiError(
      'INSUFFICIENT_COINS',
      `カード生成には${cost}コインが必要です`,
      400
    );
  }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  if (!article || article.userId !== userId) {
    throw new Error('記事が見つかりません');
  }

  return { article, cost };
}

/**
 * キーワードを選択
 * - 既存カードで使用済みのキーワードを除外
 * - 利用可能なキーワードからランダム選択
 */
async function selectKeywordForCard(
  articleId: string,
  content: string
): Promise<string> {
  const existingCards = await prisma.card.findMany({
    where: { articleId },
    select: { keyword: true },
  });
  const usedKeywords = existingCards.map((c) => c.keyword);

  const extractedKeywords = await extractKeywords(content);
  const keyword = selectRandomKeyword(extractedKeywords, usedKeywords);

  if (!keyword) {
    throw new Error(
      'この記事から生成できるカードはもうありません。別の記事でお試しください'
    );
  }

  return keyword;
}

/**
 * カードコンテンツを生成
 * - 文脈分析
 * - レア度決定
 * - フレーバーテキスト生成
 */
async function generateCardContent(
  keyword: string,
  articleContent: string,
  specifiedRarity?: Rarity
): Promise<CardContent> {
  const contextAnalysis = await analyzeContext(keyword, articleContent);
  const rarity = calculateRarity(specifiedRarity);
  const flavorText = await generateFlavorText({
    keyword,
    contextDescription: contextAnalysis.contextDescription,
    rarity,
    emotionalTone: contextAnalysis.emotionalTone,
  });

  return { contextAnalysis, rarity, flavorText };
}

/**
 * カード番号を決定
 * - 同一キーワードの最大番号 + 1
 */
async function determineCardNumber(keyword: string): Promise<number> {
  const maxNumberResult = await prisma.card.aggregate({
    where: { keyword },
    _max: { cardNumber: true },
  });
  return (maxNumberResult._max.cardNumber ?? 0) + 1;
}

/**
 * 画像を生成してアップロード
 * - イラスト生成
 * - カード画像合成
 * - GCSへアップロード
 */
async function generateAndUploadImages(
  contextAnalysis: ContextAnalysisResult,
  rarity: Rarity,
  keyword: string,
  cardNumber: number,
  flavorText: string,
  tempCardId: string,
  createdAt: Date
): Promise<{ images: CardImageUrls; imagePrompt: string; imageModel: string; imageProvider: string; imageCost: number }> {
  // イラスト生成
  const {
    imageBuffer: illustrationBuffer,
    prompt: imagePrompt,
    model: imageModel,
    provider: imageProvider,
    estimatedCost: imageCost,
  } = await generateCardIllustration({
    imageSubject: contextAnalysis.imageSubject,
    imageScene: contextAnalysis.imageScene,
    imageDetails: contextAnalysis.imageDetails,
    rarity,
    emotionalTone: contextAnalysis.emotionalTone,
  });

  console.log(`Image generated with ${imageModel} (${imageProvider}), estimated cost: $${imageCost.toFixed(4)}`);

  // カード画像合成
  const { cardImageBuffer, cardBackImageBuffer, thumbnailBuffer } = await composeCardImage({
    illustrationBuffer,
    keyword,
    cardNumber,
    rarity,
    flavorText,
    contextDescription: contextAnalysis.contextDescription,
    createdAt,
  });

  // GCSへアップロード（順次実行でストリーム競合を回避）
  const illustrationUpload = await uploadCardIllustration(illustrationBuffer, tempCardId);
  const cardImageUpload = await uploadCardImage(cardImageBuffer, tempCardId);
  const cardBackImageUpload = await uploadCardBackImage(cardBackImageBuffer, tempCardId);
  const thumbnailUpload = await uploadThumbnail(thumbnailBuffer, tempCardId);

  return {
    images: {
      illustrationUrl: illustrationUpload.url,
      cardImageUrl: cardImageUpload.url,
      cardBackImageUrl: cardBackImageUpload.url,
      thumbnailUrl: thumbnailUpload.url,
    },
    imagePrompt,
    imageModel,
    imageProvider,
    imageCost,
  };
}

/**
 * カードをDBに保存（トランザクション）
 */
async function saveCard(
  tempCardId: string,
  userId: string,
  articleId: string,
  keyword: string,
  rarity: Rarity,
  flavorText: string,
  contextAnalysis: ContextAnalysisResult,
  images: CardImageUrls,
  imagePrompt: string
): Promise<Card> {
  return prisma.$transaction(async (tx) => {
    // 再度最大番号を確認（同時実行時の競合対策）
    const latestMaxResult = await tx.card.aggregate({
      where: { keyword },
      _max: { cardNumber: true },
    });
    const finalCardNumber = (latestMaxResult._max.cardNumber ?? 0) + 1;

    return tx.card.create({
      data: {
        id: tempCardId,
        userId,
        articleId,
        keyword,
        cardNumber: finalCardNumber,
        rarity,
        flavorText,
        contextCategory: contextAnalysis.contextCategory,
        contextDescription: contextAnalysis.contextDescription,
        illustrationUrl: images.illustrationUrl,
        cardImageUrl: images.cardImageUrl,
        cardBackImageUrl: images.cardBackImageUrl,
        thumbnailUrl: images.thumbnailUrl,
        fluxPrompt: imagePrompt,
      },
    });
  });
}

/**
 * 記事からカードを生成
 */
export async function createCard({
  userId,
  articleId,
  specifiedRarity,
}: CreateCardParams): Promise<Card> {
  // 1. 検証（コイン残高・記事の存在確認）
  const { article, cost } = await validateCardCreation(userId, articleId);

  // 2. キーワード選択
  const keyword = await selectKeywordForCard(articleId, article.content);

  // 3. カードコンテンツ生成（文脈分析・レア度・フレーバーテキスト）
  const { contextAnalysis, rarity, flavorText } = await generateCardContent(
    keyword,
    article.content,
    specifiedRarity
  );

  // 4. カード番号決定（画像生成前に取得）
  const cardNumber = await determineCardNumber(keyword);

  // 5. 画像生成・アップロード
  const tempCardId = crypto.randomUUID();
  const createdAt = new Date();

  const { images, imagePrompt } = await generateAndUploadImages(
    contextAnalysis,
    rarity,
    keyword,
    cardNumber,
    flavorText,
    tempCardId,
    createdAt
  );

  // 6. DB保存（トランザクション）
  const card = await saveCard(
    tempCardId,
    userId,
    articleId,
    keyword,
    rarity,
    flavorText,
    contextAnalysis,
    images,
    imagePrompt
  );

  // 7. コイン消費
  await consumeCoins(userId, cost, `カード生成: ${keyword}`);

  return card;
}

/**
 * ユーザーのカード一覧を取得（カーソルベースページネーション）
 */
export async function getCardsByUser({
  userId,
  cursor,
  limit = DEFAULT_PAGE_SIZE,
  rarity,
}: CardListParams): Promise<CardListResult> {
  const cards = await prisma.card.findMany({
    where: {
      userId,
      ...(rarity && { rarity }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...buildCursorOptions(cursor),
  });

  const { items, nextCursor, hasMore } = processPaginationResult(cards, limit);

  return {
    cards: items,
    nextCursor,
    hasMore,
  };
}

export type CardWithArticle = Card & {
  article: { id: string; theme: string } | null;
};

/**
 * カードを取得
 */
export async function getCardById(
  cardId: string,
  userId?: string
): Promise<CardWithArticle | null> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      article: {
        select: { id: true, theme: true },
      },
    },
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

/**
 * 記事で利用可能なキーワード数を取得
 * バッチ生成時の上限決定に使用
 */
export async function getAvailableKeywordCount(
  articleId: string,
  userId: string
): Promise<{ available: number; total: number; used: number }> {
  // 記事の存在・所有権確認
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  if (!article || article.userId !== userId) {
    throw new Error('記事が見つかりません');
  }

  // キーワード抽出
  const extractedKeywords = await extractKeywords(article.content);

  // 既存のカードで使用されたキーワードを取得
  const existingCards = await prisma.card.findMany({
    where: { articleId },
    select: { keyword: true },
  });
  const usedKeywords = new Set(existingCards.map((c) => c.keyword));

  // 利用可能なキーワード数を計算
  const availableKeywords = extractedKeywords.filter(
    (kw) => !usedKeywords.has(kw)
  );

  return {
    available: availableKeywords.length,
    total: extractedKeywords.length,
    used: usedKeywords.size,
  };
}
