---
title: "getObserver"
category: "高度なトピック / オーナー & Introspection"
use_cases: "高度なオーナー & introspection api、getobserver の使い方"
tags:
  - "get"
  - "observer"
  - "advanced"
  - "owner"
  - "introspection"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "現在追跡中のオブザーバー（この地点でリアクティブな読み取りを購読している計算）を返します。ここでの読み取りが追跡されない場合は `null` を返します。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/core/owner.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

現在追跡中のオブザーバー（この地点でリアクティブな読み取りを購読している
計算）を返します。ここでの読み取りが追跡対象にならない場合は `null` を
返します。自分が追跡スコープ内にいるかを知る必要があるリアクティブ
プリミティブが使います。アプリコードで必要になることはほとんどありません —
ライフサイクルのオーナーについては `getOwner()` を参照してください。

## インポート

```ts
import { getObserver } from "solid-js";
```

## 型シグネチャ

```ts
function getObserver(): Owner | null;
```

## 例

```ts
// Library predicate: only register a hot-path subscription when the
// caller is inside a tracking scope (memo / effect compute / JSX).
function trackIfTracked(source: () => unknown) {
  if (getObserver()) source();
}
```

## 関連項目

- [オーナーシップ](/docs/concepts/reactivity.md#ownership)
- [カスタムプリミティブ](/docs/guides/custom-primitives.md)
