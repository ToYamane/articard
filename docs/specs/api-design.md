# 07. API設計

## 7.1 概要

- **フレームワーク**: Next.js API Routes (App Router)
- **認証**: Firebase Authentication (Bearer Token)
- **形式**: REST API
- **レスポンス形式**: JSON

## 7.2 共通仕様

### ベースURL

```
開発: http://localhost:3000/api
本番: https://api.example.com/api
```

### 認証ヘッダー

```
Authorization: Bearer <firebase_id_token>
```

### 共通レスポンス形式

```typescript
// 成功時
interface SuccessResponse<T> {
  success: true;
  data: T;
}

// エラー時
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### 共通エラーコード

| コード               | HTTPステータス | 説明                           |
| -------------------- | -------------- | ------------------------------ |
| UNAUTHORIZED         | 401            | 認証エラー                     |
| FORBIDDEN            | 403            | 権限エラー                     |
| NOT_FOUND            | 404            | リソース未発見                 |
| VALIDATION_ERROR     | 400            | バリデーションエラー           |
| RATE_LIMIT_EXCEEDED  | 429            | レート制限超過                 |
| INTERNAL_ERROR       | 500            | サーバーエラー                 |
| MODERATION_BLOCKED   | 400            | コンテンツポリシー違反         |
| INSUFFICIENT_COINS   | 400            | コイン不足                     |
| INVALID_PACKAGE      | 400            | 無効なコインパッケージ         |
| INVALID_TIER         | 400            | 無効なサブスクリプションプラン |
| ALREADY_SUBSCRIBED   | 400            | 既にサブスクリプション中       |
| NO_AVAILABLE_KEYWORD | 400            | 利用可能なキーワードなし       |
| USER_NOT_FOUND       | 404            | ユーザーが見つからない         |
| PRICE_NOT_FOUND      | 500            | Stripe価格情報エラー           |

## 7.3 エンドポイント一覧

### 認証・ユーザー

| Method | Endpoint           | 説明                   |
| ------ | ------------------ | ---------------------- |
| POST   | /api/auth/register | 新規ユーザー登録       |
| GET    | /api/users/me      | 自分のプロフィール取得 |
| PATCH  | /api/users/me      | プロフィール更新       |
| DELETE | /api/users/me      | アカウント削除         |

### 記事生成

| Method | Endpoint          | 説明                             |
| ------ | ----------------- | -------------------------------- |
| POST   | /api/articles     | 記事生成                         |
| GET    | /api/articles     | 自分の記事一覧                   |
| GET    | /api/articles/:id | 記事詳細                         |
| DELETE | /api/articles/:id | 記事削除（関連カードも連動削除） |

### カード生成

| Method | Endpoint                     | 説明               |
| ------ | ---------------------------- | ------------------ |
| POST   | /api/cards                   | カード生成         |
| GET    | /api/cards                   | 自分のカード一覧   |
| GET    | /api/cards/:id               | カード詳細         |
| GET    | /api/cards/:id/share         | 共有用カード情報   |
| DELETE | /api/cards/:id               | カード削除         |
| GET    | /api/cards/batch/eligibility | バッチ生成資格確認 |

### 統計

| Method | Endpoint   | 説明             |
| ------ | ---------- | ---------------- |
| GET    | /api/stats | コレクション統計 |

### コイン

| Method | Endpoint                | 説明                                         |
| ------ | ----------------------- | -------------------------------------------- |
| GET    | /api/coins              | コイン残高・チャレンジ回数・サブスク情報取得 |
| GET    | /api/coins/transactions | トランザクション履歴                         |
| POST   | /api/coins/purchase     | コイン購入（開発者のみ）                     |

### サブスクリプション

| Method | Endpoint                 | 説明                         |
| ------ | ------------------------ | ---------------------------- |
| POST   | /api/subscription        | サブスク有効化（開発者のみ） |
| DELETE | /api/subscription        | サブスク解約                 |
| GET    | /api/subscription/status | サブスク状態取得             |

### チャレンジモード

| Method | Endpoint                              | 説明                 |
| ------ | ------------------------------------- | -------------------- |
| GET    | /api/challenge/scenarios              | シナリオ一覧         |
| GET    | /api/challenge/highscores             | ハイスコア一覧       |
| POST   | /api/challenge/sessions               | セッション作成       |
| GET    | /api/challenge/sessions               | セッション一覧       |
| GET    | /api/challenge/sessions/:id           | セッション詳細       |
| DELETE | /api/challenge/sessions/:id           | セッション中断       |
| POST   | /api/challenge/sessions/:id/deck      | デッキ設定           |
| GET    | /api/challenge/sessions/:id/challenge | 現在のチャレンジ取得 |
| POST   | /api/challenge/sessions/:id/submit    | カード提出・評価     |

### ユーティリティ

| Method | Endpoint              | 説明               |
| ------ | --------------------- | ------------------ |
| GET    | /api/suggested-themes | おすすめテーマ取得 |
| GET    | /api/health           | ヘルスチェック     |

### Stripe連携

| Method | Endpoint             | 説明                   |
| ------ | -------------------- | ---------------------- |
| POST   | /api/stripe/checkout | Checkoutセッション作成 |
| POST   | /api/stripe/webhook  | Stripe Webhook受信     |

---

## 7.4 エンドポイント詳細

### POST /api/auth/register

Firebase認証後、アプリケーションDBにユーザーを登録。

**Request:**

```typescript
{
  nickname: string; // 2-20文字
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    id: string;
    nickname: string;
    coinBalance: number;
    isPremium: boolean;
    createdAt: string;
  }
}
```

---

### GET /api/users/me

**Response:**

```typescript
{
  success: true,
  data: {
    id: string;
    nickname: string;
    coinBalance: number;
    isPremium: boolean;
    premiumExpiresAt: string | null;
    createdAt: string;
    stats: {
      totalCards: number;
      totalArticles: number;
      rarityBreakdown: {
        common: number;
        rare: number;
        super_rare: number;
        legend: number;
      }
    }
  }
}
```

---

### PATCH /api/users/me

**Request:**

```typescript
{
  nickname?: string;  // 2-20文字
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    id: string;
    nickname: string;
    updatedAt: string;
  }
}
```

---

### DELETE /api/users/me

アカウントと関連データをすべて削除。

**Response:**

```typescript
{
  success: true,
  data: {
    message: "Account deleted successfully"
  }
}
```

---

### POST /api/articles

記事を生成。

**Request:**

```typescript
{
  theme: string; // 2-30文字
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    id: string;
    theme: string;
    content: string;
    createdAt: string;
  }
}
```

**エラー:**

```typescript
// コンテンツポリシー違反
{
  success: false,
  error: {
    code: "MODERATION_BLOCKED",
    message: "このテーマでは記事を生成できません"
  }
}
```

---

### GET /api/articles

**Query Parameters:**
| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| cursor | string | - | ページネーションカーソル |
| limit | number | 20 | 取得件数（最大50） |

**Response:**

```typescript
{
  success: true,
  data: {
    items: [
      {
        id: string;
        theme: string;
        content: string;
        createdAt: string;
        cardCount: number;
      }
    ],
    nextCursor: string | null;
    hasMore: boolean;
    totalCount: number;
  }
}
```

---

### GET /api/articles/:id

**Response:**

```typescript
{
  success: true,
  data: {
    id: string;
    theme: string;
    content: string;
    createdAt: string;
    cards: [
      {
        id: string;
        keyword: string;
        rarity: string;
        thumbnailUrl: string;
      }
    ]
  }
}
```

---

### DELETE /api/articles/:id

記事を削除。関連するカードは削除されず、カードの articleId が null になる。

**Response:**

```typescript
{
  success: true,
  data: {
    message: "記事が削除されました"
  }
}
```

**エラー:**

```typescript
// 記事が見つからない or 所有者でない
{
  success: false,
  error: {
    code: "NOT_FOUND",
    message: "記事が見つかりません"
  }
}
```

---

### POST /api/cards

記事からカードを生成。

**Request:**

```typescript
{
  articleId: string;
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    id: string;
    keyword: string;
    rarity: string;
    flavorText: string;
    contextCategory: string;
    illustrationUrl: string;
    cardImageUrl: string;
    thumbnailUrl: string;
    createdAt: string;
  }
}
```

---

### GET /api/cards

**Query Parameters:**
| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| cursor | string | - | ページネーションカーソル |
| limit | number | 20 | 取得件数（最大50） |
| rarity | string[] | - | レア度フィルター（複数可） |
| contextCategory | string[] | - | 文脈カテゴリフィルター（複数可） |
| dateFrom | string | - | 開始日（ISO8601） |
| dateTo | string | - | 終了日（ISO8601） |
| search | string | - | キーワード検索 |
| sortBy | string | createdAt | ソート項目 |
| sortOrder | string | desc | ソート順序 |

**Response:**

```typescript
{
  success: true,
  data: {
    items: [
      {
        id: string;
        keyword: string;
        rarity: string;
        flavorText: string;
        thumbnailUrl: string;
        createdAt: string;
      }
    ],
    nextCursor: string | null;
    hasMore: boolean;
    totalCount: number;
  }
}
```

---

### GET /api/cards/:id

**Response:**

```typescript
{
  success: true,
  data: {
    id: string;
    keyword: string;
    rarity: string;
    flavorText: string;
    contextCategory: string;
    contextDescription: string;
    illustrationUrl: string;
    cardImageUrl: string;
    thumbnailUrl: string;
    createdAt: string;
    article: {
      id: string;
      theme: string;
    } | null  // 元記事が削除された場合 null
  }
}
```

---

### DELETE /api/cards/:id

カードを削除。関連する記事は削除されない。

**Response:**

```typescript
{
  success: true,
  data: {
    message: "Card deleted successfully"
  }
}
```

**エラー:**

```typescript
// カードが見つからない or 所有者でない
{
  success: false,
  error: {
    code: "NOT_FOUND",
    message: "カードが見つかりません"
  }
}
```

---

### GET /api/cards/:id/share

共有用のカード情報（認証不要）。

**Response:**

```typescript
{
  success: true,
  data: {
    id: string;
    keyword: string;
    rarity: string;
    flavorText: string;
    cardImageUrl: string;
    createdAt: string;
    owner: {
      nickname: string;
    }
    // OGPメタデータ用
    ogp: {
      title: string;
      description: string;
      imageUrl: string;
    }
  }
}
```

---

### GET /api/stats

**Response:**

```typescript
{
  success: true,
  data: {
    totalCards: number;
    totalArticles: number;
    rarityBreakdown: {
      common: number;
      rare: number;
      super_rare: number;
      legend: number;
    };
    recentCards: [
      {
        id: string;
        keyword: string;
        rarity: string;
        thumbnailUrl: string;
        createdAt: string;
      }
    ];  // 最新5枚
  }
}
```

---

## 7.5 レート制限

| エンドポイント     | 制限      | 備考       |
| ------------------ | --------- | ---------- |
| POST /api/articles | 10回/時間 | 記事生成   |
| POST /api/cards    | 20回/時間 | カード生成 |
| その他 GET         | 100回/分  | 読み取り系 |

### レート制限レスポンス

```typescript
{
  success: false,
  error: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "リクエスト制限を超えました。しばらく待ってから再度お試しください。",
    details: {
      retryAfter: 3600  // 秒
    }
  }
}
```

## 7.6 バリデーション

### Zodスキーマ例

```typescript
import { z } from 'zod';

