---
name: ui-new
description: 新しいUIコンポーネントのボイラープレートを生成
argument-hint: <ComponentName> [--variant] [--size] [--animated]
allowed-tools: Bash, Read, Write, Glob
---

# UIコンポーネント生成

新しいUIコンポーネントを既存のパターンに沿って作成する。

## 引数

- `ComponentName` (必須) - PascalCase形式のコンポーネント名（例: `Badge`, `Tooltip`）
- `--variant` - variant props を追加（primary/secondary/ghost）
- `--size` - size props を追加（sm/md/lg）
- `--animated` - Framer Motion アニメーション対応

## 実行手順

1. **コンポーネント名の変換**
   - PascalCase → kebab-case（例: `MyButton` → `my-button`）
   - ファイルパス: `src/components/ui/{kebab-case}.tsx`

2. **既存コンポーネントの確認**
   - `src/components/ui/` 内に同名ファイルがないか確認
   - 存在する場合は警告してユーザーに確認

3. **テンプレート生成**
   - オプションに応じて適切なテンプレートを選択
   - ファイルを作成

4. **export追加**
   - `src/components/ui/index.ts` に export を追加

## テンプレート

### 基本テンプレート（オプションなし）

```tsx
'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface {ComponentName}Props extends HTMLAttributes<HTMLDivElement> {
  // カスタムpropsをここに追加
}

const {ComponentName} = forwardRef<HTMLDivElement, {ComponentName}Props>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg bg-gray-100 dark:bg-gray-800',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

{ComponentName}.displayName = '{ComponentName}';

export { {ComponentName} };
```

### --variant テンプレート

```tsx
'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface {ComponentName}Props extends HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

const {ComponentName} = forwardRef<HTMLDivElement, {ComponentName}Props>(
  ({ className, variant = 'primary', children, ...props }, ref) => {
    const variants = {
      primary: 'bg-blue-600 text-white',
      secondary: 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
      ghost: 'bg-transparent text-gray-700 dark:text-gray-300',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

{ComponentName}.displayName = '{ComponentName}';

export { {ComponentName} };
```

### --size テンプレート

```tsx
'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface {ComponentName}Props extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

const {ComponentName} = forwardRef<HTMLDivElement, {ComponentName}Props>(
  ({ className, size = 'md', children, ...props }, ref) => {
    const sizes = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-1.5 text-base',
      lg: 'px-4 py-2 text-lg',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg bg-gray-100 dark:bg-gray-800',
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

{ComponentName}.displayName = '{ComponentName}';

export { {ComponentName} };
```

### --variant --size テンプレート（両方指定）

```tsx
'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface {ComponentName}Props extends HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const {ComponentName} = forwardRef<HTMLDivElement, {ComponentName}Props>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const variants = {
      primary: 'bg-blue-600 text-white',
      secondary: 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
      ghost: 'bg-transparent text-gray-700 dark:text-gray-300',
    };

    const sizes = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-1.5 text-base',
      lg: 'px-4 py-2 text-lg',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

{ComponentName}.displayName = '{ComponentName}';

export { {ComponentName} };
```

### --animated テンプレート

```tsx
'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface {ComponentName}Props extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  // カスタムpropsをここに追加
}

const {ComponentName} = forwardRef<HTMLDivElement, {ComponentName}Props>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'rounded-lg bg-gray-100 dark:bg-gray-800',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

{ComponentName}.displayName = '{ComponentName}';

export { {ComponentName} };
```

### --variant --size --animated テンプレート（全部指定）

```tsx
'use client';

import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface {ComponentName}Props extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const {ComponentName} = forwardRef<HTMLDivElement, {ComponentName}Props>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const variants = {
      primary: 'bg-blue-600 text-white',
      secondary: 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
      ghost: 'bg-transparent text-gray-700 dark:text-gray-300',
    };

    const sizes = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-1.5 text-base',
      lg: 'px-4 py-2 text-lg',
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'rounded-lg',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

{ComponentName}.displayName = '{ComponentName}';

export { {ComponentName} };
```

## export追加形式

`src/components/ui/index.ts` に追加:

```typescript
export { {ComponentName}, type {ComponentName}Props } from './{kebab-case}';
```

## 使用例

```
/ui-new Badge                    # 基本コンポーネント
/ui-new Tag --variant --size     # variant + size props付き
/ui-new Tooltip --animated       # アニメーション対応
/ui-new Card --variant --size --animated  # 全オプション
```

## 完了後の出力

- 作成したファイルパス
- 追加したexport
- 使用方法のサンプルコード
