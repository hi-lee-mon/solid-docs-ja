---
title: "ネストされたルートとレイアウト"
version: "2.0"
description: "ページ群を共有レイアウトで包み、ページが変わってもマウントを維持し、ツリーの下へパラメータを共有し、ウォーターフォールなしで各レベルでデータをロードします。"
---

ほとんどのアプリにはセクションがあります。独自のサイドバーを持つアカウント領域、サインインチェックの背後にある管理領域、フィルターバーのある商品カタログです。
ネストされたルートを使うと、セクションのフレームを一度書くだけで、その中のページを入れ替えられます。

このページでは[Solid Router 概要](/routing/solid-router)のストアにアカウントセクションを追加します。

## レイアウトとそのページ

`children` を持つルートは、マッチした子をそのコンポーネントで包んでレンダーします。
子は `props.children` として届きます。あらゆる Solid コンポーネントが children を受け取るのと同じ仕組みです:

```tsx
// src/router.ts
export const Router = createRouter({
	routes: [
		{ path: "/", component: Home },
		{ path: "/sign-in", component: SignIn },
		{
			path: "/account",
			component: AccountLayout,
			children: [
				{ path: "/", component: Profile },
				{ path: "/orders", component: Orders },
				{ path: "/orders/:id", component: Order },
			],
		},
		{ path: "*404", component: NotFound },
	],
});
```

```tsx
// src/pages/account/AccountLayout.tsx
import type { RouteProps } from "@solidjs/router";
import { paths } from "../../router";

export default function AccountLayout(props: RouteProps<typeof paths.account>) {
	return (
		<div class="account">
			<nav>
				<a href={paths.account}>Profile</a>
				<a href={paths.account.orders}>Orders</a>
			</nav>
			<section>{props.children}</section>
		</div>
	);
}
```

`/account/orders` にアクセスすると、ページはアカウントの `<nav>` と、その下の `<section>` に注文一覧を表示します。
子のパスは親に対して相対的です。`/account` は `AccountLayout` の内側に `Profile` をレンダーし、`/account/orders/42` は `AccountLayout` の内側に `Order` をレンダーします。
`paths` も同じネストに従うため、`paths.account.orders(42)` は `/account/orders/42` です。

マッチのすべてのレベルは同じ4つの props を受け取ります: `params`、`location`、`data`、`children`。
葉のページには `children` がありません。

コンポーネントライブラリの習慣では、フレームを各ページにインポートしてページを包みがちです:

```tsx
// Avoid: each page wraps itself, so every page change builds a new layout
export default function Orders() {
	return (
		<AccountLayout>
			<OrderList />
		</AccountLayout>
	);
}

// Prefer: the layout is a route with children, and the page renders only its own content
export default function Orders() {
	return <OrderList />;
}
```

`Avoid` 版を実行して Profile から Orders へクリックすると、アカウントの `<nav>` は破棄・再構築され、その中の検索ボックスはテキストを失います。どちらも `<AccountLayout>` をレンダーする2つのページは、何も共有しない2つの別レイアウトです。
レイアウトをルートにした場合に代わりに何が起きるかを、次のセクションで説明します。

:::pitfall[children をレンダーしないレイアウト]
`props.children` を省いたレイアウトルートのコンポーネントは、エラーなしに自分のフレームだけをレンダーします:

```tsx
// Avoid: the frame renders, the matched page does not
export default function AccountLayout(props: RouteProps<typeof paths.account>) {
	return (
		<div class="account">
			<nav>…</nav>
			<section />
		</div>
	);
}
```

`<section>` は `/account` 以下のすべての URL で空のままです。
ネストされたページが表示されないときは、他を調べる前にまずレイアウトが `props.children` をレンダーしているか確認してください。
:::

## マウントされ続けるもの

Profile から Orders へクリックして、何が起きるか見てみましょう。
`AccountLayout` は再実行されません。
その `<nav>` は DOM を保ち、その中の検索ボックスはテキストを保ち、その中で作られたシグナルは値を保ちます。
変わるのは `<section>` の中身だけです。

![/account/profile と /account/orders の2つのコンポーネントツリー。Router の関数 child と AccountLayout は両方で同じインスタンスで、ページレベル（Profile から Orders）だけが破棄・生成される。](/images/diagrams/nested-routes-what-stays-mounted.svg)

ルーターは、ルートのコンポーネントを、そのルート定義がマッチの一部である限り生存させます。
変化したレベルだけを生成・破棄します。
その結果は期待どおりです:

