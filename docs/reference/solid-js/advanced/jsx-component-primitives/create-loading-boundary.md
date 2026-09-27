---
title: "createLoadingBoundary"
category: "高度なトピック / JSX コンポーネントプリミティブ"
use_cases: "高度な jsx コンポーネントプリミティブ api、createloadingboundary の使い方"
tags:
  - "create"
  - "loading"
  - "boundary"
  - "advanced"
  - "jsx"
  - "component"
  - "primitives"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "`<Loading>` 制御フローを支える低レベルプリミティブ。`fn` 内の保留中の非同期読み取りを捕捉し、それらが確定するまで `fallback` をレンダーします。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/boundaries.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

`<Loading>` 制御フローを支える低レベルプリミティブ。`fn` 内の保留中の
非同期読み取りを捕捉し、それらが確定するまで `fallback` をレンダーします。

アプリコードでは `<Loading fallback={...}>` を使ってください。このプリミティブを
使うのは、カスタムバウンダリコンポーネントを作成するときだけにします。

## インポート

```ts
import { createLoadingBoundary } from "@solidjs/signals";
```

## 型シグネチャ

```ts
function createLoadingBoundary<T, U>(
  fn: () => T,
  fallback: () => U,
  options?: { on?: () => any }
): Accessor<T | U>;
```

## パラメータ

### `fn`

- **型:** `() => T`

追跡対象のサブツリー

### `fallback`

- **型:** `() => U`

`fn` 内の非同期読み取りが未解決の間に表示されるフォールバック

### `options`

- **型:** `{ on?: () => any }`
- 省略可能

`on` — 値がバウンダリの適用範囲を決めるアクセサー。設定すると、
他のリアクティブソースへの書き込みによる更新は捕捉*されません*

## 例

```tsx
// Custom boundary component built on top of the primitive.
function MyLoading(props: { fallback: JSX.Element; children: JSX.Element }) {
  return createLoadingBoundary(
    () => props.children,
    () => props.fallback
  ) as unknown as JSX.Element;
}
```

## 関連項目

- [プリミティブ形式](/docs/concepts/boundaries.md#primitive-forms)
