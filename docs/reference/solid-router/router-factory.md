---
title: "ルーターファクトリー"
version: "2.0"
description: "createRouter・defineRoute・defineRoutes・ルーター設定・ルーターインスタンスのリファレンス。"
source_repo: "solidjs/solid-router"
source_ref: "next"
source_path: "src/routers/factory.tsx"
---

## インポート

```ts
import { createRouter, defineRoute, defineRoutes } from "@solidjs/router";
```

## `createRouter`

ルートツリーからイミュータブルなルーターインスタンスを作成します。

```ts
function createRouter<const R extends readonly RouteDefinition[]>(
	config: RouterConfig<R>
): RouterInstance<R>;
```

### `RouterConfig`

```ts
interface RouterConfig<
	R extends readonly RouteDefinition[] = RouteDefinition[],
> {
	routes: R;
	base?: string;
	preload?: RoutePreloadFunc;
	history?: RouterHistory;
	singleFlight?: boolean;
	actionBase?: string;
	explicitLinks?: boolean;
	preloadLinks?: boolean;
	scrollRestoration?: boolean;
	transformUrl?: (url: string) => string;
}
```

- `routes` はマッチングとパス推論に使われるルートツリーです。
- `base` はマッチしたパスと生成されるパスにプレフィックスを付けます。
- `preload` はルートのレンダープロップにデータを返します。
- `history` はクライアントではブラウザ履歴がデフォルトです。
- `singleFlight` のデフォルトは `true` です。
- `actionBase` のデフォルトは `/_server` です。
- `explicitLinks` のデフォルトは `false` です。
- `preloadLinks` のデフォルトは `true` です。
- `scrollRestoration` はデフォルトのブラウザ履歴では `true` がデフォルトです。
- `transformUrl` はマッチングとプリロードの前にパス名を書き換えます。

### 戻り値

```ts
interface RouterInstance<
	R extends readonly RouteDefinition[] = RouteDefinition[],
> {
	(props: RouterProps): JSX.Element;
	readonly paths: RoutePaths<R>;
	readonly routes: R;
	readonly config: RouterConfig<R>;
	match(url: string): OutputMatch[];
}
```

インスタンスはプロバイダーコンポーネントです。
`paths` は最初のアクセス時に作成されます。
`match(url)` はルートから葉までのマッチ、または空配列を返します。

```tsx
const Router = createRouter({
	routes: [{ path: "/", component: Home }],
});

<Router>{(props) => <main>{props.children}</main>}</Router>;
```

### `RouterProps`

```ts
interface RouterProps {
	url?: string;
	children?: (props: RouteSectionProps) => JSX.Element;
}
```

`url` はリクエストイベントが存在しない場合に、サーバーレンダーされるロケーションを選択します。
リクエストイベントが優先されます。
クライアントは `url` を無視します。

## `defineRoutes`

抽出されたルートタプルのリテラル型を保持し、同じ値を返します。

```ts
function defineRoutes<const R extends readonly RouteDefinition[]>(routes: R): R;
```

```ts
const routes = defineRoutes([{ path: "/" }, { path: "/users/:id" }]);
```

## `defineRoute`

渡されたルートオブジェクトをそのまま返しつつ、そのパスから component と preload のパラメータに型を付けます。

```ts
function defineRoute<
	const S extends string | readonly string[],
	T = unknown,
	const F = DefinedRouteFilters<S>,
	const C extends RouteChildren | undefined = RouteChildren | undefined,
	Sch extends StandardSchemaV1<any, any> | undefined = undefined,
>(route: {
	path: S;
	matchFilters?: F;
	preload?: (args: RoutePreloadFuncArgs<RouteParams<S>>) => T;
	component?: (
		props: RouteSectionProps<T, RouteParams<S>> & { children?: any }
	) => JSX.Element;
	children?: C;
	search?: Sch;
	info?: RouteInfo;
}): DefinedRoute<S, T, F, C, Sch>;
```

`RouteChildren` は `RouteDefinition | readonly RouteDefinition[] | LazyRouteChildren` です。
パスレスのオーバーロードは `path` を省略し、開かれた `Params` を使います。

```tsx
const route = defineRoute({
	path: "/users/:id",
	preload: ({ params }) => getUser(params.id),
	component: (props) => <h1>{props.data.name}</h1>,
});
```

## 関連項目

- [ルートと型付きパス](/reference/solid-router/routes-and-paths)
- [履歴アダプター](/reference/solid-router/history)
- [サーバー統合](/reference/solid-router/server)
