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
  uploadCardBackImage,
  uploadThumbnail,
  deleteCardImages,
} from '@/lib/gcs/storage';
import { hasEnoughCoins, consumeCoins } from '@/lib/services/coin-service';
import { COIN_COSTS } from '@/lib/constants/coins';
import { ApiError } from '@/lib/errors';
import type { Card } from '@prisma/client';
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
  specifiedRarity,
}: CreateCardParams): Promise<Card> {
  // コイン残高チェック
  const cardCost = COIN_COSTS.CARD_GENERATION;
  const hasCoins = await hasEnoughCoins(userId, cardCost);

  if (!hasCoins) {
    throw new ApiError(
      'INSUFFICIENT_COINS',
      `カード生成には${cardCost}コインが必要です`,
      400
    );
  }

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

  // レア度決定（指定がなければ確率ベース）
  const rarity = calculateRarity(specifiedRarity);

  // フレーバーテキスト生成
  const flavorText = await generateFlavorText({
    keyword,
    contextDescription: contextAnalysis.contextDescription,
    rarity,
    emotionalTone: contextAnalysis.emotionalTone,
  });

  // イラスト生成（レアリティに応じたモデルを使用）
  // 英語の詳細プロンプトを使用して画像品質を向上
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

  // 仮のカードIDを生成（UUIDは後で取得）
  const tempCardId = crypto.randomUUID();
  const createdAt = new Date();

  // 同一キーワードの最大番号を取得してカード番号を決定
  const maxNumberResult = await prisma.card.aggregate({
    where: { keyword },
    _max: { cardNumber: true },
  });
  const cardNumber = (maxNumberResult._max.cardNumber ?? 0) + 1;

  // カード画像合成（表面・裏面・サムネイル）
  const { cardImageBuffer, cardBackImageBuffer, thumbnailBuffer } = await composeCardImage({
    illustrationBuffer,
    keyword,
    cardNumber,
    rarity,
    flavorText,
    contextDescription: contextAnalysis.contextDescription,
    createdAt,
  });

  // 画像をアップロード（GCS SDKのストリーム競合を避けるため順次実行）
  const illustrationUpload = await uploadCardIllustration(illustrationBuffer, tempCardId);
  const cardImageUpload = await uploadCardImage(cardImageBuffer, tempCardId);
  const cardBackImageUpload = await uploadCardBackImage(cardBackImageBuffer, tempCardId);
  const thumbnailUpload = await uploadThumbnail(thumbnailBuffer, tempCardId);

  // データベースに保存（トランザクションで番号の競合を防止）
  const card = await prisma.$transaction(async (tx) => {
    // 再度最大番号を確認（同時実行時の競合対策）
    const latestMaxResult = await tx.card.aggregate({
      where: { keyword },
      _max: { cardNumber: true },
    });
    const finalCardNumber = (latestMaxResult._max.cardNumber ?? 0) + 1;

    // 番号が変わった場合は画像を再生成する必要があるが、
    // 同時生成は稀なため、番号の不一致は許容する
    // （画像の番号と DB の番号が異なる可能性がある）

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
        illustrationUrl: illustrationUpload.url,
        cardImageUrl: cardImageUpload.url,
        cardBackImageUrl: cardBackImageUpload.url,
        thumbnailUrl: thumbnailUpload.url,
        fluxPrompt: imagePrompt,
      },
    });
  });

  // カード生成成功後にコイン消費
  await consumeCoins(userId, cardCost, `カード生成: ${keyword}`);

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
