# テストスクリプト更新 & フォントレンダリング検証

**日付**: 2026-02-09

## 概要

テスト用スクリプト `scripts/test-card-compose.ts` を本番コード準拠に全面書き換え。
旧デザイン（PNGフレーム、font-size 22px）の独自実装を廃止し、本番 `composeCardImage` の直接使用 + フォント個別検証の2部構成に変更。

## 背景

- `image-composer.ts` はSVGフレーム・新タイトルパラメータ（36px, stroke-width 4, font-weight なし）に移行済み
- テストスクリプトは旧PNGフレーム・旧パラメータ（22px, stroke-width 2, font-weight bold）のまま乖離していた
- ランダムフォント10種の正常レンダリングを目視検証する手段がなかった

## 変更内容

### 削除した旧コード

| 定数/関数 | 理由 |
|-----------|------|
| `FRAME_CONFIG` | PNGフレームパス・旧タイトル位置/色/サイズ22px |
| `RARITY_COLORS`, `RARITY_STARS`, `RARITY_NAMES`, `RARITY_BORDER_WIDTHS` | 本番import で不要 |
| `createCardFront()` / `createCardBack()` | 本番 `composeCardImage` に置換 |
| `wrapText()` | 裏面生成が本番コードに移行したため不要 |

### Part 1: 本番コード使用レアリティ別テスト

- `composeCardImage` を `@/lib/card/image-composer` から直接 import
- ダミーイラスト（虹色グラデーション SVG）を生成
- 全4レアリティで本番と同一フローでカード生成
- 出力: `card_front_{rarity}.jpg`, `card_back_{rarity}.jpg`, `thumb_{rarity}.jpg` (12ファイル)

### Part 2: フォント個別レンダリング検証

本番 `CARD_FONTS` と同じ10フォントリストで個別にタイトルSVGを生成:

| パラメータ | 値 | 本番と同一か |
|------------|-----|------------|
| font-size | 36px | Yes |
| stroke-width | 4 | Yes |
| stroke | #000 | Yes |
| paint-order | stroke | Yes |
| font-weight | なし | Yes |
| fill | #D1D5DB | Yes (common) |

- 暗背景（#1a1a2e）にタイトルSVG + フォント名ラベルを合成
- 出力: `font_{FontName}.jpg` (10ファイル)
- ファイルサイズ表示で簡易的なフォント差異検証

### Part 3: fontconfig キャッシュクリア

スクリプト冒頭で `.fontconfig-cache` ディレクトリを削除し、古いキャッシュによるフォント解決失敗を排除。

## 同時に適用した image-composer.ts の変更

| 項目 | 旧 | 新 |
|------|-----|-----|
| TITLE_FONT_SIZE | 30 | 36 |
| TITLE_Y | 48 | 52 |
| stroke-width | 3 | 4 |
| font-weight | bold | (削除) |
| Noto Sans/Serif family | CJK JP 付き複数ファミリー | シングルファミリー + ジェネリック |
| Super Rare ボーダー色 | 紫 (#8B5CF6) | 金 (#F59E0B) |
| Legend タイトル色 | #FDE68A | #FFFFFF |
| Legend ボーダー | 金グラデーション | 虹色グラデーション |

## 検証結果

```
Part 1: 12ファイル生成OK（4レアリティ × 表裏サムネ）
Part 2: 10ファイル生成OK（全フォント 6.9〜7.9 KB で差異あり）
type-check: エラーなし
test: 526 passed, 2 failed（既知の pre-existing issue）
```

## 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `scripts/test-card-compose.ts` | 全面書き換え: 本番import + フォント個別検証 |
| `src/lib/card/image-composer.ts` | タイトルパラメータ更新、フォントfamily簡潔化、Super Rare/Legend色変更 |
| `fonts/fonts.conf` | Noto Sans/Serif JP エイリアス追加 |
| `fonts/*.ttf` | Google Fonts 正式ファイルに差し替え |
| `docs/logs/2026-02-09-svg-card-frame.md` | タイトルパラメータ・色情報を最新値に更新 |
