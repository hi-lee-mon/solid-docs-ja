---
title: "Solid Router 0.x/1.x からの移行"
version: "2.0"
description: "JSX ルートと Solid Router 0.x/1.x のデータ API を、Solid Router 2 の createRouter インスタンスへ移行します。"
source_repo: "solidjs/solid-router"
source_ref: "next"
source_path: "README.md"
---

Solid Router 2 では、コンポーネントベースのルーター設定が、1 つの静的なルーターインスタンスに置き換わります。
ルートツリーが、マッチング・パス生成・ルート props・サーバー統合の信頼できる定義源になります。

このガイドは、Router 0.x/1.x のコンポーネント API を使っているアプリケーションを対象にしています。
各セクションは個別に適用し、変更ごとにルートマッチング・ナビゲーション・データ・サーバー動作を確認できるようにしてください。

## 互換性の境界を確認する

Solid ランタイムと Solid Router は同時にアップグレードしてください。
Solid Router 2 には、`solid-js` と `@solidjs/web` の対応する Solid 2 RC ビルドが必要です。
Solid 1 アプリケーションを包む互換レイヤーとしては動作しません。

また、Router 2 はアプリケーションごとに 1 つのルーターインスタンスのみをサポートします。
Router 2 のインスタンスを旧 `<Router>` の内側にマウントしないでください。
ルートツリーは一度に 1 つずつ完全に移し、新しいインスタンスをマウントする前に旧ルーターを取り除いてください。

以下の旧エクスポートには、コンポーネント単位で対応する置き換え先がありません:

- あらかじめ用意されたルーターコンポーネントとしての `Router`、`HashRouter`、`MemoryRouter`
- `Route`
- `A`
- `Navigate`
- `createMemoryHistory`

新しいエントリーポイントは、ファクトリー・ルート定義ヘルパー・素のリンク要素・履歴アダプターです。
インストールとマウントパターンの全体については [Solid Router のセットアップ](/routing/solid-router/setup) を参照してください。

## ルーターインスタンスを作成する

ルート構成を、レンダーされる JSX からモジュールレベルの `createRouter` 呼び出しへ移します。

変更前:

```tsx
import { Route, Router } from "@solidjs/router";

export function App() {
	return (
		<Router root={RootLayout} rootPreload={loadSession}>
			<Route path="/" component={Home} />
			<Route path="/users/:id" component={User} />
			<Route path="*404" component={NotFound} />
		</Router>
	);
}
```

変更後:

```tsx
// src/router.tsx
import { createRouter } from "@solidjs/router";

export const Router = createRouter({
	routes: [
		{ path: "/", component: Home },
		{ path: "/users/:id", component: User },
		{ path: "*404", component: NotFound },
	],
	preload: loadSession,
});

export const { paths } = Router;
```

返されたインスタンスをプロバイダーコンポーネントとしてマウントします。
旧 `root` prop は、プロバイダーの関数 children に置き換えます。
ファクトリーレベルの `preload` の結果は `props.data` として参照できます。

```tsx
// src/index.tsx
import { render } from "@solidjs/web";
import { Router } from "./router";

render(
	() => <Router>{(props) => <RootLayout {...props} />}</Router>,
	document.getElementById("app")!
);
```

インスタンスはモジュールスコープで作成してください。
その `routes`、`config`、`paths`、`match()` メンバーはアプリケーションを記述し、レンダーとサーバーリクエストをまたいで共有されます。
現在のロケーションは、引き続き `useLocation`、`useParams`、`useNavigate` などのプリミティブ経由で読み取ります。

ルート定義が別モジュールにある場合は、配列を `defineRoutes` でラップします。
このヘルパーは、素の取り出し済み配列では `string` に広げられてしまうリテラルなパス型を保持します。

```tsx
// src/routes.tsx
import { defineRoutes } from "@solidjs/router";

export const routes = defineRoutes([
	{ path: "/", component: Home },
	{ path: "/users/:id", component: User },
]);
```

```tsx
// src/router.tsx
import { createRouter } from "@solidjs/router";
import { routes } from "./routes";

export const Router = createRouter({ routes });
```

代替ルーターコンポーネントは履歴アダプターに置き換えます:

```tsx
import { createRouter, hashHistory, memoryHistory } from "@solidjs/router";

const HashRouter = createRouter({
	routes,
	history: hashHistory(),
});

const MemoryRouter = createRouter({
	routes,
	history: memoryHistory("/initial"),
});
```

