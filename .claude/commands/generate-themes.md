# /generate-themes

AIでおすすめテーマを生成し、DBに直接登録するコマンド。

## 使用方法

```
/generate-themes [件数] [カテゴリ]
```

## 引数

- `件数`: 生成するテーマ数（デフォルト: 10、最大: 50）
- `カテゴリ`: 特定カテゴリに限定（省略可）
  - 科学、歴史、生物、テクノロジー、地理、文化、人体、宇宙、数学

## 実行手順

### 1. 既存テーマの取得

DBから現在登録されているテーマ一覧を取得:

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const existingThemes = await prisma.suggestedTheme.findMany({
  where: { isActive: true },
  select: { theme: true, category: true }
});
console.log(`既存テーマ数: ${existingThemes.length}件`);
```

### 2. OpenAIでテーマ生成

`src/lib/openai/theme-generation.ts` の `generateThemes()` を使用:

```typescript
import { generateThemes } from '@/lib/openai/theme-generation';

const existingThemeNames = existingThemes.map(t => t.theme);
const result = await generateThemes(existingThemeNames, 件数, カテゴリ);

console.log('生成されたテーマ:');
result.themes.forEach((t, i) => {
  console.log(`${i + 1}. ${t.theme} [${t.category}]`);
});
```

### 3. ユーザー確認

生成結果を表示し、ユーザーに確認を求める:

```
生成されたテーマ（10件）:
1. 量子もつれの不思議 [科学]
2. 古代エジプトの神々 [歴史]
3. クモの糸の強度 [生物]
...

これらのテーマをDBに登録しますか？
```

### 4. DB登録

承認後、Prismaで直接DBに登録:

```typescript
const created = await prisma.suggestedTheme.createMany({
  data: result.themes.map(t => ({
    theme: t.theme,
    category: t.category
  })),
  skipDuplicates: true
});

console.log(`✅ ${created.count}件のテーマを登録しました`);
```

### 5. 登録確認

```typescript
const totalCount = await prisma.suggestedTheme.count({
  where: { isActive: true }
});
console.log(`現在の総テーマ数: ${totalCount}件`);
```

## 簡易実行スクリプト

以下のスクリプトを `scripts/add-themes.ts` として保存し、`npx tsx scripts/add-themes.ts` で実行可能:

```typescript
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI();

async function main() {
  // 既存テーマ取得
  const existing = await prisma.suggestedTheme.findMany({
    select: { theme: true }
  });
  const existingNames = existing.map(t => t.theme);

  // テーマ生成（引数から件数とカテゴリを取得）
  const count = parseInt(process.argv[2]) || 10;
  const category = process.argv[3];

  // OpenAI呼び出し...
  // DB登録...
}

main().finally(() => prisma.$disconnect());
```

## 注意事項

- このコマンドは開発環境でのみ使用
- 重複するテーマは自動的にスキップ（skipDuplicates）
- 2〜30文字のテーマのみ登録可能
