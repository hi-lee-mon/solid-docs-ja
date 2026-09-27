---
title: "Show"
category: "コンポーネント（JSX）"
use_cases: "components (jsx) api、show の使い方"
tags:
  - "show"
  - "components"
  - "jsx"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "`when` が truthy のとき children を条件付きでレンダーし、それ以外のときは省略可能な `fallback` をレンダーします。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/solid/src/client/flow.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

`when` が truthy のとき children を条件付きでレンダーし、それ以外のときは
省略可能な `fallback` をレンダーします。

関数形式の child は絞り込まれた値を受け取ります。`keyed` なし（デフォルト）では
アクセサーを受け取り、truthy な値をまたいで child は保持されます。`keyed` ありでは
生の値を受け取り、値の同一性が変わるたびに再マウントされます。

## インポート

```ts
import { Show } from "solid-js";
```

## 型シグネチャ

```ts
function Show<T>(props: {
	when: T | undefined | null | false;
	keyed?: false;
	fallback?: JSX.Element;
	children: JSX.Element | ((item: Accessor<NonNullable<T>>) => JSX.Element);
}): JSX.Element;
function Show<T>(props: {
	when: T | undefined | null | false;
	keyed: true;
	fallback?: JSX.Element;
	children: JSX.Element | ((item: NonNullable<T>) => JSX.Element);
}): JSX.Element;
```

## Props

### `when`

- **型:** `T | undefined | null | false`

条件。truthy のとき children がレンダーされます。

### `keyed`

- **型:** `boolean`
- 省略可能

`true` の場合、関数形式の child は生の値を受け取り、値の同一性が変わるたびにコンテンツが再マウントされます。デフォルトは `false` で、関数形式の child はアクセサーを受け取り、truthy な値をまたいでコンテンツが保持されます。

### `fallback`

- **型:** `JSX.Element`
- 省略可能

`when` が falsy のときにレンダーされます。

### `children`

- **型:** `JSX.Element | ((item) => JSX.Element)`

静的なコンテンツ、または絞り込まれた値（デフォルトでは `Accessor<NonNullable<T>>`、keyed の場合は `NonNullable<T>`）を受け取る関数。

## 例

```tsx
<Show when={user()} fallback={<SignIn />}>
  {u => <Greeting name={u().name} />}
</Show>
```

### 同一性が変わったら再マウントする

```tsx
// Without `keyed`, switching from one user to another keeps the DOM and
// updates the accessor. With `keyed`, the content is re-created per user.
<Show when={user()} keyed fallback={<SignIn />}>
	{(u) => <Profile user={u} />}
</Show>
```

## 注意点

- `when` に裸のアクセサーを渡す（`when={user}`）と、それは関数なので truthy になります。`when={user()}` を渡してください。
- `keyed` なしでは、`when` を別の truthy な値に変えてもアクセサーがその場で更新され、DOM は保持されます。`keyed` ありではコンテンツが再マウントされます。

## よくある問題

- [値がセットされているのに `Show` がフォールバックをレンダーする](/concepts/components-and-jsx#show-renders-the-fallback-even-though-the-value-is-set)
- [ページに値ではなく `function` や `() =>` という文字が表示される](/concepts/reactivity#the-page-shows-the-words-function-or---instead-of-the-value)

## 関連項目

- [条件付きコンテンツ](/concepts/components-and-jsx#conditional-content)
- [コンポーネントと JSX](/concepts/components-and-jsx)
- [バウンダリ](/concepts/boundaries)