## ネストとレイアウトを変換する

ネストした `<Route>` 要素は `children` 配列に置き換えます。
親レイアウトにさらに深い子ルートがある場合でも、パス `/` を持つインデックスの子は維持してください。

変更前:

```tsx
function AccountLayout(props) {
	return <section>{props.children}</section>;
}

<Router root={RootLayout}>
	<Route path="/account" component={AccountLayout}>
		<Route path="/" component={Profile} />
		<Route path="/security" component={Security} />
	</Route>
</Router>;
```

変更後:

```tsx
const Router = createRouter({
	routes: [
		{
			path: "/account",
			component: AccountLayout,
			children: [
				{ path: "/", component: Profile },
				{ path: "/security", component: Security },
			],
		},
	],
});

<Router>{(props) => <RootLayout {...props} />}</Router>;
```

親コンポーネントは、引き続き `props.children` を通じてマッチした子をレンダーします。
共有の親レイアウトは、兄弟の子ルート間をナビゲーションしている間もマウントされたままです。

URL セグメントを追加したくないレイアウトには、`path` を持たないルートを使います:

```tsx
const routes = defineRoutes([
	{
		component: AuthenticatedLayout,
		children: [
			{ path: "/dashboard", component: Dashboard },
			{ path: "/settings", component: Settings },
		],
	},
]);
```

旧来のネストした `<Routes>` バウンダリを、ネストしたルーターインスタンスで再現しないでください。
1 つのルートツリーの下で配列を合成するか、コード分割したい区間には遅延 `children` サンクを使います:

```tsx
{
	path: "/admin",
	component: AdminLayout,
	children: () => import("./admin/routes"),
}
```

インポートされるモジュールは、ルート配列を `default` または `routes` としてエクスポートできます。
レイアウトの生存期間と遅延サブツリーの動作については [ネストされたルートとレイアウト](/routing/solid-router/nested-routes) を参照してください。

## リンクとリダイレクトのコンポーネントを置き換える

`<A>` は素の `<a>` に置き換えます。
ルートツリーがリテラル型を持つ場合は、インスタンスの `paths` プロキシを使ってください。

変更前:

```tsx
import { A } from "@solidjs/router";

<nav>
	<A href="/" end activeClass="selected">
		Home
	</A>
	<A href="/users/42" noScroll>
		User
	</A>
</nav>;
```

変更後:

```tsx
import { Router } from "./router";

<nav>
	<a href={Router.paths()}>Home</a>
	<a href={Router.paths.users(42)} noScroll>
		User
	</a>
</nav>;
```

ルーターは、管理対象となったリンク要素に状態属性を付与します:

```css
nav a[data-active] {
	color: var(--accent);
}

nav a[aria-current="page"] {
	font-weight: 600;
}

a[data-pending] {
	opacity: 0.6;
}
```

完全一致または子孫ルートとの一致には `[data-active]` を使います。
完全一致には `[aria-current="page"]` を使います。
ルートパスは完全一致の場合にのみアクティブになります。

旧リンクの props はリンク要素へ移します:

- `noScroll`、`replace`、`state`、`preload` はリンク要素の属性になり、`@solidjs/web` が `<a>` 上に型付けします。
- `activeClass` と `inactiveClass` は、状態属性に対する CSS セレクターになります。
- `end` は `[aria-current="page"]` による完全一致セレクターになります。

アプリケーションロジックによるナビゲーションには、引き続き `useNavigate` を使います。
文字列・履歴の差分・型付きパスノードを受け取れます。

```tsx
const navigate = useNavigate();

navigate(Router.paths.account, { replace: true });
navigate(-1);
```

`<Navigate>` は、セットアップ時の `useNavigate` 呼び出しに置き換えるか、クエリまたはアクションからリダイレクトを返してください。
プロトコル系のレスポンスヘルパーは `@solidjs/web` からインポートします。

```tsx
function LoginRedirect() {
	const navigate = useNavigate();
	navigate("/login", { replace: true });
	return null;
}
```

`useCurrentMatches` は `useRouteMatches` に改名します。
カスタムリンクコンポーネントがリアクティブな `active`、`current`、`pending` の値を必要とする場合は `useLinkState` を使います。
その他のリンク要素とナビゲーションのオプションについては [ナビゲーションと型付きパス](/routing/solid-router/navigation) を参照してください。

