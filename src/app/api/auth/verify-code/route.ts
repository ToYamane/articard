import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/api/with-auth';
import { getUserByUid, updateUserEmailVerified } from '@/lib/firebase/admin';
import { verifyCodeSchema } from '@/lib/validations/auth';

const MAX_ATTEMPTS = 5;

export const POST = withAuth(
  async (authUser, req) => {
    const body = await req.json();
    const parsed = verifyCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
        },
        { status: 400 }
      );
    }

    const { code } = parsed.data;

    // Get Firebase user's email
    const firebaseUser = await getUserByUid(authUser.uid);
    const email = firebaseUser.email;
    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'メールアドレスが設定されていません' },
        },
        { status: 400 }
      );
    }

    // Find matching code
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
        purpose: 'email_verify',
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
            message: '認証コードが見つかりません。再送信してください。',
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
            message: `認証コードが正しくありません。残り${remaining}回`,
          },
        },
        { status: 400 }
      );
    }

    // Success: update Firebase user and clean up
    await updateUserEmailVerified(authUser.uid);
    await prisma.emailVerification.delete({ where: { id: verification.id } });

    return { verified: true };
  },
  { rateLimit: 'standard' }
);
