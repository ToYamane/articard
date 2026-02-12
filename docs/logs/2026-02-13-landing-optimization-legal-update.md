# ランディングページ最適化 & 法的ページ改善

**日付**: 2026-02-13

## 概要

ランディングページの画像最適化・カルーセルUI改善・セクション構成見直しを実施。併せて法的ページ4種（利用規約・プライバシーポリシー・特商法・問い合わせ）の内容を検証し、法的要件の不足を修正した。

---

## 1. 画像最適化

`npx sharp-cli` で全画像を WebP 変換 + リサイズ。合計 3.3MB → 1.4MB（58% 削減）。

| 元ファイル | 元サイズ | WebP サイズ | 削減率 |
|-----------|---------|------------|--------|
| `logo/icon.png` | 510KB | 15KB | 97% |
| `logo/text.png` | 552KB | 44KB | 92% |
| `promo/screenshot-article.png` | 331KB | 72KB | 78% |
| `promo/screenshot-challenge.png` | 674KB | 53KB | 92% |
| `promo/screenshot-score.png` | 235KB | 46KB | 80% |
| `promo/cards/*.jpg` (16枚) | 1.4MB | ~800KB | 43% |

元の PNG/JPG ファイルは削除済み。全参照元（page.tsx, layout.tsx, header.tsx, login-form.tsx, register-form.tsx）のパスを `.webp` に更新。

## 2. カルーセル UI 改善 (`src/app/page.tsx`)

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| 表示領域 | 固定 480px | `h-[380px] md:h-[480px]` |
| カードサイズ | 240×360 固定 | モバイル 180×270 / デスクトップ 240×360 |
| カード間隔 | `offset * 220` 固定 | モバイル `*160` / デスクトップ `*220` |
| ヒントテキスト | `text-xs text-white/40` | `text-sm text-white/60` + フリップアイコン |
| 矢印ボタン | `bg-white/15 p-3` SVG 20px | `bg-white/20 border border-white/30 p-3.5 md:p-4` SVG 24px + shadow |
| 隣接カードクリック | 不可（pointer-events-none） | クリックでそのカードへ移動 |

`useIsMobile` フック（`matchMedia` ベース）を追加してレスポンシブ対応。

## 3. セクション構成

- **セクション E（特徴まとめ）**: 削除（セクション B/C/D と重複していたため）
- **Hero ロゴ拡大**: アイコン `w-20`→`w-28`、テキスト `w-64`→`w-80`
- **セクション B カード拡大**: デスクトップ `w-[140px]`→`w-[180px]`、モバイル→`w-[160px]`
- **CTA統一**: 最下部 CTA の `md:text-lg` を削除

## 4. 法的ページ改善

### 4.1 特定商取引法 (`src/app/(public)/commerce/page.tsx`)

- プレースホルダー `[要更新]` を実情報に置き換え
  - 事業者名・代表者名: 山根聡展
  - 所在地・電話番号: 「請求があれば遅滞なく開示」
- 「電話番号」行を新規追加
- 「販売商品」行を新規追加（ナレッジの購入）
- 「販売価格」を具体化（アプリ内購入画面に表示）

### 4.2 利用規約 (`src/app/(public)/terms/page.tsx`)

- 前文に運営者名（山根聡展）を明記
- **第2条の2「有料サービス」新設**: ナレッジ購入・Stripe 決済・返金ポリシー
- **第3条の2「アカウントの停止・削除」新設**: 禁止事項違反時の措置
- 第4条: 商用利用禁止を明記（個人利用・SNS 共有のみ許可）
- 第5条: サービス終了時 30 日前通知を追加
- 第6条: 規約変更の 14 日前通知を明記

### 4.3 プライバシーポリシー (`src/app/(public)/privacy/page.tsx`)

- 冒頭に個人情報取扱事業者名を追記
- 外部サービス一覧に追加: FLUX (Black Forest Labs)、Google Gemini、DALL-E (OpenAI)
- **新セクション5「AIへのデータ提供」追加**: API 経由利用のため学習に使用されない旨を明記
- データ保管: アカウント削除後 30 日以内に削除を追記
- セクション番号を繰り下げ（5→6〜8→9）

### 4.4 お問い合わせ (`src/app/(public)/contact/page.tsx`)

- 個人情報取り扱い文をメールアドレスセクションに追加

---

## 変更ファイル一覧

| ファイル | 操作 |
|----------|------|
| `public/logo/icon.png` → `icon.webp` | WebP 変換 + リサイズ（元ファイル削除） |
| `public/logo/text.png` → `text.webp` | WebP 変換 + リサイズ（元ファイル削除） |
| `public/promo/screenshot-*.png` → `.webp` | WebP 変換（元ファイル削除） |
| `public/promo/cards/*.jpg` → `.webp` | WebP 変換（元ファイル削除） |
| `src/app/page.tsx` | カルーセル UI 改善 + セクション E 削除 + ロゴ拡大 + 画像パス更新 |
| `src/app/(public)/layout.tsx` | ロゴパス .png → .webp |
| `src/components/layout/header.tsx` | ロゴパス .png → .webp |
| `src/components/auth/login-form.tsx` | ロゴパス .png → .webp |
| `src/components/auth/register-form.tsx` | ロゴパス .png → .webp |
| `src/app/(public)/commerce/page.tsx` | プレースホルダー更新 + 電話番号・販売商品追加 |
| `src/app/(public)/terms/page.tsx` | 有料サービス条項・アカウント停止条項新設 + 既存条項改善 |
| `src/app/(public)/privacy/page.tsx` | 外部サービス追加 + AI 学習セクション + データ保持期間 |
| `src/app/(public)/contact/page.tsx` | 個人情報取り扱い文追加 |

## 検証結果

- `npm run type-check`: OK（エラーなし）
- `npm run lint src/app/page.tsx`: OK
- プレースホルダー `[要更新]` 残存なし

## 残タスク

- [ ] メール受信設定（Cloudflare Email Routing 等で support@articard.app を有効化）
- [ ] `npm run dev` での実機確認
- [ ] モバイル実機でのカルーセル・レスポンシブ確認
