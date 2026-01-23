import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import type { Rarity } from '@/types/database';

// GET /api/stats - ユーザーの統計情報を取得
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      );
    }

    const userId = user.uid;

    // 総カード数とレア度別カウントを取得
    const [totalCards, rarityGroups, knowledgePoints] = await Promise.all([
      prisma.card.count({
        where: { userId },
      }),
      prisma.card.groupBy({
        by: ['rarity'],
        where: { userId },
        _count: {
          rarity: true,
        },
      }),
      prisma.knowledgeTransaction.aggregate({
        where: { userId },
        _sum: {
          amount: true,
        },
      }),
    ]);

    // レア度別内訳を整形
    const rarityBreakdown: Record<Rarity, number> = {
      common: 0,
      uncommon: 0,
      rare: 0,
      super_rare: 0,
      legend: 0,
    };

    for (const group of rarityGroups) {
      rarityBreakdown[group.rarity as Rarity] = group._count.rarity;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalCards,
        rarityBreakdown,
        totalKnowledgePoints: knowledgePoints._sum.amount || 0,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '統計情報の取得に失敗しました',
        },
      },
      { status: 500 }
    );
  }
}
