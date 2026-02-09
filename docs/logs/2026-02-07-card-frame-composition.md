# カードフレーム合成の実装

## 概要

フレームPNGオーバーレイによるカード表面合成の実装・検証・修正。
`image-composer.ts` のフレーム合成ロジックを完成させ、全4レアリティのフレームPNG透明性を検証・修正した。

## 背景

- `image-composer.ts` にフレームPNG合成ロジック（背景 → イラスト全面 → フレームPNG → タイトルSVG）は実装済みだったが、フレーム画像の透明性が未検証だった
- Gemini生成の `frame_rare.png` は黒背景で不透明 → イラストが完全に隠れる問題が判明
- フレームPNGが `public/frames/` に存在しない場合はSVG枠線にフォールバックする設計

## 実施内容

### 1. フレーム透明性の検証 & 修正

`scripts/fix-frames.ts` を作成し、全フレームのアルファチャンネルを診断・自動修正するスクリプトを実装。

処理内容:
- 各フレームPNGのアルファチャンネルを分析（中心付近サンプリング、ピクセル統計）
- 中心が不透明なフレームを自動検出
- 白に近い（R,G,B > 240）または黒に近い（R,G,B < 30）ピクセルのアルファを0に設定
- 修正前後の診断結果を表示

### 2. テスト用カード合成スクリプト

`scripts/test-card-compose.ts` を作成し、外部API不要でカード合成を確認できるテストスクリプトを実装。

処理内容:
- 虹色グラデーションのダミーイラストをSVGで生成
- 全4レアリティで表面・裏面・サムネイルを合成
- 結果を `tmp/card-test/` に出力（.gitignore済み）

### 3. 開発環境の改善

- `concurrently` パッケージを導入
- `npm run dev` で Cloud SQL Proxy + Next.js を同時起動するように統合
- `/dev` スキル（`.claude/skills/dev/SKILL.md`）を DB Proxy 統合に対応して更新
- `.gitignore` に `/tmp` を追加

## フレーム診断結果

| フレーム | サイズ | 透明性 | 状態 | 対応 |
|----------|--------|--------|------|------|
| frame_common.png | 512x768 | OK（透明領域あり） | 正常 | なし |
| frame_rare.png | 512x768 | NG（黒背景で不透明） | 修正必要 | 219,871px を自動透明化 |
| frame_super_rare.png | 512x768 | OK（透明領域あり） | 正常 | なし |
| frame_legend.png | 512x768 | OK（super_rare のコピー） | 正常 | なし |

## 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `src/lib/card/image-composer.ts` | フレームPNGオーバーレイ合成ロジック（FRAME_CONFIG追加、createCardFrontのcomposite順序整備） |
| `scripts/fix-frames.ts` | 新規: フレーム透明性の診断・自動修正スクリプト |
| `scripts/test-card-compose.ts` | 新規: テスト用カード合成スクリプト |
| `public/frames/frame_common.png` | 新規: Common用フレームPNG |
| `public/frames/frame_rare.png` | 新規: Rare用フレームPNG（透明化修正済み） |
| `public/frames/frame_super_rare.png` | 新規: Super Rare用フレームPNG |
| `public/frames/frame_legend.png` | 新規: Legend用フレームPNG（super_rareのコピー） |
| `package.json` | concurrently追加、devスクリプト変更、dev:next追加、db:proxy追加 |
| `.claude/skills/dev/SKILL.md` | /devスキルをDB Proxy統合に対応 |
| `.gitignore` | `/tmp` 追加 |

## 検証手順

```bash
# フレーム透明性の診断・修正
npx tsx scripts/fix-frames.ts

# テスト用カード合成（tmp/card-test/ に出力）
npx tsx scripts/test-card-compose.ts
```

## 技術詳細

### カード表面の合成フロー

```
背景(#1a1a2e) → イラスト(全面cover) → フレームPNG(透明オーバーレイ) → タイトルSVG
```

sharp の `composite` メソッドで上記レイヤーを順番に合成。フレームPNGが存在しない場合はSVG枠線にフォールバック。

### フレーム設定（レアリティ別）

各レアリティでタイトル位置・色が異なる:
- Common: y=30, #CD7F32（ブロンズ）
- Rare: y=65, #C0C0FF（シルバーブルー）
- Super Rare: y=40, #FFD700（ゴールド）
- Legend: y=40, #FFD700（ゴールド）

## 今後の課題

- **frame_rare.png**: Gemini生成のため品質に課題あり。黒背景の自動透明化は行ったが、エッジ品質が他フレームより劣る → 将来的に手動作成 or 再生成を検討
- **frame_legend.png**: 現状 super_rare のコピー → Legend専用フレーム（より豪華なデザイン）の作成を検討
