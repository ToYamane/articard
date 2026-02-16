import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/api/with-auth';
import { getUserByUid } from '@/lib/firebase/admin';
import { sendVerificationCode } from '@/lib/email/resend';

const CODE_EXPIRY_MINUTES = 10;

export const POST = withAuth(
  async (authUser) => {
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

    if (firebaseUser.emailVerified) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'メールアドレスは既に認証済みです' },
        },
        { status: 400 }
      );
    }

    // Delete existing codes for this email/purpose
    await prisma.emailVerification.deleteMany({
      where: { email, purpose: 'email_verify' },
    });

    // Generate 6-digit code
    const code = String(crypto.randomInt(100000, 999999));

    // Save to DB
    await prisma.emailVerification.create({
      data: {
        email,
        code,
        purpose: 'email_verify',
        expiresAt: new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000),
      },
    });

    // Send email
    await sendVerificationCode(email, code);

    return { sent: true };
  },
  { rateLimit: 'standard' }
);
