---
title: "deep"
category: "高度なトピック / ストア（高度）"
use_cases: "高度なストアの高度な api、deep の使い方"
tags:
  - "deep"
  - "advanced"
  - "store"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "囲むスコープをストア値の到達可能なすべての階層に購読させ、そのプレーンなビューを返します。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/store/index.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

囲んでいるスコープをストア値の到達可能なすべての階層に購読させ、そのプレーンなビューを返します。サブツリー内のどこかの変更で計算を再実行させたいときに使います。

## インポート

```ts
import { deep } from "solid-js";
```

## 型シグネチャ

```ts
function deep<T>(value: T): T;
```

## パラメータ

### `value`

- **型:** `T`

## 関連項目

- [ストア](/concepts/stores)
