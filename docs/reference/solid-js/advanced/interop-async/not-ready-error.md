---
title: "NotReadyError"
category: "高度なトピック / 相互運用と非同期"
use_cases: "高度な相互運用と非同期 api、notreadyerror の使い方"
tags:
  - "not"
  - "ready"
  - "error"
  - "advanced"
  - "interop"
  - "async"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "非同期リアクティブソースから、最初の値が準備される前に読み取りが行われたことを表します。アプリケーションコードでは通常、この制御フローは `Loading` と `Errored` バウンダリに処理させるべきです。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/core/error.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

非同期リアクティブソースから、最初の値が準備される前に読み取りが行われたことを表します。アプリケーションコードでは通常、この制御フローは `Loading` と `Errored` バウンダリに処理させるべきです。

## インポート

```ts
import { NotReadyError } from "solid-js";
```

## 型シグネチャ

```ts
class NotReadyError extends Error {
	readonly source: unknown;
}
```

## 例

```ts
// Advanced: distinguish "not ready yet" from a real error in custom
// boundary plumbing. App code should rely on `<Loading>` / `<Errored>`.
try {
  const value = readReactiveSource();
} catch (err) {
  if (err instanceof NotReadyError) throw err; // re-throw to suspend
  reportError(err);
}
```

## 関連項目

- [非同期リアクティビティ](/concepts/async-reactivity)
- [非 Solid コードの統合](/guides/integrate-non-solid-code)
