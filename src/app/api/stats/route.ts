import { withAuth } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import type { Rarity } from '@/types/database';

interface StatsResponse {
  totalCards: number;
  totalArticles: number;
  rarityBreakdown: Record<Rarity, number>;
  totalKnowledgePoints: number;
}

// GET /api/stats - ユーザーの統計情報を取得
export const GET = withAuth<StatsResponse>(async (authUser) => {
  const [totalCards, totalArticles, rarityGroups, knowledgePoints] = await Promise.all([
    prisma.card.count({
      where: { userId: authUser.uid },
    }),
    prisma.article.count({
      where: { userId: authUser.uid },
    }),
    prisma.card.groupBy({
      by: ['rarity'],
      where: { userId: authUser.uid },
      _count: {
        rarity: true,
      },
    }),
    prisma.knowledgeTransaction.aggregate({
      where: { userId: authUser.uid },
      _sum: {
        amount: true,
      },
    }),
  ]);

  // レア度別内訳を整形
  const rarityBreakdown: Record<Rarity, number> = {
    common: 0,
    rare: 0,
    super_rare: 0,
    legend: 0,
  };

  for (const group of rarityGroups) {
    rarityBreakdown[group.rarity as Rarity] = group._count.rarity;
  }

  return {
    totalCards,
    totalArticles,
    rarityBreakdown,
    totalKnowledgePoints: knowledgePoints._sum.amount || 0,
  };
});
