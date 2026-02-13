# ダークモード実装

**日付**: 2026-02-13

## 概要

next-themes + Tailwind CSS クラスベースのダークモード機能を実装。ユーザーは設定ページからライト/ダーク/システムの3モードを切り替え可能。

## 技術構成

### インフラ

- **next-themes**: テーマ管理ライブラリ（`ThemeProvider` による SSR 対応）
- **Tailwind CSS**: `darkMode: 'class'` 設定で `dark:` プレフィクスによるスタイル切替
- **providers.tsx**: `ThemeProvider` をラップする新規プロバイダーコンポーネント

### 配色設計

- CSS 変数（`globals.css`）でライト/ダーク両モードの基本カラーを定義
- ユーティリティクラスで背景・テキスト・ボーダー・シャドウを統一管理
- `dark:` プレフィクスで全コンポーネントにダーク配色を適用

## 変更範囲

### 新規ファイル
- `src/app/providers.tsx` - ThemeProvider ラッパー

### 設定変更
- `tailwind.config.ts` - `darkMode: 'class'` 追加
- `package.json` / `package-lock.json` - next-themes 依存追加

### スタイル
- `src/app/globals.css` - CSS 変数・ダークモード用ユーティリティクラス追加

### レイアウト（4ファイル）
- `src/app/layout.tsx` - ThemeProvider 統合
- `src/app/(auth)/layout.tsx` - ダーク背景対応
- `src/app/(main)/layout.tsx` - ダーク背景・ヘッダー対応
- `src/app/(public)/layout.tsx` - ダーク背景対応

### ページ（8ファイル）
- `src/app/page.tsx` - LP ダーク対応
- `src/app/(main)/cards/[id]/page.tsx`
- `src/app/(main)/challenge/[sessionId]/page.tsx`
- `src/app/(main)/challenge/history/page.tsx`
- `src/app/(main)/challenge/page.tsx`
- `src/app/(main)/settings/page.tsx` - テーマ切替 UI 追加
- `src/app/(public)/commerce/page.tsx`
- `src/app/(public)/contact/page.tsx`
- `src/app/(public)/privacy/page.tsx`
- `src/app/(public)/terms/page.tsx`

### コンポーネント（約30ファイル）
- `src/components/ui/` - badge, button, checkbox, empty-state, input, modal, radio, select, skeleton, toggle-switch
- `src/components/article/` - article-card, article-view, theme-input, theme-suggestions
- `src/components/auth/` - login-form, nickname-setup-form, register-form
- `src/components/card/` - batch-generation-progress, card-loading, rarity-badge, rarity-selector
- `src/components/challenge/` - card-detail-modal, card-selector, challenge-card, challenge-complete, deck-builder, phase-display, result-display, scenario-card
- `src/components/collection/` - collection-filter, collection-search
- `src/components/layout/` - header

## 設定ページ UI

設定ページに3つのテーマオプションを表示:
- **ライトモード**: 常にライトテーマ
- **ダークモード**: 常にダークテーマ
- **システム設定に合わせる**: OS のテーマ設定に追従

## 設計判断

- `class` ベース（`media` ではなく）を採用し、ユーザーによる明示的な切り替えを可能に
- next-themes により FOUC（Flash of Unstyled Content）を防止
- CSS 変数でカラートークンを定義し、コンポーネント間の配色一貫性を確保
