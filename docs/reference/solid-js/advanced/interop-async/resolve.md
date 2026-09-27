---
title: "resolve"
category: "高度なトピック / 相互運用と非同期"
use_cases: "高度な相互運用と非同期 api、resolve の使い方"
tags:
  - "resolve"
  - "advanced"
  - "interop"
  - "async"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "リアクティブな式を await し、最初に完全に確定した値を `Promise` として返します。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/signals.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

リアクティブな式を await し、最初に完全に確定した値を `Promise` として
返します。保留中の非同期読み取り（`createMemo` が Promise を返す場合など）は
待機されます。式が `NotReadyError` なしに同期的に値を返した時点で、
その値で Promise が解決します。式が代わりにエラーで確定した場合――
非同期ソースが reject する場合も含む――Promise はそれで reject されます。

追跡スコープの*外側*で呼び出す必要があります――購読はせず、
現在の値を一度だけ解決するだけです。

## インポート

```ts
import { resolve } from "solid-js";
```

## 型シグネチャ

```ts
function resolve<T>(fn: () => T): Promise<T>;
```

## パラメーター

### `fn`

- **型:** `() => T`

解決するリアクティブな式

## 例

```ts
const user = createMemo(() => fetch(`/users/${id()}`).then(r => r.json()));

// outside any reactive scope
const initial = await resolve(() => user());
```

## 関連項目

- [非同期リアクティビティ](/docs/concepts/async-reactivity.md)
- [非 Solid コードの統合](/docs/guides/integrate-non-solid-code.md)
