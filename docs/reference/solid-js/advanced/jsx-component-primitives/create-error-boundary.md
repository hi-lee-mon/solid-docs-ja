---
title: "createErrorBoundary"
category: "高度なトピック / JSX コンポーネントプリミティブ"
use_cases: "高度な jsx コンポーネントプリミティブ api、createerrorboundary の使い方"
tags:
  - "create"
  - "error"
  - "boundary"
  - "advanced"
  - "jsx"
  - "component"
  - "primitives"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "`<Errored>` 制御フローを支える低レベルプリミティブ。`fn` 内でスローされたエラーを捕捉し、代わりに `fallback(error, reset)` を呼び出します。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/boundaries.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

`<Errored>` 制御フローを支える低レベルプリミティブ。`fn` 内でスローされた
エラーを捕捉し、代わりに `fallback(error, reset)` を呼び出します。
`error` は直近に捕捉されたエラーを返すアクセサーで、`reset()` は失敗した
ソースを再計算し、バウンダリが回復を試みられるようにします。

アプリコードでは `<Errored fallback={...}>` を使ってください。このプリミティブを
使うのは、カスタムバウンダリコンポーネントを作成するときだけにします。

## インポート

```ts
import { createErrorBoundary } from "@solidjs/signals";
```

## 型シグネチャ

```ts
function createErrorBoundary<T, U>(
  fn: () => T,
  fallback: (error: Accessor<unknown>, reset: () => void) => U
): Accessor<T | U>;
```

## パラメータ

### `fn`

- **型:** `() => T`

### `fallback`

- **型:** `(error: Accessor<unknown>, reset: () => void) => U`

## 例

```tsx
// Custom boundary that wraps the primitive and adds telemetry.
function TracedErrored(props: { fallback: (e: () => unknown) => JSX.Element; children: JSX.Element }) {
  return createErrorBoundary(
    () => props.children,
    (err, reset) => {
      reportError(err());
      return props.fallback(err);
    }
  ) as unknown as JSX.Element;
}
```

## 関連項目

- [プリミティブ形式](/concepts/boundaries#primitive-forms)
