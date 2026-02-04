---
name: ui-style
description: デザイントークンとスタイルガイドを参照
argument-hint: [colors|spacing|typography|animation|all]
disable-model-invocation: true
allowed-tools: Read
---

# スタイルガイド参照

プロジェクトのデザイントークンとスタイル規約を表示する。

## 引数

- `colors` - カラーパレット
- `spacing` - スペーシング規約
- `typography` - タイポグラフィ
- `animation` - アニメーション設定
- `all` または引数なし - 全カテゴリ表示

## 実行手順

1. 引数に応じて該当セクションを表示
2. 必要に応じて以下のファイルを参照:
   - `tailwind.config.ts` - Tailwind設定
   - `src/app/globals.css` - カスタムCSS
   - `src/components/ui/button.tsx` - スタイルパターン例

## 出力内容

### colors

```markdown
## 🎨 カラーパレット

### Primary Colors
| 名前 | Light | Dark | 用途 |
|------|-------|------|------|
| Primary | `blue-600` | `blue-500` | メインアクション、リンク |
| Primary Hover | `blue-700` | `blue-600` | ホバー状態 |

### Semantic Colors
| 名前 | Class | 用途 |
|------|-------|------|
| Success | `green-600` | 成功メッセージ |
| Error | `red-500` / `red-600` | エラー、削除 |
| Warning | `yellow-500` | 警告 |

### Grayscale (Light Mode)
| 用途 | Class |
|------|-------|
| 背景 | `white` / `gray-50` |
| カード背景 | `gray-100` |
| ボーダー | `gray-200` / `gray-300` |
| テキスト（薄） | `gray-400` / `gray-500` |
| テキスト（通常） | `gray-700` |
| テキスト（濃） | `gray-900` |

### Grayscale (Dark Mode)
| 用途 | Class |
|------|-------|
| 背景 | `gray-950` / `#0a0a0a` |
| カード背景 | `gray-800` / `gray-900` |
| ボーダー | `gray-700` |
| テキスト（薄） | `gray-400` / `gray-500` |
| テキスト（通常） | `gray-300` |
| テキスト（濃） | `gray-100` |

### CSS Variables
\`\`\`css
:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}
\`\`\`
```

### spacing

```markdown
## 📐 スペーシング規約

### コンポーネント内部
| 用途 | Class | 値 |
|------|-------|-----|
| 超小 | `p-1` / `px-2 py-1` | 4px / 8px 4px |
| 小 | `p-2` / `px-3 py-2` | 8px / 12px 8px |
| 中 | `p-4` / `px-4 py-3` | 16px / 16px 12px |
| 大 | `p-6` | 24px |

### ボタンサイズ
| サイズ | Class | 高さ |
|--------|-------|------|
| sm | `h-8 px-3` | 32px |
| md | `h-10 px-4` | 40px |
| lg | `h-12 px-6` | 48px |

### セクション間
| 用途 | Class |
|------|-------|
| カード内の要素間 | `space-y-2` / `space-y-4` |
| セクション間 | `space-y-6` / `space-y-8` |
| ページ余白 | `p-4` / `p-6` |

### Gap（Grid/Flex）
| 用途 | Class |
|------|-------|
| 小さいグリッド | `gap-2` / `gap-3` |
| カードグリッド | `gap-4` / `gap-6` |
```

### typography

```markdown
## 📝 タイポグラフィ

### フォントファミリー
\`\`\`css
font-family: Arial, Helvetica, sans-serif;
\`\`\`

### テキストサイズ
| 用途 | Class | 例 |
|------|-------|-----|
| 極小 | `text-xs` | ラベル、キャプション |
| 小 | `text-sm` | ボタン、入力フィールド |
| 通常 | `text-base` | 本文 |
| 中 | `text-lg` | モーダルタイトル |
| 大 | `text-xl` / `text-2xl` | ページタイトル |

### フォントウェイト
| 用途 | Class |
|------|-------|
| 通常 | `font-normal` |
| 中 | `font-medium` | ボタン、ラベル |
| 太 | `font-semibold` | タイトル |
| 極太 | `font-bold` | 強調 |

### テキストカラー（コンポーネント別）
\`\`\`tsx
// ラベル
className="text-gray-700 dark:text-gray-300"

// プレースホルダー
className="text-gray-400"

// エラー
className="text-red-500"

// 無効状態
className="opacity-50"
\`\`\`
```

### animation

```markdown
## ✨ アニメーション

### Framer Motion パターン

**フェードイン:**
\`\`\`tsx
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
\`\`\`

**スライドアップ:**
\`\`\`tsx
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -10 }}
transition={{ duration: 0.2 }}
\`\`\`

**スケール（モーダル）:**
\`\`\`tsx
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}
transition={{ duration: 0.2 }}
\`\`\`

### Tailwind トランジション
| 用途 | Class |
|------|-------|
| カラー変化 | `transition-colors` |
| 全般 | `transition-all` |
| 変形 | `transition-transform` |

### Tailwindアニメーション
| 用途 | Class |
|------|-------|
| スピナー | `animate-spin` |
| パルス | `animate-pulse` |

### カスタムアニメーション（globals.css）
\`\`\`css
/* シマーアニメーション（スケルトンUI用） */
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
\`\`\`

### フォーカスリング
\`\`\`tsx
// 標準パターン
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600"

// エラー時
className="focus-visible:ring-red-500/20"
\`\`\`
```

## 使用例

```
/ui-style           # 全カテゴリ表示
/ui-style colors    # カラーパレットのみ
/ui-style spacing   # スペーシング規約のみ
/ui-style typography # タイポグラフィのみ
/ui-style animation # アニメーション設定のみ
/ui-style all       # 全カテゴリ表示
```