- セクションに属する状態はレイアウトに置かれ、ページ遷移を生き残ります。
- ページに属する状態はページに置かれ、ユーザーが離れるとリセットされます。
- `/account/orders/42` から `/account/orders/43` への移動では、ルート定義が変わらないため `Order` もマウントされたままです。`props.params.id` が更新され、それを読むものが追従します。

`<Router>` の関数 child はこれらすべての一段上にあります。
マッチの一部にはならないため、アプリの存続期間中ずっとマウントされたままです。
アプリシェルとアプリ全体のプロバイダーはそこに置き、セクション固有の外枠はレイアウトルートに置きます。

## URL セグメントを持たないレイアウト

フレームがユーザーが訪れる場所でないこともあります。
ページ群を囲むサインインチェックは典型的な例です。
`path` を省略すると、ルートは URL を追加せずにマッチへコンポーネントを追加します:

```tsx
{
	component: RequireSignIn,
	children: [
		{ path: "/account", component: AccountLayout, children: accountRoutes },
		{ path: "/checkout", component: Checkout },
	],
}
```

```tsx
// src/pages/RequireSignIn.tsx
import { Show, createMemo } from "solid-js";
import type { RouteSectionProps } from "@solidjs/router";
import { getSession } from "../data/session";
import { paths } from "../router";

export default function RequireSignIn(props: RouteSectionProps) {
	const session = createMemo(() => getSession());

	return (
		<Show
			when={session().user}
			fallback={<a href={paths["sign-in"]}>Sign in to continue</a>}
		>
			{props.children}
		</Show>
	);
}
```

サインアウトした状態で `/checkout` にアクセスするとページは "Sign in to continue" を表示し、サインインすると同じ URL がチェックアウトを表示します。
`/account` と `/checkout` は URL としてそのままで、`RequireSignIn` が両方の前に立ちます。
パスなしルートには `RouteProps` の手がかりとして渡せる `paths` ノードがないため、そのコンポーネントは型付けされない `RouteSectionProps` を受け取り、その `params` はオープンな `Params` 型です。

パスなしルートは、コンポーネントなしで `preload` だけを持つこともできます。ページ群を何かで包まずに、そのグループのためのリクエストを開始したい場合に使います。

:::caution[クライアントサイドのチェックは認可ではない]
`RequireSignIn` が決めるのは何をレンダーするかであって、リクエストを止めるわけではありません。
`/account` と `/checkout` の背後にあるサーバー関数は、[セッションと認証](/building-apps/sessions-and-auth)が示すように、それ自身でセッションを確認しなければなりません。さもなければ誰でも直接呼び出せます。
[保護されたルート](/guides/protected-routes)はこのチェックを、サーバーとブラウザの両方で実行されるリダイレクトに変え、訪問者を後で元の場所に戻します。
:::

## パラメータは下へ流れる

子は自分のパラメータと、上にあるすべてのパラメータを見られます。
ストアにコレクションを追加します:

```tsx
{
	path: "/collections/:collection",
	component: CollectionLayout,
	children: [
		{ path: "/", component: CollectionHome },
		{ path: "/products/:id", component: CollectionProduct },
	],
}
```

`/collections/mugs/products/blue` では、`CollectionLayout` は `params.collection` を読み、`CollectionProduct` は `params.collection` と `params.id` の両方を読みます。

葉を `paths` 内のパスで型付けすれば、両方の名前がチェックされます:

```tsx
import type { RouteProps } from "@solidjs/router";
import type { Router } from "../../router";

export default function CollectionProduct(
	props: RouteProps<typeof Router.paths.collections.products>
) {
	return (
		<h1>
			{props.params.collection} / {props.params.id}
		</h1>
	);
}
```

