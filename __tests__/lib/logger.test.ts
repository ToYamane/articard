/**
 * Logger テスト
 */

import { createLogger, createRequestLogger, logger } from '@/lib/logger';

describe('Logger', () => {
  let consoleSpy: {
    log: jest.SpiedFunction<typeof console.log>;
    warn: jest.SpiedFunction<typeof console.warn>;
    error: jest.SpiedFunction<typeof console.error>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createLogger', () => {
    it('info メッセージをログ出力する', () => {
      const log = createLogger();
      log.info('test message');

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      const output = consoleSpy.log.mock.calls[0][0] as string;
      expect(output).toContain('[INFO]');
      expect(output).toContain('test message');
    });

    it('warn メッセージをログ出力する', () => {
      const log = createLogger();
      log.warn('warning message');

      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      const output = consoleSpy.warn.mock.calls[0][0] as string;
      expect(output).toContain('[WARNING]');
      expect(output).toContain('warning message');
    });

    it('error メッセージをログ出力する', () => {
      const log = createLogger();
      log.error('error message');

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      const output = consoleSpy.error.mock.calls[0][0] as string;
      expect(output).toContain('[ERROR]');
      expect(output).toContain('error message');
    });

    it('critical メッセージを error として出力する', () => {
      const log = createLogger();
      log.critical('critical message');

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      const output = consoleSpy.error.mock.calls[0][0] as string;
      expect(output).toContain('[CRITICAL]');
      expect(output).toContain('critical message');
    });

    it('debug メッセージをログ出力する', () => {
      const log = createLogger();
      log.debug('debug message');

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      const output = consoleSpy.log.mock.calls[0][0] as string;
      expect(output).toContain('[DEBUG]');
      expect(output).toContain('debug message');
    });

    it('コンテキスト付きでログ出力する', () => {
      const log = createLogger({ userId: 'user-1', path: '/api/test' });
      log.info('test message');

      const output = consoleSpy.log.mock.calls[0][0] as string;
      expect(output).toContain('user-1');
      expect(output).toContain('/api/test');
    });

    it('追加データ付きでログ出力する', () => {
      const log = createLogger();
      log.info('test message', { key: 'value' });

      const output = consoleSpy.log.mock.calls[0][0] as string;
      expect(output).toContain('key');
      expect(output).toContain('value');
    });

    it('Error オブジェクトをシリアライズする', () => {
      const log = createLogger();
      const testError = new Error('test error');
      log.error('something failed', { error: testError });

      const output = consoleSpy.error.mock.calls[0][0] as string;
      expect(output).toContain('test error');
    });
  });

  describe('createRequestLogger', () => {
    it('リクエストコンテキスト付きのロガーを作成する', () => {
      const log = createRequestLogger('req-123', '/api/test', 'user-1');
      log.info('request log');

      const output = consoleSpy.log.mock.calls[0][0] as string;
      expect(output).toContain('req-123');
      expect(output).toContain('/api/test');
      expect(output).toContain('user-1');
    });

    it('userId なしでもロガーを作成できる', () => {
      const log = createRequestLogger('req-456', '/api/test');
      log.info('request log');

      const output = consoleSpy.log.mock.calls[0][0] as string;
      expect(output).toContain('req-456');
    });
  });

  describe('default logger', () => {
    it('デフォルトロガーが利用可能', () => {
      logger.info('default logger test');

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      const output = consoleSpy.log.mock.calls[0][0] as string;
      expect(output).toContain('default logger test');
    });
  });
});
