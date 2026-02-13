# 2026-02-13 サブスク月次更新ボーナス・UI刷新・各種改善

## 概要

サブスクリプションの月次更新時にもボーナスコインが付与されるよう Webhook ハンドラを追加し、
ホーム画面の UI を全面リニューアル。その他、新規登録ボーナス、名称重複の解消などを実施。

## 変更内容

### 1. サブスク月次更新ボーナス

**背景**: `activateSubscription()` は毎回ボーナスを付与するよう変更済みだったが、
Webhook の `customer.subscription.updated` は tier 変更時のみ呼ばれるため、
同一プランの月次更新（renewal）ではボーナスが付与されなかった。

**対応**:
- `src/app/api/stripe/webhook/route.ts`: `invoice.paid` ハンドラ追加
  - `billing_reason === 'subscription_cycle'` のみ処理（renewal のみ）
  - `subscription_create`（初回）、`subscription_update`（プラン変更）はスキップ
- `src/lib/services/subscription-service.ts`: ボーナスを毎回付与に変更
  - `signupBonus` → `bonus` にリネーム
  - 「初回特典」→「加入特典」に文言変更
- `__tests__/`: webhook テスト 3 件追加、service テスト更新

| シナリオ | トリガー | ボーナス |
|---------|----------|---------|
| 初回加入 | `checkout.session.completed` | 付与 |
| プラン変更 | `customer.subscription.updated` (tier変更) | 付与 |
| 月次更新 | `invoice.paid` (subscription_cycle) | 付与 (NEW) |

### 2. コインパッケージ名称変更

**背景**: サブスクプラン「プレミアム」とコイン購入パッケージ「プレミアム」で名称が重複。

**対応**:
- `src/lib/constants/coins.ts`: `COIN_PACKAGES.premium` → `COIN_PACKAGES.mega`（メガ）
- テスト更新: `purchase/route.test.ts`, `coins/route.test.ts`

### 3. ホーム画面 UI 刷新

- グラデーション背景（layout.tsx）
- 装飾付き生成フォーム（カード風デザイン + アニメーションバー）
- チャレンジ・コレクションへのクイックアクションボタン
- カード表示の `home` バリアント追加（キーワード・レアリティ常時表示）
- 空状態の改善（プロモカード画像 + CTA ボタン）
- ウェルカムメッセージのグラデーションテキスト

### 4. 生成フォーム簡素化

- 「記事のみ生成」ボタンを廃止 → 常にカード生成を実行
- `ThemeInput.onSubmit` から `withCard` パラメータを削除
- ゴールド風アニメーションボタン（有効時）

### 5. ヘッダー改善

- コイン残高のホバーポップアップ追加（デイリーコイン・永続コイン・リセットまでの時間）
- デイリーコインリセットまでのカウントダウン表示

### 6. 新規登録ウェルカムボーナス

- `src/app/api/auth/register/route.ts`: ユーザー作成時に `WELCOME_BONUS`（300コイン）を付与
- `COIN_REWARDS.WELCOME_BONUS` 定数追加

### 7. Stats API 拡張

- `src/app/api/stats/route.ts`: `totalArticles` フィールド追加
- ホーム画面で記事数・カード数の統計を表示

### 8. コレクションフィルター簡素化

- `contextCategory` フィルターを削除（未使用だったため）

### 9. その他

- ファビコン・アプリアイコン更新（favicon.ico, favicon-16/32, apple-touch-icon, icon-192/512）
- メタデータ更新（タイトル・説明文を ArtiCard 用に変更）
- CSS: `animate-gradient-x`, `animate-gold-button`, `gold-glow`, `gold-pulse` アニメーション追加
- テーマサジェストのデザイン改善

## 変更ファイル一覧

### ソースコード
- `src/app/(main)/home/page.tsx` - ホーム画面 UI 刷新
- `src/app/(main)/layout.tsx` - グラデーション背景
- `src/app/(main)/settings/page.tsx` - 文言修正（デイリーコイン・加入ボーナス）
- `src/app/api/auth/register/route.ts` - ウェルカムボーナス
- `src/app/api/stats/route.ts` - totalArticles 追加
- `src/app/api/stripe/webhook/route.ts` - invoice.paid ハンドラ
- `src/app/globals.css` - アニメーション追加
- `src/app/layout.tsx` - メタデータ・ファビコン設定
- `src/app/favicon.ico` - アイコン更新
- `src/components/article/theme-input.tsx` - フォーム簡素化・デザイン
- `src/components/article/theme-suggestions.tsx` - デザイン改善
- `src/components/card/card-display.tsx` - home バリアント・showInfo
- `src/components/card/card-grid.tsx` - home バリアント
- `src/components/collection/collection-filter.tsx` - contextCategory 削除
- `src/components/layout/header.tsx` - コインポップアップ
- `src/hooks/use-collection.ts` - contextCategory 削除
- `src/lib/constants/coins.ts` - bonus リネーム・mega・WELCOME_BONUS
- `src/lib/services/subscription-service.ts` - 毎回ボーナス

### テスト
- `__tests__/app/api/stripe/webhook/route.test.ts` - invoice.paid テスト追加
- `__tests__/app/api/coins/purchase/route.test.ts` - mega パッケージ
- `__tests__/app/api/coins/route.test.ts` - mega パッケージ
- `__tests__/lib/services/subscription-service.test.ts` - 毎回ボーナス

### アセット
- `public/apple-touch-icon.png` - 新規
- `public/favicon-16.png` - 新規
- `public/favicon-32.png` - 新規
- `public/icon-192.png` - 新規
- `public/icon-512.png` - 新規
- `cloudbuild-deploy.yaml` - 新規
