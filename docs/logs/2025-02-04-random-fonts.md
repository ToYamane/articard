# ランダムフォント機能の実装

## 概要

カード画像のタイトルに使用するフォントをランダムに選択する機能を実装。
Google Fontsから10種類の日本語フォントをローカルにインストールして使用。

## 追加フォント（10種類）

| フォント | ファイル | 特徴 | 出現重み |
|----------|----------|------|---------|
| Noto Sans JP | NotoSansJP-Bold.ttf | 標準ゴシック | 2 |
| Noto Serif JP | NotoSerifJP-Bold.ttf | 標準明朝 | 2 |
| Dela Gothic One | DelaGothicOne-Regular.ttf | 太字で力強い | 2 |
| Kaisei Tokumin | KaiseiTokumin-Bold.ttf | 毛筆風で雅やか | 2 |
| Reggae One | ReggaeOne-Regular.ttf | ポップで楽しい | 1 |
| Yuji Syuku | YujiSyuku-Regular.ttf | 書道風 | 1 |
| Kiwi Maru | KiwiMaru-Medium.ttf | 丸みのある | 1 |
| Hachi Maru Pop | HachiMaruPop-Regular.ttf | かわいい | 1 |
| DotGothic16 | DotGothic16-Regular.ttf | レトロゲーム風 | 1 |
| Stick | Stick-Regular.ttf | 角張り | 1 |

合計サイズ: 約43MB

## 変更ファイル

- `fonts/*.ttf` - フォントファイル10個を追加
- `fonts/fonts.conf` - ローカルフォントディレクトリを参照するよう更新
- `src/lib/card/image-composer.ts` - フォントリストをGoogle Fontsに更新

## 技術詳細

- fontconfigを使用してローカルフォントを参照
- 重み付きランダム選択アルゴリズム
  - 標準フォント（weight: 2）: 約57%の確率
  - 個性フォント（weight: 1）: 約43%の確率

## ライセンス

すべてのフォントはOFL（Open Font License）のもとで配布されており、商用利用可能。
