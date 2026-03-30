import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  linkWithCredential,
  linkWithPopup,
  EmailAuthProvider,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase App (singleton)
let app: FirebaseApp;
let auth: Auth;

if (typeof window !== 'undefined') {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
}

// Auth providers
const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Create a new user with email and password
 */
export async function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

/**
 * Sign in anonymously (guest mode)
 */
export async function signInAsGuest() {
  return signInAnonymously(auth);
}

/**
 * Link anonymous account with email/password
 */
export async function linkWithEmail(email: string, password: string) {
  const credential = EmailAuthProvider.credential(email, password);
  return linkWithCredential(auth.currentUser!, credential);
}

/**
 * Link anonymous account with Google
 */
export async function linkWithGoogle() {
  return linkWithPopup(auth.currentUser!, googleProvider);
}

/**
 * Sign out the current user
 */
export async function logout() {
  return signOut(auth);
}

/**
 * Get the current user's ID token
 */
export async function getIdToken(): Promise<string | null> {
  const user = auth?.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

/**
 * Subscribe to auth state changes
 */
export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export { auth, type User };
