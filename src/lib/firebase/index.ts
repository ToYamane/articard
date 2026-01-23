// Client-side exports (use in React components)
export {
  auth,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  logout,
  resetPassword,
  getIdToken,
  subscribeToAuthState,
  type User,
} from './client';

// Server-side exports (use in API routes only)
export { verifyIdToken, getUserByUid, deleteUser, type DecodedIdToken } from './admin';
