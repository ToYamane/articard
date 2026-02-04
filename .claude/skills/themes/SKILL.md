---
name: themes
description: AIでおすすめテーマを生成してDBに登録
argument-hint: [count?] [category?]
disable-model-invocation: true
allowed-tools: Bash, Read
---

# テーマ生成

AIでおすすめテーマを生成し、ユーザー確認後にDBに登録する。

## 使用方法

```
/themes [件数] [カテゴリ]
```

## 引数

- `件数`: 生成するテーマ数（デフォルト: 10、最大: 50）
- `カテゴリ`: 特定カテゴリに限定（省略可）
  - 科学、歴史、生物、テクノロジー、地理、文化、人体、宇宙、数学

## 例

```
/themes              # 10件生成
/themes 20           # 20件生成
/themes 10 科学      # 科学カテゴリで10件生成
```

## 実行手順

### 1. 既存テーマの取得

DBから現在登録されているテーマ一覧を取得して重複を避ける:

```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const themes = await prisma.suggestedTheme.findMany({
    where: { isActive: true },
    select: { theme: true, category: true }
  });
  console.log('既存テーマ数:', themes.length);
  themes.forEach(t => console.log(\`- \${t.theme} [\${t.category}]\`));
}

main().finally(() => prisma.\$disconnect());
"
```

### 2. OpenAIでテーマ生成

`src/lib/openai/theme-generation.ts` の `generateThemes()` を使用:

```bash
npx tsx -e "
import { generateThemes } from './src/lib/openai/theme-generation';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.suggestedTheme.findMany({
    select: { theme: true }
  });
  const existingNames = existing.map(t => t.theme);

  const count = ${件数 || 10};
  const category = '${カテゴリ || ''}' || undefined;

  const result = await generateThemes(existingNames, count, category);

  console.log('生成されたテーマ:');
  result.themes.forEach((t, i) => {
    console.log(\`\${i + 1}. \${t.theme} [\${t.category}]\`);
  });
}

main().finally(() => prisma.\$disconnect());
"
```

### 3. ユーザー確認

生成結果を表示し、ユーザーに確認を求める:

```
生成されたテーマ（10件）:
1. 量子もつれの不思議 [科学]
2. 古代エジプトの神々 [歴史]
3. クモの糸の強度 [生物]
...

これらのテーマをDBに登録しますか？ (y/n)
```

**重要**: 必ずユーザーの承認を得てから次のステップに進むこと。

### 4. DB登録

承認後、Prismaで直接DBに登録:

```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const themes = [
  // 生成されたテーマをここに配列で記述
  { theme: 'テーマ名', category: 'カテゴリ' },
];

async function main() {
  const created = await prisma.suggestedTheme.createMany({
    data: themes,
    skipDuplicates: true
  });
  console.log(\`✅ \${created.count}件のテーマを登録しました\`);

  const total = await prisma.suggestedTheme.count({ where: { isActive: true } });
  console.log(\`現在の総テーマ数: \${total}件\`);
}

main().finally(() => prisma.\$disconnect());
"
```

## 前提条件

- Cloud SQL Proxy が起動していること（`/db-proxy` で起動可能）
- OPENAI_API_KEY が設定されていること

## 注意事項

- 開発環境でのみ使用
- 重複するテーマは自動的にスキップ（skipDuplicates）
- 2〜30文字のテーマのみ登録可能
- 必ずユーザー確認後にDB登録を行う
