---
title: "until"
category: "ライフサイクルとアクション"
use_cases: "lifecycle & actions api、until の使い方"
tags:
  - "until"
  - "lifecycle"
  - "actions"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "リアクティブな述語を await し、初めて truthy になった時点で絞り込まれた値とともに解決します。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/signals.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

リアクティブな述語を await し、初めて truthy になった時点で絞り込まれた値とともに解決します。falsy な結果や保留中の非同期読み取りは「まだ」を意味するため、購読は生きたままで、ソースが変化するたびに再評価されます。throw されたエラー、reject された非同期ソース、タイムアウト、または中止は Promise を reject します。

## インポート

```ts
import { until } from "solid-js";
```

## 型シグネチャ

```ts
function until<T>(fn: () => T, options?: UntilOptions): Promise<Truthy<T>>;
```

## パラメータ

### `fn`

- **型:** `() => T`

権威ある状態に対するリアクティブな述語

### `options`

- **型:** `UntilOptions`
- 省略可能

省略可能な `timeout`（ミリ秒）と中止用の `signal`

## 戻り値

`fn` の最初の truthy な結果で解決し、`Truthy<T>` で絞り込まれる Promise。

## 例

```ts
const send = action(async function* (text: string) {
  const clientId = crypto.randomUUID();
  setMessages(m => { m.push({ clientId, text, pending: true }); }); // optimistic
  await socket.send({ clientId, text }); // fire-and-forget transport
  yield; // re-enter the transaction after the await
  // Hold until the live source echoes the write (authoritative view —
  // the optimistic row above cannot satisfy this):
  yield until(() => messages.some(m => m.clientId === clientId), { timeout: 10_000 });
});
```

### 続行する前に値を待つ

```ts
const user = createMemo(() => fetchUser(id()));

async function exportReport() {
	const u = await until(() => user()); // resolves once the user has loaded
	download(buildReport(u));
}
```

## 注意点

- falsy な結果は待ち続けます。throw されたエラー、reject された非同期ソース、タイムアウト、または中止は Promise を reject します。
- 述語内の読み取りは権威ある状態を見るため、楽観的な書き込みでは満たせません。

## 関連項目

- [サーバーが書き込みをエコーするのを待つ：`until`](/docs/concepts/mutations.md#wait-for-the-server-to-echo-the-write-until)
- [非同期リアクティビティ](/docs/concepts/async-reactivity.md)
- [不要なエフェクトを避ける](/docs/guides/avoid-unnecessary-effects.md)

## 関連する型

### `TimeoutError`

述語がウィンドウ内に truthy にならなかった場合の
`until(fn, { timeout })` の reject 値です。`action()` 内では、reject は
`yield` ポイントで throw し直されます — そこで catch できるか、
アクションが失敗してその楽観的状態が巻き戻ります。

```ts
class TimeoutError extends Error {
  constructor(message = "Timed out waiting for condition") {
    super(message);
    this.name = "TimeoutError";
  }
};
```

### `Truthy`

truthy な述語結果が絞り込まれる対象となる falsy 値。

```ts
type Truthy<T> = Exclude<T, false | 0 | 0n | "" | null | undefined>;
```

### `UntilOptions`

```ts
interface UntilOptions {
  timeout?: number;
  signal?: AbortSignal;
};
```

#### `timeout`

- **型:** `number`

述語がこのミリ秒以内に truthy にならなかった場合に `TimeoutError` で
reject します。確認となる真の値がドロップしうるトランスポート
（ソケット、購読）経由で届く場合に強く推奨されます。

#### `signal`

- **型:** `AbortSignal`

中止時に `signal.reason` で reject します。
