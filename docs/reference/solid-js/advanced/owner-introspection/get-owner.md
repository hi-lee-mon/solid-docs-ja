---
title: "getOwner"
category: "高度なトピック / オーナー & Introspection"
use_cases: "高度なオーナー & introspection api、getowner の使い方"
tags:
  - "get"
  - "owner"
  - "advanced"
  - "introspection"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "現在のリアクティブオーナーを返します。次の `cleanup()` / `onCleanup()` / `createSignal()` などがアタッチされるライフサイクルノードです。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/core/owner.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

現在のリアクティブな**オーナー**を返します。次に呼ばれる
`cleanup()` / `onCleanup()` / `createSignal()` などがアタッチされる
ライフサイクルノードです。

オーナー外で呼ばれた場合は `null` を返します。`getOwner()` でオーナーを
取得し、あとで `runWithOwner(owner, fn)` でそのオーナーに再入場すると、
コールバック（イベントハンドラーや非同期解決など）内で作成された破棄対象を
コンポーネントのライフサイクルに結び付けられます。

## インポート

```ts
import { getOwner } from "solid-js";
```

## 型シグネチャ

```ts
function getOwner(): Owner | null;
```

## 例

```ts
function defer<T>(fn: () => T) {
  const owner = getOwner();
  queueMicrotask(() => runWithOwner(owner, fn));
}
```

## 関連項目

- [コンポーネント外で実行する](/docs/guides/custom-primitives.md#run-outside-a-component)
- [オーナーシップ](/docs/concepts/reactivity.md#ownership)
- [カスタムプリミティブ](/docs/guides/custom-primitives.md)

## 関連する型

### `NoOwnerError`

```ts
class NoOwnerError extends Error {
  constructor() {
    super(__DEV__ ? "Context can only be accessed under a reactive root." : "");
  }
};
```
