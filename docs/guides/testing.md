# 09. テスト運用ガイド

## 9.1 概要

本プロジェクトでは、API ルート・ビジネスロジックに焦点を当てたテスト戦略を採用している。
フロントエンドコンポーネントや E2E テストは対象外とし、バックエンドの品質担保を優先する。

**現在の規模:**

| 指標             | 値                             |
| ---------------- | ------------------------------ |
| テストファイル数 | 36                             |
| テスト数         | 528（526 passing / 2 failing） |
| 実行時間         | 約 9 秒                        |

## 9.2 テスト対象

### カバレッジ状況

| カテゴリ           | ファイル数 | 主な対象                                                                    |
| ------------------ | ---------- | --------------------------------------------------------------------------- |
| API ルートテスト   | 22         | articles, cards, challenge, coins, stripe, subscription, auth, stats, users |
| サービステスト     | 5          | article, card, challenge, coin, subscription                                |
| チャレンジロジック | 3          | game-state, rewards, scenarios                                              |
| バリデーション     | 3          | article, card, user                                                         |
| エラーハンドリング | 2          | api-error, error-messages                                                   |
| カードロジック     | 1          | rarity                                                                      |

### 未テスト

- `suggested-theme-service` — サービステスト未作成
- React コンポーネント（対象外）
- E2E テスト（対象外）

## 9.3 テストツール

```json
{
  "devDependencies": {
    "jest": "^30.2.0",
    "jest-environment-jsdom": "^30.2.0",
    "@types/jest": "^30.0.0",
    "ts-jest": "^29.4.6",
    "@testing-library/jest-dom": "^6.9.1"
  }
}
```

- **jest** + **ts-jest**: テストランナー・TypeScript 変換
- **jest-environment-jsdom**: Next.js API ルートテスト用の DOM 環境
- **@testing-library/jest-dom**: カスタムマッチャー
- `jest.setup.js` で `TextEncoder`, `Request/Response`, `ReadableStream` 等のポリフィルを設定

## 9.4 ディレクトリ構成

テストは `src/` の外の `__tests__/` ディレクトリに配置する。ソースコードのディレクトリ構造をミラーする。

```
__tests__/
├── __mocks__/                    # 外部サービスモック
│   ├── firebase.ts               #   Firebase Auth
│   ├── openai.ts                 #   OpenAI API
│   ├── flux.ts                   #   FLUX 画像生成
│   ├── stripe.ts                 #   Stripe 決済
│   ├── index.ts                  #   re-export
│   └── next/
│       └── server.ts             #   Next.js Server API (NextRequest/NextResponse)
├── helpers/                      # テストヘルパー
│   ├── api-test-helpers.ts       #   createAuthenticatedRequest 等
│   ├── db-helpers.ts             #   Prisma モックヘルパー
│   ├── coin-test-data.ts         #   コイン関連テストデータ
│   └── index.ts                  #   re-export
├── app/
│   └── api/                      # API ルートテスト（src/app/api をミラー）
│       ├── articles/
│       ├── auth/
│       ├── cards/
│       ├── challenge/
│       ├── coins/
│       ├── stats/
│       ├── stripe/
│       ├── subscription/
│       └── users/
└── lib/                          # ライブラリ・サービステスト
    ├── card/                     #   レア度計算
    ├── challenge/                #   ゲームロジック
    ├── errors/                   #   エラークラス
    ├── services/                 #   ビジネスロジック
    └── validations/              #   Zod バリデーション
```

## 9.5 テストパターン

本プロジェクトのテストは主に 3 パターンに分類される。

### 9.5.1 サービステスト

Prisma クライアントを `jest.mock` で個別メソッドごとにモックし、ビジネスロジックをテストする。

```typescript
// __tests__/lib/services/card-service.test.ts の例

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    card: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    article: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import prisma from '@/lib/prisma';
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('CardService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ユーザーのカード一覧を取得できる', async () => {
    (mockPrisma.card.findMany as jest.Mock).mockResolvedValue([
      /* ... */
    ]);
    const result = await cardService.getCards('user-id');
    expect(result).toHaveLength(1);
  });
});
```

**`$transaction` のモック:**

```typescript
const mockTxPrisma = {
  card: { create: jest.fn() },
  coinTransaction: { create: jest.fn() },
};
(mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb) => cb(mockTxPrisma));
```

### 9.5.2 API ルートテスト

`verifyAuth` をモックし、`createAuthenticatedRequest` ヘルパーでリクエストを構築する。

```typescript
// __tests__/app/api/articles/route.test.ts の例

jest.mock('@/lib/auth', () => ({
  verifyAuth: jest.fn(),
}));

import { verifyAuth } from '@/lib/auth';
import { createAuthenticatedRequest } from '@/__tests__/helpers';
import { GET } from '@/app/api/articles/route';

describe('GET /api/articles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAuth as jest.Mock).mockResolvedValue({ uid: 'test-user-id' });
  });

  it('記事一覧を返す', async () => {
    // Prisma モックを設定
    const response = await GET(createAuthenticatedRequest('GET'));
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

**`withAuthParams` ルートの呼び出し:**

パス付きルート（例: `/api/cards/[id]`）は第二引数に params を渡す。

```typescript
import { DELETE } from '@/app/api/cards/[id]/route';

