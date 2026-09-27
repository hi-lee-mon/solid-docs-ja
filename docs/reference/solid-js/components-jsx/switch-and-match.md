---
title: "Switch / Match"
category: "コンポーネント（JSX）"
use_cases: "components (jsx) api、switch の使い方"
tags:
  - "switch"
  - "match"
  - "components"
  - "jsx"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "排他的な条件に基づいてコンテンツを切り替えます。`when` が truthy である最初の `<Match>` をレンダーし、どれも一致しない場合は `fallback` にフォールバックします。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/solid/src/client/flow.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

排他的な条件に基づいてコンテンツを切り替えます。`when` が truthy である
最初の `<Match>` をレンダーし、どれも一致しない場合は `fallback` に
フォールバックします。

## インポート

```ts
import { Switch, Match } from "solid-js";
```

## `Switch`

### 型シグネチャ

```ts
function Switch(props: { fallback?: JSX.Element; children: JSX.Element }): JSX.Element;
```

### Props

#### `fallback`

- **型:** `JSX.Element`
- 省略可能

truthy な `Match` 条件が 1 つもないときにレンダーされます。

#### `children`

- **型:** `JSX.Element`

1 つ以上の `Match` 要素。

### 例

```tsx
<Switch fallback={<FourOhFour />}>
  <Match when={state.route === 'home'}>
    <Home />
  </Match>
  <Match when={state.route === 'settings'}>
    <Settings />
  </Match>
</Switch>
```

#### マッチした値を絞り込む

```tsx
<Switch fallback={<p>Loading…</p>}>
	<Match when={error()}>{(e) => <p>Error: {e().message}</p>}</Match>
	<Match when={data()}>{(d) => <Table rows={d().rows} />}</Match>
</Switch>
```

### 注意点

- 意味のある child は `Match` 要素だけです。他のコンテンツには `when` がなく、レンダーされることはありません。
- truthy な `Match` は先勝ちです。分岐は最も具体的なものから順に並べてください。

## `Match`

`<Switch>` 内の分岐です。`when` が truthy である最初の `<Match>` が
採用され、残りのマッチはスキップされます。

`<Show>` と同様に、`<Match>` も関数形式の child をサポートします。
非 keyed の child は絞り込まれた値のアクセサーを受け取り、keyed の
child は絞り込まれた生の値を受け取ります。

### 型シグネチャ

```ts
function Match<T>(props: {
	when: T | undefined | null | false;
	keyed?: false;
	children: JSX.Element | ((item: Accessor<NonNullable<T>>) => JSX.Element);
}): JSX.Element;
function Match<T>(props: {
	when: T | undefined | null | false;
	keyed: true;
	children: JSX.Element | ((item: NonNullable<T>) => JSX.Element);
}): JSX.Element;
```

### Props

#### `when`

- **型:** `T | undefined | null | false`

分岐条件。`Switch` 内で最初に truthy になった `Match` がレンダーされます。

#### `keyed`

- **型:** `boolean`
- 省略可能

`Show` と同じ意味です。keyed なコンテンツは値の同一性が変わると再マウントされます。

#### `children`

- **型:** `JSX.Element | ((item) => JSX.Element)`

静的なコンテンツ、または絞り込まれた値を受け取る関数。

### 例

```tsx
<Switch fallback={<NotFound />}>
  <Match when={user()}>
    {u => <Profile name={u().name} />}
  </Match>
  <Match when={loading()}>
    <Spinner />
  </Match>
</Switch>
```

### 注意点

- `Switch` の外にある `Match` は有用なものを何もレンダーしません。自身の条件を囲んでいる `Switch` に報告するだけです。

## 関連項目

- [条件付きコンテンツ](/docs/concepts/components-and-jsx.md#conditional-content)
- [コンポーネントと JSX](/docs/concepts/components-and-jsx.md)
- [バウンダリ](/docs/concepts/boundaries.md)

## 関連する型

### `AnyMatchProps`

```ts
type AnyMatchProps<T> =
  | MatchProps<T>
  | KeyedMatchProps<T>
  | {
      when: T | undefined | null | false;
      keyed?: boolean;
      children: JSX.Element;
    };
```

### `KeyedMatchProps`

```ts
type KeyedMatchProps<
  T,
  F extends KeyedConditionalRenderCallback<T> = KeyedConditionalRenderCallback<T>
> = {
  when: T | undefined | null | false;
  keyed: true;
  children: KeyedConditionalRenderChildren<T, F>;
};
```

#### `when`

- **型:** `T | undefined | null | false`

#### `keyed`

- **型:** `true`

#### `children`

- **型:** `KeyedConditionalRenderChildren<T, F>`

### `MatchProps`

```ts
type MatchProps<T, F extends ConditionalRenderCallback<T> = ConditionalRenderCallback<T>> = {
  when: T | undefined | null | false;
  keyed?: false;
  children: ConditionalRenderChildren<T, F>;
};
```

#### `when`

- **型:** `T | undefined | null | false`

#### `keyed`

- **型:** `false`

#### `children`

- **型:** `ConditionalRenderChildren<T, F>`
