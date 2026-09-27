---
title: "createTrackedEffect"
category: "高度なトピック / 特殊化されたリアクティビティ & 追跡"
use_cases: "高度な特殊化されたリアクティビティ & 追跡 api、createtrackedeffect の使い方"
tags:
  - "create"
  - "tracked"
  - "effect"
  - "advanced"
  - "specialized"
  - "reactivity"
  - "tracking"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "依存関係の追跡と副作用が同じスコープで行われる、追跡型のリアクティブエフェクトを作成します。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/signals.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

依存関係の追跡と副作用が同じスコープで行われる、追跡型のリアクティブエフェクトを
作成します。

> 非推奨: 新しいコードでは使わないでください。リアクティブな状態に追随する
> 副作用には `createEffect(compute, effect)` を使ってください — 追跡と
> 副作用を分離し、実行前に依存関係を把握し、非同期やトランジションに参加できます。
> レンダー後の一度きりの DOM 処理（計測、ref へのサードパーティウィジェットの
> アタッチ）には `onSettled` を使ってください。エフェクトフェーズ内からの追跡 —
> このプリミティブが追加する唯一の機能 — は 1.x からの移行を容易にするためだけに
> 残されています: 値がコミットされたあとにユーザーエフェクトのコールバックと
> 並んで実行され、トランジションを保持することはなく、まだ読んでいないシグナルが
> 同じフラッシュ内で先行してステージングした書き込みを観測できません。

追跡と副作用が同じスコープで行われるため、このプリミティブは単一の変更に対して
複数回実行されたり、ティアリング（不整合な状態の読み取り）が発生したりする
ことがあります。動的な購読パターンで同一スコープの追跡が必要な場合にのみ
使ってください。

コールバックはフラッシュの最中に実行されます: 内部で行われた書き込みは同じ
フラッシュの継続処理にキューイングされ、コールバック自身の読み取りからは決して
見えません（読み取りは、すべてのエフェクトフェーズスコープと同様に確定済みの
値を返します）。また内部から `flush()` を呼ぶことはできません（開発モードでは
例外をスロー。本番では no-op）— 必要なら `queueMicrotask(() => flush())` で
遅延させてください。

```typescript
createTrackedEffect(compute, options?: { name?: string });
```

## インポート

```ts
import { createTrackedEffect } from "solid-js";
```

## 型シグネチャ

```ts
function createTrackedEffect(
  compute: () => void | (() => void),
  options?: BaseEffectOptions
): void;
```

## パラメータ

### `compute`

- **型:** `() => void | (() => void)`

追跡するリアクティブな読み取りを含み、破棄時または次回実行前に実行する
任意のクリーンアップ関数を返す関数

### `options`

- **型:** `BaseEffectOptions`
- 省略可能

-- name

## 例

```ts
createTrackedEffect(() => {
  const target = focusedNode();
  if (!target) return;

  const handler = () => log(target.value());
  target.on("change", handler);

  return () => target.off("change", handler);
});
```

## 関連項目

- [不要なエフェクトを避ける](/docs/guides/avoid-unnecessary-effects.md)
- [リアクティビティのデバッグ](/docs/guides/debugging-reactivity.md)
