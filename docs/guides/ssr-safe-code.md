---
title: "SSR セーフなコード"
version: "2.0"
description: "ブラウザー API、実行ごとに変わる値、クライアント専用のデータをサーバーレンダーから排除し、各ハイドレーション警告を読んで、サーバーとブラウザーが食い違う原因となった行を見つけます。"
---

ストアフロントは `vite build` を通過しましたが、`ssr: true` を付けた開発サーバーへの最初のリクエストで、カートドロワーから `ReferenceError: window is not defined` が出力されました。
その行を移すとクラッシュは直りましたが、今度はブラウザーのコンソールがセールバナーからの `Hydration structure mismatch` 警告で埋まりました。サーバーはレンダリングしたのに、ブラウザーはしないと判断したバナーです。

どちらの問題も形は同じです。1つのコンポーネントソースがサーバーとブラウザーの両方で実行され、場所によって異なる答えを返す行がどちらかを壊します。
このモデルについては [レンダリングと SSR](/concepts/rendering-and-ssr) で説明しています。
このガイドはコードのためのチェックリストです。各行がどこで実行されるか、サーバーで実行できない行はどれか、一致していなければならない値はどれか、そして食い違ったときに警告をどう読むかを扱います。

## 各行がどこで実行されるか

各種の行に印を付けた1つのコンポーネントです:

```tsx
import {
	createEffect,
	createMemo,
	createSignal,
	createStore,
	onSettled,
} from "solid-js";
import { getCart } from "./cart.server";

// Module scope: both sides; on the server, once per process, not per request
const currency = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

export function CartSummary() {
	// Component body: both sides; on the server, once per request
	const [open, setOpen] = createSignal(false);
	// The store's function: both sides; the body of getCart: server only
	const [cart] = createStore(() => getCart(), { items: [] as CartItem[] });
	const total = createMemo(() =>
		cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
	);

	createEffect(
		// Compute function: both sides
		() => total(),
		// Effect function: browser only
		(amount) => {
			document.title = `Cart (${currency.format(amount)})`;
		}
	);

	// onSettled callback: browser only
	onSettled(() => {
		document.getElementById("cart-toggle")?.focus();
	});

	return (
		<aside>
			<button id="cart-toggle" onClick={() => setOpen(!open())}>
				{cart.items.length} items, {currency.format(total())}
			</button>
		</aside>
	);
}
```

ページをリクエストすると、サーバーはモジュールを1回、コンポーネント本体をリクエストごとに1回、ストアの関数とメモ、そしてエフェクトの計算関数を実行します。
エフェクト関数と `onSettled` コールバックは実行しません。サーバーでは `createEffect` が計算関数を1回実行してエフェクト関数を捨て、`onSettled` はハイドレーション id を予約するだけの no-op だからです。
ブラウザーはそのすべてを実行し、`document.title` はハイドレーション後に変わります。

ブラウザー専用処理のルールはこの一覧から導かれます。エフェクト関数か `onSettled` に入れてください。
イベントハンドラーもブラウザーでのみ実行されます。サーバーには処理すべきイベントがないからです。

