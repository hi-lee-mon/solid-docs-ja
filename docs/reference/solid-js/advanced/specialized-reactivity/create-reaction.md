---
title: "createReaction"
category: "高度なトピック / 特殊化されたリアクティビティ & 追跡"
use_cases: "高度な特殊化されたリアクティビティ & 追跡 api、createreaction の使い方"
tags:
  - "create"
  - "reaction"
  - "advanced"
  - "specialized"
  - "reactivity"
  - "tracking"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "柔軟な追跡が可能な、レンダーフェーズ後に実行されるリアクティブな計算を作成します。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/signals.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

柔軟な追跡が可能な、レンダーフェーズ後に実行されるリアクティブな計算を作成します。

```typescript
const track = createReaction(effectFn, options?: EffectOptions);
track(() => { // reactive reads });
```

## インポート

```ts
import { createReaction } from "solid-js";
```

## 型シグネチャ

```ts
function createReaction(
  effectFn: EffectFunction<undefined> | EffectBundle<undefined>,
  options?: EffectOptions
): (tracking: () => void) => void;
```

## パラメータ

### `effectFn`

- **型:** `EffectFunction<undefined> | EffectBundle<undefined>`

追跡対象の関数が無効化されたときに呼び出される関数（または `EffectBundle`）

### `options`

- **型:** `EffectOptions`
- 省略可能

`EffectOptions` -- name, defer

## 例

```ts
const [count, setCount] = createSignal(0);

const track = createReaction(() => {
  console.log("count changed once, re-arm to listen again");
  track(() => count()); // re-arm
});

track(() => count()); // initial arm

setCount(1); // logs once, reaction re-armed for next change
```

## 関連項目

- [不要なエフェクトを避ける](/guides/avoid-unnecessary-effects)
- [リアクティビティのデバッグ](/guides/debugging-reactivity)
