---
title: "createRenderEffect"
category: "高度なトピック / 特殊化されたリアクティビティ & 追跡"
use_cases: "高度な特殊化されたリアクティビティ & 追跡 api、createrendereffect の使い方"
tags:
  - "create"
  - "render"
  - "effect"
  - "advanced"
  - "specialized"
  - "reactivity"
  - "tracking"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "DOM 要素が作成・更新される（必ずしも接続済みとは限らない）レンダーフェーズ中に実行されるリアクティブな計算を作成します。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/solid/src/client/hydration.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

DOM 要素が作成・更新される（必ずしも接続済みとは限らない）レンダーフェーズ中に
実行されるリアクティブな計算を作成します。

`createEffect` と同じ compute/effect の分割（`compute(prev)` が追跡し、
`effect(next, prev?)` が命令的に実行される）ですが、レンダーキューの後ではなく
その内部でスケジュールされます。これを使うのはレンダラーの基盤部分を作成するとき
だけにします。アプリコードでは `createEffect` を使ってください。

```ts
createRenderEffect<T>(compute, effectFn, options?: EffectOptions);
```

**ハイドレーション:** `EffectOptions` は `ssrSource` フィールド
（`"server"` | `"hybrid"` | `"client"`）を受け付けます。`ssrSource`
オプションを参照してください。`transparent: true` にすると、エフェクトは
ハイドレーションから完全に見えなくなります — ハイドレーション id スロットを
消費せず、シリアライズされたサーバー値を採用する代わりに compute がライブで
実行されます。サーバーが作成しなかったクライアント専用エフェクト向けです。

## インポート

```ts
import { createRenderEffect } from "solid-js";
```

## 型シグネチャ

```ts
function createRenderEffect<T>(
  compute: ComputeFunction<undefined | NoInfer<T>, T>,
  effectFn: EffectFunction<NoInfer<T>, T>,
  options?: EffectOptions
): void;
```

## パラメータ

### `compute`

- **型:** `ComputeFunction<undefined | NoInfer<T>, T>`

以前の値を受け取り、計算に対して反応するための新しい値を返す関数

### `effectFn`

- **型:** `EffectFunction<NoInfer<T>, T>`

新しい値を受け取り、副作用を実行するために使われる関数

### `options`

- **型:** `EffectOptions`
- 省略可能

`EffectOptions` -- name, defer, schedule, transparent

## 例

```ts
// Custom directive: bind an element's textContent to a reactive source
// synchronously during render. App code should use `createEffect` for
// post-render side effects.
function bindText(el: HTMLElement, source: () => string) {
  createRenderEffect(
    () => source(),
    value => { el.textContent = value; }
  );
}
```

## 関連項目

- [不要なエフェクトを避ける](/docs/guides/avoid-unnecessary-effects.md)
- [リアクティビティのデバッグ](/docs/guides/debugging-reactivity.md)
