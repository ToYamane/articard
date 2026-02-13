import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';
import { cleanupOldWebhookEvents } from '@/lib/services/webhook-cleanup-service';
import { createRequestLogger } from '@/lib/logger';
import type { ApiResponse } from '@/types/api';

// POST /api/admin/webhook-cleanup - 古いWebhookイベントを削除（開発者のみ）
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ deletedCount: number }>>> {
  try {
    const authUser = await verifyAuth(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      );
    }

    const requestId = req.headers.get('x-request-id') || '';
    const log = createRequestLogger(requestId, '/api/admin/webhook-cleanup', authUser.uid);

    // 開発者チェック
    const user = await prisma.user.findUnique({
      where: { id: authUser.uid },
      select: { isDeveloper: true },
    });

    if (!user?.isDeveloper) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '開発者のみ利用可能です' } },
        { status: 403 }
      );
    }

    const deletedCount = await cleanupOldWebhookEvents();

    log.info(`Webhook cleanup completed: ${deletedCount} events deleted`);

    return NextResponse.json({
      success: true,
      data: { deletedCount },
    });
  } catch (error) {
    const requestId = req.headers.get('x-request-id') || '';
    const log = createRequestLogger(requestId, '/api/admin/webhook-cleanup');
    log.error('Webhook cleanup error', { error });
    return handleApiError(error);
  }
}
