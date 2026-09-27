---
title: "保護されたルート"
version: "2.0"
description: "データ・ルート・リクエストの各レイヤーでアカウント領域にサインイン済みの顧客を要求し、サインアウトした訪問者をサーバーとブラウザーの両方でサインインへリダイレクトさせ、元の行き先へ送り返します。"
---

[ネストされたルートとレイアウト](/docs/routing/solid-router/nested-routes.md)のアカウント領域には `/account`、`/account/orders`、`/account/addresses` の3つのページがあります。
サインアウトした訪問者がそこへ辿り着く経路は3通りです: ブックマークや共有リンク（ページ全体のリクエスト）、ヘッダーの **Account** リンク（クライアントサイドナビゲーション）、そして `getOrders` を直接呼ぶスクリプト（何もレンダーしません）。
どれも最終的に `/sign-in` に到達する必要があり、サインイン後の訪問者はアカウントホームではなく、要求したページに着地すべきです。

[セッションと認証](/docs/building-apps/sessions-and-auth.md)では Cookie、`getSession()`、`event.locals.userId` を設定するミドルウェアを構築しました。
このガイドでは、それらの部品をすべてのレイヤーで成立するガードへ組み立て、アカウント領域を実例として使います。

## 3つのレイヤー、1つの判定

判定は常に同じです: リクエストイベントに `userId` があるかどうか。
その判定をどこで実行するかが、何を保護するかを決めます。

- 各サーバー関数内のチェックはデータを保護します。
  ページレンダー、ルーターナビゲーション、JavaScript なしのフォーム送信、`curl` コマンドのいずれでも実行されます。これらはすべて同じリクエストイベントを経由して関数へ届くためです。
- ルートガード（`preload` とコンポーネントを持つパスなしルート）内のチェックはナビゲーションを保護します。
  セッションが無い場合、アカウントページがレンダーされる前にリダイレクトへ変えます。サーバーでもブラウザーでも同様です。
- ミドルウェア内のチェックはリクエストを保護します。
  `/account/*` へのページ全体リクエストに対し、レンダリングが始まる前にリダイレクトで応答します。

どれか1つだけでは不十分です。
ルートガードだけでは、URL を知っていれば誰でも `getOrders` を呼べたままです。ルートガードは何をレンダーするかを決めるもので、直接の呼び出しを見ることはないためです。
サーバー関数チェックだけではデータは止まりますがそれだけです: ブラウザーでは読み取りがナビゲーションではなくレスポンスオブジェクトを受け取り、ページはデータのないまま残ります。
ミドルウェアだけではクライアントサイドナビゲーションを見られません。ルーター内でのナビゲーションはページリクエストを発行しないためです。

## まずデータを守る

アカウント領域の配下にあるすべてのサーバー関数は、リクエストイベントから識別情報を読み取り、それが無ければ拒否します:

```ts
// src/data/account.ts
import { getRequestEvent, redirect } from "@solidjs/web";
import { query } from "@solidjs/router";
import { paths } from "../router";
import { database } from "../server/database";

export const getCurrentUser = query(async () => {
	"use server";
	const userId = getRequestEvent()?.locals.userId;
	return userId ? database.customers.find(userId) : null;
}, "current-user");

export const getOrders = query(async () => {
	"use server";
	const userId = getRequestEvent()?.locals.userId;
	if (!userId) throw redirect(paths["sign-in"]);
	return database.orders.forCustomer(userId);
}, "orders");
```

