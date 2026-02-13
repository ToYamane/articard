# UI改善・OGP画像・Toast Context化・チャレンジ課金タイミング修正

**日付**: 2026-02-14

## 概要

ログイン画面のロゴ適用・デザイン改善、OGP/Twitter Card画像の自動生成、Toast通知のContext化、チャレンジモードの課金タイミング修正、デッキビルダーのアニメーション追加など、複数のUI/UX改善を実施。

---

## 1. Auth画面ロゴ適用 & デザイン改善

### 変更内容

- **`src/app/(auth)/layout.tsx`**: プレーンテキスト「Articard」→ `icon.webp` + `text.webp` ロゴ画像に置換
  - グラデーション背景（`from-blue-50 via-indigo-50 to-purple-50`、ダーク対応）
  - フォームを `rounded-2xl bg-white/80 shadow-xl backdrop-blur-sm` カードコンテナで囲む
  - ダークモード: `text.webp` に `brightness-0 invert` で白反転
  - `priority` 属性で LCP 最適化
- **`src/components/auth/login-form.tsx`**: 重複 `icon.webp` 削除、divider背景色修正
- **`src/components/auth/register-form.tsx`**: 同上
- **`src/components/auth/nickname-setup-form.tsx`**: メール表示部の背景色をカード内に最適化

## 2. OGP/Twitter Card 画像

### 変更内容

- **`src/app/opengraph-image.tsx`**: Edge Runtimeで動的OGP画像生成（1200x630）
  - `icon.webp` + `text.webp` をBase64変換して埋め込み
  - 紫〜青のグラデーション背景
- **`src/app/twitter-image.tsx`**: OGP画像を再エクスポート
- **`src/app/layout.tsx`**: `metadataBase`、`openGraph`、`twitter` メタデータ追加、`lang="ja"` に修正

## 3. Toast通知のContext化

### 変更内容

- **`src/hooks/use-toast.ts`** → **`src/hooks/use-toast.tsx`** に変換
  - ローカルState hookから `ToastProvider` + `ToastContext` パターンに移行
  - `ToastContainer` をProvider内に内蔵し、アプリ全体で統一管理
- **`src/app/providers.tsx`**: `ToastProvider` を追加

## 4. チャレンジモード課金タイミング修正

### 変更内容

- **`src/lib/services/challenge-service.ts`**:
  - `createSession` からコイン消費・回数カウントを削除
  - `setSessionDeck` にコイン消費・回数カウントを移動
  - **理由**: セッション作成時ではなくデッキ確定時（=実質的なチャレンジ開始時）に課金するのが適切

## 5. デッキビルダーUI改善

### 変更内容

- **`src/components/challenge/deck-builder.tsx`**: デッキ完成時にチャレンジ開始ボタンにパルスアニメーション追加（`motion.div` + `scale`）
  - `shouldReduceMotion` 対応（アクセシビリティ）

## 6. 設定ページ比較表更新

### 変更内容

- **`src/app/(main)/settings/page.tsx`**: プラン比較表に「カード一括生成」行を追加

---

## 変更ファイル一覧

| ファイル                                      | 変更                                         |
| --------------------------------------------- | -------------------------------------------- |
| `src/app/(auth)/layout.tsx`                   | ロゴ画像化 + グラデーション + カードコンテナ |
| `src/components/auth/login-form.tsx`          | 重複アイコン削除 + divider修正               |
| `src/components/auth/register-form.tsx`       | 同上                                         |
| `src/components/auth/nickname-setup-form.tsx` | 背景色微調整                                 |
| `src/app/opengraph-image.tsx`                 | **新規** OGP画像生成                         |
| `src/app/twitter-image.tsx`                   | **新規** Twitter Card画像                    |
| `src/app/layout.tsx`                          | OGPメタデータ + lang=ja                      |
| `src/app/providers.tsx`                       | ToastProvider追加                            |
| `src/hooks/use-toast.tsx`                     | **新規** Context版Toast                      |
| `src/hooks/use-toast.ts`                      | **削除** 旧hook版                            |
| `src/components/challenge/deck-builder.tsx`   | ボタンパルスアニメーション                   |
| `src/lib/services/challenge-service.ts`       | 課金タイミングをsetSessionDeckに移動         |
| `src/app/(main)/settings/page.tsx`            | 一括生成行追加                               |
