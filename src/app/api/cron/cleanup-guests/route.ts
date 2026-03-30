import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { batchDeleteCardImages } from '@/lib/gcs/storage';
import { deleteUser as deleteFirebaseUser } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

const GUEST_EXPIRATION_DAYS = 7;

export async function POST(req: NextRequest) {
  // CRONシークレットで認証
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const expirationDate = new Date(Date.now() - GUEST_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

  try {
    // 期限切れゲストユーザーを取得
    const staleGuests = await prisma.user.findMany({
      where: {
        isGuest: true,
        lastActiveAt: { lt: expirationDate },
      },
      include: {
        cards: { select: { id: true } },
      },
    });

    if (staleGuests.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    let deletedCount = 0;

    for (const guest of staleGuests) {
      try {
        // 1. GCS画像削除
        const cardIds = guest.cards.map((c) => c.id);
        if (cardIds.length > 0) {
          try {
            await batchDeleteCardImages(cardIds);
          } catch (error) {
            logger.error('Failed to delete GCS images for guest', {
              userId: guest.id,
              error,
            });
          }
        }

        // 2. DB削除（Cascade で関連データも削除）
        await prisma.user.delete({ where: { id: guest.id } });

        // 3. Firebase匿名ユーザー削除
        try {
          await deleteFirebaseUser(guest.id);
        } catch (error) {
          logger.error('Failed to delete Firebase user', {
            userId: guest.id,
            error,
          });
        }

        deletedCount++;
      } catch (error) {
        logger.error('Failed to cleanup guest user', {
          userId: guest.id,
          error,
        });
      }
    }

    logger.info('Guest cleanup completed', {
      total: staleGuests.length,
      deleted: deletedCount,
    });

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      total: staleGuests.length,
    });
  } catch (error) {
    logger.error('Guest cleanup failed', { error });
    return NextResponse.json({ success: false, error: 'Cleanup failed' }, { status: 500 });
  }
}
