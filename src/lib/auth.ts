import { NextRequest } from 'next/server';
import { verifyIdToken, type DecodedIdToken } from './firebase/admin';

export interface AuthUser {
  uid: string;
  email: string | undefined;
  emailVerified: boolean;
}

/**
 * Extract and verify the Firebase ID token from request headers
 */
export async function verifyAuth(req: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return null;
    }

    const decodedToken = await verifyIdToken(token);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified ?? false,
    };
  } catch (error) {
    console.error('Auth verification failed:', error);
    return null;
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  const user = await verifyAuth(req);

  if (!user) {
    throw new AuthError('認証が必要です');
  }

  return user;
}

/**
 * Custom error class for authentication errors
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export { type DecodedIdToken };
