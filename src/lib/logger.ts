/**
 * 構造化ロガー
 * Cloud Logging 互換 JSON 出力（severity フィールド付き）
 * 開発環境は人間可読形式、本番は JSON
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

interface LogContext {
  requestId?: string;
  userId?: string;
  path?: string;
  [key: string]: unknown;
}

interface LogEntry {
  severity: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error.cause ? { cause: serializeError(error.cause) } : {}),
    };
  }
  return { value: String(error) };
}

const isProduction = process.env.NODE_ENV === 'production';

function formatLog(entry: LogEntry): string {
  if (isProduction) {
    return JSON.stringify(entry);
  }

  // 開発環境: 人間可読形式
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { severity, message, timestamp, ...rest } = entry;
  const ctx = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
  return `[${severity}] ${message}${ctx}`;
}

function writeLog(level: LogLevel, entry: LogEntry) {
  const output = formatLog(entry);
  if (level === 'ERROR' || level === 'CRITICAL') {
    console.error(output);
  } else if (level === 'WARNING') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

function createLogMethod(level: LogLevel, baseContext: LogContext) {
  return (message: string, extra?: Record<string, unknown>) => {
    const entry: LogEntry = {
      severity: level,
      message,
      timestamp: new Date().toISOString(),
      ...baseContext,
      ...extra,
    };

    // error フィールドがある場合はシリアライズ
    if (extra?.error) {
      entry.error = serializeError(extra.error);
    }

    writeLog(level, entry);
  };
}

export interface Logger {
  debug: (message: string, extra?: Record<string, unknown>) => void;
  info: (message: string, extra?: Record<string, unknown>) => void;
  warn: (message: string, extra?: Record<string, unknown>) => void;
  error: (message: string, extra?: Record<string, unknown>) => void;
  critical: (message: string, extra?: Record<string, unknown>) => void;
}

export function createLogger(context: LogContext = {}): Logger {
  return {
    debug: createLogMethod('DEBUG', context),
    info: createLogMethod('INFO', context),
    warn: createLogMethod('WARNING', context),
    error: createLogMethod('ERROR', context),
    critical: createLogMethod('CRITICAL', context),
  };
}

/**
 * リクエストスコープのロガーを作成
 */
export function createRequestLogger(
  requestId: string,
  path: string,
  userId?: string
): Logger {
  return createLogger({ requestId, path, userId });
}

/** デフォルトのロガー（コンテキストなし） */
export const logger = createLogger();
