---
name: ui-list
description: 既存UIコンポーネントの一覧と使用例を表示
argument-hint: [component-name?]
disable-model-invocation: true
allowed-tools: Bash, Read, Glob
---

# UIコンポーネント一覧

既存のUIコンポーネントを確認し、使用例を表示する。

## 引数

- 引数なし - 全コンポーネントの一覧をテーブル形式で表示
- `component-name` - 指定コンポーネントの詳細（Props、使用例）を表示

## 実行手順

### 引数なしの場合（一覧表示）

1. `src/components/ui/` ディレクトリ内の `.tsx` ファイルを取得
2. 各ファイルから export されているコンポーネント名を抽出
3. テーブル形式で一覧表示

**出力形式:**

```markdown
## 📦 UIコンポーネント一覧

| コンポーネント | ファイル | Props |
|---------------|---------|-------|
| Button | button.tsx | variant, size, isLoading |
| Input | input.tsx | label, error, showCharCount |
| Modal | modal.tsx | isOpen, onClose, title |
| ... | ... | ... |

💡 詳細を見るには: `/ui-list ComponentName`
```

### 引数ありの場合（詳細表示）

1. 指定されたコンポーネント名からファイルを特定
   - PascalCase → kebab-case 変換して検索
2. ファイルを読み込み、以下を抽出:
   - interface/type 定義
   - デフォルト値
   - JSDoc コメント（あれば）
3. 使用例を生成

**出力形式:**

```markdown
## 🔍 Button コンポーネント

**ファイル:** `src/components/ui/button.tsx`

### Props

| Prop | Type | Default | 説明 |
|------|------|---------|------|
| variant | 'primary' \| 'secondary' \| 'ghost' \| 'danger' | 'primary' | ボタンのスタイル |
| size | 'sm' \| 'md' \| 'lg' | 'md' | ボタンのサイズ |
| isLoading | boolean | false | ローディング状態 |
| disabled | boolean | false | 無効状態 |

### 使用例

\`\`\`tsx
import { Button } from '@/components/ui';

// 基本
<Button>クリック</Button>

// バリエーション
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Delete</Button>

// サイズ
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>

// ローディング
<Button isLoading>処理中...</Button>
\`\`\`
```

## 対象ディレクトリ

- `src/components/ui/` - 再利用可能なUIコンポーネント

## 使用例

```
/ui-list           # 全コンポーネント一覧
/ui-list Button    # Buttonの詳細
/ui-list Modal     # Modalの詳細
/ui-list input     # 小文字でも可（Inputとして検索）
```

## 注意事項

- index.ts からエクスポートされているコンポーネントのみ表示
- 内部コンポーネント（export されていないもの）は除外
