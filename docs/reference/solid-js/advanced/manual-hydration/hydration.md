---
title: "Hydration"
category: "高度なトピック / 手動ハイドレーション"
use_cases: "高度な手動ハイドレーション api、hydration の使い方"
tags:
  - "hydration"
  - "advanced"
  - "manual"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "`<NoHydration>` ゾーン内でハイドレーションを再有効化します（クライアントではパススルー）。周囲の領域がハイドレーションをオプトアウトしているときに、サブツリーをハイドレーションに戻すために使います。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/solid/src/client/hydration.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

`<NoHydration>` ゾーン内でハイドレーションを再有効化します（クライアントでは
パススルー）。周囲の領域がハイドレーションをオプトアウトしているときに、
サブツリーをハイドレーションに戻すために使います。

## インポート

```ts
import { Hydration } from "solid-js";
```

## 型シグネチャ

```ts
function Hydration(props: { id?: string; children: JSX.Element }): JSX.Element;
```

## Props

### `id`

- **型:** `string`
- 省略可能

### `children`

- **型:** `JSX.Element`

## 例

```tsx
// Inside a `<NoHydration>` region, re-enable hydration for one inner
// subtree that does need to match a server-rendered fragment.
<NoHydration>
  <ClientOnlyShell>
    <Hydration>
      <ServerHydratedWidget />
    </Hydration>
  </ClientOnlyShell>
</NoHydration>
```

## 関連項目

- [ハイドレーションの制御](/concepts/rendering-and-ssr#controlling-hydration)
