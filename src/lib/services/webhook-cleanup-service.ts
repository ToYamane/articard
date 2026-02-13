import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const CLEANUP_DAYS = 7;

/**
 * 古い Webhook イベントレコードを削除
 * 7日以上前のレコードを削除してテーブル肥大化を防ぐ
 */
export async function cleanupOldWebhookEvents(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - CLEANUP_DAYS);

  const result = await prisma.stripeWebhookEvent.deleteMany({
    where: {
      processedAt: { lt: cutoff },
    },
  });

  if (result.count > 0) {
    logger.info(`Cleaned up ${result.count} old webhook events`);
  }

  return result.count;
}
