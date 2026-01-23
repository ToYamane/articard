/**
 * エラーメッセージ定数
 * UI表示用のエラーメッセージを一元管理
 */

export const ERROR_MESSAGES = {
  // 認証関連
  AUTH: {
    UNAUTHORIZED: '認証が必要です',
    SESSION_EXPIRED: 'セッションの有効期限が切れました',
    INVALID_TOKEN: '無効なトークンです',
    LOGIN_REQUIRED: 'ログインしてください',
  },

  // ユーザー関連
  USER: {
    NOT_FOUND: 'ユーザーが見つかりません',
    NICKNAME_EXISTS: 'このニックネームは既に使用されています',
    NICKNAME_REQUIRED: 'ニックネームを入力してください',
    DELETE_CONFIRM: 'アカウントを削除すると、すべてのデータが失われます。本当に削除しますか？',
    DELETE_SUCCESS: 'アカウントが削除されました',
    DELETE_FAILED: 'アカウントの削除に失敗しました',
  },

  // 記事関連
  ARTICLE: {
    NOT_FOUND: '記事が見つかりません',
    GENERATION_FAILED: '記事の生成に失敗しました',
    DELETE_CONFIRM: 'この記事を削除すると、関連するすべてのカードも削除されます。本当に削除しますか？',
    DELETE_SUCCESS: '記事を削除しました',
    DELETE_FAILED: '記事の削除に失敗しました',
    THEME_BLOCKED: 'このテーマでは記事を生成できません',
  },

  // カード関連
  CARD: {
    NOT_FOUND: 'カードが見つかりません',
    GENERATION_FAILED: 'カードの生成に失敗しました',
    DELETE_CONFIRM: 'このカードを削除しますか？この操作は取り消せません。',
    DELETE_SUCCESS: 'カードを削除しました',
    DELETE_FAILED: 'カードの削除に失敗しました',
    NO_AVAILABLE_KEYWORD: 'この記事から生成できるカードはもうありません。別の記事でお試しください',
    IMAGE_GENERATION_FAILED: 'カード画像の生成に失敗しました',
  },

  // 共有関連
  SHARE: {
    COPY_SUCCESS: 'リンクをコピーしました',
    COPY_FAILED: 'リンクのコピーに失敗しました',
    DOWNLOAD_SUCCESS: '画像をダウンロードしました',
    DOWNLOAD_FAILED: '画像のダウンロードに失敗しました',
  },

  // 一般エラー
  GENERAL: {
    INTERNAL_ERROR: 'サーバーエラーが発生しました',
    NETWORK_ERROR: 'ネットワークエラーが発生しました',
    RATE_LIMIT: '利用制限に達しました。しばらく待ってからお試しください',
    VALIDATION_ERROR: '入力内容に誤りがあります',
    UNKNOWN: '予期しないエラーが発生しました',
    TRY_AGAIN: 'もう一度お試しください',
  },

  // ストレージ関連
  STORAGE: {
    UPLOAD_FAILED: '画像のアップロードに失敗しました',
    DELETE_FAILED: '画像の削除に失敗しました',
  },
} as const;

/**
 * エラーコードからユーザー向けメッセージを取得
 */
export function getErrorMessage(code: string): string {
  const messageMap: Record<string, string> = {
    UNAUTHORIZED: ERROR_MESSAGES.AUTH.UNAUTHORIZED,
    FORBIDDEN: ERROR_MESSAGES.AUTH.UNAUTHORIZED,
    NOT_FOUND: ERROR_MESSAGES.GENERAL.UNKNOWN,
    VALIDATION_ERROR: ERROR_MESSAGES.GENERAL.VALIDATION_ERROR,
    RATE_LIMIT_EXCEEDED: ERROR_MESSAGES.GENERAL.RATE_LIMIT,
    INTERNAL_ERROR: ERROR_MESSAGES.GENERAL.INTERNAL_ERROR,
    MODERATION_BLOCKED: ERROR_MESSAGES.ARTICLE.THEME_BLOCKED,
    NO_AVAILABLE_KEYWORD: ERROR_MESSAGES.CARD.NO_AVAILABLE_KEYWORD,
    USER_NOT_FOUND: ERROR_MESSAGES.USER.NOT_FOUND,
    ARTICLE_NOT_FOUND: ERROR_MESSAGES.ARTICLE.NOT_FOUND,
    CARD_NOT_FOUND: ERROR_MESSAGES.CARD.NOT_FOUND,
    NICKNAME_EXISTS: ERROR_MESSAGES.USER.NICKNAME_EXISTS,
  };

  return messageMap[code] || ERROR_MESSAGES.GENERAL.UNKNOWN;
}
