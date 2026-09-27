---
title: "solid-js"
titleTemplate: ":title"
version: "2.0"
description: "solid-js パッケージのリファレンス：リアクティブプリミティブ、ストア、アクション、コンテキスト、フローコンポーネント、公開型。"
---

`solid-js` はリアクティブコアです。
DOM の知識を持たず、同じプリミティブがブラウザー、サーバー、テストのどこでも動作します。
レンダリング関数は [`@solidjs/web`](/docs/reference/solid-web/index.md) にあります。

ここにあるすべてのエクスポートは `"solid-js"` からインポートします：

```ts
import { createSignal, createMemo, createStore, Show, For } from "solid-js";
```

## リアクティビティ

時間とともに変化する値と、それに追従する計算。
モデルについては [リアクティビティ](/docs/concepts/reactivity.md) で説明しています。

- [`createSignal`](/docs/reference/solid-js/reactivity/create-signal.md) は読み書き可能な値を作成します。
- [`createMemo`](/docs/reference/solid-js/reactivity/create-memo.md) は、非同期のものを含む他のリアクティブな読み取りからキャッシュされる値を導出します。
- [`createEffect`](/docs/reference/solid-js/reactivity/create-effect.md) は、追跡対象の値が変化した後に副作用を実行します。
- [`createOptimistic`](/docs/reference/solid-js/reactivity/create-optimistic.md) は、アクション内での書き込みが暫定的になるシグナルを作成します。
- [`isPending`](/docs/reference/solid-js/reactivity/is-pending.md) は新しい結果が到着途中であることを報告し、[`latest`](/docs/reference/solid-js/reactivity/latest.md) はそれを早期に読み取ります。
- [`untrack`](/docs/reference/solid-js/reactivity/untrack.md) は購読せずに読み取り、[`flush`](/docs/reference/solid-js/reactivity/flush.md) は更新キューをその場で流します。

## ストア

プロパティ単位の追跡を備えた、ネストされたリアクティブな状態。
ドラフト、プロジェクション、楽観的ストアについては [ストア](/docs/concepts/stores.md) を参照してください。

- [`createStore`](/docs/reference/solid-js/stores/create-store.md) はオブジェクトまたは配列をラップし、セッターはドラフトを受け取ります。
- [`createProjection`](/docs/reference/solid-js/stores/create-projection.md) は他のリアクティブな読み取りから読み取り専用のストアを導出します。
- [`createOptimisticStore`](/docs/reference/solid-js/stores/create-optimistic-store.md) は `createOptimistic` のストア版です。
- [`reconcile`](/docs/reference/solid-js/stores/reconcile.md) はキーによって新しいデータをストアにマージします。
- [`merge`](/docs/reference/solid-js/stores/merge.md) と [`omit`](/docs/reference/solid-js/stores/omit.md) は、リアクティビティを失わずに props を結合・分割します。

## ライフサイクルとアクション

非同期処理と、その前後のタイミングを調整します。
概念ページは [非同期リアクティビティ](/docs/concepts/async-reactivity.md) です。

- [`action`](/docs/reference/solid-js/lifecycle-actions/action.md) は、書き込みがまとめてコミットされるミューテーションを実行します。
- [`onSettled`](/docs/reference/solid-js/lifecycle-actions/on-settled.md) は、現在のオーナーの保留中の処理が完了した後に一度だけ実行され、クリーンアップを返せます。
- [`refresh`](/docs/reference/solid-js/lifecycle-actions/refresh.md) は非同期ソースを再要求し、[`affects`](/docs/reference/solid-js/lifecycle-actions/affects.md) はその間に値を保留中としてマークします。
- [`until`](/docs/reference/solid-js/lifecycle-actions/until.md) はリアクティブな条件を待ちます。

## コンポーネントとコンテキスト

- [`createContext`](/docs/reference/solid-js/components-context/create-context.md) と [`useContext`](/docs/reference/solid-js/components-context/use-context.md) はサブツリーと値を共有します。
- [`children`](/docs/reference/solid-js/components-context/children.md) は `props.children` を検査用に解決します。
- [`lazy`](/docs/reference/solid-js/components-context/lazy.md) はコンポーネントをコード分割します。
- [`createUniqueId`](/docs/reference/solid-js/components-context/create-unique-id.md) はサーバーとクライアントで一致する ID を生成します。

## フローコンポーネント

条件、リスト、バウンダリのための組み込みコンポーネント。
実際の使い方は [コンポーネントと JSX](/docs/concepts/components-and-jsx.md) と [バウンダリ](/docs/concepts/boundaries.md) を参照してください。

- [`Show`](/docs/reference/solid-js/components-jsx/show.md) は条件が成り立つときにコンテンツをレンダーします。
- [`Switch` と `Match`](/docs/reference/solid-js/components-jsx/switch-and-match.md) は最初に一致した分岐を選びます。
- [`For`](/docs/reference/solid-js/components-jsx/for.md) は配列の各要素に 1 行をレンダーし、[`Repeat`](/docs/reference/solid-js/components-jsx/repeat.md) は各インデックスに 1 行をレンダーします。
- [`Loading`](/docs/reference/solid-js/components-jsx/loading.md) は非同期読み取りに値がない間、フォールバックを表示します。
- [`Errored`](/docs/reference/solid-js/components-jsx/errored.md) はサブツリーが throw したときにフォールバックをレンダーします。
- [`Reveal`](/docs/reference/solid-js/components-jsx/reveal.md) は兄弟の `Loading` バウンダリが現れる順序を制御します。

## 高度なトピック

オーナー Introspection、特殊なエフェクト、ストアの内部、バウンダリプリミティブ、手動ハイドレーション、相互運用、開発用フック。
これらのページはライブラリとツールを支えるもので、アプリケーションコードで必要になることはほとんどありません。

- [`createRoot`](/docs/reference/solid-js/advanced/owner-introspection/create-root.md)、[`getOwner`](/docs/reference/solid-js/advanced/owner-introspection/get-owner.md)、[`runWithOwner`](/docs/reference/solid-js/advanced/owner-introspection/run-with-owner.md) はリアクティブスコープを手動で管理します。
- [`createRenderEffect`](/docs/reference/solid-js/advanced/specialized-reactivity/create-render-effect.md) と [`onCleanup`](/docs/reference/solid-js/advanced/specialized-reactivity/on-cleanup.md) はレンダラーとカスタムプリミティブ向けです。
- [`createLoadingBoundary`](/docs/reference/solid-js/advanced/jsx-component-primitives/create-loading-boundary.md) と [`createErrorBoundary`](/docs/reference/solid-js/advanced/jsx-component-primitives/create-error-boundary.md) はフローコンポーネントを支えています。
- [`DEV`](/docs/reference/solid-js/advanced/diagnostics-dev-hooks/dev.md) は、[リアクティビティのデバッグ](/docs/guides/debugging-reactivity.md)が読み取る開発用診断を公開します。

## 型

- [リアクティブ型](/docs/reference/solid-js/types/reactive-types.md)：`Accessor`、`Setter`、`Signal`
- [ストア型](/docs/reference/solid-js/types/store-types.md)：`Store`
- [コンポーネント型](/docs/reference/solid-js/types/component-types.md)：`Component`、`ParentProps`、`ValidComponent` など
- [コンテキスト型](/docs/reference/solid-js/types/context-types.md) と [`Owner`](/docs/reference/solid-js/types/owner.md)
- [`JSX`](/docs/reference/solid-js/types/jsx-types.md)：`JSX.Element` と固有要素の属性
