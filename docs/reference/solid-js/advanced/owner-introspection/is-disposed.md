---
title: "isDisposed"
category: "高度なトピック / オーナー & Introspection"
use_cases: "高度なオーナー & introspection api、isdisposed の使い方"
tags:
  - "is"
  - "disposed"
  - "advanced"
  - "owner"
  - "introspection"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "オーナーが破棄されている場合に `true` を返します。オーナーのコンポーネントやリアクティブスコープが削除されたあとに遅れて届く処理を無視するために使います。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/core/owner.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

オーナーが破棄されている場合に `true` を返します。オーナーのコンポーネントやリアクティブスコープが削除されたあとに遅れて届く処理を無視するために使います。

## インポート

```ts
import { isDisposed } from "solid-js";
```

## 型シグネチャ

```ts
function isDisposed(node: Owner): boolean;
```

## パラメータ

### `node`

- **型:** `Owner`

## 例

```ts
function onSettleSafe(fn: () => void) {
  const owner = getOwner();
  queueMicrotask(() => {
    if (owner && isDisposed(owner)) return; // component unmounted; skip
    runWithOwner(owner, fn);
  });
}
```

## 関連項目

- [コンポーネント外で実行する](/guides/custom-primitives#run-outside-a-component)
- [オーナーシップ](/concepts/reactivity#ownership)
- [カスタムプリミティブ](/guides/custom-primitives)
