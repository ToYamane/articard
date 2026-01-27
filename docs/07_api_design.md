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

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| UNAUTHORIZED | 401 | 認証エラー |
| FORBIDDEN | 403 | 権限エラー |
| NOT_FOUND | 404 | リソース未発見 |
| VALIDATION_ERROR | 400 | バリデーションエラー |
| RATE_LIMIT_EXCEEDED | 429 | レート制限超過 |
| INTERNAL_ERROR | 500 | サーバーエラー |
| MODERATION_BLOCKED | 400 | コンテンツポリシー違反 |
| INSUFFICIENT_COINS | 400 | コイン不足 |

## 7.3 エンドポイント一覧

### 認証・ユーザー

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | /api/auth/register | 新規ユーザー登録 |
| GET | /api/users/me | 自分のプロフィール取得 |
| PATCH | /api/users/me | プロフィール更新 |
| DELETE | /api/users/me | アカウント削除 |

### 記事生成

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | /api/articles | 記事生成 |
| GET | /api/articles | 自分の記事一覧 |
| GET | /api/articles/:id | 記事詳細 |
| DELETE | /api/articles/:id | 記事削除（関連カードも連動削除） |

### カード生成

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | /api/cards | カード生成 |
| GET | /api/cards | 自分のカード一覧 |
| GET | /api/cards/:id | カード詳細 |
| GET | /api/cards/:id/share | 共有用カード情報 |
| DELETE | /api/cards/:id | カード削除 |

### 統計

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /api/stats | コレクション統計 |

### コイン

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /api/coins | コイン残高・チャレンジ回数取得 |
| GET | /api/coins/transactions | トランザクション履歴 |

### チャレンジモード

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /api/challenge/scenarios | シナリオ一覧 |
| POST | /api/challenge/sessions | セッション作成 |
| GET | /api/challenge/sessions | セッション一覧 |
| GET | /api/challenge/sessions/:id | セッション詳細 |
| DELETE | /api/challenge/sessions/:id | セッション中断 |
| POST | /api/challenge/sessions/:id/deck | デッキ設定 |
| GET | /api/challenge/sessions/:id/challenge | 現在のチャレンジ取得 |
| POST | /api/challenge/sessions/:id/submit | カード提出・評価 |

---

## 7.4 エンドポイント詳細

### POST /api/auth/register

Firebase認証後、アプリケーションDBにユーザーを登録。

**Request:**
```typescript
{
  nickname: string;  // 2-20文字
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    id: string;
    nickname: string;
    knowledgeBalance: number;
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
    knowledgeBalance: number;
    isPremium: boolean;
    premiumExpiresAt: string | null;
    createdAt: string;
    stats: {
      totalCards: number;
      totalArticles: number;
      rarityBreakdown: {
        common: number;
        uncommon: number;
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
  theme: string;  // 2-30文字
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

記事と関連するすべてのカードを削除。

**Response:**
```typescript
{
  success: true,
  data: {
    message: "Article deleted successfully",
    deletedCardsCount: number  // 連動削除されたカード数
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
    }
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
      uncommon: number;
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

| エンドポイント | 制限 | 備考 |
|---------------|------|------|
| POST /api/articles | 10回/時間 | 記事生成 |
| POST /api/cards | 20回/時間 | カード生成 |
| その他 GET | 100回/分 | 読み取り系 |

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
  theme: z.string()
    .min(2, 'テーマは2文字以上で入力してください')
    .max(30, 'テーマは30文字以内で入力してください'),
});

// ニックネーム
export const nicknameSchema = z.string()
  .min(2, 'ニックネームは2文字以上で入力してください')
  .max(20, 'ニックネームは20文字以内で入力してください')
  .regex(
    /^[a-zA-Z0-9ぁ-んァ-ヶー一-龠々]+$/,
    '使用できない文字が含まれています'
  );

// ページネーション
export const paginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// カード検索
export const cardSearchSchema = paginationSchema.extend({
  rarity: z.array(z.enum(['common', 'uncommon', 'rare', 'super_rare', 'legend'])).optional(),
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
        { success: false, error: { code: 'MODERATION_BLOCKED', message: 'このテーマでは記事を生成できません' } },
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
    status: "deck_building";
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
        status: "deck_building" | "in_progress" | "completed" | "abandoned";
        currentPhase: number;
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

コイン残高とチャレンジ回数情報を取得。日次リセットも自動実行。

**Response:**
```typescript
{
  success: true,
  data: {
    freeCoins: number;        // 当日無料コイン（毎日90にリセット）
    permanentCoins: number;   // 永続コイン（達成報酬・購入）
    totalAvailable: number;   // 合計利用可能コイン
    challenge: {
      count: number;          // 本日のチャレンジ回数
      remainingFree: number;  // 残り無料回数
      isFree: boolean;        // 次回が無料か
      nextCost: number;       // 次回のコスト（0 or 10）
    }
  }
}
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