// 記事生成リクエスト
export const createArticleSchema = z.object({
  theme: z
    .string()
    .min(2, 'テーマは2文字以上で入力してください')
    .max(30, 'テーマは30文字以内で入力してください'),
});

// ニックネーム
export const nicknameSchema = z
  .string()
  .min(2, 'ニックネームは2文字以上で入力してください')
  .max(20, 'ニックネームは20文字以内で入力してください')
  .regex(/^[a-zA-Z0-9ぁ-んァ-ヶー一-龠々]+$/, '使用できない文字が含まれています');

// ページネーション
export const paginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// カード検索
export const cardSearchSchema = paginationSchema.extend({
  rarity: z.array(z.enum(['common', 'rare', 'super_rare', 'legend'])).optional(),
  contextCategory: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().max(50).optional(),
  sortBy: z.enum(['createdAt', 'rarity', 'keyword']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
```

## 7.7 API実装例

```typescript
// app/api/articles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createArticleSchema } from '@/lib/validations';
import { generateArticle } from '@/lib/openai';
import { checkModeration } from '@/lib/moderation';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      );
    }

    // リクエストボディ取得・バリデーション
    const body = await req.json();
    const validation = createArticleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error.message } },
        { status: 400 }
      );
    }

    const { theme } = validation.data;

    // モデレーションチェック
    const moderationResult = await checkModeration(theme);
    if (moderationResult.flagged) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'MODERATION_BLOCKED', message: 'このテーマでは記事を生成できません' },
        },
        { status: 400 }
      );
    }

    // 記事生成
    const { content, model, tokenUsage } = await generateArticle(theme);

    // DB保存
    const article = await prisma.article.create({
      data: {
        userId: user.uid,
        theme,
        content,
        openaiModel: model,
        tokenUsage,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: article.id,
        theme: article.theme,
        content: article.content,
        createdAt: article.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Article generation error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '記事の生成に失敗しました' } },
      { status: 500 }
    );
  }
}
```

---

## 7.8 チャレンジモード API

### GET /api/challenge/scenarios

利用可能なシナリオ一覧を取得。

**Response:**

```typescript
{
  success: true,
  data: [
    {
      id: string;
      title: string;
      description: string;
      icon: string;
      difficulty: "easy" | "normal" | "hard";
      totalPhases: number;
      deckSize: number;
      isAvailable: boolean;
    }
  ]
}
```

---

### POST /api/challenge/sessions

新しいチャレンジセッションを作成。

**Request:**

```typescript
{
  scenarioId: string;
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    id: string;
    scenarioId: string;
    status: "in_progress";
    currentPhase: 0;  // デッキ編成フェーズ
  }
}
```

**エラー:**

```typescript
// 進行中セッションがある場合
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "進行中のセッションがあります。完了または中断してから新しいセッションを開始してください"
  }
}
```

---

### GET /api/challenge/sessions

自分のセッション一覧を取得。

**Query Parameters:**
| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| status | string | - | ステータスフィルター |
| limit | number | 10 | 取得件数（最大50） |

**Response:**

```typescript
{
  success: true,
  data: {
    sessions: [
      {
        id: string;
        scenarioId: string;
        status: "in_progress" | "completed" | "abandoned";
        currentPhase: number;  // 0 = デッキ編成フェーズ
        totalScore: number;
        startedAt: string;
        completedAt: string | null;
      }
    ]
  }
}
```

---

### GET /api/challenge/sessions/:id

セッション詳細を取得（デッキ、フェーズ結果含む）。

**Response:**

```typescript
{
  success: true,
  data: {
    id: string;
    userId: string;
    scenarioId: string;
    status: string;
    currentPhase: number;
    totalScore: number;
    startedAt: string;
    completedAt: string | null;
    deckCards: [
      {
        id: string;
        cardId: string;
        isUsed: boolean;
        usedInPhase: number | null;
        card: {
          id: string;
          keyword: string;
          rarity: string;
          thumbnailUrl: string;
          cardImageUrl: string;
          flavorText: string;
          contextDescription: string;
        }
      }
    ];
    phases: [
      {
        id: string;
        phaseNumber: number;
        challenge: string;
        selectedCardIds: string[];
        fitScore: number;
        bonusScore: number;
        totalScore: number;
        aiCommentary: string;
        completedAt: string;
      }
    ]
  }
}
```

---

### DELETE /api/challenge/sessions/:id

セッションを中断。

**Response:**

```typescript
{
  success: true,
  data: {
    message: "セッションを中断しました"
  }
}
```

---

### POST /api/challenge/sessions/:id/deck

デッキを設定してゲームを開始。

**Request:**

```typescript
{
  cardIds: string[];  // 6枚
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    message: "デッキを設定しました"
  }
}
```

**エラー:**

```typescript
// カード数が不正
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "デッキには6枚のカードが必要です"
  }
}
```

---

### GET /api/challenge/sessions/:id/challenge

現在のフェーズのチャレンジを取得（AI生成）。

**Response:**

```typescript
{
  success: true,
  data: {
    challenge: {
      phaseNumber: number;
      title: string;
      situation: string;
      challenge: string;
      hint: string;
    };
    phaseDefinition: {
      phaseNumber: number;
      title: string;
      description: string;
      type: "single" | "combo";
      cardCount: number;
      consumesCard: boolean;
      baseScore: number;
    };
    availableCards: [
      {
        id: string;
        keyword: string;
        rarity: string;
        thumbnailUrl: string;
        cardImageUrl: string;
        flavorText: string;
        contextDescription: string;
      }
    ];
    totalPhases: number;
  }
}
```

---

### POST /api/challenge/sessions/:id/submit

カードを提出して評価を受ける。

**Request:**

```typescript
{
  cardIds: string[];  // 1-2枚（フェーズによる）
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    phaseNumber: number;
    challenge: string;
    selectedCards: [
      {
        id: string;
        keyword: string;
        rarity: string;
      }
    ];
    evaluation: {
      fitScore: number;          // 0-100
      bonusScore: number;
      totalScore: number;
      connectionExplanation: string;
      narrativeDescription: string;
      humorComment: string;
    };
    sessionTotalScore: number;
    isComplete: boolean;
    summary?: string;  // 完了時のみ
    achievementRewards?: [  // 達成報酬（完了時のみ）
      {
        rank: string;
        coins: number;
        isNew: boolean;
      }
    ];
    totalCoinsAwarded?: number;
  }
}
```

---

## 7.9 コイン API

### GET /api/coins

コイン残高、チャレンジ回数、サブスク情報を取得。日次リセットも自動実行。

**Response:**

```typescript
{
  success: true,
  data: {
    freeCoins: number;        // 当日無料コイン（プランにより異なる）
    permanentCoins: number;   // 永続コイン（達成報酬・購入）
    totalAvailable: number;   // 合計利用可能コイン
    challenge: {
      count: number;          // 本日のチャレンジ回数
      remainingFree: number;  // 残り無料回数（-1 = 無制限）
      isFree: boolean;        // 次回が無料か
      nextCost: number;       // 次回のコスト（0 or 10）
    },
    subscription: {
      tier: string | null;    // 'plus' | 'premium' | null
      expiresAt: string | null;
      plan: {
        name: string;
        dailyFreeCoins: number;
        freeChallenges: number;  // -1 = 無制限
      } | null;
    },
    packages: [               // 購入可能パッケージ一覧
      {
        id: string;           // 'standard' | 'value' | 'premium'
        name: string;
        coins: number;
        price: number;
      }
    ]
  }
}
```

---

### POST /api/coins/purchase

コインパッケージを購入。**開発者のみ利用可能**。

**Request:**

```typescript
{
  packageId: 'standard' | 'value' | 'premium';
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    coins: number;       // 購入したコイン数
    newBalance: number;  // 新しい永続コイン残高
  }
}
```

**エラー:**

```typescript
// 開発者以外
{ code: "FORBIDDEN", message: "開発者のみ利用可能です" }
// 無効なパッケージ
{ code: "INVALID_PACKAGE", message: "無効なパッケージです" }
```

---

### GET /api/coins/transactions

トランザクション履歴を取得。

**Query Parameters:**
| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| cursor | string | - | ページネーションカーソル |
| limit | number | 20 | 取得件数（最大50） |

**Response:**

```typescript
{
  success: true,
  data: {
    transactions: [
      {
        id: string;
        amount: number;           // 正:増加, 負:減少
        transactionType: string;  // purchase, bonus, consume, refund, daily
        description: string | null;
        balanceAfter: number;
        createdAt: string;
      }
    ],
    nextCursor: string | null,
    hasMore: boolean
  }
}
```

---

## 7.10 サブスクリプション API

### POST /api/subscription

サブスクリプションを有効化。**開発者のみ利用可能**。
初回有効化時にボーナスコインを付与。

**Request:**

```typescript
{
  tier: 'plus' | 'premium';
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    tier: string;        // 有効化されたプラン
    bonusCoins: number;  // 付与されたボーナス（初回のみ、0なら既受取）
    expiresAt: string;   // 有効期限（ISO8601）
  }
}
```

**エラー:**

```typescript
// 開発者以外
{ code: "FORBIDDEN", message: "開発者のみ利用可能です" }
// 無効なプラン
{ code: "INVALID_TIER", message: "無効なプランです" }
```

---

### DELETE /api/subscription

サブスクリプションを解約。

**Response:**

```typescript
{
  success: true,
  data: {
    message: "サブスクリプションを解約しました"
  }
}
```

---

### GET /api/subscription/status

現在のサブスクリプション状態を取得。

**Response:**

```typescript
{
  success: true,
  data: {
    tier: string | null;        // 'plus' | 'premium' | null
    expiresAt: string | null;   // 有効期限（ISO8601）
    bonusReceived: boolean;     // 初回ボーナス受取済み
    plan: {
      name: string;
      dailyFreeCoins: number;
      freeChallenges: number;   // -1 = 無制限
    } | null;
  }
}
```

---

## 7.11 バッチカード生成 API

### GET /api/cards/batch/eligibility

バッチカード生成（複数枚同時生成）の資格と情報を取得。サブスクリプション加入者のみ利用可能。

**Query Parameters:**
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| articleId | string | No | 記事ID（指定時は利用可能キーワード数も返却） |

**Response:**

```typescript
{
  success: true,
  data: {
    eligible: boolean;           // バッチ生成可能か（サブスク加入者のみtrue）
    maxBatchSize: number;        // 最大同時生成枚数（10）
    availableKeywords: number | null;  // 利用可能なキーワード数（articleId指定時のみ）
    coinBalance: number;         // 現在のコイン残高
    costPerCard: number;         // 1枚あたりのコスト（30）
    maxAffordable: number;       // コインで生成可能な最大枚数
  }
}
```

---

## 7.12 ハイスコア API

### GET /api/challenge/highscores

ユーザーの全シナリオのハイスコア一覧を取得。

**Response:**

```typescript
{
  success: true,
  data: {
    highScores: [
      {
        scenarioId: string;
        highScore: number;
        bestRank: string;        // 'C' | 'B' | 'A' | 'S'
        playCount: number;
        updatedAt: string;       // ISO8601
      }
    ]
  }
}
```

---

## 7.13 テーマ提案 API

### GET /api/suggested-themes

おすすめテーマをランダムに取得。**認証不要**。

**Query Parameters:**
| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| count | number | 5 | 取得件数（1-20） |

**Response:**

```typescript
{
  success: true,
  data: {
    themes: [
      {
        id: string;
        theme: string;           // テーマ名
      }
    ]
  }
}
```

---

## 7.14 Stripe連携 API

### POST /api/stripe/checkout

Stripe Checkoutセッションを作成し、決済ページURLを取得。

**Request:**

```typescript
{
  tier: 'plus' | 'premium';
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    sessionId: string;           // Checkoutセッション ID
    url: string;                 // Stripe決済ページURL
  }
}
```

**エラー:**

```typescript
// 既にサブスク中
{ code: "ALREADY_SUBSCRIBED", message: "既にサブスクリプション中です" }
// 無効なプラン
{ code: "INVALID_TIER", message: "無効なプランです" }
```

---

### POST /api/stripe/webhook

Stripeからのイベント通知を受信。**内部使用専用（認証不要、署名検証あり）**。

**処理イベント:**
| イベント | 処理内容 |
|----------|---------|
| checkout.session.completed | サブスクリプション有効化 |
| customer.subscription.updated | プラン変更処理 |
| customer.subscription.deleted | サブスクリプション解約 |
| invoice.payment_failed | 支払い失敗通知 |

**Response:**

```typescript
{
  received: true;
}
```

---

## 7.15 ヘルスチェック API

### GET /api/health

システムの稼働状況を確認。**認証不要**。

**Response:**

```typescript
{
  status: 'healthy' | 'unhealthy';
  timestamp: string; // ISO8601
  version: string; // アプリバージョン
  checks: {
    database: 'connected' | 'disconnected';
  }
}
```

**HTTPステータス:**

- 200: healthy
- 503: unhealthy
