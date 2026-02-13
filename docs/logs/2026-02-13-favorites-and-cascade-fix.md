# お気に入り機能・カスケード削除廃止・レアリティ整理

**日付**: 2026-02-13

## 概要

お気に入り機能の新規実装、記事→カードのカスケード削除廃止（SetNull化）、レアリティ関連コードの整理、カード一覧の検索・ソート拡張、およびドキュメントの実装同期を実施。

---

## 1. お気に入り機能（新機能）

カード・記事をお気に入りに登録し、フィルタリングできる機能を追加。

### DB

- `FavoriteCard` モデル追加（`prisma/schema.prisma`）
  - user_id + card_id のユニーク制約
  - User, Card への Cascade 削除
- `FavoriteArticle` モデル追加（`prisma/schema.prisma`）
  - user_id + article_id のユニーク制約
  - User, Article への Cascade 削除

### API

| エンドポイント            | メソッド | 概要                     |
| ------------------------- | -------- | ------------------------ |
| `/api/favorites/cards`    | POST     | カードのお気に入りトグル |
| `/api/favorites/cards`    | GET      | お気に入りカードID一覧   |
| `/api/favorites/articles` | POST     | 記事のお気に入りトグル   |
| `/api/favorites/articles` | GET      | お気に入り記事ID一覧     |

### フロントエンド

- `FavoriteButton` コンポーネント（`src/components/ui/favorite-button.tsx`）
  - アニメーション付きハートアイコン、楽観的更新
- `useFavorites` フック（`src/hooks/use-favorites.ts`）
  - お気に入り状態管理、トグル操作、ロールバック対応
- 統合箇所:
  - 記事一覧（`articles/page.tsx`）— 各記事カードにお気に入りボタン
  - コレクション（`collection/page.tsx`）— カードグリッドにお気に入り状態連携
  - カード詳細（`cards/[id]/page.tsx`）— お気に入りボタン追加
  - フィルタ（`article-filter.tsx`, `collection-filter.tsx`）— 「お気に入りのみ」トグル追加

### バリデーション

- `src/lib/validations/favorite.ts` — Zod スキーマ（cardId/articleId の UUID バリデーション）

### サービス

- `src/lib/services/favorite-service.ts` — toggleFavoriteCard, toggleFavoriteArticle, getFavoriteCardIds, getFavoriteArticleIds

---

## 2. カスケード削除の廃止（SetNull化）

記事削除時にカードが連鎖削除される問題を修正。

### 変更内容

| ファイル                                         | 変更                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                           | Card.articleId を `String?`（nullable）に、`onDelete: SetNull` に変更                                   |
| `src/lib/services/article-service.ts`            | deleteArticle 簡略化（トランザクション・カード削除・画像削除を除去、単純な `prisma.article.delete` に） |
| `src/lib/errors/error-messages.ts`               | 削除確認メッセージを「関連するカードは削除されません」に更新                                            |
| `__tests__/lib/services/article-service.test.ts` | カード連鎖削除のモック・検証を除去、単純な削除テストに更新                                              |

### 動作

- 記事削除 → カードの `articleId` が null に設定される（カード自体は残存）
- カード詳細ページは既に `card.article && ...` でガード済み

---

## 3. レアリティ星表示の整理

重複していたレアリティ星（★）定義を整理・削除。

| ファイル                                  | 変更                                                      |
| ----------------------------------------- | --------------------------------------------------------- |
| `src/lib/constants/rarity-config.ts`      | `stars` プロパティを RARITY_CONFIG から削除               |
| `src/types/database.ts`                   | `RARITY_STARS` レコードを削除                             |
| `src/lib/utils.ts`                        | `getRarityStars()` 関数を削除                             |
| `src/lib/card/image-composer.ts`          | `getRarityStars()` ヘルパーを削除、レアリティ名のみ表示に |
| `src/lib/share/utils.ts`                  | `getRarityStars()` ヘルパーを削除、レアリティ名のみ表示に |
| `src/components/card/rarity-badge.tsx`    | 星表示ロジックを簡素化                                    |
| `src/components/card/rarity-selector.tsx` | 星表示ロジックを簡素化                                    |

