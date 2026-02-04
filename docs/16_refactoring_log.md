# リファクタリング記録

## 概要

コードベース全体（約19,700行）を分析し、以下のリファクタリングを実施しました。

---

## Phase 1: APIルートの認証・エラーハンドリング共通化

### 問題点

23個のAPIルートで同じ認証チェックコードが繰り返されていた：

```typescript
// 各APIルートで重複していたコード（約15行）
const authUser = await verifyAuth(req);
if (!authUser) {
  return NextResponse.json({
    success: false,
    error: { code: 'UNAUTHORIZED', message: '認証が必要です' },
  }, { status: 401 });
}
```

### 解決策

#### 新規ファイル

**`src/lib/api/with-auth.ts`**
- `withAuth<T>()`: 認証必須ルート用ラッパー
- `withAuthParams<T,P>()`: 動的ルート（パスパラメーター付き）用ラッパー
- `withOptionalAuth<T>()`: オプショナル認証用ラッパー

**`src/lib/api/validation.ts`**
- `parseBody<T>()`: リクエストボディのパース・バリデーション
- `parseQuery<T>()`: クエリパラメーターのパース・バリデーション
- `validationErrorResponse()`: バリデーションエラーレスポンス生成

### 使用例

**Before（123行）:**
```typescript
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<Article>>> {
  try {
    const authUser = await verifyAuth(req);
    if (!authUser) {
      return NextResponse.json({ success: false, error: { ... } }, { status: 401 });
    }

    const body = await req.json();
    const validationResult = createArticleSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ success: false, error: { ... } }, { status: 400 });
    }

    const article = await createArticle({ ... });
    return NextResponse.json({ success: true, data: article });
  } catch (error) {
    return handleApiError(error);
  }
}
```

**After（40行）:**
```typescript
export const POST = withAuth<Article>(async (authUser, req) => {
  const body = await req.json();
  const { theme, contentType } = createArticleSchema.parse(body);

  return createArticle({
    userId: authUser.uid,
    theme,
    contentType,
  });
});
```

### リファクタリング済みファイル

| ファイル | 削減行数 |
|---------|---------|
| `src/app/api/articles/route.ts` | 83行 → 40行 |
| `src/app/api/articles/[id]/route.ts` | 134行 → 32行 |
| `src/app/api/cards/route.ts` | 147行 → 56行 |
| `src/app/api/cards/[id]/route.ts` | 133行 → 31行 |
| `src/app/api/coins/route.ts` | 82行 → 89行 |
| `src/app/api/stats/route.ts` | 73行 → 50行 |
| `src/app/api/users/me/route.ts` | 270行 → 117行 |

### 効果

- **330行のネット削減**（11ファイル、512行追加、842行削除）
- 認証・エラー処理の一貫性向上
- 新規APIルート作成時のボイラープレート削減

---

## Phase 2: GameState型安全性向上

### 問題点

`challenge-service.ts`で`unknown`型へのキャストが多用されていた（5箇所）：

```typescript
// 型安全性が低いコード
const gameState = (session.gameState as unknown as GameState) || { deck: [], phases: [], totalScore: 0 };
gameState: gameState as unknown as Prisma.InputJsonValue,
```

### 解決策

#### 新規ファイル

**`src/lib/challenge/game-state.ts`**

```typescript
// 型定義
export interface GameState {
  deck: DeckCard[];
  phases: PhaseResult[];
  totalScore: number;
}

// 型ガード
export function isGameState(value: unknown): value is GameState;

// シリアライゼーション
export function serializeGameState(state: GameState): Prisma.InputJsonValue;
export function deserializeGameState(raw: Prisma.JsonValue): GameState;

// ヘルパー関数
export function createInitialGameState(deck: DeckCard[]): GameState;
export function markCardsAsUsed(state: GameState, cardIds: string[], phaseNumber: number): GameState;
export function addPhaseResult(state: GameState, result: PhaseResult): GameState;
export function getAvailableCards(state: GameState): DeckCard[];
```

### 使用例

**Before:**
```typescript
const gameState = (session.gameState as unknown as GameState) || { deck: [], phases: [], totalScore: 0 };
await prisma.challengeSession.update({
  data: { gameState: gameState as unknown as Prisma.InputJsonValue },
});
```

**After:**
```typescript
const gameState = deserializeGameState(session.gameState);
await prisma.challengeSession.update({
  data: { gameState: serializeGameState(gameState) },
});
```

### 効果

- 5箇所の`unknown`キャストを型安全なヘルパー関数に置換
- ランタイムでの型検証追加
- コードの可読性向上

---

## 追加変更

### ERROR_CODES拡張

`src/types/api.ts`に`NICKNAME_EXISTS`を追加：

```typescript
export const ERROR_CODES = {
  // ... existing codes
  NICKNAME_EXISTS: 'NICKNAME_EXISTS',
} as const;
```

---

## 保留タスク

### サービス層の関数分割

以下の長い関数は将来的に分割を検討：

| ファイル | 関数名 | 行数 |
|---------|--------|------|
| `challenge-service.ts` | `submitPhaseCards` | 229行 |
| `card-service.ts` | `createCard` | 143行 |
| `image-composer.ts` | `createCardBack` | 154行 |

### 設定値の集約

レア度設定などの分散した定数は、現状の構造で十分に整理されているため保留。

---

## 今後のリファクタリング推奨事項

1. **残りのAPIルート（challenge関連約10ファイル）** を同じパターンでリファクタリング
2. **コンポーネントテストの追加**（現在0件）
3. **TypeScript/ESLint設定の強化**
   - `noUnusedLocals: true`
   - `noUnusedParameters: true`

---

## コミット履歴

```
91dda9a refactor: APIルートの認証・エラーハンドリング共通化 (Phase 1)
ce41105 refactor: GameState型安全性向上 (Phase 2)
```
