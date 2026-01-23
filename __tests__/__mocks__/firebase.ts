// Firebase モック

// モックユーザー
export const mockFirebaseUser = {
  uid: 'test-user-id-123',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
  getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
  getIdTokenResult: jest.fn().mockResolvedValue({
    token: 'mock-id-token',
    claims: {},
  }),
};

// Firebase Auth モック
export const mockFirebaseAuth = {
  currentUser: mockFirebaseUser,
  onAuthStateChanged: jest.fn((callback: (user: typeof mockFirebaseUser | null) => void) => {
    callback(mockFirebaseUser);
    return jest.fn(); // unsubscribe function
  }),
  signInWithEmailAndPassword: jest.fn().mockResolvedValue({
    user: mockFirebaseUser,
  }),
  createUserWithEmailAndPassword: jest.fn().mockResolvedValue({
    user: mockFirebaseUser,
  }),
  signInWithPopup: jest.fn().mockResolvedValue({
    user: mockFirebaseUser,
  }),
  signOut: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
};

// Firebase Admin SDK モック（サーバーサイド用）
export const mockFirebaseAdmin = {
  auth: () => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      uid: mockFirebaseUser.uid,
      email: mockFirebaseUser.email,
    }),
    getUser: jest.fn().mockResolvedValue({
      uid: mockFirebaseUser.uid,
      email: mockFirebaseUser.email,
      displayName: mockFirebaseUser.displayName,
    }),
    deleteUser: jest.fn().mockResolvedValue(undefined),
    createUser: jest.fn().mockResolvedValue({
      uid: 'new-user-id',
      email: 'new@example.com',
    }),
  }),
};

// デコードされたトークンのモック
export const mockDecodedToken = {
  uid: mockFirebaseUser.uid,
  email: mockFirebaseUser.email,
  aud: 'test-project',
  auth_time: Date.now() / 1000,
  exp: Date.now() / 1000 + 3600,
  iat: Date.now() / 1000,
  iss: 'https://securetoken.google.com/test-project',
  sub: mockFirebaseUser.uid,
};

// 認証エラーのモック
export const mockAuthErrors = {
  invalidEmail: {
    code: 'auth/invalid-email',
    message: 'The email address is badly formatted.',
  },
  userNotFound: {
    code: 'auth/user-not-found',
    message: 'There is no user record corresponding to this identifier.',
  },
  wrongPassword: {
    code: 'auth/wrong-password',
    message: 'The password is invalid.',
  },
  emailAlreadyInUse: {
    code: 'auth/email-already-in-use',
    message: 'The email address is already in use by another account.',
  },
  weakPassword: {
    code: 'auth/weak-password',
    message: 'Password should be at least 6 characters.',
  },
  tooManyRequests: {
    code: 'auth/too-many-requests',
    message: 'We have blocked all requests from this device due to unusual activity.',
  },
};

// ログイン成功をモック
export function mockLoginSuccess() {
  mockFirebaseAuth.signInWithEmailAndPassword.mockResolvedValue({
    user: mockFirebaseUser,
  });
}

// ログイン失敗をモック
export function mockLoginFailure(errorType: keyof typeof mockAuthErrors) {
  mockFirebaseAuth.signInWithEmailAndPassword.mockRejectedValue(mockAuthErrors[errorType]);
}

// トークン検証成功をモック
export function mockVerifyTokenSuccess() {
  mockFirebaseAdmin.auth().verifyIdToken.mockResolvedValue(mockDecodedToken);
}

// トークン検証失敗をモック
export function mockVerifyTokenFailure() {
  mockFirebaseAdmin.auth().verifyIdToken.mockRejectedValue(new Error('Invalid token'));
}

// 未認証状態をモック
export function mockUnauthenticated() {
  (mockFirebaseAuth as { currentUser: typeof mockFirebaseUser | null }).currentUser = null;
  mockFirebaseAuth.onAuthStateChanged.mockImplementation(
    (callback: (user: null) => void) => {
      callback(null);
      return jest.fn();
    }
  );
}

// 認証状態をリセット
export function resetFirebaseMock() {
  mockFirebaseAuth.currentUser = mockFirebaseUser;
  mockFirebaseAuth.onAuthStateChanged.mockImplementation(
    (callback: (user: typeof mockFirebaseUser) => void) => {
      callback(mockFirebaseUser);
      return jest.fn();
    }
  );
  mockFirebaseAuth.signInWithEmailAndPassword.mockReset();
  mockFirebaseAuth.createUserWithEmailAndPassword.mockReset();
  mockFirebaseAuth.signInWithPopup.mockReset();
  mockFirebaseAuth.signOut.mockReset();
  mockFirebaseAuth.sendPasswordResetEmail.mockReset();
  mockFirebaseUser.getIdToken.mockReset().mockResolvedValue('mock-id-token');
}
