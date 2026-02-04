---
name: type-check
description: TypeScript の型エラーをチェック
disable-model-invocation: true
allowed-tools: Bash, Read
---

# TypeScript 型チェック

TypeScript の型エラーを検出し、問題箇所を報告する。

## 実行手順

### 1. 型チェック実行

```bash
npm run type-check
```

### 2. 結果の解析

- エラーがない場合: 「型エラーなし」と報告
- エラーがある場合: 以下の形式で報告

```
型エラー: X件

1. src/components/Example.tsx:42
   TS2322: Type 'string' is not assignable to type 'number'.

2. src/lib/services/api.ts:15
   TS2304: Cannot find name 'Response'.
```

### 3. エラーがある場合の対応

該当ファイルを Read ツールで確認し、修正案を提示する。

## 出力形式

成功時:
```
✅ 型チェック完了 - エラーなし
```

エラー時:
```
❌ 型エラー: X件

[エラー詳細リスト]

修正が必要なファイル:
- src/path/to/file.ts:行番号
```
