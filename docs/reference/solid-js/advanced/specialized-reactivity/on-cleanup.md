---
title: "onCleanup"
category: "高度なトピック / 特殊化されたリアクティビティ & 追跡"
use_cases: "高度な特殊化されたリアクティビティ & 追跡 api、oncleanup の使い方"
tags:
  - "on"
  - "cleanup"
  - "advanced"
  - "specialized"
  - "reactivity"
  - "tracking"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "低レベルのリアクティブクリーンアッププリミティブ。囲むオーナーが破棄されたときに実行されるコールバックを登録します。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/signals.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

低レベルのリアクティブクリーンアッププリミティブ。囲んでいるオーナーが
破棄されるときに実行されるコールバックを登録します。

**2.0 のユーザーコードでこれを使う機会はほとんどありません。**
使いたくなる2つのケースには、より適した形のツールがあります:

- **コンポーネントのライフサイクル（マウント/アンマウント、リスナー、
  インターバル）:** [onSettled](/reference/solid-js/lifecycle-actions/on-settled) を使い、クリーンアップ関数を **return**
  してください。セットアップと後始末が1つのブロックに対になって保たれます。
  これは 1.x の `onMount` + `onCleanup` の組み合わせを置き換えるものです。
- **エフェクト実行に紐づくクリーンアップ:** `onCleanup` は `createEffect` の
  apply フェーズに置くものではありません。compute フェーズが本当に実行ごとの
  後始末を必要とするなら、それは通常、その処理をメモ/プロジェクションにすべき
  という兆候です。ライフサイクル的なものであれば `onSettled` に移してください。

`onCleanup` が適切なのは **ライブラリやカスタムプリミティブの内部** です —
`createRoot` 本体内での破棄の調整や、カスタムファクトリーから `runWithOwner`
経由で取得済みのオーナーにクリーンアップを配線する場合などです。
アプリケーションコードでこれらの形を直接書く必要はほとんどありません。

オーナー内で呼び出す必要があります。オーナー外での呼び出しは no-op です
（開発モードでは警告が出ます）。

`createTrackedEffect` や `onSettled` の内部では使えません — 代わりに
コールバック本体からクリーンアップ関数を返してください。

> Solid 2.0 でコンポーネントのセットアップと後始末には `onSettled` を使い、クリーンアップ関数を返してください。`onCleanup` は高度なオーナー操作やカスタムプリミティブの内部向けに残しておきます。

## インポート

```ts
import { onCleanup } from "solid-js";
```

## 型シグネチャ

```ts
function onCleanup(fn: Disposable): Disposable;
```

## パラメータ

### `fn`

- **型:** `Disposable`

## 例

```ts
// Library shape: thread a resource's disposal into a *captured* owner
// from a factory that has no settle-phase setup of its own. `onSettled`
// would queue a callback we don't need; `onCleanup` is the leaner
// primitive when the only job is "register disposal on this owner".
function bindToOwner<T extends { dispose(): void }>(owner: Owner, resource: T): T {
  runWithOwner(owner, () => onCleanup(() => resource.dispose()));
  return resource;
}
```

## 関連項目

- [始めたものをクリーンアップする](/guides/custom-primitives#clean-up-what-you-start)
- [オーナーシップ](/concepts/reactivity#ownership)
- [不要なエフェクトを避ける](/guides/avoid-unnecessary-effects)
- [リアクティビティのデバッグ](/guides/debugging-reactivity)
