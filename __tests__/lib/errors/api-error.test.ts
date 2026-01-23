import { ApiError, StorageError } from '@/lib/errors/api-error';

describe('ApiError', () => {
  describe('コンストラクタ', () => {
    it('基本的なエラーを作成できる', () => {
      const error = new ApiError('INTERNAL_ERROR', 'テストエラー', 500);

      expect(error.name).toBe('ApiError');
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.message).toBe('テストエラー');
      expect(error.statusCode).toBe(500);
      expect(error.details).toBeUndefined();
    });

    it('詳細情報を含むエラーを作成できる', () => {
      const details = { field: 'email', reason: 'invalid' };
      const error = new ApiError('VALIDATION_ERROR', 'バリデーションエラー', 400, details);

      expect(error.details).toEqual(details);
    });

    it('デフォルトのステータスコードは500', () => {
      const error = new ApiError('INTERNAL_ERROR', 'テストエラー');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('静的ファクトリメソッド', () => {
    describe('unauthorized', () => {
      it('デフォルトメッセージで作成できる', () => {
        const error = ApiError.unauthorized();

        expect(error.code).toBe('UNAUTHORIZED');
        expect(error.message).toBe('認証が必要です');
        expect(error.statusCode).toBe(401);
      });

      it('カスタムメッセージで作成できる', () => {
        const error = ApiError.unauthorized('ログインしてください');

        expect(error.message).toBe('ログインしてください');
      });
    });

    describe('forbidden', () => {
      it('デフォルトメッセージで作成できる', () => {
        const error = ApiError.forbidden();

        expect(error.code).toBe('FORBIDDEN');
        expect(error.message).toBe('アクセス権限がありません');
        expect(error.statusCode).toBe(403);
      });
    });

    describe('notFound', () => {
      it('デフォルトメッセージで作成できる', () => {
        const error = ApiError.notFound();

        expect(error.code).toBe('NOT_FOUND');
        expect(error.message).toBe('リソースが見つかりません');
        expect(error.statusCode).toBe(404);
      });

      it('カスタムメッセージで作成できる', () => {
        const error = ApiError.notFound('カードが見つかりません');

        expect(error.message).toBe('カードが見つかりません');
      });
    });

    describe('validation', () => {
      it('メッセージと詳細で作成できる', () => {
        const details = [{ field: 'theme', message: '必須です' }];
        const error = ApiError.validation('入力エラー', details);

        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.message).toBe('入力エラー');
        expect(error.statusCode).toBe(400);
        expect(error.details).toEqual(details);
      });
    });

    describe('rateLimit', () => {
      it('デフォルトメッセージで作成できる', () => {
        const error = ApiError.rateLimit();

        expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(error.message).toBe('利用制限に達しました');
        expect(error.statusCode).toBe(429);
      });
    });

    describe('moderationBlocked', () => {
      it('デフォルトメッセージで作成できる', () => {
        const error = ApiError.moderationBlocked();

        expect(error.code).toBe('MODERATION_BLOCKED');
        expect(error.message).toBe('このコンテンツは生成できません');
        expect(error.statusCode).toBe(400);
      });
    });

    describe('noAvailableKeyword', () => {
      it('デフォルトメッセージで作成できる', () => {
        const error = ApiError.noAvailableKeyword();

        expect(error.code).toBe('NO_AVAILABLE_KEYWORD');
        expect(error.message).toBe('この記事から生成できるカードはもうありません');
        expect(error.statusCode).toBe(400);
      });
    });

    describe('internal', () => {
      it('デフォルトメッセージで作成できる', () => {
        const error = ApiError.internal();

        expect(error.code).toBe('INTERNAL_ERROR');
        expect(error.message).toBe('サーバーエラーが発生しました');
        expect(error.statusCode).toBe(500);
      });
    });
  });

  describe('継承', () => {
    it('Errorを継承している', () => {
      const error = ApiError.internal();
      expect(error instanceof Error).toBe(true);
      expect(error instanceof ApiError).toBe(true);
    });

    it('スタックトレースを持つ', () => {
      const error = ApiError.internal();
      expect(error.stack).toBeDefined();
    });
  });
});

describe('StorageError', () => {
  it('基本的なエラーを作成できる', () => {
    const paths = ['cards/123.jpg', 'thumbnails/123.jpg'];
    const error = new StorageError('削除に失敗しました', paths);

    expect(error.name).toBe('StorageError');
    expect(error.message).toBe('削除に失敗しました');
    expect(error.paths).toEqual(paths);
    expect(error.cause).toBeUndefined();
  });

  it('原因エラーを含むエラーを作成できる', () => {
    const paths = ['cards/123.jpg'];
    const cause = new Error('ネットワークエラー');
    const error = new StorageError('削除に失敗しました', paths, cause);

    expect(error.cause).toBe(cause);
  });

  it('Errorを継承している', () => {
    const error = new StorageError('テスト', []);
    expect(error instanceof Error).toBe(true);
    expect(error instanceof StorageError).toBe(true);
  });
});
