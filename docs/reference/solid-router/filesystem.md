---
title: "ファイルシステムアダプター"
version: "2.0"
description: "ファイルルートマニフェストの変換と Solid Router ルートモジュール設定の型付けのリファレンス。"
source_repo: "solidjs/solid-router"
source_ref: "next"
source_path: "src/fs.ts"
---

## インポート

```ts
import { defineFileRoute, fileRoutes } from "@solidjs/router/fs";
```

## `fileRoutes`

ネストされたファイルルートのマニフェストエントリーをルート定義タプルに変換します。

```ts
function fileRoutes<const T extends readonly FileRouteEntry[]>(
	entries: T
): FileRoutesFrom<T>;
```

```tsx
import { pageRoutes } from "virtual:file-routes";
import { createRouter } from "@solidjs/router";
import { fileRoutes } from "@solidjs/router/fs";

const Router = createRouter({
	routes: fileRoutes(pageRoutes),
});
```

各エントリーに対して、アダプターは:

- マニフェストの `path` を使います。
- モジュールの default エクスポートを `component` として読み込みます。
- モジュールの名前付き `route` エクスポートを定義にスプレッドします。
- `info` に `filesystem: true` を追加します。
- `children` を再帰的に変換します。

コード分割されたコンポーネント参照は `lazy` コンポーネントになり、そのソースを `moduleUrl` として使います。
eager なコンポーネント参照は `lazy` ラッパーなしでそのまま渡されます。
1 回の `fileRoutes` 呼び出し内では、lazy コンポーネントはソース URL 単位で再利用されます。

## `defineFileRoute`

パスパターンのウィットネスから、ルートモジュールの名前付き `route` エクスポートに型を付けます。

```ts
function defineFileRoute<
	S extends string,
	T = unknown,
	const F = DefinedRouteFilters<S>,
	Sch extends StandardSchemaV1<any, any> | undefined = undefined,
>(
	path: S,
	config: {
		matchFilters?: F;
		preload?: (args: RoutePreloadFuncArgs<RouteParams<S>>) => T;
		search?: Sch;
		info?: RouteInfo;
	}
): FileRouteConfig<S, T, F, Sch>;
```

```tsx
export const route = defineFileRoute("/blog/:id", {
	matchFilters: { id: int },
	preload: ({ params }) => getPost(params.id),
});

export default function Post(props: RouteProps<typeof route>) {
	return <h1>{props.data.title}</h1>;
}
```

`path` 引数は型のウィットネスです。
実行時のパスはマニフェストエントリーが提供します。

## マニフェストの型

```ts
interface FileRouteEntry {
	path: string;
	page?: boolean;
	$component?: FileRouteLazyRef<any> | FileRouteEagerRef<any>;
	$$route?: FileRouteEagerRef<any>;
	children?: readonly FileRouteEntry[];
}

interface FileRouteLazyRef<M = Record<string, unknown>> {
	src: string;
	import(): Promise<M>;
}

interface FileRouteEagerRef<M = Record<string, unknown>> {
	src?: string;
	require(): M;
}
```

`FileRouteFrom<E>` は 1 つのマニフェストエントリーをそのルート型にマッピングします。
`FileRoutesFrom<T>` はリテラルなパスとルートモジュール設定を保持しながら、エントリータプル全体をマッピングします。

## 関連項目

- [ルート定義](/reference/solid-router/routes-and-paths)
- [ファイルシステムルーティングガイド](/routing/solid-router/route-definitions#convert-a-file-system-manifest)
