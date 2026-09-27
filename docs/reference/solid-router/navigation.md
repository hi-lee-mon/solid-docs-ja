---
title: "ナビゲーションプリミティブ"
version: "2.0"
description: "Solid Router のロケーション・ナビゲーション・マッチング・検索・プリロード・リンク状態・離脱ガードのリファレンス。"
source_repo: "solidjs/solid-router"
source_ref: "next"
source_path: "src/routing.ts"
---

## インポート

```ts
import {
	useBeforeLeave,
	useHref,
	useIsRouting,
	useLinkState,
	useLocation,
	useMatch,
	useNavigate,
	useParams,
	usePreloadRoute,
	useResolvedPath,
	useRouteMatches,
	useSearchParams,
} from "@solidjs/router";
```

このページのすべてのプリミティブは、マウントされたルーターコンテキストが必要です。

## `useNavigate`

```ts
function useNavigate(): Navigator;

interface Navigator {
	(to: string | TypedPath | number, options?: Partial<NavigateOptions>): void;
	(delta: number): void;
}
```

```ts
interface NavigateOptions<S = unknown> {
	resolve: boolean;
	replace: boolean;
	scroll: boolean;
	state: S;
}
```

デフォルトは `resolve: true`、`replace: false`、`scroll: true` です。

```ts
const navigate = useNavigate();
navigate(Router.paths.users(42), { replace: true });
navigate(-1);
```

## `useLocation`

```ts
function useLocation<S = unknown>(): Location<S>;
```

```ts
interface Location<S = unknown> {
	pathname: string;
	search: string;
	hash: string;
	query: SearchParams;
	state: Readonly<Partial<S>> | null;
	key: string;
}
```

現在のリアクティブなロケーションを返します。

## `useParams`

```ts
function useParams<T extends Params>(): T;
function useParams<P extends Params>(
	path: TypedPath<P>
): { [K in keyof P]: P[K] };
```

現在のルートチェーンについて、マージ済みのリアクティブなパラメータを返します。
path 引数は型のウィットネスであり、実行時にマッチングされるわけではありません。

## `useSearchParams`

```ts
function useSearchParams<T extends SearchParams>(): [
	Partial<T>,
	(params: SetSearchParams, options?: Partial<NavigateOptions>) => void,
];

function useSearchParams<In, Out>(
	path: TypedSearchPath<In, Out>
): [Out, (params: Partial<In>, options?: Partial<NavigateOptions>) => void];
```

引数なしの形式は生のクエリ値を読み取ります。
パスウィットネス形式は、現在マッチしているルートの同期検索スキーマを実行します。
セッターは値をマージし、デフォルトは `scroll: false` と `resolve: false` です。

## `useMatch`

```ts
function useMatch<S extends string | TypedPath>(
	path: () => S,
	matchFilters?: MatchFilters
): () => PathMatch | undefined;
```

指定されたパスパターンを現在の pathname に対してマッチングします。
`useMatch` はルートツリーを参照しません。

```ts
const match = useMatch(() => "/docs/*rest");
match()?.params.rest;
```

## `useRouteMatches`

```ts
function useRouteMatches(): () => RouteMatch[];
```

解決済みのルートツリーマッチの、ルートから葉までのコピーされた配列を返します。

## `useIsRouting`

```ts
function useIsRouting(): () => boolean;
```

保留中のプログラム的ナビゲーション、ネイティブの履歴トラバーサル、遅延ルート解決を示すアクセサーを返します。

## `usePreloadRoute`

```ts
function usePreloadRoute(): (
	url: string | URL | TypedPath,
	options?: { preloadData?: boolean }
) => void;
```

マッチした lazy コンポーネントを読み込みます。
`preloadData: true` を設定すると、マッチしたルートのプリロードも実行します。

## `useLinkState`

```ts
function useLinkState(
	href: () => string | TypedPath,
	options?: { end?: boolean }
): LinkState;
```

```ts
interface LinkState {
	active: () => boolean;
	current: () => boolean;
	pending: () => boolean;
}
```

`active` は `end` が true でない限り、子孫も含みます。
`current` は完全一致です。
`pending` は進行中のアクティブなターゲットにマッチします。

## `useResolvedPath`

```ts
function useResolvedPath(path: () => string): () => string | undefined;
```

現在のルートコンテキストに対してパスを解決します。

## `useHref`

```ts
function useHref<T extends string | undefined>(to: () => T): () => string | T;
```

履歴アダプターの出力レンダリングを適用します（ハッシュ履歴の `#` プレフィックスなど）。

## `useBeforeLeave`

```ts
function useBeforeLeave(listener: (event: BeforeLeaveEventArgs) => void): void;
```

```ts
interface BeforeLeaveEventArgs {
	from: Location;
	to: string | number;
	options?: Partial<NavigateOptions>;
	readonly defaultPrevented: boolean;
	preventDefault(): void;
	retry(force?: boolean): void;
}
```

オーナーが破棄されると、Solid はリスナーを削除します。
ナビゲーションをブロックするには `preventDefault()` を呼び出します。
離脱ハンドラーを再実行せずに再試行するには `retry(true)` を呼び出します。

## 関連項目

- [ルートと型付きパス](/docs/reference/solid-router/routes-and-paths.md)
- [履歴アダプター](/docs/reference/solid-router/history.md)
