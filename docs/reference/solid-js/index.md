---
title: "solid-js"
titleTemplate: ":title"
version: "2.0"
description: "solid-js パッケージのリファレンス：リアクティブプリミティブ、ストア、アクション、コンテキスト、フローコンポーネント、公開型。"
---

`solid-js` はリアクティブコアです。
DOM の知識を持たず、同じプリミティブがブラウザー、サーバー、テストのどこでも動作します。
レンダリング関数は [`@solidjs/web`](/reference/solid-web) にあります。

ここにあるすべてのエクスポートは `"solid-js"` からインポートします：

```ts
import { createSignal, createMemo, createStore, Show, For } from "solid-js";
```

## リアクティビティ

時間とともに変化する値と、それに追従する計算。
モデルについては [リアクティビティ](/concepts/reactivity) で説明しています。

- [`createSignal`](/reference/solid-js/reactivity/create-signal) は読み書き可能な値を作成します。
- [`createMemo`](/reference/solid-js/reactivity/create-memo) は、非同期のものを含む他のリアクティブな読み取りからキャッシュされる値を導出します。
- [`createEffect`](/reference/solid-js/reactivity/create-effect) は、追跡対象の値が変化した後に副作用を実行します。
- [`createOptimistic`](/reference/solid-js/reactivity/create-optimistic) は、アクション内での書き込みが暫定的になるシグナルを作成します。
- [`isPending`](/reference/solid-js/reactivity/is-pending) は新しい結果が到着途中であることを報告し、[`latest`](/reference/solid-js/reactivity/latest) はそれを早期に読み取ります。
- [`untrack`](/reference/solid-js/reactivity/untrack) は購読せずに読み取り、[`flush`](/reference/solid-js/reactivity/flush) は更新キューをその場で流します。

## ストア

プロパティ単位の追跡を備えた、ネストされたリアクティブな状態。
ドラフト、プロジェクション、楽観的ストアについては [ストア](/concepts/stores) を参照してください。

- [`createStore`](/reference/solid-js/stores/create-store) はオブジェクトまたは配列をラップし、セッターはドラフトを受け取ります。
- [`createProjection`](/reference/solid-js/stores/create-projection) は他のリアクティブな読み取りから読み取り専用のストアを導出します。
- [`createOptimisticStore`](/reference/solid-js/stores/create-optimistic-store) は `createOptimistic` のストア版です。
- [`reconcile`](/reference/solid-js/stores/reconcile) はキーによって新しいデータをストアにマージします。
- [`merge`](/reference/solid-js/stores/merge) と [`omit`](/reference/solid-js/stores/omit) は、リアクティビティを失わずに props を結合・分割します。

## ライフサイクルとアクション

非同期処理と、その前後のタイミングを調整します。
概念ページは [非同期リアクティビティ](/concepts/async-reactivity) です。

- [`action`](/reference/solid-js/lifecycle-actions/action) は、書き込みがまとめてコミットされるミューテーションを実行します。
- [`onSettled`](/reference/solid-js/lifecycle-actions/on-settled) は、現在のオーナーの保留中の処理が完了した後に一度だけ実行され、クリーンアップを返せます。
- [`refresh`](/reference/solid-js/lifecycle-actions/refresh) は非同期ソースを再要求し、[`affects`](/reference/solid-js/lifecycle-actions/affects) はその間に値を保留中としてマークします。
- [`until`](/reference/solid-js/lifecycle-actions/until) はリアクティブな条件を待ちます。

## コンポーネントとコンテキスト

- [`createContext`](/reference/solid-js/components-context/create-context) と [`useContext`](/reference/solid-js/components-context/use-context) はサブツリーと値を共有します。
- [`children`](/reference/solid-js/components-context/children) は `props.children` を検査用に解決します。
- [`lazy`](/reference/solid-js/components-context/lazy) はコンポーネントをコード分割します。
- [`createUniqueId`](/reference/solid-js/components-context/create-unique-id) はサーバーとクライアントで一致する ID を生成します。

## フローコンポーネント

条件、リスト、バウンダリのための組み込みコンポーネント。
実際の使い方は [コンポーネントと JSX](/concepts/components-and-jsx) と [バウンダリ](/concepts/boundaries) を参照してください。

- [`Show`](/reference/solid-js/components-jsx/show) は条件が成り立つときにコンテンツをレンダーします。
- [`Switch` と `Match`](/reference/solid-js/components-jsx/switch-and-match) は最初に一致した分岐を選びます。
- [`For`](/reference/solid-js/components-jsx/for) は配列の各要素に 1 行をレンダーし、[`Repeat`](/reference/solid-js/components-jsx/repeat) は各インデックスに 1 行をレンダーします。
- [`Loading`](/reference/solid-js/components-jsx/loading) は非同期読み取りに値がない間、フォールバックを表示します。
- [`Errored`](/reference/solid-js/components-jsx/errored) はサブツリーが throw したときにフォールバックをレンダーします。
- [`Reveal`](/reference/solid-js/components-jsx/reveal) は兄弟の `Loading` バウンダリが現れる順序を制御します。

## 高度なトピック

オーナー Introspection、特殊なエフェクト、ストアの内部、バウンダリプリミティブ、手動ハイドレーション、相互運用、開発用フック。
これらのページはライブラリとツールを支えるもので、アプリケーションコードで必要になることはほとんどありません。

- [`createRoot`](/reference/solid-js/advanced/owner-introspection/create-root)、[`getOwner`](/reference/solid-js/advanced/owner-introspection/get-owner)、[`runWithOwner`](/reference/solid-js/advanced/owner-introspection/run-with-owner) はリアクティブスコープを手動で管理します。
- [`createRenderEffect`](/reference/solid-js/advanced/specialized-reactivity/create-render-effect) と [`onCleanup`](/reference/solid-js/advanced/specialized-reactivity/on-cleanup) はレンダラーとカスタムプリミティブ向けです。
- [`createLoadingBoundary`](/reference/solid-js/advanced/jsx-component-primitives/create-loading-boundary) と [`createErrorBoundary`](/reference/solid-js/advanced/jsx-component-primitives/create-error-boundary) はフローコンポーネントを支えています。
- [`DEV`](/reference/solid-js/advanced/diagnostics-dev-hooks/dev) は、[リアクティビティのデバッグ](/guides/debugging-reactivity)が読み取る開発用診断を公開します。

## 型

- [リアクティブ型](/reference/solid-js/types/reactive-types)：`Accessor`、`Setter`、`Signal`
- [ストア型](/reference/solid-js/types/store-types)：`Store`
- [コンポーネント型](/reference/solid-js/types/component-types)：`Component`、`ParentProps`、`ValidComponent` など
- [コンテキスト型](/reference/solid-js/types/context-types) と [`Owner`](/reference/solid-js/types/owner)
- [`JSX`](/reference/solid-js/types/jsx-types)：`JSX.Element` と固有要素の属性
