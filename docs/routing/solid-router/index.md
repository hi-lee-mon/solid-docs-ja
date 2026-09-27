---
title: "Solid Router"
version: "2.0"
description: "Solid Router で小さなルーティング付きストアを作ります：URL から id を読み取る商品ページ、マウントされたままになるヘッダー、型付きリンク、そしてページがレンダーされる前に読み込みを開始するルートデータ。"
---

このストアにはページが1つしかありません。
必要なのは、`/products/mug` にある商品ページ、その下でページが切り替わってもそのまま残るヘッダー、ドキュメントを再読み込みしないリンク、そしてページがレンダーされた後ではなくリンクがクリックされた時点で読み込みを開始する商品データです。

Solid Router は `basic` と `fullstack` のプロジェクト形式に同梱されるルーターで、`@solidjs/router` として公開されています。
利用は任意です。Solid アプリケーションは[別のルーター](/docs/routing/overview.md#pick-a-router)を使っても、ルーターなしでも構いません。
このページでは上記のストアを4つのステップで構築します。アプリケーションが日常的に触れる部分を使い、各パートの詳細は後続のページで扱います。

## 1つのアプリ、3つのページ

ホームページ、動的セグメントを持つ商品ページ、そしてそれ以外すべてを受け止めるキャッチオールです。
ルートはオブジェクトであり、そのツリーはモジュールスコープで一度だけ作られます：

```tsx
// src/router.ts
import { lazy } from "solid-js";
import { createRouter } from "@solidjs/router";

export const Router = createRouter({
	routes: [
		{ path: "/", component: lazy(() => import("./pages/Home")) },
		{ path: "/products/:id", component: lazy(() => import("./pages/Product")) },
		{ path: "*404", component: lazy(() => import("./pages/NotFound")) },
	],
});

export const { paths } = Router;
```

`createRouter` はコンポーネント `Router` を返し、そこには静的ヘルパーが一式付いています。
その中でも `paths` は至る所に登場します：`paths()` は `/`、`paths.products("mug")` は `/products/mug` です。
ルートツリーはリテラルなので、引数なしの `paths.products()` は型エラーになり、`paths.produts` のようなタイポも同様です。

`lazy` は各ページをそれぞれのチャンクに分割します。
ルーターは、そのページへのリンクがホバーされるかルートがマッチするかの、早い方でチャンクを読み込みます。

## マウントしてレイアウトを追加する

`App` はルーターをレンダーします。
関数の子要素がルートレイアウトで、その下でページが切り替わってもマウントされたままです：

```tsx
// src/App.tsx
import { Loading } from "solid-js";
import { paths, Router } from "./router";

export default function App() {
	return (
		<Router>
			{(props) => (
				<>
					<header>
						<a href={paths()}>Store</a>
						<a href={paths.products("mug")}>Featured</a>
					</header>
					<Loading fallback={<main>Loading…</main>}>
						<main>{props.children}</main>
					</Loading>
				</>
			)}
		</Router>
	);
}
```

**Featured** をクリックしてみましょう。
URL は `/products/mug` に変わり、`<main>` の中身が入れ替わりますが、`<header>` は DOM を維持します。ドキュメントの再読み込みは起きません。

リンクは普通のアンカー要素です。
ルーターは内部にある同一オリジンのアンカーのクリックを監視し、クライアントサイドのナビゲーションに変換するので、インポートすべき `Link` コンポーネントはありません。

:::note[フォールバックが初回読み込み時にしか出ない理由]
ユーザーがまだデータを読み込み中のページへのリンクをクリックしたとき、Solid はフォールバックに切り替える代わりに現在のページを画面に残し、保留中のリンクに印を付けます。
フォールバックが現れるのは初回読み込みのように、保持できる前のページがない場合だけです。
仕組みは[非同期リアクティビティ](/docs/concepts/async-reactivity.md)で説明しています。保留中状態へのスタイル付けは[アクティブなリンクと保留中のリンクを表示する](/docs/routing/solid-router/navigation.md#show-active-and-pending-links)を参照してください。
:::

## ページで URL を読み取る

ページコンポーネントは props として `params`、`location`、`data`、`children` を受け取ります。
ルートから型を付ければ、パラメータ名のタイポを検出できます：

```tsx
// src/pages/Product.tsx
import type { RouteProps } from "@solidjs/router";
import type { Router } from "../router";

export default function Product(
	props: RouteProps<typeof Router.paths.products>
) {
	return <h1>Product {props.params.id}</h1>;
}
```

`/products/mug` から `/products/bowl` に移動してみましょう。
`Product` は再マウントされません。JSX の中で `props.params.id` を読み取っているので、見出しが「Product bowl」に変わります。

他のルーターでの習慣は、コンポーネントの冒頭で id を一度だけ取り出すものです：

```tsx
// Avoid: the body runs once, so this is the first id forever
export default function Product(
	props: RouteProps<typeof Router.paths.products>
) {
	const id = props.params.id;
	return <h1>Product {id}</h1>;
}

// Prefer: read the param where it is displayed
export default function Product(
	props: RouteProps<typeof Router.paths.products>
) {
	return <h1>Product {props.params.id}</h1>;
}
```

`Avoid` 版を実行すると、`/products/bowl` へ移動した後も見出しは「Product mug」のままです。開発環境では `Product` を指名する `[STRICT_READ_UNTRACKED]` が出力され、これは[リアクティビティのデバッグ](/docs/guides/debugging-reactivity.md#is-the-read-inside-a-tracking-scope)で扱っています。
これは Solid のどこでも同じルールです。値を使う場所で読み取れば、コンポーネントを再実行する必要はありません。
詳しい説明は[リアクティビティ](/docs/concepts/reactivity.md)のページにあります。

## ページのデータを読み込む

ルートのデータも、Solid の他の非同期値と同じパターンに従います。
`query` でキャッシュされる読み取りを宣言し、ルートの `preload` で起動してナビゲーション開始と同時に動かし、コンポーネントではメモ経由で読み取ります：

```ts
// src/data/products.ts
import { query } from "@solidjs/router";

export const getProduct = query(async (id: string) => {
	const response = await fetch(`/api/products/${id}`);
	return (await response.json()) as { name: string; price: number };
}, "product");
```

```tsx
// src/router.ts
import { lazy } from "solid-js";
import { createRouter } from "@solidjs/router";
import { getProduct } from "./data/products";

export const Router = createRouter({
	routes: [
		{ path: "/", component: lazy(() => import("./pages/Home")) },
		{
			path: "/products/:id",
			component: lazy(() => import("./pages/Product")),
			preload: ({ params }) => void getProduct(params.id),
		},
		{ path: "*404", component: lazy(() => import("./pages/NotFound")) },
	],
});

export const { paths } = Router;
```

```tsx
// src/pages/Product.tsx
import { createMemo } from "solid-js";
import type { RouteProps } from "@solidjs/router";
import { getProduct } from "../data/products";
import type { Router } from "../router";

export default function Product(
	props: RouteProps<typeof Router.paths.products>
) {
	const product = createMemo(() => getProduct(props.params.id));
	return (
		<>
			<h1>{product().name}</h1>
			<p>${product().price}</p>
		</>
	);
}
```

**Featured** にホバーしてネットワークタブを見てみましょう。商品のリクエストはクリックの前に始まります。
クリックすると、データがすでにある状態でページがレンダーされます。

`query` はキーと引数でキャッシュするので、preload とメモは1つのリクエストを共有します。
Promise が保留中の間メモも保留中であり、ユーザーに何を見せるかは `App` の `Loading` バウンダリが決めます。
後述のファイルシステムアダプターでは、同じ `preload` はルートモジュールの `route` エクスポートに移ります。

`fullstack` プロジェクトでは `query` の中の関数は通常[サーバー関数](/docs/building-apps/server-functions/index.md)なので、上の fetch はブラウザに送られない直接のデータベース呼び出しになります。

## ファイルシステムアダプターの位置づけ

CLI テンプレートはルートツリーを手で書きません。
`filesystem-routing` が `src/routes` をスキャンし、`@solidjs/router/fs` がそのマニフェストを上で示したのと同じルートオブジェクトに変換します：

```ts
// src/router.ts
import { pageRoutes } from "virtual:file-routes";
import { createRouter } from "@solidjs/router";
import { fileRoutes } from "@solidjs/router/fs";

export const Router = createRouter({ routes: fileRoutes(pageRoutes) });

export const { paths } = Router;
```

`src/routes/products/[id].tsx` は `/products/:id` に、`src/routes/[...404].tsx` はキャッチオールになり、`products/` ディレクトリの隣にある `products.tsx` はその内側すべてのレイアウトになります。
これらのページにある他の内容はすべてそのまま適用されます。アダプターが生成するのはルートオブジェクトだけです。
`preload` やその他のルートフィールドをルートファイルのどこに書くかは、[ファイルシステムマニフェストの変換](/docs/routing/solid-router/route-definitions.md#convert-a-file-system-manifest)を参照してください。

:::deep-dive[パッケージの各エントリーの役割]
`@solidjs/router` にはルーターファクトリー、ルートとナビゲーションのプリミティブ、履歴アダプター、クエリ、アクションが含まれ、ほとんどのアプリケーションがインポートするのはこのエントリーだけです。
`@solidjs/router/fs` は `file-routes` マニフェストをルート定義に変換します。
`@solidjs/router/server` はサーバー関数ハンドラー向けのシングルフライトのデータコレクターを提供し、[サーバーレンダリングとハイドレーション](/docs/routing/solid-router/server-rendering.md)のページでそのセットアップを行います。
3つすべてのシグネチャとオプションの詳細は [Solid Router API リファレンス](/docs/reference/solid-router/index.md)にあります。
:::

## まとめ

- ルーターは `createRouter` でモジュールスコープに一度だけ作り、`Router` と `paths` を `src/router.ts` からエクスポートします。
- URL はすべて `paths` で組み立てましょう。ルートが移動しても、デッドリンクではなくコンパイルエラーになります。
- アプリの外枠は `<Router>` の関数の子要素に置き、`Loading` バウンダリの内側で `props.children` を通してページをレンダーします。
- リンクは素の `<a>` 要素で書きます。内部の同一オリジンのアンカーはルーターが処理します。
- `props.params` はコンポーネント本体で一度だけ読むのではなく、JSX やメモの中で読み取ります。
- 非同期の読み取りは `query` でラップし、ルートの `preload` で開始して、ページではメモ経由で読み取ります。
- ファイルシステムアダプターでも手書きの配列でも構いません。ルートオブジェクトも各ページもどちらでも同じです。

## 次のステップ

Solid Router が初めてならこの順で読み進め、必要なものがあればそこへ直接進んでください：

1. [セットアップ](/docs/routing/solid-router/setup.md)：ルーターをまだ持たないプロジェクトへの追加と、`base`・履歴・プリロードのオプション。
2. [ルート定義](/docs/routing/solid-router/route-definitions.md)：パスパターン、パラメータフィルター、ルートのメタデータ、遅延サブツリー、ファイルシステムマニフェスト。
3. [ネストされたルートとレイアウト](/docs/routing/solid-router/nested-routes.md)：ページが切り替わってもマウントされたままになる独自フレームを持つアカウントセクション。
4. [ナビゲーションと型付きパス](/docs/routing/solid-router/navigation.md)：`paths`、`useNavigate`、スキーマ付き検索パラメータ、アクティブ・保留中リンク、離脱ガード。
5. [データ読み込みとミューテーション](/docs/routing/solid-router/data.md)：`preload`、`query`、`action`、楽観的更新、ミューテーション後の再検証。
6. [サーバーレンダリングとハイドレーション](/docs/routing/solid-router/server-rendering.md)：アプリをサーバーでレンダーするときにサーバーが追加するものと、ミューテーションが1回の往復で新しいデータを返す仕組み。
