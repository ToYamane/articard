import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cardIdSchema } from '@/lib/validations/card';
import type { ApiResponse } from '@/types/api';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface ShareCardData {
  id: string;
  keyword: string;
  rarity: string;
  flavorText: string;
  cardImageUrl: string;
  createdAt: string;
  owner: {
    nickname: string;
  };
  ogp: {
    title: string;
    description: string;
    imageUrl: string;
  };
}

// 公開カード情報取得（認証不要）
export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<ShareCardData>>> {
  try {
    const params = await context.params;
    const validationResult = cardIdSchema.safeParse({ id: params.id });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validationResult.error.issues[0].message,
          },
        },
        { status: 400 }
      );
    }

    const card = await prisma.card.findUnique({
      where: { id: validationResult.data.id },
      include: {
        user: {
          select: {
            nickname: true,
          },
        },
      },
    });

    if (!card) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'カードが見つかりません',
          },
        },
        { status: 404 }
      );
    }

    const shareData: ShareCardData = {
      id: card.id,
      keyword: card.keyword,
      rarity: card.rarity,
      flavorText: card.flavorText,
      cardImageUrl: card.cardImageUrl,
      createdAt: card.createdAt.toISOString(),
      owner: {
        nickname: card.user.nickname,
      },
      ogp: {
        title: `「${card.keyword}」のカード`,
        description: card.flavorText,
        imageUrl: card.cardImageUrl,
      },
    };

    return NextResponse.json({
      success: true,
      data: shareData,
    });
  } catch (error) {
    console.error('Get share card error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました',
        },
      },
      { status: 500 }
    );
  }
}
