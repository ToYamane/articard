# 15. カスタムカードフレーム実装ガイド

このドキュメントは、カスタムカードフレームを実装するためのガイドです。

---

## 概要

ユーザー提供の4つのカードフレーム画像をレアリティ別フレームとして使用する。

## レアリティとフレームの対応

| レアリティ | フレーム | 特徴 |
|-----------|---------|------|
| Legend | SF/メタル | 未来的な金属フレーム、青いライト |
| Super Rare | ゴールド | 豪華なバロック調、青い宝石付き |
| Rare | シルバー/アイス | クリスタル調、上部にオーブ |
| Common | ブロンズ | アールヌーボー調の蔦模様 |

---

## Phase 1: フレーム画像の加工（手動作業）

### 使用ツール

- **Photoshop** または **GIMP**（無料）

### GIMP での加工手順

#### Step 1: 画像を開く

1. GIMP を起動
2. `ファイル` → `開く` でフレーム画像を選択

#### Step 2: アルファチャンネルを追加

1. `レイヤー` → `透明部分` → `アルファチャンネルの追加`
   - これにより透明度を扱えるようになる

#### Step 3: 内側領域を選択

**方法A: 色域選択（推奨）**

1. `ツール` → `選択ツール` → `色域を選択`
2. 内側の背景色（ベージュ/グレー部分）をクリック
3. しきい値を調整（15〜30程度）して内側全体が選択されるようにする

**方法B: 自由選択（複雑な場合）**

1. `ツール` → `選択ツール` → `自由選択`
2. 内側の境界に沿ってクリックで囲む
3. 最後に始点をクリックして閉じる

#### Step 4: 選択範囲を削除

1. `編集` → `消去` または `Delete` キー
2. 内側が市松模様（透明）になれば成功

#### Step 5: リサイズ

1. `画像` → `画像の拡大・縮小`
2. 幅: 512px、高さ: 768px（縦横比を維持しない場合あり）
3. `拡大・縮小` をクリック

#### Step 6: PNG で保存

1. `ファイル` → `名前を付けてエクスポート`
2. ファイル名:
   - `frame_legend.png`（SF/メタル）
   - `frame_super_rare.png`（ゴールド）
   - `frame_rare.png`（シルバー/アイス）
   - `frame_common.png`（ブロンズ）
3. 保存先: プロジェクトの `public/frames/` ディレクトリ

### 注意点

- 装飾部分（宝石、蔦、オーブなど）は残す
- 内側の「背景」部分のみ透明にする
- フレームの端が切れないように注意

---

## Phase 2: コード実装

### 修正ファイル

- `src/lib/card/image-composer.ts`

### 実装内容

#### 1. フレーム設定の定義

```typescript
const FRAME_CONFIG: Record<Rarity, {
  framePath: string;
  illustrationArea: { x: number; y: number; width: number; height: number };
  titlePosition: { x: number; y: number };
  titleColor: string;
  titleFontSize: number;
}> = {
  legend: {
    framePath: '/frames/frame_legend.png',
    illustrationArea: { x: 45, y: 85, width: 422, height: 598 },  // 調整必要
    titlePosition: { x: 256, y: 50 },
    titleColor: '#00BFFF',
    titleFontSize: 22,
  },
  super_rare: {
    framePath: '/frames/frame_super_rare.png',
    illustrationArea: { x: 40, y: 70, width: 432, height: 618 },  // 調整必要
    titlePosition: { x: 256, y: 40 },
    titleColor: '#FFD700',
    titleFontSize: 22,
  },
  rare: {
    framePath: '/frames/frame_rare.png',
    illustrationArea: { x: 35, y: 65, width: 442, height: 628 },  // 調整必要
    titlePosition: { x: 256, y: 45 },
    titleColor: '#C0C0FF',
    titleFontSize: 22,
  },
  common: {
    framePath: '/frames/frame_common.png',
    illustrationArea: { x: 30, y: 60, width: 452, height: 638 },  // 調整必要
    titlePosition: { x: 256, y: 35 },
    titleColor: '#CD7F32',
    titleFontSize: 22,
  },
};
```

#### 2. 合成ロジックの変更

1. 背景キャンバス作成（512×768）
2. イラストを `illustrationArea` に合わせてリサイズ・配置
3. フレームPNGをオーバーレイ（透明部分からイラストが見える）
4. タイトルテキストを `titlePosition` に描画

---

## Phase 3: 検証

### 確認項目

- [ ] 各レアリティでフレームが正しく表示される
- [ ] イラストがフレーム内に収まっている
- [ ] タイトル位置が適切
- [ ] 透明部分に問題がない

### テスト方法

```bash
npm run dev
# カード生成を実行して各レアリティを確認
```

---

## 作業フロー

1. **ユーザー作業**: 4つのフレーム画像を加工して `public/frames/` に配置
2. **コード実装**: `image-composer.ts` を修正
3. **座標調整**: 実際の画像を見ながら `illustrationArea` と `titlePosition` を微調整
4. **検証**: 全レアリティでカード生成をテスト

---

## 元画像

- SF/メタル（Legend）: `ChatGPT Image 2026年2月3日 13_03_24.png`
- ゴールド（Super Rare）: `ChatGPT Image 2026年2月3日 16_32_26.png`
- シルバー/アイス（Rare）: `ChatGPT Image 2026年2月3日 16_38_33.png`
- ブロンズ（Common）: `ChatGPT Image 2026年2月3日 16_34_28.png`
