---
title: "runWithOwner"
category: "高度なトピック / オーナー & Introspection"
use_cases: "高度なオーナー & introspection api、runwithowner の使い方"
tags:
  - "run"
  - "with"
  - "owner"
  - "advanced"
  - "introspection"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "指定した `owner` を現在のオーナーに設定して `fn` を実行します。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/core/core.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

指定した `owner` を現在のオーナーに設定して `fn` を実行します。`fn` 内で
作成されたリアクティブプリミティブ（`createSignal`、`createMemo`、
`createEffect`、`onCleanup`、`cleanup` など）はすべてそのオーナーに
アタッチされ、オーナーが破棄されるときに一緒に破棄されます。

典型的なパターン: コンポーネント内で `getOwner()` により現在のオーナーを
取得し、コールバック（イベントハンドラー、非同期 resolve、`setTimeout`
など）からそれに再入場すると、コールバック内で作成された破棄対象が
コンポーネントと一緒にクリーンアップされます。

## インポート

```ts
import { runWithOwner } from "solid-js";
```

## 型シグネチャ

```ts
function runWithOwner<T>(owner: Owner | null, fn: () => T): T;
```

## パラメータ

### `owner`

- **型:** `Owner | null`

### `fn`

- **型:** `() => T`

## 例

```ts
function delayed<T>(ms: number, fn: () => T) {
  const owner = getOwner();
  setTimeout(() => runWithOwner(owner, fn), ms);
}
```

## 関連項目

- [コンポーネント外で実行する](/docs/guides/custom-primitives.md#run-outside-a-component)
- [オーナーシップ](/docs/concepts/reactivity.md#ownership)
- [カスタムプリミティブ](/docs/guides/custom-primitives.md)