const response = await DELETE(createAuthenticatedRequest('DELETE'), {
  params: Promise.resolve({ id: 'card-id' }),
});
```

### 9.5.3 純関数テスト

外部依存のないロジックはモック不要でテストする。

```typescript
// __tests__/lib/challenge/scenarios.test.ts の例
import { getScenarioById, getAllScenarios } from '@/lib/challenge/scenarios';

describe('scenarios', () => {
  it('IDでシナリオを取得できる', () => {
    const scenario = getScenarioById('science-basics');
    expect(scenario).toBeDefined();
    expect(scenario!.name).toBe('科学の基礎');
  });
});
```

## 9.6 モック

### 外部サービスモック（`__tests__/__mocks__/`）

| ファイル         | モック対象             | 主なエクスポート                                           |
| ---------------- | ---------------------- | ---------------------------------------------------------- |
| `firebase.ts`    | `@/lib/firebase/admin` | `adminAuth.verifyIdToken` 等                               |
| `openai.ts`      | `@/lib/openai/*`       | `generateArticle`, `extractKeywords`, `generateFlavorText` |
| `flux.ts`        | `@/lib/flux`           | `generateIllustration`                                     |
| `stripe.ts`      | `stripe` パッケージ    | `Stripe` コンストラクタ                                    |
| `next/server.ts` | `next/server`          | `NextRequest`, `NextResponse` の互換実装                   |

### テストヘルパー（`__tests__/helpers/`）

| ファイル              | 用途                                                                              |
| --------------------- | --------------------------------------------------------------------------------- |
| `api-test-helpers.ts` | `createAuthenticatedRequest(method, options)` — Bearer トークン付きリクエスト生成 |
| `db-helpers.ts`       | Prisma モック生成ヘルパー、テスト用データファクトリ                               |
| `coin-test-data.ts`   | コイン残高・トランザクションのテストデータ                                        |

### モックリセット

各テストファイルの `beforeEach` で `jest.clearAllMocks()` を呼び出す。

```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

## 9.7 テスト実行

```bash
# 全テスト実行
npm test

# 特定ファイルのみ
npm test -- __tests__/lib/services/card-service.test.ts

# パターンで絞り込み
npm test -- --testPathPattern="challenge"

# 監視モード
npm test -- --watch

# カバレッジ付き
npm test -- --coverage

# テスト一覧のみ表示
npm test -- --listTests

# verbose（詳細出力）
npm test -- --verbose
```

## 9.8 新テスト追加手順

### サービステストを追加する場合

1. `__tests__/lib/services/<name>-service.test.ts` を作成
2. `jest.mock('@/lib/prisma')` でデフォルトエクスポートの Prisma をモック
3. 必要に応じて外部サービスもモック（`jest.mock('@/lib/openai/...')`等）
4. `beforeEach` で `jest.clearAllMocks()`
5. 各 Prisma メソッドの戻り値を `mockResolvedValue` で設定
6. `$transaction` が必要なら `mockImplementation(async (cb) => cb(mockTxPrisma))` パターンを使用
7. `npm test -- __tests__/lib/services/<name>-service.test.ts` で実行確認

### API ルートテストを追加する場合

1. `__tests__/app/api/<path>/route.test.ts` を作成（ソースのディレクトリ構造をミラー）
2. `jest.mock('@/lib/auth')` で認証をモック
3. `jest.mock('@/lib/prisma')` でデータベースをモック
4. `createAuthenticatedRequest` ヘルパーを使ってリクエストを生成
5. ルートハンドラ（`GET`, `POST`, `DELETE` 等）を直接インポートして呼び出す
6. `response.json()` で結果を取得し、`success`, `data`, `error` を検証
7. パス付きルートの場合は `{ params: Promise.resolve({ id }) }` を第二引数に渡す

### チェックリスト

- [ ] `jest.clearAllMocks()` を `beforeEach` に追加したか
- [ ] モックの戻り値は適切に設定したか
- [ ] 正常系・異常系（認証エラー、バリデーションエラー、404 等）をカバーしたか
- [ ] `npm test` で全体の既存テストに影響がないか確認したか

## 9.9 既知の問題

| ファイル                                   | 問題         | 備考                                                                                      |
| ------------------------------------------ | ------------ | ----------------------------------------------------------------------------------------- |
| `__tests__/app/api/users/me/route.test.ts` | 2 テスト失敗 | テストが `USER_NOT_FOUND` を期待するが実際は `NOT_FOUND` を返す。エラーコードの統一が必要 |
| `suggested-theme-service`                  | テスト未作成 | サービス 6 件中唯一の未テスト                                                             |
