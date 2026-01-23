import { ERROR_CODES, type ErrorCode } from '@/types/api';

/**
 * API Error クラス
 * HTTP ステータスコードとエラーコードを含むカスタムエラー
 */
export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  static unauthorized(message: string = '認証が必要です'): ApiError {
    return new ApiError(ERROR_CODES.UNAUTHORIZED, message, 401);
  }

  static forbidden(message: string = 'アクセス権限がありません'): ApiError {
    return new ApiError(ERROR_CODES.FORBIDDEN, message, 403);
  }

  static notFound(message: string = 'リソースが見つかりません'): ApiError {
    return new ApiError(ERROR_CODES.NOT_FOUND, message, 404);
  }

  static validation(message: string, details?: unknown): ApiError {
    return new ApiError(ERROR_CODES.VALIDATION_ERROR, message, 400, details);
  }

  static rateLimit(message: string = '利用制限に達しました'): ApiError {
    return new ApiError(ERROR_CODES.RATE_LIMIT_EXCEEDED, message, 429);
  }

  static moderationBlocked(message: string = 'このコンテンツは生成できません'): ApiError {
    return new ApiError(ERROR_CODES.MODERATION_BLOCKED, message, 400);
  }

  static noAvailableKeyword(message: string = 'この記事から生成できるカードはもうありません'): ApiError {
    return new ApiError(ERROR_CODES.NO_AVAILABLE_KEYWORD, message, 400);
  }

  static internal(message: string = 'サーバーエラーが発生しました'): ApiError {
    return new ApiError(ERROR_CODES.INTERNAL_ERROR, message, 500);
  }
}

/**
 * ストレージ削除エラー
 */
export class StorageError extends Error {
  public readonly paths: string[];
  public readonly cause?: Error;

  constructor(message: string, paths: string[], cause?: Error) {
    super(message);
    this.name = 'StorageError';
    this.paths = paths;
    this.cause = cause;
  }
}
