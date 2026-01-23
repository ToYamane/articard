import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth, type DecodedIdToken } from 'firebase-admin/auth';

let app: App;
let adminAuth: Auth;

function getFirebaseAdmin() {
  if (getApps().length === 0) {
    // Initialize Firebase Admin SDK
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  } else {
    app = getApps()[0];
  }

  adminAuth = getAuth(app);
  return { app, adminAuth };
}

/**
 * Verify a Firebase ID token
 */
export async function verifyIdToken(token: string): Promise<DecodedIdToken> {
  const { adminAuth } = getFirebaseAdmin();
  return adminAuth.verifyIdToken(token);
}

/**
 * Get user by UID
 */
export async function getUserByUid(uid: string) {
  const { adminAuth } = getFirebaseAdmin();
  return adminAuth.getUser(uid);
}

/**
 * Delete a user by UID
 */
export async function deleteUser(uid: string) {
  const { adminAuth } = getFirebaseAdmin();
  return adminAuth.deleteUser(uid);
}

export { type DecodedIdToken };
