# フォントレンダリング修正: fontconfig → opentype.js

**日付**: 2026-02-09

## 概要

カードタイトルのランダムフォント機能（10種）が、Windows環境でfontconfigの問題により全て同一のシステムフォールバックで描画されていた問題を修正。`opentype.js`を導入し、TTFファイルを直接読み込んでSVGパスに変換する方式に切り替えた。

## 問題

- カードタイトルに10種のGoogle Fontsを重み付きランダムで適用する仕様
- `FONTCONFIG_PATH` + `fonts.conf` でfontconfigにフォントディレクトリを指定していた
- Windows環境でsharpにバンドルされたlibrsvg/fontconfigがカスタムTTFを解決できず、全フォントがシステムデフォルトにフォールバック
- テスト画像10枚が全て同一の見た目で描画されていた

## 解決策

`opentype.js`でTTFファイルを直接読み込み、テキストをSVGの`<path>`要素に変換する方式に変更。fontconfigに依存しないため、OS・環境を問わず確実にフォントが適用される。

### 技術的変更

1. **SVG `<text>` → `<path>`**: フォント名指定によるテキスト描画から、グリフのベクターパスによる描画に変更
2. **フォント遅延ロード**: 各フォントは初回使用時に`opentype.loadSync()`でロードしキャッシュ
3. **テキスト中央揃え**: `font.charToGlyph()`でグリフ幅を計測し、手動でセンタリング計算

## 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `package.json` | `opentype.js` + `@types/opentype.js` 追加 |
| `src/lib/card/image-composer.ts` | fontconfig設定削除、opentype.jsによるフォント読み込み・パス変換を実装 |
| `scripts/test-card-compose.ts` | Part 2のフォント個別テストをopentype.js方式に更新 |

## フォント一覧（変更なし）

| フォント | ファイル | 出現重み |
|----------|----------|----------|
| Noto Sans JP | NotoSansJP-Bold.ttf | 2 |
| Noto Serif JP | NotoSerifJP-Bold.ttf | 2 |
| Dela Gothic One | DelaGothicOne-Regular.ttf | 2 |
| Kaisei Tokumin | KaiseiTokumin-Bold.ttf | 2 |
| Reggae One | ReggaeOne-Regular.ttf | 1 |
| Yuji Syuku | YujiSyuku-Regular.ttf | 1 |
| Kiwi Maru | KiwiMaru-Medium.ttf | 1 |
| Hachi Maru Pop | HachiMaruPop-Regular.ttf | 1 |
| DotGothic16 | DotGothic16-Regular.ttf | 1 |
| Stick | Stick-Regular.ttf | 1 |

## 検証結果

- `npm run type-check` — pass
- `npm run test` — 526/528 pass（2件は既知の既存失敗）
- `npx tsx scripts/test-card-compose.ts` — 全10フォントが異なる見た目で描画されることを確認
