---
title: "affects"
category: "ライフサイクルとアクション"
use_cases: "lifecycle & actions api、affects の使い方"
tags:
  - "affects"
  - "lifecycle"
  - "actions"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "変更を加える処理の実行中に、リアクティブソースやストアの位置を保留中としてマークします。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/affects.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

変更を加える処理が実行中の間、リアクティブソースまたはストアの位置を保留中としてマークします。マークされた値は読み取り可能なままで、派生したリーダーは周囲のアクションや更新が確定するまで保留中の状態を報告します。

## インポート

```ts
import { affects } from "solid-js";
```

## 型シグネチャ

```ts
function affects(target: Accessor<unknown> | Store<object>): void;
function affects<T extends object>(target: Store<T>, key: keyof T): void;
```

## パラメータ

### `target`

- **型:** `Accessor<unknown> | Store<object> | Store<T>`

保留中としてマークするアクセサー、ストア、またはストアノード。

### `key`

- **型:** `keyof T`

`target` がストアの場合、ストア全体ではなくマークするプロパティ。

## 例

```ts
const send = action(function* (text: string) {
  setState(s => { s.messages.push({ text, status: "sending" }); });
  affects(state.messages.at(-1)!, "status"); // this slot pends until settle
  yield api.send(text);
});

const reload = action(function* () {
  affects(thing);      // the whole store pends…
  refresh(thing);      // …over this otherwise-quiet re-ask
  yield api.done();
});
```

## 注意点

- マークしても値は変わらず、再フェッチもトリガーされません。保留中であることを報告するだけです。再要求には `refresh()` と組み合わせてください。

## よくある問題

- [クリック後に画面が固まったように見える](/docs/guides/debugging-reactivity.md#the-screen-looks-dead-after-a-click)

## 関連項目

- [データを変更中としてマークする：`affects`](/docs/concepts/mutations.md#mark-data-as-changing-affects)
- [非同期リアクティビティ](/docs/concepts/async-reactivity.md)
- [不要なエフェクトを避ける](/docs/guides/avoid-unnecessary-effects.md)
