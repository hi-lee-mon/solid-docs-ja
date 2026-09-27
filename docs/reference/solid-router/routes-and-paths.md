---
title: "ルートと型付きパス"
version: "2.0"
description: "ルート定義・パスパターン・型付きパスノード・マッチフィルター・ルーターマッチングのリファレンス。"
source_repo: "solidjs/solid-router"
source_ref: "next"
source_path: "src/types.ts"
---

## `RouteDefinition`

```ts
type RouteDefinition<S extends string | string[] = any, T = any> = {
	path?: S;
	matchFilters?: MatchFilters<S>;
	preload?: RoutePreloadFunc<T>;
	children?: RouteDefinition | readonly RouteDefinition[] | LazyRouteChildren;
	component?: RouteSectionComponent<T>;
	search?: StandardSchemaV1<any, any>;
	info?: RouteInfo;
};
```

### パス構文

- `/users` は静的パスです。
- `/:id` は必須パラメータです。
- `/:id?` はオプションパラメータです。
- `/*rest` は残りのパスを捕捉します。
- パスの配列は、1 つのルート定義に複数のパターンを割り当てます。
- パスを省略すると、パスレスルートになります。

ワイルドカードは最後のセグメントでなければなりません。

### `children`

インラインの children は、1 つのルートまたは読み取り専用のルート配列を受け取ります。
遅延 children は、決定的なサンクを受け取ります:

```ts
type LazyRouteChildren = () =>
	| readonly RouteDefinition[]
	| Promise<
			| readonly RouteDefinition[]
			| { default: readonly RouteDefinition[] }
			| { routes: readonly RouteDefinition[] }
	  >;
```

### `component` props

```ts
interface RouteSectionProps<T = unknown, P extends Params = Params> {
	params: P;
	location: Location;
	data: T;
	children?: JSX.Element;
}
```

`data` はルートプリロードの戻り値です。
`children` は次にマッチしたルートセクションです。

### `preload`

```ts
type RoutePreloadFunc<T = unknown, P extends Params = Params> = (
	args: RoutePreloadFuncArgs<P>
) => T;

interface RoutePreloadFuncArgs<P extends Params = Params> {
	params: P;
	location: Location;
	intent: "initial" | "native" | "navigate" | "preload";
}
```

## マッチフィルター

```ts
type MatchFilter = readonly string[] | RegExp | ((value: string) => boolean);

type MatchFilters<P extends string | readonly string[] = any> = {
	[K in PathParams<P>[number]]?: MatchFilter;
};
```

### `int`

整数の URL セグメントにマッチし、対応するパスビルダー引数を `number` 型にします。

```ts
import { int } from "@solidjs/router";

const route = defineRoute({
	path: "/users/:id",
	matchFilters: { id: int },
});
```

実行時のルートパラメータは文字列のままです。

## `Router.paths`

`Router.paths` の型は `RoutePaths<typeof routes>` です。
静的プロパティはセグメントを追加し、呼び出しはパラメータをバインドします。引数なし、または search オブジェクトを渡す呼び出しは文字列を返します。

```ts
Router.paths.users(42).settings();
Router.paths.search({ q: "solid" }, "results");
String(Router.paths.about);
```

すべてのパスノードは次を実装しています:

```ts
interface TypedPath<P extends Params = Params>
	extends JSX.SerializableAttributeValue {
	toString(): string;
}
```

パスの終端はさらに search 引数と hash 引数を受け取ります:

```ts
type PathEnd<
	Sch extends {
		input: any;
		output: any;
	} = DefaultSearchTypes,
	P extends Params = Params,
> = TypedPath<P> &
	TypedSearchPath<Sch["input"], Sch["output"]> & {
		(): string;
		(search: Sch["input"], hash?: string): string;
	};
```

## `Router.match`

レンダリングせずに、任意の URL をインスタンスに対してマッチさせます。

```ts
match(url: string): OutputMatch[];
```

```ts
interface OutputMatch {
	path: string;
	pattern: string;
	match: string;
	params: Params;
	info?: RouteInfo;
}
```

ルートから葉までのマッチを返します。
どのルートにもマッチしない場合は `[]` を返します。
ルーターの `transformUrl`、`base`、および解決済みの遅延サブツリーが適用されます。

## ルートコンポーネントの型

簡略化された公開形状:

```ts
type RouteProps<
	Path,
	T = /* inferred preload data */ unknown,
> = RouteSectionProps<T, /* params derived from Path */ Params>;

type RouteComponent<Path, T = unknown> = Component<RouteProps<Path, T>>;
```

`Path` には型付きパスノード、リテラルのパターン文字列、`defineFileRoute` の結果を指定できます。

```ts
const User: RouteComponent<typeof Router.paths.users> = props => (
  <h1>{props.params.id}</h1>
);
```

## `RouteInfo`

ルートの `info`、`Router.match`、`useRouteMatches` が使用する、拡張可能なメタデータインターフェースです。

```ts
interface RouteInfo {
	[key: string]: any;
}
```

```ts
declare module "@solidjs/router" {
	interface RouteInfo {
		breadcrumb?: string;
	}
}
```

## 関連項目

- [`defineRoute` と `defineRoutes`](/docs/reference/solid-router/router-factory.md)
- [ナビゲーションプリミティブ](/docs/reference/solid-router/navigation.md)
- [ファイルシステムアダプター](/docs/reference/solid-router/filesystem.md)
