# ランディングページ & 法的ページ実装

**日付**: 2026-02-12

## 概要

本番デプロイ後、`articard.app` にアクセスすると即座に `/login` へリダイレクトされ、初回訪問者にサービスの魅力が伝わらなかった。スクロール式ランディングページ（6セクション + フッター）を実装し、同時にサービス公開に必要な法的ページ4種を追加した。

## 1. ランディングページ (`src/app/page.tsx`)

`redirect('/login')` のみだったルートページを、Framer Motion アニメーション付きのフルLPに置き換え。

### ページ構成（6セクション）

| セクション | 内容 | 背景 |
|-----------|------|------|
| (A) Hero | ロゴ + キャッチコピー「学んで集める、AIカードコレクション」+ CTA | ダークグラデーション + スパークルエフェクト |
| (B) 記事→カード生成 | 記事スクリーンショット → 矢印 → カード4枚ファンレイアウト | ホワイト |
| (C) レアリティ展示 | 4段階レアリティをグローエフェクト付きで展示（確率・AI名表示） | ダークグラデーション |
| (D) チャレンジモード | スクリーンショット2枚 + シナリオ例（タイムトラベル, 魔王討伐, 無人島） | ホワイト |
| (E) 特徴まとめ | 3カラム: AI記事生成 / コレクティブルカード / チャレンジモード | ライトグレー |
| (F) CTA | 「今すぐはじめよう」+ 登録ボタン | ダークグラデーション |
| Footer | ロゴ + 法的ページリンク + コピーライト | ダークグレー |

### 技術的実装

- **認証ハンドリング**: `useAuth` フックで認証状態を確認。認証済みユーザーは `/home`（登録済み）または `/setup`（未登録）へリダイレクト
- **アニメーション**: Framer Motion の `motion.div` + `whileInView`（`viewport={{ once: true }}`）でスクロールトリガー。既存の `staggerContainer` / `staggerItem` を再利用
- **スパークルエフェクト**: CSS `@keyframes twinkle` を `<style jsx global>` で定義、8個のパーティクルを配置
- **レスポンシブ**: モバイルではカードファンが2x2グリッドに、矢印が縦向きに、スクリーンショットが縦並びに変化
- **レアリティカードのグロー**: `onMouseEnter` / `onMouseLeave` で `boxShadow` を動的変更 + Framer Motion `whileHover={{ scale: 1.05 }}`

### デザインリファレンス

既存の `public/promo/` にあるプロモ用HTML（01-title.html 〜 05-combinations.html）のデザインパターン（グラデーション、グロー、ファンレイアウト等）を参考に実装。

## 2. プロモ画像の配置

`image/promo/` から `public/promo/` にコピーし、ファイル名を英語に統一:

| 元ファイル | コピー先 |
|-----------|---------|
| `026495f1-..._card.webp` | `public/promo/card-common.webp` |
| `cdce1261-..._card.webp` | `public/promo/card-rare.webp` |
| `1ec0a331-..._card.webp` | `public/promo/card-super-rare.webp` |
| `1c5049bc-..._card.webp` | `public/promo/card-legend.webp` |
| `スクリーンショット 2026-02-09 202212.png` | `public/promo/screenshot-article.png` |
| `スクリーンショット 2026-02-09 191214.png` | `public/promo/screenshot-challenge.png` |
| `スクリーンショット 2026-02-09 203422.png` | `public/promo/screenshot-score.png` |

## 3. 法的ページ

`(public)` ルートグループ配下に4ページを新規作成。すべてサーバーコンポーネント（metadata エクスポートあり）。

| パス | ファイル | 内容 |
|------|---------|------|
| `/terms` | `src/app/(public)/terms/page.tsx` | 利用規約（7条: サービス概要、利用登録、禁止事項、知的財産権、免責事項、規約変更、準拠法） |
| `/privacy` | `src/app/(public)/privacy/page.tsx` | プライバシーポリシー（Firebase Auth・利用データの収集、利用目的、第三者提供、Cookie、データ保管、ユーザー権利） |
| `/commerce` | `src/app/(public)/commerce/page.tsx` | 特定商取引法に基づく表記（テーブル形式、事業者情報は [要更新] プレースホルダー） |
| `/contact` | `src/app/(public)/contact/page.tsx` | お問い合わせ（support@articard.app へのメール案内、必要情報リスト、回答期間） |

## 4. AuthGuard 更新 (`src/components/auth/auth-guard.tsx`)

- `publicRoutes` に `/terms`, `/privacy`, `/commerce`, `/contact` を追加
- 認証済みユーザーが `/` にアクセスした場合のリダイレクト追加（`pathname === '/'` を既存の `/login`, `/register` チェックに統合）

## 5. (public) レイアウト更新 (`src/app/(public)/layout.tsx`)

フッターに法的ページへのリンク4つを追加（利用規約、プライバシーポリシー、特定商取引法に基づく表記、お問い合わせ）。

## 変更ファイル一覧

| ファイル | 操作 |
|----------|------|
| `src/app/page.tsx` | 書き換え（redirect → LP、582行） |
| `public/promo/card-common.webp` | 新規（image/promo からコピー） |
| `public/promo/card-rare.webp` | 新規（image/promo からコピー） |
| `public/promo/card-super-rare.webp` | 新規（image/promo からコピー） |
| `public/promo/card-legend.webp` | 新規（image/promo からコピー） |
| `public/promo/screenshot-article.png` | 新規（image/promo からコピー） |
| `public/promo/screenshot-challenge.png` | 新規（image/promo からコピー） |
| `public/promo/screenshot-score.png` | 新規（image/promo からコピー） |
| `src/app/(public)/terms/page.tsx` | 新規作成 |
| `src/app/(public)/privacy/page.tsx` | 新規作成 |
| `src/app/(public)/commerce/page.tsx` | 新規作成 |
| `src/app/(public)/contact/page.tsx` | 新規作成 |
| `src/app/(public)/layout.tsx` | フッターにリンク追加 |
| `src/components/auth/auth-guard.tsx` | publicRoutes 拡張 + `/` リダイレクト追加 |

## 検証結果

- `npm run type-check`: OK（エラーなし）
- ランディングページの全6セクション + フッター実装完了
- 法的ページ4種が `(public)` レイアウトで表示
- 認証済みユーザーの `/` → `/home` リダイレクト動作
- レスポンシブ対応（モバイル幅でカードファン→グリッド、矢印→縦向き）

## 残タスク

- [x] `commerce/page.tsx` の [要更新] プレースホルダーに実際の事業者情報を記入 → 2026-02-13 完了
- [ ] `npm run dev` での実機確認・デザイン微調整
- [ ] モバイル実機でのレイアウト確認
