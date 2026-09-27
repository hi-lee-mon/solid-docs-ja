---
title: "ルート定義"
version: "2.0"
description: "Solid Router がマッチングに使うルートオブジェクトの書き方：必須・オプション・ワイルドカードのセグメントを持つパスパターン、型付きパラメーター、マッチフィルター、メタデータ、遅延サブツリー、ファイルシステムマニフェスト。"
---

URL `/products/mug` には商品 ID が含まれています。
商品ページはその ID を `props.params.id` として必要とし、そこを指すリンクは `paths.products("mug")` が型チェッカーに検査される必要があり、どちらも `/products/` の後ろに何も続かないものを受け付けてはいけません。
これらのすべてが、ルートツリー内の1つのオブジェクトから生まれます。

ルート定義はプレーンなオブジェクトです。パスパターン、レンダリングするコンポーネント、そしてオプションで `preload`・`children`・マッチフィルター・メタデータを持ちます。
ほとんどのアプリに必要なのは [パスパターンをマッチさせる](#match-path-patterns) と [定義時点でルートに型を付ける](#type-a-route-at-its-definition) だけです。その後のセクションでは、プロジェクトがそれらを必要とする規模に育ったときのために、フィルター・メタデータ・遅延サブツリー・ファイルシステムマニフェストを扱います。

```tsx
import { defineRoutes } from "@solidjs/router";

export const routes = defineRoutes([
	{ path: "/", component: Home },
	{ path: "/products/:id", component: Product },
	{ path: "*404", component: NotFound },
]);
```

ルート配列は型の出どころでもあります。
TypeScript がリテラル `"/products/:id"` を保持しているため、`paths.products` は存在し、`paths.prodcuts` は存在しません。
`createRouter` にインラインで渡した配列はリテラルをそのまま保ちますが、一度変数に代入した配列は `string` に広がります。

```tsx
// Avoid: the literal paths widen to string, so paths accepts anything
const routes = [
	{ path: "/", component: Home },
	{ path: "/products/:id", component: Product },
];
export const Router = createRouter({ routes });

// Prefer: defineRoutes keeps the literals
const routes = defineRoutes([
	{ path: "/", component: Home },
	{ path: "/products/:id", component: Product },
]);
export const Router = createRouter({ routes });
```

`Avoid` 版では `paths.prodcuts` がコンパイルを通り、タイプミスは実行時に見つかるデッドリンクになります。
`defineRoutes` では、呼び出し側で型エラーになります。

## 定義時点でルートに型を付ける

ルート自身の `component` と `preload` の中では、`params` はデフォルトで開いたレコードです。パターンが保証する `:id` でさえも、すべてのキーが `string | undefined` です。
ルートを `defineRoute` でラップすると、そのルート自身の `path` から両方に型が付きます。

```tsx
import { defineRoute } from "@solidjs/router";

const productRoute = defineRoute({
	path: "/products/:id/:tab?",
	preload: ({ params }) => void getProduct(params.id), // params.id: string
	component: (props) => (
		<Product id={props.params.id} tab={props.params.tab} /> // tab: string | undefined
	),
});
```

`:id` のような必須パラメーターは `string` 型になります。
`:tab?` のようなオプションパラメーターは `string | undefined` 型になります。
親から継承したパラメーターは `string | undefined` として引き続きアクセスできます。

`preload` が返すものは何でも、コンポーネントの `props.data` の型になります。
ルートがマッチした時点で一度だけキャプチャされるため、非同期データでは [データロードとミューテーション](/docs/routing/solid-router/data.md) ページのパターンに従います。つまり `preload` で `void` を付けてクエリを開始し、コンポーネント内でメモを通して読み取ることで、`params` に対してリアクティブなままにします。

別モジュールで宣言されたコンポーネントには、パスウィットネスでアノテーションを付けます。

```tsx
import type { RouteComponent } from "@solidjs/router";
import type { Router } from "../router";

const Product: RouteComponent<typeof Router.paths.products> = (props) => (
	<h1>{props.params.id}</h1>
);
```

対応する props オブジェクトの型は `RouteProps<typeof Router.paths.products>` が提供します。

## パスパターンをマッチさせる

パラメーターごとにパストークンを選びます。

- 必須セグメントには `:name` を使います。
- オプションセグメントには `:name?` を使います。
- 残りのパスには `*name` を使います。

```tsx
const routes = defineRoutes([
	{ path: "/products/:id", component: Product },
	{ path: "/docs/:section?", component: Docs },
	{ path: "/files/*path", component: FileViewer },
]);
```

`/products/mug` は `params.id === "mug"` で1つ目のルートにマッチします。`/products` はマッチしません。
`/docs` と `/docs/install` はどちらも2つ目にマッチします。
`/files/2024/invoices/march.pdf` は `params.path === "2024/invoices/march.pdf"` で3つ目にマッチします。

:::caution[ワイルドカードはパターンを終わらせる]
`*name` は最後のセグメントでなければなりません。`*` の後のすべてがパラメーター名として読まれるため、`/files/*path/preview` のようなパターンは見た目が示すものにはマッチしません。
固定セグメントはワイルドカードの前に置くか、そのバリアントには子ルートを使ってください。
:::

ルートは配列内のどのパスにもマッチさせることができます。

```tsx
{ path: ["/sign-in", "/register"], component: AccountAccess }
```

マッチするパス間を移動しても同じルート定義はマウントされたままなので、ユーザーが `/sign-in` から `/register` に切り替えても `AccountAccess` 内のフォームは状態を保ちます。

## パラメーターをフィルターする

`matchFilters` は、設定したフィルターを満たさないパラメーター値を拒否します。
フィルターには配列・正規表現・述語が使えます。

```tsx
import { defineRoute, int } from "@solidjs/router";

const orderRoute = defineRoute({
	path: "/account/orders/:id",
	matchFilters: { id: int },
	component: Order,
});
```

`/account/orders/42` はマッチし、`/account/orders/latest` は次にマッチするルート（通常は `*404` のキャッチオール）へフォールスルーします。

組み込みの `int` フィルターは実行時に整数文字列を受け付けます。
また、対応する `Router.paths` の引数を `number` に変えるため、`paths.account.orders(42)` は型チェックを通り、`paths.account.orders("latest")` は通りません。

:::note[フィルターが変えるのはリンクの型であり、param の型ではない]
ルートコンポーネントが受け取る URL パラメーターは引き続き文字列です。
ルートに `int` を付けても `Order` 内の `params.id` は `"42"` のままです。URL が保持するのは文字列だからです。読み取る側で変換してください。
:::

## ルートメタデータを追加する

`info` プロパティはアプリケーションのメタデータをルートに保存します。
マッチしたメタデータは `useRouteMatches()` または `Router.match(url)` で読み取ります。

```tsx
const routes = defineRoutes([
	{
		path: "/account",
		component: Account,
		info: { breadcrumb: "Account" },
	},
]);
```

アプリケーション全体で共有するメタデータのキーをチェックするには、`RouteInfo` を拡張（augment）します。

```ts
declare module "@solidjs/router" {
	interface RouteInfo {
		breadcrumb?: string;
	}
}
```

## ルートサブツリーを遅延ロードする

`children` のサンクで、ネストしたルートテーブル全体をロードできます。
そのモジュールはルート配列を `default` として、または `routes` としてエクスポートできます。

```tsx
const Router = createRouter({
	routes: [
		{ path: "/", component: Home },
		{
			path: "/admin",
			component: AdminLayout,
			children: () => import("./admin/routes"),
		},
	],
});
```

```tsx
// src/admin/routes.ts
import { defineRoutes } from "@solidjs/router";

export default defineRoutes([
	{ path: "/", component: AdminHome },
	{ path: "/products/:id", component: AdminProduct },
]);
```

`/` を訪れたとき、admin のルートテーブルはダウンロードされません。
`/admin/products/mug` を訪れるか、そこへのリンクをホバーすると、サンクが実行され、ルーターは解決済みのサブツリーをコンパイル済みルートツリーに追加し、マッチが完了します。
インポートされたルート配列がリテラル型を保持していれば、TypeScript はインポートの Promise 型を通じて `paths.admin.products("mug")` を推論します。

`() => import("./admin/routes")` のような決定論的なサンクを使ってください。
解決済みのサブツリーはキャッシュされ共有されるため、後の実行時状態によって切り替わることはありません。

## ファイルシステムマニフェストを変換する

`filesystem-routing` Vite プラグインを有効にすると、`virtual:file-routes` が生成されます。

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { fileRoutes as fileRoutesPlugin } from "filesystem-routing/vite";
import solid from "@solidjs/vite-plugin";

export default defineConfig({
	plugins: [solid({ start: true }), fileRoutesPlugin()],
});
```

`@solidjs/router/fs` アダプターは、生成された `pageRoutes` エクスポートを Solid Router のルート定義に変換します。

```tsx
import { pageRoutes } from "virtual:file-routes";
import { createRouter } from "@solidjs/router";
import { fileRoutes as routerFileRoutes } from "@solidjs/router/fs";

export const Router = createRouter({
	routes: routerFileRoutes(pageRoutes),
});
```

各ルートモジュールはコンポーネントを `default` としてエクスポートします。
オプションの名前付き `route` エクスポートで `preload`・`matchFilters`・`search`・`info` を提供できます。

```tsx
// src/routes/products/[id].tsx
import { createMemo } from "solid-js";
import { int, type RouteProps } from "@solidjs/router";
import { defineFileRoute } from "@solidjs/router/fs";
import { getProduct } from "../../data/products";

export const route = defineFileRoute("/products/:id", {
	matchFilters: { id: int },
	preload: ({ params }) => void getProduct(params.id),
});

export default function Product(props: RouteProps<typeof route>) {
	const product = createMemo(() => getProduct(props.params.id));
	return <h1>{product().name}</h1>;
}
```

ルートファイル内ではパターンはファイル名に存在するため、型付けの対象となる `paths` ノードがありません。
[`defineFileRoute`](/docs/reference/solid-router/filesystem.md) に渡す文字列がその代わりを務め、`preload` の params に型を付け、`matchFilters` を検証し、その設定をコンポーネントの `RouteProps` ウィットネスとして兼用させます。
実行時の真実の源（source of truth）はマニフェストのパスのままなので、ファイルを移動したらその文字列も一緒に更新してください。

:::deep-dive[アダプターがマニフェストをどう処理するか]
マニフェストが生成したリテラル型を持つ場合、ルートパス・フィルター・検索スキーマは `Router.paths` に引き継がれるため、`paths.products("mug")` には手書きの配列の場合と同じように型が付きます。
コード分割されたマニフェストのコンポーネントは Solid の `lazy` コンポーネントになります。
`codeSplitting: false` でビルドされたマニフェストから即時配信されるコンポーネントは、`lazy` ラッパーなしでそのまま渡されます。
`route` エクスポートはマニフェストが指すモジュールから読み取られます。手書きのルートツリーはこれを読みません。そのため、[イントロダクション](/docs/routing/solid-router/index.md#load-data-for-a-page) ページでは preload が `src/router.ts` のルートオブジェクトに置かれています。
:::

## まとめ

- `defineRoutes` またはインライン配列でパスリテラルを保ち、`paths` がルートツリーから型付けされるようにします。
- 必須セグメントには `:name`、オプションには `:name?`、残りのパスの最終セグメントには `*name` を使います。
- ルートを `defineRoute` でラップすると、自身の `component` と `preload` 内の `params` に型が付きます。
- 非同期処理は `preload` で `void` 付きで開始し、メモ経由で読み取ります。`props.data` は一度だけキャプチャされます。
- `matchFilters` でマッチ時に値を拒否します。params は文字列のままで、`int` は `paths` の引数を number 型にします。
- 大きなセクションのルートは専用のモジュールに置き、`children` サンクでロードします。
- ルートファイルでは、`preload` とフィルターを `defineFileRoute` を使った `route` エクスポートに置きます。

## 次のステップ

- [ネストルートとレイアウト](/docs/routing/solid-router/nested-routes.md): `children` を持つルートが、マッチしたページの周りにレイアウトをレンダリングする方法と、マウントされたままになるもの。
- [ナビゲーションと型付きパス](/docs/routing/solid-router/navigation.md): これらの定義が生み出す型付き `paths` と、スキーマ付きの検索パラメーター。
- [データロードとミューテーション](/docs/routing/solid-router/data.md): `preload` に何を置くか、そしてコンポーネントがそれをどう読み取るか。