ルートコンポーネントの外では、`useParams(Router.paths.collections.products)` が同じ型付きオブジェクトを返します。
`int` のような[マッチフィルター](/routing/solid-router/route-definitions#filter-parameters)が `paths` の受け付けるものを変えても、実行時のパラメータは常に文字列です。

## 各レベルでデータをロードする

各レベルは独自の `preload` を持て、ルーターはマッチが作られた時点ですべてを開始します。
子のプリロードは親を待ちません:

```tsx
{
	path: "/collections/:collection",
	preload: ({ params }) => void getCollection(params.collection),
	component: CollectionLayout,
	children: [
		{
			path: "/products/:id",
			preload: ({ params }) => void getProduct(params.id),
			component: CollectionProduct,
		},
	],
}
```

`/collections/mugs/products/blue` へのナビゲーションは両方のリクエストを一度に送ります。
その後、各コンポーネントは[データロードとミューテーション](/routing/solid-router/data)ページと同様にメモ経由で自分のクエリを読み、その上の `Loading` バウンダリが保留中に何を表示するかを決めます。
並列で開始することこそが、コレクションが届いてから `CollectionLayout` の中で商品をフェッチする（ウォーターフォールになる）のではなく、プリロードをネストする理由です。
一般的な原理は[非同期リアクティビティ](/concepts/async-reactivity#nesting-is-not-a-waterfall)で説明しています。

配下のすべてのページが必要とするデータをレイアウトが持つ場合、レイアウトでロードしてコンテキスト経由で渡します:

```tsx
// src/pages/collections/CollectionLayout.tsx
import { createContext, createMemo, useContext } from "solid-js";
import type { RouteProps } from "@solidjs/router";
import type { Router } from "../../router";
import { getCollection, type Collection } from "../../data/collections";

const CollectionContext = createContext<() => Collection>();
export const useCollection = () => useContext(CollectionContext);

export default function CollectionLayout(
	props: RouteProps<typeof Router.paths.collections>
) {
	const collection = createMemo(() => getCollection(props.params.collection));
	return (
		<CollectionContext value={collection}>
			<h1>{collection().title}</h1>
			{props.children}
		</CollectionContext>
	);
}
```

配下のページは `useCollection()()` を呼ぶだけで、コレクションを自分でフェッチしません。
`getCollection` は `query` なので、呼び出したページも結局キャッシュ済みの結果を得ます。コンテキストはページがパラメータを知らなくて済むようにします。

## セクションを独自のモジュールに分割する

大きなセクションは独自のファイルと独自のチャンクに置けます。
`children` にサンクを渡すと、その配下の URL が最初にマッチまたはプリロードされたときにルーターがサブツリーをロードします:

```tsx
{
	path: "/admin",
	component: AdminLayout,
	children: () => import("./pages/admin/routes"),
}
```

インポートされたモジュールはルート配列を `default` または `routes` としてエクスポートします。
型付き `paths` はインポート越しでも機能するため、`paths.admin.users(7)` はビルド時にチェックされます。
詳細は[ルート定義](/routing/solid-router/route-definitions#load-a-route-subtree-lazily)にあります。

## よくある問題

### ネストされたページが何もレンダーしない

レイアウトが `props.children` をレンダーしていません。
ページを表示したい場所に `{props.children}` を追加します。欠けていてもエラーは出ません。

### ページが変わるたびにレイアウトが再実行される

そのレイアウトは `children` を持つルートではなく、各ページがインポートして自分を包むコンポーネントです。
それぞれが `<AccountLayout>` をレンダーする2つのページは2つの別レイアウトを作ります。
レイアウトをルートツリーに移し、各ページは自分のコンテンツだけをレンダーさせます。

### 2つのセクションが別々のアプリシェルを必要とする

シェルはすべてのルートで共有される `<Router>` の関数 child にあります。
各セクションのレイアウトルートに移します。関数 child は `props.children` だけをレンダーするようになります。

### パスなしルートが下位のパラメータを必要とする

それはできません。パラメータは下へ流れ、上には流れません。
`useLocation()` でロケーションを読むか、そのパラメータを持つ子にチェックを移動します。

## まとめ

- セクションのフレームは `children` を持つルートで与えます。フレームはマッチしたページを `props.children` 経由でレンダーします。
- ルートのコンポーネントは、そのルートがマッチの一部である限りマウントされたままです。変化したレベルだけが生成・破棄されます。
- セクションの状態はレイアウトに、ページの状態はページに置きます。前者はページ遷移を生き残り、後者はリセットされます。
- ルートの `path` を省略すると、サインインチェックのようなコンポーネントを URL を追加せずにマッチへ追加できます。
- 子は自分のパラメータと上のすべてのパラメータを読みます。葉を `paths` ノードで型付けすればすべてがチェックされます。
- 各レベルに独自の `preload` を与えます。ルーターはそれらを一緒に開始するため、子は親を待ちません。
- 大きなセクションは `children: () => import(...)` でロードし、型付き `paths` はインポート越しでも機能します。

## 次のステップ

- [ナビゲーションと型付きパス](/routing/solid-router/navigation): 型付き `paths`、アクティブ・保留中リンクのスタイル、`RequireSignIn` のようなセクションのナビゲーションガード。
- [データロードとミューテーション](/routing/solid-router/data): 上のプリロードが開始するものと、レイアウトとそのページ間でキャッシュが結果を共有する仕組み。
- [ルート定義](/routing/solid-router/route-definitions): パスパターン、マッチフィルター、メタデータ、そしてディレクトリから同じネスト構造を生成するファイルシステムアダプター。
