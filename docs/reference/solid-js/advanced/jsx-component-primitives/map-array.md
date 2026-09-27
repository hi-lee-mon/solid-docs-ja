---
title: "mapArray"
category: "高度なトピック / JSX コンポーネントプリミティブ"
use_cases: "高度な jsx コンポーネントプリミティブ api、maparray の使い方"
tags:
  - "map"
  - "array"
  - "advanced"
  - "jsx"
  - "component"
  - "primitives"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "配列をリアクティブにマップし、変更のない項目には以前マップした値を再利用します。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/map.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

配列をリアクティブにマップし、変更のない項目には以前マップした値を
再利用します。

コールバックの形はキー指定モードに従います:
- デフォルト / `keyed: true` では `(item, index)` を受け取り、`item` は
  生の行の値、`index` はアクセサーです。
- `keyed: false` では `(item, index)` を受け取り、`item` はアクセサー、
  `index` は安定した数値です。
- `keyed: item => key` では両方の引数がアクセサーになります。

これは `<For>` を支える内部ヘルパーです。アプリコードでは `<For>` を直接
使ってください。`mapArray` はカスタムリストコンポーネントを実装するときに
使います。

- `options.keyed` — `true`（プリミティブでのデフォルト）は同一性で比較
  します。`false` はインデックスのみのマッピングにフォールバックします。
  関数 `(item) => key` を渡すと、抽出したキーによる安定した同一性が得られます。
- `options.fallback` — 入力が空のときに表示する値を返すアクセサー。

## インポート

```ts
import { mapArray } from "solid-js";
```

## 型シグネチャ

```ts
function mapArray<Item, MappedItem>(
  list: Accessor<Maybe<readonly Item[]>>,
  map: (value: Item, index: Accessor<number>) => MappedItem,
  options?: { keyed?: true; fallback?: Accessor<any>; name?: string }
): Accessor<MappedItem[]>;
function mapArray<Item, MappedItem>(
  list: Accessor<Maybe<readonly Item[]>>,
  map: (value: Accessor<Item>, index: number) => MappedItem,
  options: { keyed: false; fallback?: Accessor<any>; name?: string }
): Accessor<MappedItem[]>;
function mapArray<Item, MappedItem>(
  list: Accessor<Maybe<readonly Item[]>>,
  map: (value: Accessor<Item>, index: Accessor<number>) => MappedItem,
  options: { keyed: (item: Item) => any; fallback?: Accessor<any>; name?: string }
): Accessor<MappedItem[]>;
```

## パラメータ

### `list`

- **型:** `Accessor<Maybe<readonly Item[]>>`

### `map`

- **型:** `(value: Item, index: Accessor<number>) => MappedItem | (value: Accessor<Item>, index: number) => MappedItem | (value: Accessor<Item>, index: Accessor<number>) => MappedItem`

### `options`

- **型:** `{ keyed?: true; fallback?: Accessor<any>; name?: string } | { keyed: false; fallback?: Accessor<any>; name?: string } | { keyed: (item: Item) => any; fallback?: Accessor<any>; name?: string }`
- 省略可能

## 例

```ts
const view = mapArray(
  items,
  (item, index) => `${index()}: ${item.label}`,
  { fallback: () => "no items" }
);
```

## 関連項目

- [プリミティブ形式](/concepts/boundaries#primitive-forms)

## 関連する型

### `Maybe`

```ts
type Maybe<T> = T | void | null | undefined | false;
```
