---
title: "flatten"
category: "高度なトピック / 相互運用と非同期"
use_cases: "高度な相互運用と非同期 api、flatten の使い方"
tags:
  - "flatten"
  - "advanced"
  - "interop"
  - "async"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "children の値をレンダー可能な形に解決します: 引数なし関数（アクセサー）をアンラップし、配列を再帰的に平坦化し、必要に応じてレンダーされない値（`null`、`undefined`、`true`、`false`、`\"\"`）をスキップします。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/boundaries.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

children の値をレンダー可能な形に解決します: 引数なし関数
（アクセサー）をアンラップし、配列を再帰的に平坦化し、必要に応じて
レンダーされない値（`null`、`undefined`、`true`、`false`、`""`）をスキップします。

フローコンポーネントとレンダラーが children ツリーを走査するために内部で
使われます。アプリコードが直接これを必要とすることはほとんどありません――
結果をメモ化するユーザー向けヘルパーについては `solid-js` の `children()` を
参照してください。

## インポート

```ts
import { flatten } from "solid-js";
```

## 型シグネチャ

```ts
function flatten(
  children: any,
  options?: { skipNonRendered?: boolean; doNotUnwrap?: boolean }
): any;
```

## パラメーター

### `children`

- **型:** `any`

平坦化する値または値の配列

### `options`

- **型:** `{ skipNonRendered?: boolean; doNotUnwrap?: boolean }`
- 省略可

- `skipNonRendered` ―― レンダーされない値を除外します
  - `doNotUnwrap` ―― 関数の children をそのまま残します（呼び出し側が解決します）

## 例

```ts
// Custom renderer walking a children tree manually. Most authors should
// use `children()` from solid-js, which memoizes the resolved value.
function renderChildren(value: unknown): unknown {
  return flatten(value, { skipNonRendered: true });
}
```

## 関連項目

- [非同期リアクティビティ](/docs/concepts/async-reactivity.md)
- [非 Solid コードの統合](/docs/guides/integrate-non-solid-code.md)
