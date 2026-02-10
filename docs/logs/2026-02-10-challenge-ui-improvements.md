# チャレンジモード UI改善

**日付**: 2026-02-10

## 概要

チャレンジモードの全コンポーネント（8ファイル）、ページ（2ファイル）、バックエンド（サービス・API）を調査し、バグ修正・UX改善・新機能追加・アクセシビリティ対応を実施。計16項目を3フェーズに分けて実装。

## Phase 1: バグ修正 & クイックウィン

### 1.1 トリプルカードのラベルバグ修正
- `phase-display.tsx`: 3枚フェーズで「2枚選択（コンボ）」と誤表示されていたのを「3枚選択（トリプル）」に修正

### 1.2 CardSelectorの未使用コード削除
- `card-selector.tsx`: `hoveredCardId` state と関連コードを削除（不要なre-render防止）

### 1.3 プログレスバーの計算修正
- `phase-display.tsx`: `(currentPhase / totalPhases)` → `((currentPhase - 1) / totalPhases)` でフェーズ1開始時に0%を正しく表示

### 1.4 アニメーション遅延の短縮
- `result-display.tsx`, `challenge-complete.tsx`: アクションボタンの表示遅延を `delay: 1` → `delay: 0.3` に短縮

### 1.5 アクセシビリティ改善
- `challenge-card.tsx`, `result-display.tsx`, `challenge-complete.tsx`, `deck-builder.tsx`: 絵文字に `aria-hidden="true"` 追加、デッキ削除ボタンに `aria-label` 追加

## Phase 2: コアUX改善

### 2.1 カード詳細モーダル追加
- 新規 `card-detail-modal.tsx`: カード画像・キーワード・レアリティ・フレーバーテキスト・説明を表示するモーダル
- `card-selector.tsx`, `deck-builder.tsx`: カードに「i」ボタンを追加し、モーダルを呼び出し

### 2.2 結果画面にカードサムネイル追加
- `result-display.tsx`: `CardData` に `thumbnailUrl` を追加し、結果画面でサムネイル画像を表示
- `challenge-service.ts`: APIレスポンスの `selectedCards` に `thumbnailUrl` を含めるよう修正

### 2.3 AI評価中のローディングUI改善
- `[sessionId]/page.tsx`: submitting状態でローテーションテキスト付きオーバーレイを表示（「AIが評価中...」→「物語を紡いでいます...」等）

### 2.4 カード取得上限の引き上げ
- `[sessionId]/page.tsx`: `/api/cards?limit=50` → `limit=200`
- `card.ts`: Zodスキーマの `.max(50)` → `.max(200)`

### 2.5 進行状況表示の統合
- `[sessionId]/page.tsx`: チャレンジプレイ中のPhaseTimelineを削除（結果画面では保持）、モバイルの縦スペース確保

### 2.6 デッキプレビューサムネイルの拡大
- `deck-builder.tsx`: `h-20 w-14` → `h-24 w-16` に拡大、空きスロットの "?" を "+" アイコンに変更

## Phase 3: 新機能

### 3.1 シナリオカードにプレイ回数表示
- `scenario-card.tsx`: `playCount` プロパティ追加、プレイ回数を詳細情報に表示
- `challenge/page.tsx`: ハイスコアAPIを並列取得し、プレイ回数をシナリオに統合

### 3.2 シナリオソート機能
- `challenge/page.tsx`: ハイスコア順・プレイ回数順のソートオプション追加

### 3.3 チャレンジ履歴ページ
- 新規 `challenge/history/page.tsx`: 完了セッション一覧の閲覧UI（既存API `GET /sessions?status=completed` を活用）

### 3.4 prefers-reduced-motion 対応
- 全7コンポーネント: Framer Motionの `useReducedMotion()` フックで、OS設定に基づきアニメーションを簡素化（scale/translate無効化、whileHover/whileTap無効化）

### 3.5 キーボードナビゲーション改善
- `card-selector.tsx`, `deck-builder.tsx`: `focus-visible:ring-2` フォーカス表示、grid要素に `role="group"` と `aria-label` 追加

## 変更ファイル一覧

| ファイル | 種別 | 対応項目 |
|----------|------|----------|
| `src/components/challenge/phase-display.tsx` | 修正 | 1.1, 1.3, 3.4 |
| `src/components/challenge/card-selector.tsx` | 修正 | 1.2, 2.1, 3.4, 3.5 |
| `src/components/challenge/card-detail-modal.tsx` | **新規** | 2.1 |
| `src/components/challenge/result-display.tsx` | 修正 | 1.4, 1.5, 2.2, 3.4 |
| `src/components/challenge/challenge-complete.tsx` | 修正 | 1.4, 1.5, 3.4 |
| `src/components/challenge/challenge-card.tsx` | 修正 | 1.5, 3.4 |
| `src/components/challenge/deck-builder.tsx` | 修正 | 1.5, 2.1, 2.6, 3.4, 3.5 |
| `src/components/challenge/scenario-card.tsx` | 修正 | 3.1, 3.4 |
| `src/components/challenge/index.ts` | 修正 | 2.1 (export追加) |
| `src/app/(main)/challenge/[sessionId]/page.tsx` | 修正 | 2.3, 2.4, 2.5 |
| `src/app/(main)/challenge/page.tsx` | 修正 | 3.1, 3.2 |
| `src/app/(main)/challenge/history/page.tsx` | **新規** | 3.3 |
| `src/lib/services/challenge-service.ts` | 修正 | 2.2 |
| `src/lib/validations/card.ts` | 修正 | 2.4 |

## 検証結果

- `npm run type-check` — 成功（エラーなし）
- `npm run lint` — 警告のみ（全て既存、新規エラーなし）
- `npm run test -- __tests__/lib/services/challenge-service.test.ts` — 42テスト全パス
