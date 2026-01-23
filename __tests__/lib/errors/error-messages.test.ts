import { ERROR_MESSAGES, getErrorMessage } from '@/lib/errors/error-messages';

describe('ERROR_MESSAGES', () => {
  describe('AUTH', () => {
    it('認証関連メッセージが定義されている', () => {
      expect(ERROR_MESSAGES.AUTH.UNAUTHORIZED).toBe('認証が必要です');
      expect(ERROR_MESSAGES.AUTH.SESSION_EXPIRED).toBe('セッションの有効期限が切れました');
      expect(ERROR_MESSAGES.AUTH.INVALID_TOKEN).toBe('無効なトークンです');
      expect(ERROR_MESSAGES.AUTH.LOGIN_REQUIRED).toBe('ログインしてください');
    });
  });

  describe('USER', () => {
    it('ユーザー関連メッセージが定義されている', () => {
      expect(ERROR_MESSAGES.USER.NOT_FOUND).toBe('ユーザーが見つかりません');
      expect(ERROR_MESSAGES.USER.NICKNAME_EXISTS).toBe('このニックネームは既に使用されています');
      expect(ERROR_MESSAGES.USER.DELETE_SUCCESS).toBe('アカウントが削除されました');
    });
  });

  describe('ARTICLE', () => {
    it('記事関連メッセージが定義されている', () => {
      expect(ERROR_MESSAGES.ARTICLE.NOT_FOUND).toBe('記事が見つかりません');
      expect(ERROR_MESSAGES.ARTICLE.DELETE_SUCCESS).toBe('記事を削除しました');
      expect(ERROR_MESSAGES.ARTICLE.THEME_BLOCKED).toBe('このテーマでは記事を生成できません');
    });
  });

  describe('CARD', () => {
    it('カード関連メッセージが定義されている', () => {
      expect(ERROR_MESSAGES.CARD.NOT_FOUND).toBe('カードが見つかりません');
      expect(ERROR_MESSAGES.CARD.DELETE_SUCCESS).toBe('カードを削除しました');
      expect(ERROR_MESSAGES.CARD.NO_AVAILABLE_KEYWORD).toContain('生成できるカード');
    });
  });

  describe('SHARE', () => {
    it('共有関連メッセージが定義されている', () => {
      expect(ERROR_MESSAGES.SHARE.COPY_SUCCESS).toBe('リンクをコピーしました');
      expect(ERROR_MESSAGES.SHARE.DOWNLOAD_SUCCESS).toBe('画像をダウンロードしました');
    });
  });

  describe('GENERAL', () => {
    it('一般エラーメッセージが定義されている', () => {
      expect(ERROR_MESSAGES.GENERAL.INTERNAL_ERROR).toBe('サーバーエラーが発生しました');
      expect(ERROR_MESSAGES.GENERAL.NETWORK_ERROR).toBe('ネットワークエラーが発生しました');
      expect(ERROR_MESSAGES.GENERAL.RATE_LIMIT).toContain('利用制限');
    });
  });

  describe('STORAGE', () => {
    it('ストレージ関連メッセージが定義されている', () => {
      expect(ERROR_MESSAGES.STORAGE.UPLOAD_FAILED).toBe('画像のアップロードに失敗しました');
      expect(ERROR_MESSAGES.STORAGE.DELETE_FAILED).toBe('画像の削除に失敗しました');
    });
  });
});

describe('getErrorMessage', () => {
  it('UNAUTHORIZED コードから適切なメッセージを返す', () => {
    expect(getErrorMessage('UNAUTHORIZED')).toBe(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
  });

  it('FORBIDDEN コードから適切なメッセージを返す', () => {
    expect(getErrorMessage('FORBIDDEN')).toBe(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
  });

  it('VALIDATION_ERROR コードから適切なメッセージを返す', () => {
    expect(getErrorMessage('VALIDATION_ERROR')).toBe(ERROR_MESSAGES.GENERAL.VALIDATION_ERROR);
  });

  it('RATE_LIMIT_EXCEEDED コードから適切なメッセージを返す', () => {
    expect(getErrorMessage('RATE_LIMIT_EXCEEDED')).toBe(ERROR_MESSAGES.GENERAL.RATE_LIMIT);
  });

  it('INTERNAL_ERROR コードから適切なメッセージを返す', () => {
    expect(getErrorMessage('INTERNAL_ERROR')).toBe(ERROR_MESSAGES.GENERAL.INTERNAL_ERROR);
  });

  it('MODERATION_BLOCKED コードから適切なメッセージを返す', () => {
    expect(getErrorMessage('MODERATION_BLOCKED')).toBe(ERROR_MESSAGES.ARTICLE.THEME_BLOCKED);
  });

  it('NO_AVAILABLE_KEYWORD コードから適切なメッセージを返す', () => {
    expect(getErrorMessage('NO_AVAILABLE_KEYWORD')).toBe(ERROR_MESSAGES.CARD.NO_AVAILABLE_KEYWORD);
  });

  it('USER_NOT_FOUND コードから適切なメッセージを返す', () => {
    expect(getErrorMessage('USER_NOT_FOUND')).toBe(ERROR_MESSAGES.USER.NOT_FOUND);
  });

  it('ARTICLE_NOT_FOUND コードから適切なメッセージを返す', () => {
    expect(getErrorMessage('ARTICLE_NOT_FOUND')).toBe(ERROR_MESSAGES.ARTICLE.NOT_FOUND);
  });

  it('CARD_NOT_FOUND コードから適切なメッセージを返す', () => {
    expect(getErrorMessage('CARD_NOT_FOUND')).toBe(ERROR_MESSAGES.CARD.NOT_FOUND);
  });

  it('NICKNAME_EXISTS コードから適切なメッセージを返す', () => {
    expect(getErrorMessage('NICKNAME_EXISTS')).toBe(ERROR_MESSAGES.USER.NICKNAME_EXISTS);
  });

  it('未知のコードはデフォルトメッセージを返す', () => {
    expect(getErrorMessage('UNKNOWN_ERROR_CODE')).toBe(ERROR_MESSAGES.GENERAL.UNKNOWN);
  });
});
