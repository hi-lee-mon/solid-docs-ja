---
title: "データ API"
version: "2.0"
description: "Solid Router のクエリキャッシュ・再検証・アクション・アクション呼び出し・確定済み送信のリファレンス。"
source_repo: "solidjs/solid-router"
source_ref: "next"
source_path: "src/data/index.ts"
---

## インポート

```ts
import {
	action,
	query,
	revalidate,
	useAction,
	useSubmissions,
} from "@solidjs/router";
```

## `query`

```ts
function query<T extends (...args: any[]) => any>(
	fn: T,
	name: string
): CachedFunction<T>;
```

キーヘルパー付きのキャッシュ済み関数を返します:

```ts
type CachedFunction<T extends (...args: any[]) => any> = ((
	...args: Parameters<T>
) => ReturnType<T>) & {
	key: string;
	keyFor(...args: Parameters<T>): string;
};
```

```ts
const getUser = query(fetchUser, "users");

getUser.key;
getUser.keyFor("42");
```

キャッシュキーは `name` と引数の安定した JSON シリアライズを組み合わせたものです。
プレーンオブジェクトのキーはシリアライズ時にソートされます。

`fn` がメソッドを宣言していないサーバー関数の場合、`query` はそれを GET サーバー関数としてラップします。

### キャッシュメソッド

```ts
query.get(key: string): any;
query.set<T>(key: string, value: T): void;
query.delete(key: string): boolean;
query.clear(): void;
```

`query.get` は確定済みのキャッシュ値を返します。
`query.get` はエントリーが存在しない場合にスローします。
`query.set` は Promise の値を受け付けません。

## `revalidate`

```ts
function revalidate(key?: string | string[] | void, force?: boolean): void;
```

生存しているマッチするキャッシュエントリーを再トリガーします。
キーは前方一致でマッチします。
`key` を省略するとすべてのエントリーにマッチします。
`force` のデフォルトは `true` で、マッチしたエントリーを再トリガーする前に stale としてマークします。

## `action`

```ts
function action<T extends any[], U = void>(
	fn: (...args: T) => Promise<U>,
	name?: string
): Action<T, U>;

function action<T extends any[], U = void>(
	fn: (...args: T) => Promise<U>,
	options?: { name?: string }
): Action<T, U>;
```

```ts
type Action<T extends any[], U, V = T> = ((
	...variables: T
) => Promise<NarrowResponse<U>>) & {
	url: string;
	with<A extends any[], B extends any[]>(...args: A): Action<B, U, V>;
	onSubmit(hook: (...args: V extends any[] ? V : T) => void): Action<T, U, V>;
	onSettled(
		hook: (
			submission: Submission<V extends any[] ? V : T, NarrowResponse<U>>
		) => void
	): Action<T, U, V>;
};
```

フォーム対応のアクションは、Solid のシリアライズ可能な JSX 属性値を実装します。
クライアントアクションはサーバーでレンダーされる際に安定した名前が必要です。
サーバー関数は独自の URL を提供します。

### フォームでの使用

```tsx
<form action={save} method="post">
	<button>Save</button>
</form>
```

デリゲートされたアクション処理が受け付けるのは POST フォームのみです。
デリゲートされた送信の実行中、フォームには `aria-busy="true"` が付きます。

### `with`

先頭のアクション引数をバインドし、残りの引数を取るアクションを返します。
バインドされた引数はアクション URL に表れます。

### `onSubmit`

ミューテーション呼び出しの前に実行されるコールバックを登録します。
オーナー配下での登録は、オーナーが破棄されると削除されます。

### `onSettled`

完了した各呼び出しに対するコールバックを登録します。
コールバックは `Submission` を受け取ります。void・リダイレクト・メタデータのみの結果でも同様です。

## `useAction`

```ts
function useAction<T extends any[], U, V>(
	action: Action<T, U, V>
): (...args: T) => Promise<NarrowResponse<U>>;
```

アクションの直接呼び出しを現在のルーターコンテキストにバインドします。

## `useSubmissions`

```ts
function useSubmissions<T extends any[], U, V>(
	action: Action<T, U, V>,
	filter?: (input: V) => boolean
): Submission<V, NarrowResponse<U>>[];
```

そのアクションの確定済みレコードのリアクティブな配列プロキシを返します。
ルーターが保持するのは result または error を持つレコードのみです。

```ts
type Submission<T, U> = {
	readonly input: T;
	readonly result?: U;
	readonly error: any;
	readonly url: string;
	clear(): void;
	retry(): void;
};
```

## 関連項目

- [ルートプリロードの型](/docs/reference/solid-router/routes-and-paths.md#preload)
- [サーバー統合](/docs/reference/solid-router/server.md)
