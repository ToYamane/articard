import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getUserByEmail, updateUserPassword } from '@/lib/firebase/admin';
import { resetPasswordSchema } from '@/lib/validations/auth';
import { handleApiError } from '@/lib/errors';
import { createRequestLogger } from '@/lib/logger';

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const log = createRequestLogger(requestId, '/api/auth/reset-password');

  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
        },
        { status: 400 }
      );
    }

    const { email, code, newPassword } = parsed.data;

    // Find matching code
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
        purpose: 'password_reset',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'リセットコードが見つかりません。再送信してください。',
          },
        },
        { status: 400 }
      );
    }

    // Check attempts
    if (verification.attempts >= MAX_ATTEMPTS) {
      await prisma.emailVerification.delete({ where: { id: verification.id } });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '試行回数の上限に達しました。コードを再送信してください。',
          },
        },
        { status: 400 }
      );
    }

    // Increment attempts
    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 } },
    });

    // Verify code
    if (verification.code !== code) {
      const remaining = MAX_ATTEMPTS - verification.attempts - 1;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `コードが正しくありません。残り${remaining}回`,
          },
        },
        { status: 400 }
      );
    }

    // Get Firebase user and update password
    const firebaseUser = await getUserByEmail(email);
    await updateUserPassword(firebaseUser.uid, newPassword);

    // Clean up
    await prisma.emailVerification.delete({ where: { id: verification.id } });

    return NextResponse.json({ success: true, data: { reset: true } });
  } catch (error) {
    log.error('Reset password error', { error });
    return handleApiError(error);
  }
}