`"use server"` 関数は逆のケースです。
その本体はどちらの経路でもサーバーで実行されます。ブラウザーでは呼び出しが HTTP リクエストになり、サーバーレンダー中はリクエストイベントのもとで同じプロセス内で実行されます。
両経路については [呼び出しは何になるか](/building-apps/server-functions#what-the-call-becomes) で説明しています。

人を驚かせるのはモジュールスコープです。
ファイル先頭の `const` はサーバーエントリーがロードされたときに1回だけ評価され、その後はすべてのリクエストで共有されるため、そこに置かれたシグナルやストアは全訪問者にとって1つのオブジェクトになります。
それがカートに何をもたらすか、そして代わりにどこでストアを作成するかは、[モジュールレベルの状態とサーバー](/guides/state-management#module-level-state-and-the-server) を参照してください。

:::caution[サーバーレンダー中に呼ばれたセッターは、効果のないデータとして残る]
サーバーレンダーは入力から HTML への1パスです。
サーバー上でコンポーネント本体の `setOpen(true)` を呼んでも何も更新されず、開発環境では最初に起きたときに `[SERVER_WRITE]` 警告が出力されます。
その警告と、あるべき書き込みの姿については [サーバーでの書き込みが何もしなかった](/guides/debugging-reactivity#a-write-on-the-server-did-nothing) を参照してください。
:::

## ブラウザー API

カートドロワーはビューポートが狭いかどうかを知りたがっています。
コンポーネント本体の `window.matchMedia` が、`window is not defined` を出力した行です:

```tsx
import { createSignal, onSettled } from "solid-js";

// Avoid: matchMedia runs in the component body, on the server too
function CartDrawer() {
	const compact = window.matchMedia("(max-width: 40rem)").matches;
	return <aside class={compact ? "drawer drawer-compact" : "drawer"}>…</aside>;
}

// Prefer: ask the browser after hydration, and let the answer be a signal
function CartDrawer() {
	const [compact, setCompact] = createSignal(false);

	onSettled(() => {
		const query = window.matchMedia("(max-width: 40rem)");
		setCompact(query.matches);
		const update = (event: MediaQueryListEvent) => setCompact(event.matches);
		query.addEventListener("change", update);
		return () => query.removeEventListener("change", update);
	});

	return (
		<aside class={compact() ? "drawer drawer-compact" : "drawer"}>…</aside>
	);
}
```

`Avoid` 版を `ssr: true` で実行すると、ドロワーが HTML を生成する前にサーバーレンダーがスローします。
`Prefer` 版では、サーバーが `class="drawer"` をレンダリングし、ブラウザーが同じマークアップをハイドレートし、`onSettled` コールバックがメディアクエリを読んでクラスを1回更新します。
ウィンドウのリサイズではリスナーを通じて再度更新され、返されたクリーンアップがドロワーの破棄時にリスナーを外します。
[カスタムプリミティブ](/guides/custom-primitives#clean-up-what-you-start) ではこれを再利用可能な `createMediaQuery` にしています。

サーバーコードと共有するフォーマット関数のように、オーナーのない場所から呼ばれるヘルパーもあります。
そうした場面では、`@solidjs/web` の [`isServer`](/reference/solid-web/rendering-ssr/is-server) がビルド時定数として使えます。サーバービルドでは `true`、ブラウザービルドでは `false` になるため、バンドラーが実行できない側の分岐を取り除きます:

```ts
import { isServer } from "@solidjs/web";

export function prefersReducedMotion() {
	if (isServer) return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
```

`isServer` はクラッシュを止めますが、2つのレンダーを一致させはしません。
この種のヘルパーはサーバーでは `false`、ブラウザーでは `true` になり得るので、その結果はどの要素が存在するかを決める JSX の中ではなく、エフェクト関数か `onSettled` の中で使ってください。

地図や、インポート時に `window` に触れるライブラリを使うリッチテキストエディターのように安全にできないコンポーネントには、[`clientOnly`](/reference/solid-web/rendering-ssr/client-only) がサーバーでフォールバックをレンダリングし、ハイドレーション後にコンポーネントへ入れ替えます。
`{ lazy: true }` オプションを含めて、[サーバーから切り離す](/guides/integrate-non-solid-code#keep-it-off-the-server) で扱っています。

## 実行ごとに変わる値

商品ページは訪問者の半数にプロモーションバナーを表示します。
JSX 内の `Math.random()` は、サーバーとブラウザーでそれぞれ別の半数を選びます:

```tsx
import { Show } from "solid-js";

// Avoid: the server and the browser each roll their own value
<Show when={Math.random() < 0.5}>
	<aside class="promo">Free shipping on orders over $50</aside>
</Show>;

// Prefer: one side decides and the other receives the decision
<Show when={props.product.promo}>
	<aside class="promo">{props.product.promo}</aside>
</Show>;
```

`Avoid` 版を実行すると、ページロードの半分で食い違いが起きます。
サーバーがバナーをレンダリングしてブラウザーがしなかった場合、開発環境はハイドレーション後に `Hydration completed with 1 unclaimed server-rendered node(s):` とバナーの HTML を続けて警告し、サーバーのバナーは何も結び付かないままドキュメントに残ります。
ブラウザーがレンダリングしてサーバーがしなかった場合は、開発環境が `Hydration key miss for "..."` を警告します。ブラウザーは `<aside>` を切り離された要素として作成したため、バナーはページに現れません。

`Prefer` 版では、`getProduct` がページをレンダリングするのと同じリクエスト内のサーバー上で決定し、ブラウザーは同じデータの同じフィールドを読みます。
このルールは `Date.now()`、`Math.random()`、`crypto.randomUUID()`、`navigator.language`、その他両側が独立に計算するすべての値に当てはまります。その値がどの要素が存在するかを決めるなら、サーバーで1回だけ計算し、データとして渡してください。

:::note[テキストはハイドレーション中に比較されない]
ハイドレーションは、各テンプレートルートをそのハイドレーションキーで、内部のノードを位置で引き取り、開発環境では要素タグを検査しますが、テキストは比較しません。
`<p>Rendered at {Date.now()}</p>` は警告を発さず、サーバーのテキストがページに残ります。
このガイドの警告は、構造を変える値から来ています。`Show`、リストの長さ、片側にしか存在しない要素などです。
:::

id も実行ごとに変わる値のもう1つの代表的なものです。
チェックアウトの住所フォームは生成した id で各入力にラベルを付けますが、カウンターや `Math.random()` はサーバーとブラウザーに異なる文字列を与えます。
[`createUniqueId`](/reference/solid-js/components-context/create-unique-id) は、両側でコンポーネントのオーナーツリー内の位置から id を導きます:

```tsx
import { createUniqueId } from "solid-js";

function Field(props: { label: string; value: string }) {
	const id = createUniqueId();
	return (
		<>
			<label for={id}>{props.label}</label>
			<input id={id} value={props.value} />
		</>
	);
}
```

サーバー上およびハイドレーション中は、各呼び出しが現在のオーナーの次の子 id を取得するため、サーバーが書いた `for` 属性はブラウザーがハイドレートする `id` と一致します。
ハイドレーション外、つまりクライアント専用のレンダーでは、`cl-` にカウンターを続けたものを返します。
コンポーネントのセットアップ中に呼び出してください。サーバーでは、オーナーがないときに `createUniqueId cannot be used outside of a reactive context` をスローします。

「sale ends in 2:14」のようにブラウザーでカウントし続けなければならない値は、まずサーバーが提供した値をレンダリングし、ハイドレーション後にブラウザーへ引き継ぎます:

```tsx
import { createSignal, onSettled } from "solid-js";

function SaleCountdown(props: { endsAt: number; serverNow: number }) {
	const [now, setNow] = createSignal(props.serverNow);

	onSettled(() => {
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	});

	return <p>Sale ends in {formatRemaining(props.endsAt - now())}</p>;
}
```

`serverNow` は商品を返したサーバー関数から来るので、両側が同じ最初のテキストをレンダリングし、インターバルはブラウザーだけで開始されます。

## サーバーが持っていないデータ

カートの下書きは `localStorage` にあり、それはブラウザーにしか存在しません。
サーバーは見えるカート、つまり空のカートをレンダリングし、ブラウザーがハイドレーション後に下書きを埋めます。読み取りに `onSettled`、書き込みに `createEffect` を使うそのプリミティブは [Solid の外部と同期する](/guides/custom-primitives#sync-with-something-outside-solid) にあります。
代償として、3点入っている訪問者にも空のカートを見せる最初のフレームが生じます。

サーバーが本物のカートをレンダリングすべきときは、データをサーバーが読める場所へ移します。
Cookie に入れたカート id はすべてのリクエストとともに届き、サーバー関数がリクエストイベントからそれを読みます:

```ts
// src/server/cart.ts
"use server";
import { getRequestEvent, parseCookieHeader } from "@solidjs/web";

export async function getCart(): Promise<{ items: CartItem[] }> {
	const event = getRequestEvent();
	const cookies = parseCookieHeader(event?.request.headers.get("cookie"));
	const cartId = cookies["cart"];
	if (!cartId) return { items: [] };
	return (await database.carts.get(cartId)) ?? { items: [] };
}
```

これでコンポーネント内の `createStore(() => getCart(), { items: [] as CartItem[] })` はサーバーで3点をレンダリングし、ブラウザーも同じ関数に問い合わせて同じ答えを得ます。
`database.carts.get` はアプリケーションが使うストレージの代役です。
顧客を識別する署名付き Cookie については [セッションと認証](/building-apps/sessions-and-auth) を参照してください。顧客がサインインした後は、ミドルウェアが設定する `event.locals.userId` が Cookie の読み取りに取って代わります。

最初のフレームを誰が必要とするかで選んでください。
今のブラウザーだけが気にする下書きはハイドレーションまで待てますが、共有リンク・クローラー・低速な回線が見るべきカートはサーバーに置きます。

## ブラウザーが書き換えるマークアップ

ブラウザーの HTML パーサーは、渡された木をそのまま組み立てるとは限りません。
`<p>` の内側の `<div>` は段落を先に閉じ、`<table>` の直下の `<tr>` には暗黙の `<tbody>` が補われ、`<a>` の内側の `<a>` は外側のリンクを終わらせます。
サーバーは JSX が記述したとおりの文字列を書き出し、ブラウザーはその文字列から別の木を組み立てますが、クライアントのコンパイル済みテンプレートは JSX が記述した木を期待しています。

構造全体が1つの JSX 式に収まっているとき、コンパイラはこれを検出します。
`<div>` を `<p>` で囲んで書いた商品説明です:

```tsx
// Avoid: the parser closes <p> when it meets <div>
<p class="description">
	<div class="badge">{props.product.badge}</div>
	{props.product.description}
</p>;

// Prefer: use an element that may contain flow content
<div class="description">
	<div class="badge">{props.product.badge}</div>
	<p>{props.product.description}</p>
</div>;
```

`Avoid` 版をコンパイルすると、テンプレートで `The HTML provided is malformed and will yield unexpected output when evaluated by a browser.` と、書かれたとおりの HTML およびブラウザーがそれから組み立てる HTML が続けて示され、ビルドが失敗します。
このチェックは各テンプレートのマークアップから属性とテキストを除いたものに対して実行されるため、メッセージ中の2つの版は骨格です。タグの順序を比べて、移動したノードを見つけてください。

コンパイラはコンポーネントをまたいでは見えません。
`<p>{props.children}</p>` をレンダリングする `Description` コンポーネントと、`<div>` の子を渡す親は、それぞれが有効なテンプレートにコンパイルされますが、ブラウザーは実行時にやはり木を組み立て直します。
ハイドレーション警告が指す要素について、Elements パネルでの親が JSX の親でないときは、コンポーネント境界をまたぐネストを探して外側の要素を直してください。

## ハイドレーション警告の読み方

サーバーの DOM とクライアントの期待が食い違うと、開発環境は5種類のメッセージのどれかを出力します。
それぞれが異なるチェックの名前を示し、そのチェックがどこを見るべきかを教えてくれます。

### `Hydration structure mismatch: expected <X> as first child of`

クライアントが1つのテンプレート内をたどっていて、その位置のノードがテンプレートの期待する要素ではありません。
バリアントの `Hydration structure mismatch: expected <X> after` は、後続の兄弟について同じチェックを報告します。
メッセージの次の行は親の子要素の概略を示し、見つかったノードに `← expected X`、その位置が空なら `← missing` と付きます。
ブラウザーが書き換えたマークアップか、先行する要素が id をずらしたために間違った場所から引き取られたテンプレートルートを探してください。

### `Hydration tag mismatch for key "...": expected <X> but found`

テンプレートルートがそのハイドレーションキーの下で見つかりましたが、テンプレートのルートとは別の要素です。
両側が同じ位置に異なる要素をレンダリングしました。別の分岐を選んだ条件分岐か、順序が異なる2つのコンポーネントです。

### `Hydration key miss for "...": no server-rendered element carries this key`

クライアントが、サーバーがその id で出力していないテンプレートルートをレンダリングしました。
メッセージは起きたことを続けて説明します: `A detached element was created instead; its subtree will not appear in the document or become interactive.`
`Show when={!isServer}` や実行ごとに変わる値のようなブラウザーだけで実行される分岐、あるいはサーバーが使ったのとは別の `renderId` でハイドレートされたサブツリーを探してください。メッセージはそのケースを明示し、[ハイドレーションの制御](/concepts/rendering-and-ssr#controlling-hydration) がそれを扱っています。

### `Hydration completed with N unclaimed server-rendered node(s):`

ハイドレーションは完了しましたが、メッセージの下に列挙されたサーバーレンダリング済み要素はクライアントに一度も引き取られませんでした。
サーバーがレンダリングしてブラウザーがしなかったものです。キーミスの鏡像です。

### `Hydration Mismatch. Unable to find DOM nodes for hydration key`

これは警告ではなくエラーです。
文字列タグに解決される `dynamic()` コンポーネントなど、頼れるテンプレートなしに要素を引き取るコードは、どのサーバーノードもそのキーを持たないときにこれをスローします。
原因はキーミスと同じです。違いは、代役を作るためのテンプレートがないことです。

## サードパーティコード

モジュール本体で `window` を読むライブラリは、どのコンポーネントが実行されるより前、インポート時に失敗します。
それを使うコンポーネントを `clientOnly` で包むか、インポートを `onSettled` コールバックの中へ移してブラウザーだけで実行されるようにしてください。
[サーバーから切り離す](/guides/integrate-non-solid-code#keep-it-off-the-server) に両方の形と、動的インポートが必要とする `disposed` ガードが示されています。

## よくある問題

### 最初のリクエストで `window is not defined` または `document is not defined`

モジュール本体・コンポーネント本体・計算関数のどれかがブラウザー API を読んでおり、`ssr: true` ではそのコードもサーバーで実行されます。
読み取りをエフェクト関数や `onSettled` コールバックへ移すか、`isServer` でガードするか、コンポーネントを `clientOnly` で包んでください。
スタックが `node_modules` を指しているなら、そのライブラリがインポート時にブラウザーを読んでいます。[サードパーティコード](#third-party-code) を参照してください。

### クラッシュを直した後に `Hydration structure mismatch`

これで両側ともレンダリングするようになりましたが、異なる構造をレンダリングしています。
食い違う値を見つけてください。条件内の `Math.random()` や `Date.now()`、JSX 内の `isServer` チェック、片側だけが持つデータなどです。
直し方は [実行ごとに変わる値](#values-that-differ-on-every-run) と [サーバーが持っていないデータ](#data-the-server-does-not-have) が扱っています。

### `The HTML provided is malformed` でビルドが失敗する

ある JSX テンプレートが、ブラウザーのパーサーが移動させる要素をネストしています。`<p>` の内側の `<div>` や、`<table>` の直下の `<tr>` などです。
メッセージ内の2つの HTML 骨格を比べて外側の要素を変えてください。よくあるケースは [ブラウザーが書き換えるマークアップ](#markup-the-browser-rewrites) に挙げています。

### カートが空で表示され、後で埋まる

データはブラウザーの `localStorage` やメモリに置かれているので、サーバーは空の初期値をレンダリングし、ブラウザーがハイドレーション後に置き換えます。
最初のフレームを許容するか、サーバー関数が返せるようデータを Cookie かセッションの背後へ移してください。[サーバーが持っていないデータ](#data-the-server-does-not-have) を参照してください。

### `<label>` がその `<input>` と異なる id を指す

id がカウンターや `Math.random()` から来ているため、サーバーとブラウザーが別の文字列を生成しました。
両側でオーナーツリーから id を導く `createUniqueId` を使ってください。

## まとめ

- サーバーはモジュールスコープをプロセスごとに1回、コンポーネント本体をリクエストごとに1回、そしてすべての計算関数を実行します。エフェクト関数と `onSettled` コールバックは決して実行しません。
- ブラウザー専用の処理はエフェクト関数か `onSettled` に入れてください。オーナーを持たないヘルパーには `isServer`、安全にできないコンポーネントには `clientOnly` を使います。
- `isServer` はクラッシュを防ぎますが、2つのレンダーを一致させはしません。どの要素が存在するかを決める JSX には入れないでください。
- `Math.random()`、`Date.now()` などの実行ごとに変わる値はサーバーで1回だけ計算し、結果をデータとして渡してください。
- `for` 属性と `id` 属性の両方に現れる id には `createUniqueId` を使ってください。
- サーバーが持つ値をレンダリングしてからハイドレーション後にブラウザーで更新するか、サーバーが持てるようデータを Cookie かセッションへ移してください。
- ブラウザーのパーサーが維持する形で要素をネストしてください。コンパイラが捕捉するのは1つのテンプレート内の不正なネストで、コンポーネントをまたぐものは捕捉しません。
- ハイドレーション警告は、その示すチェックで読み解きます。構造不一致はテンプレート内の探索、キーミスはサーバーがレンダリングしなかった要素、未引き取りノードはブラウザーがレンダリングしなかった要素です。

## 次のステップ

- [レンダリングと SSR](/concepts/rendering-and-ssr): `render`、`hydrate`、`renderToStream` の呼び出し、`Loading` バウンダリによるストリーミング、`HydrationScript`。
- [Solid 以外のコードを統合する](/guides/integrate-non-solid-code): `clientOnly`、`onSettled` 内の動的インポート、自分の DOM を所有するライブラリのための ref。
- [レンダリングモードを選ぶ](/guides/choose-a-rendering-mode): ストアフロントにそもそもサーバーが必要かどうか、そして各モードがコードに求めるもの。
- [保護されたルート](/guides/protected-routes): サーバーが見るサインイン済みユーザーが何をレンダリングするかを決める、アカウント領域。
