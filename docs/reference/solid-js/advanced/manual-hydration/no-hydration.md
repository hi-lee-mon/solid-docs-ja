---
title: "NoHydration"
category: "高度なトピック / 手動ハイドレーション"
use_cases: "高度な手動ハイドレーション api、nohydration の使い方"
tags:
  - "no"
  - "hydration"
  - "advanced"
  - "manual"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "クライアントで子要素のハイドレーションを無効にします。ハイドレーション中はサブツリー全体をスキップします（undefined を返すため DOM はそのまま残されます）。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/solid/src/client/hydration.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

クライアントで子要素のハイドレーションを無効にします。
ハイドレーション中はサブツリー全体をスキップします（undefined を返すため DOM はそのまま残されます）。
ハイドレーション後、子要素を新たにレンダーします。

## インポート

```ts
import { NoHydration } from "solid-js";
```

## 型シグネチャ

```ts
function NoHydration(props: { children: JSX.Element }): JSX.Element;
```

## Props

### `children`

- **型:** `JSX.Element`

## 例

```tsx
// Mount a client-only widget that the server didn't render. The subtree
// is left empty during hydration, then renders fresh once hydration ends.
<NoHydration>
  <ClientOnlyMap />
</NoHydration>
```

## 関連項目

- [ハイドレーションの制御](/docs/concepts/rendering-and-ssr.md#controlling-hydration)
