---
title: "createRoot"
category: "高度なトピック / オーナー & Introspection"
use_cases: "高度なオーナー & introspection api、createroot の使い方"
tags:
  - "create"
  - "root"
  - "advanced"
  - "owner"
  - "introspection"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "自動破棄されない非追跡のオーナースコープを作成します。`id` を渡すと、それが所有するツリーのハイドレーション id のシードになります。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/solid/src/client/hydration.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

自動破棄されない非追跡のオーナースコープを作成します。`id` を渡すと、
それが所有するツリーのハイドレーション id のシードになります。

```ts
const dispose = createRoot(dispose => {
  // ...
  return dispose;
});
```

**ハイドレーション:** ハイドレーション中に作成されたルートは自身を
スナップショットスコープとしてマークするため、ハイドレーションパス中に
届いた書き込みはパスが完了するまで保持されます（以前、このマークはその配下で
最初に実行されたプリミティブに依存していました）。

> `render()` は通常のアプリコード用のルートを作成します。`createRoot` は、テスト・ライブラリ・リアクティブスコープをホストする必要がある非レンダーのエントリーポイントで使います。

## インポート

```ts
import { createRoot } from "solid-js";
```

## 型シグネチャ

```ts
function createRoot<T>(
  init: ((dispose: () => void) => T) | (() => T),
  options?: { id?: string; transparent?: boolean }
): T;
```

## パラメータ

### `init`

- **型:** `((dispose: () => void) => T) | (() => T)`

### `options`

- **型:** `{ id?: string; transparent?: boolean }`
- 省略可能

## 例

```ts
const dispose = createRoot(dispose => {
  const [n, setN] = createSignal(0);
  createEffect(() => n(), value => console.log(value));
  setInterval(() => setN(x => x + 1), 1000);
  return dispose;
});

// Later, to tear everything down:
dispose();
```

## 関連項目

- [コンポーネント外で実行する](/docs/guides/custom-primitives.md#run-outside-a-component)
- [オーナーシップ](/docs/concepts/reactivity.md#ownership)
- [カスタムプリミティブ](/docs/guides/custom-primitives.md)
