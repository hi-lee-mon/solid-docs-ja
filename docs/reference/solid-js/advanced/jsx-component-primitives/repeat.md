---
title: "repeat"
category: "高度なトピック / JSX コンポーネントプリミティブ"
use_cases: "高度な jsx コンポーネントプリミティブ api、repeat の使い方"
tags:
  - "repeat"
  - "advanced"
  - "jsx"
  - "component"
  - "primitives"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "コールバックを `count` 回だけリアクティブにレンダーします。count だけが変わる場合は以前レンダーした項目を再利用します。`<Repeat>` の内部ヘルパー。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/map.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

コールバックを `count` 回だけリアクティブにレンダーします。count だけが
変わる場合は以前レンダーした項目を再利用します。`<Repeat>` の内部ヘルパーです。

- `options.from` — 開始インデックス（デフォルト `0`）。オフセットや
  ウィンドウ表示でのレンダリングに便利です。
- `options.fallback` — count が `0` のときに表示する値を返すアクセサー。

## インポート

```ts
import { repeat } from "solid-js";
```

## 型シグネチャ

```ts
function repeat(
  count: Accessor<number>,
  map: (index: number) => any,
  options?: {
    from?: Accessor<number | undefined>;
    fallback?: Accessor<any>;
    name?: string;
  }
): Accessor<any[]>;
```

## パラメータ

### `count`

- **型:** `Accessor<number>`

### `map`

- **型:** `(index: number) => any`

### `options`

- **型:** `{ from?: Accessor<number | undefined>; fallback?: Accessor<any>; name?: string; }`
- 省略可能

## 例

```ts
const view = repeat(count, i => `Item ${i}`, { fallback: () => "empty" });
```

## 関連項目

- [プリミティブ形式](/docs/concepts/boundaries.md#primitive-forms)