## パラメーターと検索値に型を付ける

`useParams()` と型を付けない `useSearchParams()` は、ランタイムの動作が変わりません。
パスパラメーターは文字列のままで、検索値もスキーマがなければ文字列または文字列配列のままです。

Router 2 では、定義駆動の型が追加されました。
コンポーネントや preload をルートと一緒に宣言する場合は `defineRoute` を使います:

```tsx
import { defineRoute } from "@solidjs/router";

const userRoute = defineRoute({
	path: "/users/:id/:tab?",
	preload: ({ params }) => void getUser(params.id),
	component: (props) => <User id={props.params.id} tab={props.params.tab} />,
});
```

この例では、`id` は `string`、`tab` は `string | undefined` です。
親から継承したパラメーターは `string | undefined` として引き続き利用できます。

preload 内の `void` に注目してください。
Router 1.x では `load` の結果をコンポーネントから `createAsync` 経由で読み取ることが多くありました。Router 2 では preload はクエリを開始するだけで、コンポーネントは [非同期ラッパーを置き換える](#replace-async-wrappers) で示すようにメモ経由で同じクエリを読み取ります。
`props.data` は `preload` が返した値を保持しますが、それはルートがマッチした時点で一度だけ取り込まれるため、`params` に依存する Promise には向きません。

コンポーネントが別モジュールで宣言されている場合は、パスウィットネス（path witness）を使います:

```tsx
import type { RouteComponent } from "@solidjs/router";
import type { Router } from "../router";

const User: RouteComponent<typeof Router.paths.users> = (props) => (
	<h1>User {props.params.id}</h1>
);
```

`RouteProps<typeof Router.paths.users>` が対応する props オブジェクトの型を提供します。
同じパスノードを `useParams` に渡すと、子孫コンポーネント内で既知のキーに絞り込めます:

```tsx
const params = useParams(Router.paths.users);
params.id;
```

検索値をパースして型付けするには、同期の [Standard Schema](https://standardschema.dev/) バリデーターを追加します。
スキーマがない場合は、既存の生値を扱うコードをそのまま使います。

```tsx
import * as v from "valibot";

const searchRoute = defineRoute({
	path: "/search",
	search: v.object({
		q: v.optional(v.string(), ""),
		page: v.optional(v.pipe(v.unknown(), v.transform(Number)), 1),
	}),
	component: SearchPage,
});

export const Router = createRouter({
	routes: [searchRoute],
});
```

```tsx
const [search, setSearch] = useSearchParams(Router.paths.search);

search.page;
setSearch({ page: search.page + 1 });

<a href={Router.paths.search({ q: "solid", page: 2 })}>Search</a>;
```

バリデーターの入力型は URL の構築とセッターを制御します。
出力型はパース済みの読み取りを制御します。
非同期の検索値バリデーションはサポートされていません。

## データロードとキャッシュを移行する

ルートの `preload` 関数は、コンポーネント生成前に処理を開始する場所として維持します。
トップレベルの `rootPreload` はファクトリーの `preload` オプションへ移します。
引数には引き続き `params`、`location`、`intent` が含まれます。

すべての旧データ読み取りを preload に移す必要はありません。
preload はナビゲーションとリンクのウォーミングのために処理を開始します。一方、コンポーネントからの読み取りは、値をリアクティブな消費側につなぎ続けます。

### 非同期ラッパーを置き換える

`@solidjs/router` の `createAsync` と `createAsyncStore` を取り除きます。
`query` は Solid 2 の非同期対応プリミティブ経由で読み取ります。

変更前:

```tsx
import { createAsync, query } from "@solidjs/router";

const getUser = query(fetchUser, "users");

function User() {
	const params = useParams();
	const user = createAsync(() => getUser(params.id));

	return <h1>{user()?.name}</h1>;
}
```

変更後:

```tsx
import { createMemo } from "solid-js";
import { query, useParams } from "@solidjs/router";

const getUser = query(fetchUser, "users");

function User() {
	const params = useParams();
	const user = createMemo(() => getUser(params.id));

	return <h1>{user().name}</h1>;
}
```

深くリアクティブなオブジェクトや配列が必要な場合は `createProjection` を使います。
処理中のレンダー状態には `createOptimistic` または `createOptimisticStore` を使います。

非推奨の `cache` エイリアスは `query` に置き換えます。
クエリ名と引数の形はキャッシュキーを構成するため、安定させてください。
すべての引数の組み合わせを再検証するには `.key` を、1 つの組み合わせには `.keyFor(...)` を使います。

```tsx
revalidate(getUser.key);
revalidate(getUser.keyFor("42"));
```

`query` がメソッド宣言のないサーバー関数をラップする場合、サーバー関数トランスポートから GET ラッパーを取得します。
`query` に渡した素の関数は素の関数のままで、そのトランスポートを読み込みも使用もしません。
ルーターはトランスポートのメソッドを識別する必要があるとき、関数の [宣言メタデータ](/reference/solid-web/server-functions/metadata) を読み取ります。

### 保留中サブミッションを置き換える

Router 0.x/1.x のサブミッションは、保留中と完了したアクション呼び出しを表していました。
Router 2 ではこれらの関心事が分離されています:

- 処理中の UI には、アクションの `.onSubmit(...)` と Solid の楽観的プリミティブを使います。
- フォーム単位の保留中スタイルには、フォームの `aria-busy="true"` 状態を使います。
- 確定した結果やエラーには `useSubmissions()` を使います。
- void の結果やリダイレクトを含め、すべての完了を監視する必要がある場合は `.onSettled(...)` を使います。

変更前:

```tsx
const submission = useSubmission(addTodo);

<form action={addTodo} method="post">
	<input name="title" />
	<button disabled={submission.pending}>
		{submission.pending ? "Saving" : "Save"}
	</button>
</form>;
```

変更後:

```tsx
import { For, createOptimisticStore } from "solid-js";
import { action, useSubmissions } from "@solidjs/router";

const addTodo = action(async (form: FormData) => {
	return saveTodo(String(form.get("title") ?? ""));
}, "add-todo");

function Todos() {
	const [todos, setTodos] = createOptimisticStore(
		() => getTodos(),
		[] as Todo[]
	);
	const submissions = useSubmissions(addTodo);
	const latest = () => submissions.at(-1);

	addTodo.onSubmit((form) => {
		setTodos((items) => {
			items.push({
				id: "pending",
				title: String(form.get("title") ?? ""),
				pending: true,
			});
		});
	});

	return (
		<>
			<ul>
				<For each={todos}>
					{(todo) => <li class={{ pending: !!todo.pending }}>{todo.title}</li>}
				</For>
			</ul>
			<form action={addTodo} method="post">
				<input name="title" />
				<button>Save</button>
				<p>{latest()?.error?.message}</p>
			</form>
		</>
	);
}
```

```css
form[aria-busy] button {
	opacity: 0.6;
}
```

かつて `submission.pending` が担っていた 3 つの関心事は分離されました。楽観的ストアが新しい行を表示し、`aria-busy` がフォームを装飾し、`useSubmissions` がエラーを報告します。
`.onSubmit` はアクションのトランザクション内で実行されるため、アクションが確定して `getTodos` が再検証されると、楽観的な追加は自動的に取り消されます。
コンポーネント内で登録すると、そのフックはコンポーネントのライフタイムに紐づきます。

Router 2 は、アクションが結果またはエラーを生成した場合にのみサブミッションを保持します。
void またはメタデータのみの完了も `.onSettled(...)` に到達します。
アクションフォームには `method="post"` を維持し、サーバーレンダーされるクライアントアクションには安定した名前を付けてください。
書き直された [データロードとミューテーション](/routing/solid-router/data#show-what-is-happening) のページでは、この分離を動作する例で順に説明しています。

### レスポンスヘルパーを移す

`redirect`、`reload`、`respond` は `@solidjs/web` からインポートします。
旧ルーターの `json(data, init)` ヘルパーは `respond(data, init)` に置き換えます。

変更前:

```tsx
import { action, json, redirect } from "@solidjs/router";

const save = action(async (form: FormData) => {
	const item = await saveItem(form);
	return json(item, { revalidate: ["items"] });
}, "save-item");
```

変更後:

```tsx
import { action } from "@solidjs/router";
import { redirect, reload, respond } from "@solidjs/web";

const save = action(async (form: FormData) => {
	const item = await saveItem(form);
	return respond(item, { revalidate: ["items"] });
}, "save-item");
```

レスポンスのメタデータは、再検証キーとリダイレクトを運びます。
ルーターはそのメタデータをクエリキャッシュとナビゲーションセッションに適用します。
キャッシュの生存期間・アクションのバインド・リトライ動作については [データロードとミューテーション](/routing/solid-router/data) を参照してください。

## サーバーレンダリングとハイドレーションを移行する

クライアントとサーバーで同じモジュールレベルのルーターインスタンスを使います。
サーバーハーネスが提供する場合、リクエストイベントがサーバー URL を供給します。
`url` prop は、静的生成やテストのようにリクエストイベントを伴わないサーバーレンダーでのみ渡してください。

変更前:

```tsx
import { isServer } from "@solidjs/web";

<Router url={isServer ? request.url : ""}>
	<Route path="/users/:id" component={User} />
</Router>;
```

変更後:

```tsx
import { renderToStream } from "@solidjs/web";
import { Router } from "./router";

const html = await renderToStream(() => <Router url={request.url} />);
```

リクエストイベントは `url` prop より優先されます。
クライアントの履歴アダプターは、サーバーレンダーの URL を選択しません。
マッチしたルートが遅延 `children` バウンダリをまたぐ可能性がある場合は `renderToStream` を使います。

非同期サーバーレンダー中、`query` はキー付きの結果を Solid のハイドレーションレジストリに書き込みます。
クエリ名とシリアライズされた引数が一致すれば、クライアントはサーバーの結果を引き継ぎます。
サーバーとクライアント間で両方の値を安定させてください。

遅延ルートモジュールがあとから最初のクエリ読み取りを行えるよう、グローバルハイドレーション完了後もハイドレーションの引き継ぎは有効です。
クライアントがそのエントリーを引き継げるのは、ページペイロードが 3 分のクエリ保持上限より新しい間だけです。
その上限を超えたあとの最初の読み取りでは、代わりに現在のデータをフェッチします。

オプションのシングルフライトミューテーションコレクターは、同じルーターインスタンスから設定します:

```tsx
// src/server-config.ts
import { createFlightDataCollector } from "@solidjs/router/server";
import { configureServerFunctionsServer } from "@solidjs/web/server-functions/server";
import { Router } from "./router";

configureServerFunctionsServer({
	collectFlightData: createFlightDataCollector(Router),
});
```

最初のサーバー関数リクエストがディスパッチされる前に、この設定を読み込んでください。
`@solidjs/vite-plugin` を使う場合は、`serverFunctions.configure` にサーバー専用モジュールを指定します:

```tsx
// vite.config.ts
import solid from "@solidjs/vite-plugin";

export default {
	plugins: [
		solid({
			serverFunctions: {
				configure: "./src/server-config.ts",
			},
		}),
	],
};
```

ルーターはデフォルトでシングルフライトミューテーションデータを購読します。
アプリケーションが購読してはいけない場合は、`createRouter` に `singleFlight: false` を設定します。
消費側がなければ、トランスポートはそのミューテーションのルートデータ収集を要求しません。

サーバー関数のアクションフォームは、JavaScript なしの POST とリダイレクト経路を維持します。
コアランタイムはスクリプトなしのリクエストを検出し、リダイレクトで戻り、結果をワンショットのフラッシュ Cookie に保存します。
ルーターはリダイレクト後のサーバーレンダーでその結果を読み取ります。
カスタムハンドラーの配線については [サーバーレンダリングとハイドレーション](/routing/solid-router/server-rendering) を参照してください。

## ファイルシステムルーティングを移行する

コンポーネント風の `<FileRoutes />` の結果を、ネストした `pageRoutes` マニフェストに対する `fileRoutes` アダプターに置き換えます。

変更前:

```tsx
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";

<Router root={App}>
	<FileRoutes />
</Router>;
```

変更後:

```tsx
import { pageRoutes } from "virtual:file-routes";
import { createRouter } from "@solidjs/router";
import { fileRoutes } from "@solidjs/router/fs";

export const Router = createRouter({
	routes: fileRoutes(pageRoutes),
});
```

各ルートモジュールはコンポーネントをデフォルトエクスポートします。
ルートオプションは名前付き `route` エクスポートへ移します:

```tsx
// routes/blog/[id].tsx
import { createMemo } from "solid-js";
import { int, type RouteProps } from "@solidjs/router";
import { defineFileRoute } from "@solidjs/router/fs";
import { getPost } from "../../data/posts";

export const route = defineFileRoute("/blog/:id", {
	matchFilters: { id: int },
	preload: ({ params }) => void getPost(params.id),
});

export default function Post(props: RouteProps<typeof route>) {
	const post = createMemo(() => getPost(props.params.id));
	return <h1>{post().title}</h1>;
}
```

`defineFileRoute` に渡す文字列は TypeScript のウィットネスです。
マニフェストのパスが、ランタイムの信頼できる定義源であり続けます。
リテラルなマニフェスト型を生成して、ファイルパス・フィルター・検索スキーマを `Router.paths` に引き継がせます。

コード分割されたマニフェストのコンポーネント参照は、Solid の `lazy` コンポーネントになります。
マニフェストが `codeSplitting: false` で配信される場合、アダプターは `lazy` ラッパーを付けずに通常のコンポーネントをそのまま渡します。

アダプターの契約については [ファイルシステムルートの変換](/routing/solid-router/route-definitions#convert-a-file-system-manifest) を参照してください。

## 旧来の TypeScript ワークアラウンドを取り除く

リテラルなパスを消してしまう広すぎるルート配列の型注釈を取り除きます。
代わりにインライン配列、`defineRoutes`、または `as const` を使います。

変更前:

```tsx
const routes: RouteDefinition[] = [{ path: "/users/:id", component: User }];
```

変更後:

```tsx
const routes = defineRoutes([
	defineRoute({
		path: "/users/:id",
		preload: ({ params }) => void getUser(params.id),
		component: User,
	}),
]);
```

得られた型は次の境界で使います:

- `Router.paths` で、パラメーターが検査されたルート URL を構築します。
- `defineRoute` で、ローカルのコンポーネントと preload のパラメーターに型を付けます。
- 外部のコンポーネントには、パスウィットネスとともに `RouteProps` または `RouteComponent` を使います。
- ファイルシステムのルートモジュールには `defineFileRoute` を使います。
- ルートの `search` スキーマで、検索ビルダー・セッター・パース済み読み取りに型を付けます。

型付きマッチフィルターは、`Router.paths` が受け取る値を絞り込めます。
組み込みの `int` フィルターはパスビルダーのパラメーターを `number` にしますが、コンポーネントが受け取る URL パラメーターは引き続き文字列です。

完全なシグネチャーは [ルーターファクトリーのリファレンス](/reference/solid-router/router-factory) と [ルート型のリファレンス](/reference/solid-router/types) を参照してください。

## 削除チェックリスト

- [ ] `solid-js`、`@solidjs/web`、`@solidjs/router` を互換性のある Solid 2 バージョンにアップグレードする。
- [ ] `createRouter` でモジュールレベルのルーターを 1 つ作成する。
- [ ] すべての JSX `<Route>` 定義をルートオブジェクトに置き換える。
- [ ] `root` をプロバイダーの関数 children に、`rootPreload` をファクトリーの `preload` に移す。
- [ ] ネストしたルートを `children` 配列に変換し、レイアウトが `props.children` をレンダーする状態を維持する。
- [ ] `Router`、`HashRouter`、`MemoryRouter` コンポーネントを `createRouter` と履歴アダプターに置き換える。
- [ ] `<A>` を `<a>` に置き換え、アクティブ時のスタイルを状態属性セレクターに移す。
- [ ] `<Navigate>` を置き換え、`useCurrentMatches` を改名する。
- [ ] `cache` を `query` に置き換える。
- [ ] `createAsync`、`createAsyncStore`、`useSubmission` を取り除く。
- [ ] 保留中 UI を楽観的プリミティブまたはフォームの `aria-busy` に移す。
- [ ] `redirect`、`reload`、`respond` を `@solidjs/web` からインポートする。
- [ ] クエリ名・クエリ引数・サーバーレンダーされるクライアントアクション名を安定させる。
- [ ] サーバーとクライアントで同じルーターインスタンスをレンダーする。
- [ ] アプリケーションがシングルフライトを使う場合、サーバー関数のディスパッチ前にコレクターを登録する。
- [ ] `<FileRoutes />` の出力を `fileRoutes(pageRoutes)` で変換する。
- [ ] 広げられたルート配列の型を `defineRoutes`、`defineRoute`、パスウィットネスに置き換える。
- [ ] `Route`、`A`、`Navigate`、`createAsync`、`createAsyncStore`、`useSubmission`、`cache`、ルーターのレスポンスヘルパーの最後のインポートを取り除く。
