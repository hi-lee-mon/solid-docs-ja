---
title: "onSettled"
category: "ライフサイクルとアクション"
use_cases: "lifecycle & actions api、onsettled の使い方"
tags:
  - "on"
  - "settled"
  - "lifecycle"
  - "actions"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "リアクティブグラフが完全に確定した後、つまり現在のオーナー内の保留中の非同期読み取りがすべて解決しキューが流れた後に、`callback` を一度だけ実行するようスケジュールします。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/signals.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

リアクティブグラフが完全に確定した後 — つまり現在のオーナー内の
保留中の非同期読み取りがすべて解決し、キューが流れた後 — に
`callback` を**一度だけ**実行するようスケジュールします。各呼び出しは
1 回の発火を登録するだけで、継続的な購読は作成しません。

2.0 における正式なライフサイクルプリミティブです。主な使い方は 3 つです：

- **コンポーネントレベルのセットアップと破棄** *（最も一般的な形）*：
  コンポーネントの最初の安定レンダー後にセットアップを実行し、
  **クリーンアップ関数を返す**ことでオーナー破棄時にそれを破棄します。
  これは 1.x の `onMount` + `onCleanup` の組み合わせの代替です —
  セットアップと破棄が 1 つのブロックにまとまり、`onCleanup` はもはや
  コンポーネント本体に適したツールではありません。（`onMount` は 2.0 に
  存在しません。）
- **確定後の「準備完了」フック：** コンポーネントの最初の安定
  レンダー後に一度だけ実行します — アナリティクスの ping、フォーカス、
  スクロールによる表示など。クリーンアップは不要です。
- **イベントハンドラー内：** イベントによってトリガーされたアクションや保持された更新が完了した後に実行する処理をスケジュールします。

コールバック内のリアクティブな読み取りは追跡*されません* — 後続の
確定に反応するには、毎回新しい `onSettled` を登録してください。

コールバックは確定フラッシュの最中に実行されるため、他のすべての
エフェクトフェーズスコープ（`createEffect` のエフェクト側、
イベントハンドラー）と同じ書き込みセマンティクスを持ちます：

- **書き込み**は同じフラッシュの継続へキューイングされます — 依存する
  メモとエフェクトはフラッシュが返る前に更新されます — ただし
  コールバック内の読み取りは確定済み（書き込み前）の値を返し続けます。
  コールバックが自分自身の未確定の書き込みを観測することはありません。
  関数形式のセッターは依然として合成できます：
  `set(v => v + 1)` を 2 回呼べば 2 回インクリメントされます。
- **コールバック内から `flush()` を呼び出すことはできません** —
  フラッシュはすでに実行中です（開発環境では throw、本番では no-op）。
  この確定後に強制的に流すには、遅延させます：
  `queueMicrotask(() => flush())`。

コールバック内で `onCleanup` は**使用できません** — 代わりにクリーンアップ
関数を返してください。返されたクリーンアップはオーナー破棄時に実行されます。

クリーンアップの返却が有効なのは `onSettled` が**オーナー付きの**
スコープ（例：コンポーネント本体）から呼ばれた場合だけです。*オーナーのない*
スコープ — イベントハンドラー、追跡対象のエフェクト、別の `onSettled` — で
独立したタイミングで発火した場合、クリーンアップを紐付けるオーナー
ライフサイクルが存在しないため、返すと開発モードでエラーになります
（本番では破棄されます）。一度きりの処理には下記の確定後／
イベントハンドラー形式を使い、破棄を伴うセットアップはオーナー付きの
スコープに置いてください。

## インポート

```ts
import { onSettled } from "solid-js";
```

## 型シグネチャ

```ts
function onSettled(callback: () => void | (() => void)): void;
```

## パラメータ

### `callback`

- **型:** `() => void | (() => void)`

実行する関数。オーナー破棄時に発火する
クリーンアップ関数を返せます

## 例

```tsx
// Component-level setup + teardown — replaces onMount + onCleanup.
// Subscribe to an external source on mount, unsubscribe on dispose.
function useViewportWidth() {
  const [width, setWidth] = createSignal(window.innerWidth);
  onSettled(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  });
  return width;
}
```

```tsx
// Post-settle "ready" hook — no cleanup needed.
function Dashboard() {
  const data = createMemo(async () => fetchData());

  onSettled(() => {
    analytics.track("dashboard.ready");
  });

  return <Loading fallback={<Spinner />}><pre>{data()}</pre></Loading>;
}
```

```tsx
// Event-handler — runs after the action settles.
function SaveButton() {
  const save = action(function* () {
    yield api.save();
  });

  const handleClick = () => {
    save();
    onSettled(() => toast("Saved!"));
  };

  return <button onClick={handleClick}>Save</button>;
}
```

## 注意点

- コールバック内の読み取りは追跡されません。後続の確定に反応するには、再度登録してください。
- クリーンアップを返せるのはコンポーネント本体のようなオーナー付きスコープからだけです。イベントハンドラーからでは開発環境でエラーになり、本番では破棄されます。
- コールバック内で `onCleanup` と `flush()` は使用できません。

## 関連項目

- [命令的な境界でエフェクトを使う](/docs/guides/avoid-unnecessary-effects.md#use-an-effect-at-an-imperative-boundary)
- [オーナーシップ](/docs/concepts/reactivity.md#ownership)
- [非同期リアクティビティ](/docs/concepts/async-reactivity.md)
- [不要なエフェクトを避ける](/docs/guides/avoid-unnecessary-effects.md)
