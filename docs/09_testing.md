# 09. テスト方針

## 9.1 概要

本プロジェクトでは、API・ビジネスロジックに焦点を当てたテスト戦略を採用する。
フロントエンドコンポーネントやE2Eテストは対象外とし、バックエンドの品質担保を優先する。

## 9.2 テスト対象

### 対象

| カテゴリ | 対象 | ツール |
|---------|------|--------|
| API Routes | 全エンドポイント | Jest + supertest |
| ビジネスロジック | レア度計算、キーワード抽出等 | Jest |
| データベース | Prismaクエリ、トランザクション | Jest + Prisma |
| バリデーション | Zodスキーマ | Jest |

### 対象外

- React コンポーネント
- E2E テスト（Playwright等）
- スタイリング / UI

## 9.3 テストツール

```json
{
  "devDependencies": {
    "jest": "^29.x",
    "@types/jest": "^29.x",
    "ts-jest": "^29.x",
    "supertest": "^6.x",
    "@types/supertest": "^2.x"
  }
}
```

## 9.4 ディレクトリ構成

```
src/
├── lib/
│   ├── rarity.ts
│   ├── rarity.test.ts          # ユニットテスト
│   ├── keyword-extraction.ts
│   └── keyword-extraction.test.ts
├── app/
│   └── api/
│       ├── articles/
│       │   ├── route.ts
│       │   └── route.test.ts   # API テスト
│       └── cards/
│           ├── route.ts
│           └── route.test.ts
└── __tests__/
    └── integration/            # 統合テスト
        └── card-generation.test.ts
```

## 9.5 テストケース

### 9.5.1 レア度計算 (`lib/rarity.test.ts`)

```typescript
describe('calculateRarity', () => {
  describe('文脈スコア計算', () => {
    it('歴史的出来事は+40点', () => {
      const score = calculateContextScore('historical_event');
      expect(score).toBe(40);
    });

    it('神話・伝説は+35点', () => {
      const score = calculateContextScore('myth_legend');
      expect(score).toBe(35);
    });

    it('一般的は+5点', () => {
      const score = calculateContextScore('general');
      expect(score).toBe(5);
    });
  });

  describe('レア度判定', () => {
    it('90点以上はレジェンド', () => {
      const rarity = determineRarity(95);
      expect(rarity).toBe('legend');
    });

    it('70-89点はスーパーレア', () => {
      const rarity = determineRarity(75);
      expect(rarity).toBe('super_rare');
    });

    it('50-69点はレア', () => {
      const rarity = determineRarity(55);
      expect(rarity).toBe('rare');
    });

    it('30-49点はアンコモン', () => {
      const rarity = determineRarity(35);
      expect(rarity).toBe('uncommon');
    });

    it('29点以下はコモン', () => {
      const rarity = determineRarity(20);
      expect(rarity).toBe('common');
    });
  });
});
```

### 9.5.2 キーワード重複チェック (`lib/keyword.test.ts`)

```typescript
describe('selectAvailableKeyword', () => {
  it('未使用のキーワードから選択される', async () => {
    const extracted = ['りんご', '重力', 'ニュートン'];
    const used = ['りんご'];

    const result = await selectAvailableKeyword(extracted, used);

    expect(['重力', 'ニュートン']).toContain(result);
    expect(result).not.toBe('りんご');
  });

  it('全キーワードが使用済みの場合はエラー', async () => {
    const extracted = ['りんご', '重力'];
    const used = ['りんご', '重力'];

    await expect(
      selectAvailableKeyword(extracted, used)
    ).rejects.toThrow('この記事から生成できるカードはもうありません');
  });
});
```

### 9.5.3 API テスト (`app/api/articles/route.test.ts`)

```typescript
import { createMocks } from 'node-mocks-http';
import { POST } from './route';

describe('POST /api/articles', () => {
  it('正常なテーマで記事が生成される', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { theme: '万有引力の発見' },
    });

    // モック設定
    jest.spyOn(auth, 'verifyAuth').mockResolvedValue({ uid: 'user123' });
    jest.spyOn(moderation, 'checkModeration').mockResolvedValue({ flagged: false });
    jest.spyOn(openai, 'generateArticle').mockResolvedValue({
      content: '記事本文...',
      model: 'gpt-4o-mini',
      tokenUsage: 500,
    });

    await POST(req as any);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.theme).toBe('万有引力の発見');
  });

  it('認証なしでは401エラー', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { theme: 'テスト' },
    });

    jest.spyOn(auth, 'verifyAuth').mockResolvedValue(null);

    await POST(req as any);

    expect(res._getStatusCode()).toBe(401);
  });

  it('不適切なテーマは400エラー', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { theme: '不適切なコンテンツ' },
    });

    jest.spyOn(auth, 'verifyAuth').mockResolvedValue({ uid: 'user123' });
    jest.spyOn(moderation, 'checkModeration').mockResolvedValue({ flagged: true });

    await POST(req as any);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error.code).toBe('MODERATION_BLOCKED');
  });

  it('テーマが短すぎると400エラー', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { theme: 'a' },
    });

    jest.spyOn(auth, 'verifyAuth').mockResolvedValue({ uid: 'user123' });

    await POST(req as any);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });
});
```

### 9.5.4 削除API テスト

```typescript
describe('DELETE /api/cards/:id', () => {
  it('所有するカードを削除できる', async () => {
    // テスト実装
  });

  it('他人のカードは削除できない', async () => {
    // 403エラーを期待
  });

  it('存在しないカードは404エラー', async () => {
    // 404エラーを期待
  });
});

describe('DELETE /api/articles/:id', () => {
  it('記事削除で関連カードも連動削除される', async () => {
    // deletedCardsCount を検証
  });
});
```

## 9.6 モック戦略

### 外部サービスのモック

```typescript
// OpenAI API
jest.mock('@/lib/openai', () => ({
  generateArticle: jest.fn(),
  extractKeywords: jest.fn(),
  generateFlavorText: jest.fn(),
}));

// FLUX API (画像生成)
jest.mock('@/lib/flux', () => ({
  generateIllustration: jest.fn(),
}));

// Firebase Auth
jest.mock('@/lib/auth', () => ({
  verifyAuth: jest.fn(),
}));
```

### データベースのモック

```typescript
// Prisma Client のモック
jest.mock('@/lib/prisma', () => ({
  prisma: {
    article: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    card: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));
```

## 9.7 テスト実行

### コマンド

```bash
# 全テスト実行
npm test

# 監視モード
npm test -- --watch

# カバレッジ付き
npm test -- --coverage

# 特定ファイルのみ
npm test -- rarity.test.ts
```

### Jest設定 (`jest.config.js`)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    'src/app/api/**/*.ts',
    '!src/**/*.d.ts',
  ],
};
```

## 9.8 CI/CD連携

GitHub Actionsでテストを自動実行：

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```
