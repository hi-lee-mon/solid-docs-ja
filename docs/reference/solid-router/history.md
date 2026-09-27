---
title: "履歴アダプター"
version: "2.0"
description: "Solid Router のブラウザ・ハッシュ・メモリ履歴アダプターのリファレンス。"
source_repo: "solidjs/solid-router"
source_ref: "next"
source_path: "src/routers/history.ts"
---

## インポート

```ts
import {
	browserHistory,
	hashHistory,
	memoryHistory,
	type MemoryHistoryAdapter,
	type RouterHistory,
} from "@solidjs/router";
```

## `RouterHistory`

```ts
interface RouterHistory {
	get(): string | LocationChange;
	set(next: LocationChange): void;
	init?(notify: (value?: string | LocationChange) => void): () => void;
	utils?: Partial<RouterUtils>;
}
```

```ts
interface LocationChange<S = unknown> {
	value: string;
	replace?: boolean;
	scroll?: boolean;
	state?: S;
	rawPath?: string;
}
```

履歴アダプターは `createRouter({ history })` として渡します。
サーバーでは、リクエスト URL またはルーターの `url` prop がロケーションを選択します。

## `browserHistory`

```ts
function browserHistory(): RouterHistory;
```

`window.location`、`history.pushState`、`history.replaceState`、`popstate` を使います。
ルーターはクライアントでこのアダプターをデフォルトで作成します。

## `hashHistory`

```ts
function hashHistory(): RouterHistory;
```

ルーティング対象のパスを `#` の後ろに格納します。
`hashHistory` の `renderPath` ユーティリティは、生成される `Router.paths` の値に `#` のプレフィックスを付けます。

```ts
const Router = createRouter({
	routes,
	history: hashHistory(),
});
```

## `memoryHistory`

```ts
function memoryHistory(initial?: string): MemoryHistoryAdapter;
```

`initial` のデフォルトは `/` です。

```ts
interface MemoryHistoryAdapter extends RouterHistory {
	get(): string;
	go(delta: number): void;
	back(): void;
	forward(): void;
	listen(listener: (value: string) => void): () => void;
}
```

```ts
const history = memoryHistory("/users/42");
const Router = createRouter({ routes, history });

history.back();
```

## スクロール復元

`createRouter` は、`scrollRestoration` が false でない限り、デフォルトのブラウザ履歴を明示的なスクロール復元でラップします。
カスタム履歴アダプターは、`scrollRestoration` が true の場合にのみラップされます。

## 関連項目

- [`createRouter`](/docs/reference/solid-router/router-factory.md#createrouter)
- [ナビゲーションプリミティブ](/docs/reference/solid-router/navigation.md)
