// API response types for Articard

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// Common error codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  MODERATION_BLOCKED: 'MODERATION_BLOCKED',
  NO_AVAILABLE_KEYWORD: 'NO_AVAILABLE_KEYWORD',
  INSUFFICIENT_COINS: 'INSUFFICIENT_COINS',
  NICKNAME_EXISTS: 'NICKNAME_EXISTS',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// Pagination types
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}
