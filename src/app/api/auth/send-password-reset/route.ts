import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getUserByEmail } from '@/lib/firebase/admin';
import { sendPasswordResetCode } from '@/lib/email/resend';
import { sendPasswordResetSchema } from '@/lib/validations/auth';
import { handleApiError } from '@/lib/errors';
import { createRequestLogger } from '@/lib/logger';

const CODE_EXPIRY_MINUTES = 10;
const RATE_LIMIT_SECONDS = 60;

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const log = createRequestLogger(requestId, '/api/auth/send-password-reset');

  try {
    const body = await req.json();
    const parsed = sendPasswordResetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message },
        },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Rate limit: check if a code was sent recently
    const recentCode = await prisma.emailVerification.findFirst({
      where: {
        email,
        purpose: 'password_reset',
        createdAt: { gt: new Date(Date.now() - RATE_LIMIT_SECONDS * 1000) },
      },
    });

    if (recentCode) {
      // Still return success to prevent information leakage
      return NextResponse.json({ success: true, data: { sent: true } });
    }

    // Check if user exists in Firebase (don't reveal if not found)
    let userExists = false;
    try {
      await getUserByEmail(email);
      userExists = true;
    } catch {
      // User not found — silently succeed
    }

    if (userExists) {
      // Delete existing codes for this email/purpose
      await prisma.emailVerification.deleteMany({
        where: { email, purpose: 'password_reset' },
      });

      // Generate 6-digit code
      const code = String(crypto.randomInt(100000, 999999));

      // Save to DB
      await prisma.emailVerification.create({
        data: {
          email,
          code,
          purpose: 'password_reset',
          expiresAt: new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000),
        },
      });

      // Send email
      await sendPasswordResetCode(email, code);
    }

    // Always return success (information leakage prevention)
    return NextResponse.json({ success: true, data: { sent: true } });
  } catch (error) {
    log.error('Send password reset error', { error });
    return handleApiError(error);
  }
}