セッション Cookie なしで HTTP クライアントから関数の URL へ `getOrders` を呼ぶと、注文データを含まないリダイレクトが返ってきます。
`locals.userId` は[ミドルウェアで一度だけ認証する](/docs/building-apps/sessions-and-auth.md#authenticate-once-in-middleware)の `attachCustomer` ミドルウェアが設定するもので、呼び出し元が渡すことはできません。識別情報が引数ではなくイベントから来るのはこのためです。
チェックそのものは[サーバーで認可する](/docs/building-apps/sessions-and-auth.md#authorize-on-the-server)が扱っています。このページが追加するのは、アカウントページが読み書きするすべての関数にそれを入れるというルールだけです。

`getCurrentUser` はスローせず `null` を返します。サインアウトした訪問者はヘッダーが表示すべき通常の状態だからです。
両方を `query` でラップすると、ヘッダーと下記のルートガードがレンダーごとに1つのリクエストを共有し、[クエリは一度だけレンダーされる](/docs/routing/solid-router/server-rendering.md#queries-render-once)で説明しているように、サーバーレンダーされた結果を2回目のフェッチなしでハイドレートできます。

## パスなしルートでルートをまとめる

3つのアカウントページにはガードが1つあればよいので、ルートツリーにはそれらを所有するルートを1つ置きます。
`path` を付けなければ、そのルートは URL に何も追加せずにマッチだけへ追加されます:

```tsx
// src/router.ts
export const Router = createRouter({
	routes: [
		{ path: "/", component: Home },
		{ path: "/sign-in", component: SignIn },
		{
			preload: ({ location }) =>
				void requireUser(location.pathname + location.search),
			component: RequireUser,
			children: [
				{
					path: "/account",
					component: AccountLayout,
					children: [
						{ path: "/", component: Profile },
						{ path: "/orders", component: Orders },
						{ path: "/addresses", component: Addresses },
					],
				},
			],
		},
		{ path: "*404", component: NotFound },
	],
});
```

```tsx
// src/pages/RequireUser.tsx
import { Show, createMemo } from "solid-js";
import type { RouteSectionProps } from "@solidjs/router";
import { requireUser } from "../data/account";

export default function RequireUser(props: RouteSectionProps) {
	const user = createMemo(() =>
		requireUser(props.location.pathname + props.location.search)
	);

	return <Show when={user()}>{props.children}</Show>;
}
```

`/account/orders` にアクセスすると、マッチはパスなしルート、`/account`、`/orders` の順になり、URL は変わりません。
`RequireUser` は独自のフレームをレンダーせず、チェックがユーザーを得たあとにマッチしたページだけをレンダーします。
`/sign-in` はグループの子ではなく兄弟です。ガードの内側にあるサインインページは自分自身へリダイレクトしてしまいます。

preload とコンポーネントは同じキーを読むため、グループへの進入でリクエストは1回で済みます。
`/account` から `/account/orders` への移動でもパスなしルートはマウントされたままです。これは[URL セグメントを持たないレイアウト](/docs/routing/solid-router/nested-routes.md#layouts-without-a-url-segment)のレイアウトがページ間でマウントされ続けるのと同じ仕組みです。メモは新しいパスで再実行され、キャッシュされた `getCurrentUser` の結果に対して再度チェックします。

## レンダー前にリダイレクトする

`requireUser` は preload が開始し、コンポーネントが読み取るガードです。
これは `query` でラップされたサーバー関数で、セッションにユーザーがいなければリダイレクトをスローします:

```ts
// src/data/account.ts
export const requireUser = query(async (next: string) => {
	"use server";
	const user = await getCurrentUser();
	if (!user) throw redirect(paths["sign-in"]({ next }));
	return user;
}, "require-user");
```

サインアウトした状態でブックマークから `/account/orders` を開くと、ブラウザーは `/sign-in?next=%2Faccount%2Forders` に着地します。
サインアウトした状態でヘッダーの **Account** をクリックしても、アカウントページが先にペイントされることなく URL は同じサインインアドレスになります: `RequireUser` 内のメモが保留中なのでナビゲーションは保留され、何もコミットされる前にリダイレクトが行き先を置き換えます。
サインインすると、ルーターアクションの完了がすべてのキャッシュ済みクエリを無効化するため、アカウント領域への次の訪問ではチェックが再実行されてユーザーが見つかります。

チェックを開始するのは preload です。ルートがマッチした時点、さらに `RequireUser` がまだ存在しないホバー時にも開始されます。ナビゲーションをチェックの回答まで保留するのはメモです。
どちらも同じ関数を呼びます。
どちらの経路でも関数本体はサーバーで実行されます: サーバーレンダリング中はプロセス内で実行され、リクエストの `getCurrentUser` の結果をヘッダーと共有します。ナビゲーション中はサーバー関数エンドポイント経由で実行され、スローされたリダイレクトはレスポンスとしてルーターへ戻ります。

**Account** リンクへのホバーは `"preload"` インテントで preload を実行します。これはリクエストを開始するだけで結果に対して動作しないため、ホバーがリダイレクトすることはありません。続くクリックは、その回答を再利用するか新たにフェッチするかに関わらず、リダイレクトします。

:::deep-dive[スローされたリダイレクトをルーターがどう処理するか]
`query` は、ラップされた関数がスローした値を返された値と同じように扱います。
その値がリダイレクトの `Response` であれば（プロセス内でスローされた場合でも、サーバー関数トランスポート経由で届いた場合でも）、ルーターはそのヘッダーをリクエストイベントのレスポンスへコピーし、ターゲットを読み取ります。
同一オリジンのターゲットは `replace: true` を伴うルーターの `navigate` 呼び出しになります。
サーバーでは、`navigate` がリクエストイベントにその `Location` を伴う 302 を記録し、読み取りは `undefined` で解決されるためレンダーを完了できます。シェルがフラッシュされる前に設定された `Location` はレスポンス全体をボディのないリダイレクトに変え、フラッシュ後に設定されたものは `window.location` を設定するスクリプトとしてストリームに追記されます。これは[ストリーミングレンダラー](/docs/concepts/rendering-and-ssr.md#streaming-rendering)が説明しているとおりです。
ブラウザーでは読み取りは永久に保留中のままです。ナビゲーションがそれを待っていたすべてをアンマウントするためです。アカウントページが値を受け取ることはありません。`undefined` も含めて。
リダイレクト上のすべての `X-Revalidate` キーはナビゲーションの前に無効化されるため、行き先は新しいデータをフェッチします。
:::

## 元の場所へ送り返す

サインインページは URL から `next` を読み取り、隠しフィールドを通じてサインインアクションへ渡します:

```tsx
// src/pages/SignIn.tsx
import { action, useSearchParams } from "@solidjs/router";
import { safeNext, signIn } from "../data/account";

const signInAction = action(signIn);

export default function SignIn() {
	const [search] = useSearchParams();

	return (
		<form method="post" action={signInAction}>
			<input type="hidden" name="next" value={safeNext(search.next) ?? ""} />
			<label>
				Email
				<input name="email" type="email" required />
			</label>
			<label>
				Password
				<input name="password" type="password" required />
			</label>
			<button>Sign in</button>
		</form>
	);
}
```

```ts
// src/data/account.ts
import { markSafeError } from "@solidjs/web";
import { setSession } from "../server/session";
import { verifyCredentials } from "../server/customers";

export function safeNext(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	if (!value.startsWith("/")) return undefined;
	if (value.startsWith("//") || value.startsWith("/\\")) return undefined;
	if (value.startsWith("/sign-in")) return undefined;
	return value;
}

export async function signIn(form: FormData) {
	"use server";
	const customer = await verifyCredentials(
		String(form.get("email") ?? ""),
		String(form.get("password") ?? "")
	);
	if (!customer) {
		throw markSafeError(new Error("Email or password did not match"));
	}

	await setSession({ userId: customer.id });
	throw redirect(safeNext(form.get("next")) ?? paths.account);
}
```

`/sign-in?next=%2Faccount%2Forders` に到達して有効な資格情報を送信すると、ルーターは新しいセッション Cookie をレスポンスに載せて `/account/orders` へナビゲートします。JavaScript が無い場合でも、ブラウザーはリダイレクトをたどって同じアドレスへ向かいます。
`useSearchParams()` が値をデコードするため `search.next` は `/account/orders` になり、隠し input がそれをポストを通じて運びます。
この読み取りの型なし版とスキーマ型付き版は[検索パラメータの型付け](/docs/routing/solid-router/navigation.md#type-search-parameters)が扱っています。資格情報チェックとセッション書き込みは[サインインとサインアウト](/docs/building-apps/sessions-and-auth.md#sign-in-and-sign-out)の範囲です。

`safeNext` が受け入れる形は1つだけです: 単一の `/` で始まる、このオリジン上のパスです。
それ以外はすべてアカウントホームへフォールバックします。

:::danger[next はフォームだけでなくサーバーで検証する]
隠し input は呼び出し元が制御できます: サインインページがそこに置いたかどうかに関わらず、誰でも `next=//attacker.example` を `signIn` へポストできます。
サーバー関数トランスポートはリダイレクトターゲットをリクエスト URL に対して解決するため、`//attacker.example` と `/\attacker.example` はどちらも別オリジンへ解決されます。ルーターは別オリジンのターゲットへは `window.location.href` を設定してアプリを離れます。
ランタイムはスキームが `http` または `https` でないターゲットは拒否しますが、異なる `http` オリジンは拒否しません。
`safeNext` は `signIn` の内部で実行してください。そこは値が `Location` ヘッダーになろうとしている場所です。フォーム内のコピーは利便性のためのものとして扱います。
:::

## セクション全体のためのミドルウェア

サインアウトした訪問者からの `/account/orders` へのページ全体リクエストは、レンダリングが始まる前に応答できます。
セッションを読み取るミドルウェアの後に、ミドルウェアを1つ追加します:

```ts
// src/middleware.ts
import { getRequestEvent } from "@solidjs/web";
import { createAPIHandler } from "filesystem-routing/api";
import routes from "virtual:file-routes";
import { paths } from "./router";

// attachCustomer from Sessions and auth is defined above this line

function requireAccountSession(
	request: Request,
	next: () => Promise<Response>
) {
	const url = new URL(request.url);
	if (
		url.pathname.startsWith("/account") &&
		!getRequestEvent()?.locals.userId
	) {
		const target = paths["sign-in"]({ next: url.pathname + url.search });
		return Response.redirect(new URL(target, request.url), 302);
	}
	return next();
}

export default [
	attachCustomer,
	requireAccountSession,
	createAPIHandler(routes),
];
```

Cookie なしで `/account/orders` をリクエストすると、サーバーは `Location: /sign-in?next=%2Faccount%2Forders` を伴う `302` で応答し、コンポーネントは一切実行されません。
`attachCustomer` は[セッションと認証](/docs/building-apps/sessions-and-auth.md#authenticate-once-in-middleware)のミドルウェアです。ミドルウェアの順序は配列の順序なので、これは配列の先頭に来なければなりません。
`next()` を呼ばずに `Response` を返す方法は[チェーンを止める](/docs/building-apps/middleware-and-api-routes.md#stop-the-chain)が扱っています。

このレイヤーはルートガードの代わりではなく、併用します。
これが追加するのは、ページ全体リクエストに対する本物のリダイレクトステータスです: ルートガードのリダイレクトは、シェルがフラッシュされた後に着地すると、フォールバックがすでにペイントされた後で、ストリーム末尾のスクリプトとしてブラウザーに届きます。
これにできないのは、ページリクエストを発行しないクライアントサイドナビゲーションや、`/account/*` ではなく `/_server` へのリクエストであるサーバー関数呼び出しを見ることです。

:::caution[パスプレフィックスは権限ではない]
ミドルウェアは URL をマッチさせるため、`/account` で始まるパスだけを厳密に保護し、それ以外は保護しません。
アカウントページが呼ぶサーバー関数はそれぞれ自身の URL で到達可能であり、それらを保護するのは各関数内部のチェックです。
ミドルウェアにプレフィックスを追加しても、関数からチェックを取り除けるわけではありません。
:::

## 正しいナビゲーションを表示する

ヘッダーは、ガードが使うのと同じ `getCurrentUser` の読み取りから、**Sign in** または顧客名を表示します:

```tsx
// src/components/Header.tsx
import { Loading, Show, createMemo } from "solid-js";
import { useLocation } from "@solidjs/router";
import { getCurrentUser } from "../data/account";
import { paths } from "../router";

export function Header() {
	const user = createMemo(() => getCurrentUser());
	const location = useLocation();

	return (
		<Loading fallback={<span />}>
			<Show
				when={user()}
				fallback={
					<a
						href={paths["sign-in"]({
							next: location.pathname + location.search,
						})}
					>
						Sign in
					</a>
				}
			>
				{(current) => <a href={paths.account}>{current().name}</a>}
			</Show>
		</Loading>
	);
}
```

サインアウトした状態で商品ページを読み込むと、ヘッダーは `/sign-in?next=%2Fproducts%2Fmug` へのリンクを持つ **Sign in** を表示します。そのリンクはサーバーがレンダーし、ブラウザーはハイドレーション中にシリアライズされた `current-user` の結果を再フェッチせずに採用するため、読み込み時にリクエストも状態変化も起こりません。
サインインすると名前が現れます。`redirect(paths())` をスローするルーター `action` でサインアウトすると、アクション完了時にすべてのキャッシュ済みクエリが無効化されるため、`getCurrentUser` が再実行され、ページ全体の読み込みなしにヘッダーは **Sign in** を表示します。

ヘッダーがユーザーのコピーではなくビューを保持する理由は[サーバー上の状態](/docs/guides/state-management.md#state-on-the-server)が説明しています。
`Header` はルーターの関数形式の子要素の内側でレンダーされるため、`useLocation()` と `query` の読み取りの両方にバインド先のルーターがあります。

## よくある問題

### `/sign-in` と `/account` の間でリダイレクトがループする

サインインルートがパスなしガードルートの子になっているため、ガードが自分の守るページへリダイレクトしています。
`/sign-in` をグループの隣へ移してください。
ルートが正しいのにループするなら、次のリクエストでセッション Cookie が返ってきていません。[セッションと認証](/docs/building-apps/sessions-and-auth.md#common-problems)に比較すべき Cookie 属性の一覧があります。
連鎖するクライアントサイドリダイレクトは 100 回で停止し、ルーターから `Too many redirects` が返ります。

### アカウントページがペイントされてからサインインページに置き換わる

ガードが、エフェクトやコールバックから、ユーザーデータの到着後にナビゲートしているため、ページがコミットされてからナビゲーションが続いています。
代わりに `query` がラップするサーバー関数の内部からリダイレクトをスローしてください。読み取りは保留中のまま、ナビゲーションは保留され、何かがペイントされる前にサインインページが行き先を置き換えます。
ページ全体リクエストでは、ミドルウェアを追加して、シェルを先にレンダーする代わりにサーバーがリダイレクトステータスで応答するようにしてください。

### サーバー関数がサインアウトした呼び出し元に注文を返す

関数自身にチェックがありません。ルートガード、隠されたリンク、ミドルウェアのプレフィックスがページを守っていても関数は守っていません。
[サーバーで認可する](/docs/building-apps/sessions-and-auth.md#authorize-on-the-server)が示すように、関数内で `getRequestEvent()?.locals.userId` を読み、無ければ `redirect()` または `respond()` をスローしてください。

### サインイン後、訪問者が別サイトに着地する

`next` が検証なしで `redirect()` へ渡され、`//attacker.example` のような値が別オリジンへ解決されました。
単一の `/` で始まるパスだけを受け入れ、`//` と `/\` を拒否してください。そのチェックはフォームだけでなくサーバー関数の内部で実行します。

## まとめ

- `locals.userId` で一度だけ判定し、その判定をすべてのサーバー関数、ルートガード、ミドルウェアで実行します。各レイヤーは他では見られない侵入経路をカバーします。
- `preload` がチェックを開始し、コンポーネントがその背後で `props.children` をレンダーするパスなしルートの下にアカウントページを置き、`/sign-in` はグループの隣に保ちます。
- ガードは、セッションにユーザーがいなければ `redirect()` をスローする `query` でラップされたサーバー関数にします。ルーターはサーバーレンダリング中もクライアントサイドナビゲーション中も同様にそれでナビゲートします。
- サインインのターゲットは `paths["sign-in"]({ next })` で構築します。search オブジェクトがパスをエンコードします。
- `next` はサーバー関数の内部で検証します: 先頭が単一の `/`、`//` なし、`/\` なし、サインインページ自身でもないこと。
- `/account` 配下へのページ全体リクエストにはミドルウェアからリダイレクトを返します。関数チェックは維持します。ミドルウェアは `/_server` やクライアントサイドナビゲーションを見ないためです。
- ヘッダーでは `getCurrentUser()` を `query` 経由で読み、サーバーの結果がハイドレートされ、サインアウトアクションがそれを更新するようにします。

## 次のステップ

- [セッションと認証](/docs/building-apps/sessions-and-auth.md): このガイドが読むイベントに `userId` を置く Cookie、`getSession()`、ミドルウェア。
- [ミドルウェアと API ルート](/docs/building-apps/middleware-and-api-routes.md): `requireAccountSession` ミドルウェアが参加するチェーンと、API ルートを同じ方法で守るやり方。
- [フォーム](/docs/guides/forms.md): サインインフォームのインラインバリデーションメッセージと保留中の状態。
- [SSR セーフなコード](/docs/guides/ssr-safe-code.md): `RequireUser` のように両側で実行されるコードのためのチェックリスト。
