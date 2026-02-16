// Client-side exports (use in React components)
export {
  auth,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  logout,
  getIdToken,
  subscribeToAuthState,
  type User,
} from './client';

// Server-side exports (use in API routes only)
export {
  verifyIdToken,
  getUserByUid,
  deleteUser,
  updateUserEmailVerified,
  updateUserPassword,
  getUserByEmail,
  type DecodedIdToken,
} from './admin';
