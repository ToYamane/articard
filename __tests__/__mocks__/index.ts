// モックエクスポート

export * from './openai';
export * from './flux';
export * from './firebase';

// 全モックリセット
export function resetAllMocks() {
  const { resetOpenAIMock } = require('./openai');
  const { resetFluxMock, resetFetchMock } = require('./flux');
  const { resetFirebaseMock } = require('./firebase');

  resetOpenAIMock();
  resetFluxMock();
  resetFetchMock();
  resetFirebaseMock();
}