---

## 4. カード一覧の検索・ソート拡張

| ファイル                           | 変更                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/app/api/cards/route.ts`       | keyword, sortBy, sortOrder, onlyFavorites パラメータ追加                                    |
| `src/lib/services/card-service.ts` | getCardsByUser に keyword 検索、sortBy (createdAt/rarity/keyword)、お気に入りフィルタを追加 |
| `src/lib/validations/card.ts`      | keyword, sortBy, sortOrder, onlyFavorites のバリデーション追加                              |
| `src/hooks/use-collection.ts`      | FilterState に onlyFavorites 追加、クエリパラメータ連携                                     |

---

## 5. ドキュメント同期

実装内容に合わせてDB関連ドキュメントを更新。

| ファイル                        | 変更                                                                                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/specs/database.md`        | ER図にお気に入りテーブル追加、cards.article_id を SET NULL に修正、Prismaスキーマを Enum 型・全モデル含め全面更新、Enum定義に SessionStatus/SubscriptionTier/daily 追加 |
| `docs/specs/api-design.md`      | DELETE /api/articles/:id の説明・レスポンスを修正、GET /api/cards/:id の article フィールドに null 許容を明記                                                           |
| `docs/specs/card-generation.md` | Card データ構造の articleId を `string \| null` に修正                                                                                                                  |
| `docs/logs/db-design-notes.md`  | スキーマ構造図に SetNull 注釈・お気に入りテーブル追加、変更履歴追記                                                                                                     |
| `CLAUDE.md`                     | Database Models セクションに FavoriteCard/FavoriteArticle/StripeWebhookEvent 追加                                                                                       |

---

## 変更ファイル一覧

### 新規ファイル（6）

- `src/app/api/favorites/cards/route.ts`
- `src/app/api/favorites/articles/route.ts`
- `src/components/ui/favorite-button.tsx`
- `src/hooks/use-favorites.ts`
- `src/lib/services/favorite-service.ts`
- `src/lib/validations/favorite.ts`

### 変更ファイル（35）

- `prisma/schema.prisma`
- `CLAUDE.md`
- `src/lib/services/article-service.ts`
- `src/lib/services/card-service.ts`
- `src/lib/errors/error-messages.ts`
- `src/lib/constants/rarity-config.ts`
- `src/lib/card/image-composer.ts`
- `src/lib/share/utils.ts`
- `src/lib/utils.ts`
- `src/lib/validations/article.ts`
- `src/lib/validations/card.ts`
- `src/types/database.ts`
- `src/app/api/articles/route.ts`
- `src/app/api/cards/route.ts`
- `src/app/(main)/articles/page.tsx`
- `src/app/(main)/cards/[id]/page.tsx`
- `src/app/(main)/collection/page.tsx`
- `src/components/article/article-card.tsx`
- `src/components/article/article-filter.tsx`
- `src/components/card/card-display.tsx`
- `src/components/card/card-grid.tsx`
- `src/components/card/rarity-badge.tsx`
- `src/components/card/rarity-selector.tsx`
- `src/components/collection/collection-filter.tsx`
- `src/components/ui/index.ts`
- `src/hooks/use-articles.ts`
- `src/hooks/use-collection.ts`
- `__tests__/app/api/articles/route.test.ts`
- `__tests__/app/api/cards/route.test.ts`
- `__tests__/lib/services/article-service.test.ts`
- `docs/specs/database.md`
- `docs/specs/api-design.md`
- `docs/specs/card-generation.md`
- `docs/logs/db-design-notes.md`
- `docs/logs/2026-02-13-favorites-and-cascade-fix.md`
