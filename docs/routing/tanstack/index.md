---
title: "TanStack Router"
version: "2.0"
description: "fullstack-tanstack プロジェクトシェイプと同様に、Solid のサーバー関数・ストリーミング SSR・シングルフライトミューテーションを TanStack Router と TanStack Query と組み合わせて使います。"
---

すでに TanStack Query を使って開発している、あるいは別フレームワークの TanStack アプリとルートの規約を共有している、という状況で、それを手放さずに Solid のサーバー関数・ストリーミング SSR・シングルフライトミューテーションを使いたい場合の話です。
`fullstack-tanstack` プロジェクトシェイプはその組み合わせです。クライアント側半分を入れ替えた `fullstack` シェイプになっています。

[TanStack Router](https://tanstack.com/router) がルーティングを担当し、[TanStack Query](https://tanstack.com/query) がデータキャッシュを担当します。一方、Solid のサーバー関数、ストリーミング SSR、シングルフライトミューテーション、セッション、API ルートはそのまま動作します。
サーバー側では、どのルーターがレンダリングしているかを気にする箇所はありません。

このページでは、このテンプレートの中で 3 つがどう組み合わさっているかを説明します。設計を意識しながらソースを読み、安心して変更できるようになるのが目的です。
ルーター自体の API、ルートファイル、`<Link>`、ローダー、検索パラメータなどについては [TanStack Router のドキュメント](https://tanstack.com/router/latest/docs/framework/solid/overview)を参照してください。Solid の下でもそこに書かれている内容は変わりません。

:::note[まだルーターを選んでいない場合]
[ルーターを選ぶ](/docs/routing/overview.md#pick-a-router) でこのシェイプと Solid Router を比較しています。
要約すると、TanStack Query や TanStack の規約を共有したいならこちらを選びます。そうでなければ、他のテンプレートと共通のファイルシステム規約と、JavaScript なしで動作するフォームを備えた Solid Router が適しています。
:::

## それぞれの担当範囲

- Solid と Vite プラグインが担当するのは、RPC（型付きフェッチにコンパイルされる `"use server"` 関数）、シングルフライトのエンベロープ、シリアライズ、生成されるエントリー、`src/Document.tsx`、セッション、型付き環境変数です。
- TanStack Router がルーティングを担当します。`src/routes` 配下のファイルベースのツリー（`src/routeTree.gen.ts` に生成される）、ナビゲーション、インテントプリロード、ルート単位のコード分割です。
- TanStack Query がクライアントのデータキャッシュを担当します。ローダーがそこにプリフェッチし、コンポーネントが `useQuery` でそこから読み取り、サーバーが返すものはすべてそこに入ります。

シングルフライトは公開されている拡張ポイントだけを通じて、この 3 つすべてを横断します。
どのパッケージも他のパッケージにパッチを当てたりラップしたりしていません。

## ページの構造

テンプレートにあるユーザー詳細ルートを抜粋したものです:

```tsx
// src/routes/users.$id.tsx
import { useMutation, useQuery } from "@tanstack/solid-query";
import { createFileRoute } from "@tanstack/solid-router";
import { isPending } from "solid-js";
import { prefetch, userQuery } from "../lib/queries";
import { renameUser } from "../lib/users";

export const Route = createFileRoute("/users/$id")({
	loader: ({ context, params }) => {
		prefetch(context.queryClient, userQuery(params.id));
	},
	component: UserPage,
});

function UserPage() {
	const params = Route.useParams();
	const user = useQuery(() => userQuery(params().id));
	const rename = useMutation(() => ({
		mutationFn: (input: { id: string; name: string }) => renameUser(input),
	}));

	return (
		<section style={{ opacity: isPending(() => user.data) ? 0.5 : 1 }}>
			<h2>{user.data.name}</h2>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					const name = new FormData(event.currentTarget).get("name");
					rename.mutate({ id: params().id, name: String(name) });
				}}
			>
				<input name="name" value={user.data.name} required />
				<button type="submit" disabled={rename.isPending}>
					Rename
				</button>
			</form>
		</section>
	);
}
```

`/users/1` を開き、新しい名前を入力して **Rename** をクリックすると、見出しが更新され、再フェッチの間セクションが一瞬薄くなり、親レイアウトのユーザー一覧にも新しい名前が表示されます。
このファイルには、TanStack のデフォルトから意図的に外れている点が 3 つあります。

ローダーは関門ではなくヒントです。
`prefetch` は `void queryClient.prefetchQuery(...)` です。
ナビゲーションは即座に確定し、コンポーネントは `user.data` でデータを受け取ります。そのデータはクエリが確定するまで、最も近い `Loading` バウンダリにサスペンドします。
サーバー側では、これによって各バウンダリが自分のクエリの終了に合わせてストリーミングでき、最も遅いクエリを待ってレスポンス全体を保留せずに済みます。

読み取りは Solid の非同期モデルを通ります。
`user.data.name` は `isLoading` ガードなしで直接読み取られ、再フェッチ中は `isPending(() => user.data)` がセクションを薄くします。
これらは Solid の他の部分と同じプリミティブです。[非同期リアクティビティ](/docs/concepts/async-reactivity.md) で説明しています。

`invalidateQueries` はありません。
`rename.mutate` が確定した時点で、キャッシュにはすでに名前変更後のユーザーと親の一覧が入っています。
これがシングルフライトです。後述します。

## 読み取り: `GET` サーバー関数を `queryOptions` で包む

すべての読み取りは `src/lib/queries.ts` で一度だけ宣言されます。形式は、サーバー関数を包んだ TanStack の `queryOptions` です:

```ts
// src/lib/queries.ts
import { queryOptions } from "@tanstack/solid-query";
import { getUser, getUsers } from "./users";

export const usersQuery = () =>
	queryOptions({ queryKey: ["users"], queryFn: () => getUsers() });

export const userQuery = (id: string) =>
	queryOptions({ queryKey: ["users", id], queryFn: () => getUser(id) });
```

```ts
// src/lib/users.ts
import { GET } from "@solidjs/web/server-functions";

export const getUser = GET(async (id: string) => {
	"use server";
	return findUser(id);
});
```

ローダー、コンポーネント、シングルフライトコレクターのすべてが同じオプションを使うので、キーの指定は 1 箇所にまとまります。

`GET` ラッパーは、`query` が自動で適用してくれる Solid Router テンプレートよりも、ここでは重要です:

```ts
// Avoid: a bare server function is a POST, and every POST carries the single-flight header
export async function getUser(id: string) {
	"use server";
	return findUser(id);
}

// Prefer: declare the read as a GET
export const getUser = GET(async (id: string) => {
	"use server";
	return findUser(id);
});
```

`Avoid` 側の書き方では、マウントされたシングルフライトコンシューマーが `GET` 以外のすべての呼び出しにヘッダーを付けるため、各 `useQuery` フェッチはサーバーにページのローダーの再実行を要求し、それらが確定するまでレスポンスを保留させます。
`GET` とマークされた読み取りはそのヘッダーをスキップし、おまけにキャッシュ可能な HTTP セマンティクスも得られます。

:::caution[staleTime は 0 より大きく保つ]
共有の `QueryClient` には `staleTime: 30_000` が設定されています。
サーバーがレンダリング済みのデータやミューテーションが更新したデータは fresh として扱われます。これがないと、マウントされる `useQuery` がすべて到着時に再フェッチし、ハイドレーションとシングルフライトの両方を台無しにします。
:::

## ミューテーション: `useMutation` 経由のサーバー関数

ミューテーションは、`useMutation` を通じて呼び出される普通のサーバー関数です:

```ts
// src/lib/users.ts
import { reload } from "@solidjs/web";

export async function renameUser(input: { id: string; name: string }) {
	"use server";
	if (!(await getSession())?.userId) throw new Error("Sign in to rename users");
	updateUser(input.id, { name: input.name });
	return reload({ revalidate: "users" });
}
```

上のルートのように、呼び出しはアロー関数で包んでください。
`useMutation` は `mutationFn(variables, context)` を呼び出し、サーバー関数は受け取った引数をすべて RPC に転送します。アロー関数で包むことで、context オブジェクトが通信上に載るのを防げます。

`reload({ revalidate: "users" })` は、ミューテーションが何を変更したかを宣言します。
テンプレートはこの宣言を使ってシングルフライトの収集範囲を絞り込みます。何も返さないミューテーションは範囲指定なしの動作になり、ページのローダーを再実行してその結果をすべて送信します。

ここでのフォームはスクリプト駆動（`onSubmit` が `mutate` を呼ぶ）で、TanStack で一般的な形です。
JavaScript なしで動作する必要があるフォームには、`fullstack` シェイプの Solid Router アクションがサポートされた手段です。[プログレッシブエンハンスメント](/docs/building-apps/server-functions/progressive-enhancement.md) では、ルーターに関係なくサーバー関数ランタイムがスクリプトなしの `POST` に対して何を行うかを説明しています。

## リクエストごとにサーバーが行うこと

プラグインの `start.setup` フックが、Solid 管理外のルーターがストリーミング SSR を駆動できるようにする接合部です。
`src/setup.tsx` は SSR リクエストごとに実行されます:

```tsx
// src/setup.tsx (trimmed)
export default async function setup(
	event: RequestEvent & { response: ResponseStub }
) {
	const url = new URL(event.request.url);
	const queryClient = createQueryClient();
	const router = createAppRouter(
		queryClient,
		createMemoryHistory({ initialEntries: [url.pathname + url.search] })
	);

	await router.load();

	const result = router._serverResult;
	if (result?.type === "redirect") {
		result.redirect.headers.forEach((value, key) =>
			event.response.headers.set(key, value)
		);
		event.response.status = result.redirect.status;
		return () => null;
	}
	if (result) event.response.status = result.status;

	return () => (
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	);
}
```

上から順に見ていきます:

1. リクエストごとに新しい `QueryClient` とルーターが作られるため、あるユーザーのデータが別のユーザーのページにレンダリングされることはありません。
2. `router.load()` が URL をマッチさせ、ローダーのプリフェッチを開始します。プリフェッチの実行中にレンダリングが始まります。
3. `beforeLoad` やローダーでスローされた `redirect()` は、サーバー上ではスローされず `router._serverResult` に入ります。
   setup はそのステータスと `Location` をレスポンスにコピーするので、ブラウザは空のボディを持つ `200` ではなく、本物の `30x` を受け取ります。
   NotFound やエラーになったロードも同じ方法で `404` と `500` を設定します。
4. 返されたコンポーネントは `Document` 内で `App` の位置にレンダリングされます。

クライアントへの引き継ぎはプロバイダーが担います。
`QueryClientProvider` は各クエリが確定するたびにその dehydrate されたエントリーを Solid のハイドレーションレジストリへストリーミングし、クライアント側のプロバイダーは届いたエントリーからキャッシュを初期化します。
`RouterProvider` もマッチ状態について同じことを行うので、クライアントの `createRouter` はハイドレーション前にサーバーのマッチを確定できます。起動時の `router.load()` は不要で、ローダーの再実行もなく、各ルートの遅延チャンクはサーバーがレンダリングしたバウンダリの下で解決されます。
インラインの `window.__QUERY_STATE__` や `window.$_TSR` スクリプトは存在しません。

クライアント側のエントリーは同じツリー構成を反映しますが、`QueryClient` はセッションを通じて 1 つです:

```tsx
// src/App.tsx (trimmed)
const queryClient = createQueryClient();
const router = createAppRouter(queryClient);

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	);
}
```

## Solid 管理外のルーターでのシングルフライト

ネットワークタブを開いた状態でユーザー名を変更してみてください。
`POST /_server` が 1 回だけ発行され、その 1 つのレスポンスから詳細の見出しと親レイアウトのユーザー一覧の両方が更新されます。

クライアント側は TanStack Query 自身の仕組みです。`QueryClientProvider` はマウントされている間、名前付きフライトデータソース（`"sq"`）を購読し、その名前で返ってきたペイロードからキャッシュをハイドレートします。
この購読がそのままオプトインにもなっています。プロバイダーがマウントされている間、ミューテーション呼び出しにはシングルフライトヘッダーが付きます。

サーバー側は `src/server-config.ts` で、`vite.config.ts` の `serverFunctions.configure` を通じて、どのサーバー関数がディスパッチされるよりも先に読み込まれます:

```ts
// src/server-config.ts (trimmed)
import { registerFlightDataSource } from "@solidjs/web/server-functions/server";
import { FLIGHT_DATA_SOURCE, dehydrateSettled } from "@tanstack/solid-query";
import { loadFlightTarget } from "@tanstack/solid-router/ssr/server";

registerFlightDataSource(FLIGHT_DATA_SOURCE, (event, outcome) => {
	const queryClient = createQueryClient();
	return loadFlightTarget({
		router: createAppRouter(queryClient),
		event,
		outcome,
		async collect() {
			const state = await dehydrateSettled(queryClient);
			return state.queries.length > 0 ? state : undefined;
		},
	});
});
```

`loadFlightTarget` は、ミューテーション後にブラウザが表示するページ用のルーターを構築し（ミューテーションの cookie による変更はすでに反映済み）、新しい `QueryClient` に向けてローダーを実行します。
`dehydrateSettled` はそれらのプリフェッチを待ち、dehydrate されたキャッシュを返します。これがペイロードになります。
ペイロードは dehydrate された `QueryClient` なので、それを消費するのは TanStack 自身の `hydrate` です。

テンプレートは `src/lib/flight.ts` でさらに一歩進んでいます。ミューテーションのリクエストにはクライアントがすでにキャッシュしている内容の一覧が載り、コレクターはミューテーションの `revalidate` キーが指定しなかったものの再計算をスキップします。
これは同じ接合部の上でのユーザーランドの組み合わせであり、テンプレート内のコメントがその仕組みを説明しています。
これを取り除いても、基本プロトコルはそのまま動作します。

## 変わらない部分

セッション、型付き環境変数、API ルート、デプロイは `fullstack` シェイプのものがそのままです。
唯一の調整は API ルートの置き場所です。`src/routes` は TanStack Router のものなので、代わりに `fileRoutes` プラグインが `src/api` をスキャンして `/api` 配下にマウントします。

## 知っておくべき制限

- `start.setup` が実行されるのは、プラグインが生成したサーバーエントリーを使い、かつ `ssr` がオンの場合だけです。
  自作のサーバーエントリーでは、ルーターの準備とレンダリングを自分で行う必要があります。
- TanStack 自身の SSR プロトコル（`RouterServer`、`RouterClient`、`$_TSR` ストリームハンドラー）は HTML ストリームを自分で所有することを前提としており、start モードではプラグインがそれを所有します。
  このテンプレートはそのプロトコルを使いません。上で説明したハイドレーションレジストリ経由の転送が、この構成におけるネイティブな経路です。
- `src/router.tsx` の `disableGlobalCatchBoundary: true` は回避策ではなく設計上の選択です。
  SSR 中の `redirect()` を含むエラーは、ルーターの `ErrorComponent` で止まらず、ルーターを通り越してアプリ自身の [バウンダリ](/docs/concepts/boundaries.md) とストリームハンドラーまでバブルアップします。
  ルートレベルの `errorComponent` と `pendingComponent` は引き続き機能します。

## まとめ

- すべての読み取りは `GET` サーバー関数を包む `queryOptions` として一度だけ宣言し、ローダー・コンポーネント・コレクターが同じ 1 箇所で各キーを指定するようにします。
- ローダーはプリフェッチとして扱います。Promise を `void` にして、コンポーネントを最も近い `Loading` バウンダリにサスペンドさせます。
- `query.data` は直接読み取り、再フェッチ状態には `isPending` を使います。`isLoading` ガードは不要です。
- ミューテーションはサーバー関数をアロー関数で包んで `useMutation` 経由で呼び出し、`reload({ revalidate })` を返してシングルフライトが収集する範囲を指定します。
- `staleTime` を 0 より大きく保ち、ハイドレーション済みデータとシングルフライトのデータが fresh として扱われるようにします。
- `start.setup` でリクエストごとに新しいルーターと `QueryClient` を構築し、`router._serverResult` のリダイレクトやステータスをレスポンスにコピーします。
- `disableGlobalCatchBoundary: true` はそのままにして、SSR 中にエラーやリダイレクトがアプリ自身のバウンダリに届くようにします。

## 次のステップ

- [サーバー関数](/docs/building-apps/server-functions/index.md): `queryOptions` と `useMutation` に包まれた読み取りとミューテーション、`GET` が重要な理由を含みます。
- [ルーターを統合する](/docs/routing/integrate-a-router.md): このテンプレートの基盤である `start.setup` とフライトデータのフック。別のルーターにこのパターンを適用する際に参照してください。
- [レンダリングモードを選ぶ](/docs/guides/choose-a-rendering-mode.md): `ssr: false` の構成、つまり静的シェルと API サーバーの組み合わせはこのシェイプでも使えます。
- [ミドルウェアと API ルート](/docs/building-apps/middleware-and-api-routes.md): `src/api` のハンドラーと、このシェイプで `src/routes` の外に置く理由。
