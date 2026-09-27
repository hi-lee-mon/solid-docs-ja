---
title: "データ読み込みとミューテーション"
version: "2.0"
description: "preload でルートのデータを早期に開始し、query で読み取りをキャッシュ・共有し、action でミューテーションを送信し、楽観的な状態を表示し、何を再検証するかを制御します。"
---

[イントロダクション](/routing/solid-router)の商品ページは、メモの中で商品をフェッチしていました。
それでも動きますが、3つの点でまだ不十分です：リクエストはページコンポーネントが実行されるまで始まりません。リスト内の `ProductCard` と `Product` ページは同じ商品を二度フェッチします。そして **Add to cart** フォームには、カートが変わったことを伝える手段がありません。

ルーターのデータAPIはそれぞれに1つずつ答えを用意します：`preload` はページのコンポーネントが存在する前にリクエストを開始し、`query` は2つの読み手に1つのリクエストを共有させ、`action` はミューテーションをラップして JavaScript なしでもフォームとして動作させ、完了時にキャッシュを再検証します。
このページはストアの続きです：商品ページとカートです。

:::note[すべて任意です]
Solid Router のアプリは、素の非同期メモでデータを読み込み、素のサーバー関数でフォームを送信することもでき、その場合は[非同期リアクティビティ](/concepts/async-reactivity)のページだけで足ります。
以下の各要素はそれぞれ独立して価値があるので、目の前のページが必要とするものだけを取り入れてください。
:::

## 3つの要素

各要素にラベルを付けた商品ページがこちらです：

```ts
// src/data/products.ts
import { query } from "@solidjs/router";

// 1. A cached read. Same name + same arguments = same request.
export const getProduct = query(async (id: string) => {
	const response = await fetch(`/api/products/${id}`);
	return (await response.json()) as Product;
}, "product");
```

`src/router.ts` の `routes` 配列内では：

```ts
{
	path: "/products/:id",
	component: lazy(() => import("./pages/Product")),
	// 2. Start it as soon as the route matches, before the component runs.
	preload: ({ params }) => void getProduct(params.id),
}
```

```tsx
// src/pages/Product.tsx
import { createMemo } from "solid-js";
import type { RouteProps } from "@solidjs/router";
import { getProduct } from "../data/products";
import type { Router } from "../router";

// 3. Read it where it is displayed.
export default function Product(
	props: RouteProps<typeof Router.paths.products>
) {
	const product = createMemo(() => getProduct(props.params.id));
	return <h1>{product().name}</h1>;
}
```

商品リンクにホバーすると、クリックの前にネットワークタブにリクエストが現れます。
クリックすると、名前がすでにある状態で見出しがレンダーされます。

![リンクへのホバーからクリック、コンポーネントの実行までのタイムライン。preload はホバー時にクエリを呼び出し、コンポーネント内のメモは同じクエリを読み取り、両者は最も早い呼び出しで開始された1つのキャッシュ済みリクエストに到達します。](/images/diagrams/router-three-data-pieces.svg)

要素2を削除してもページは動きます。リクエストはメモが最初に実行されるタイミングで、数ミリ秒遅れて始まるだけです。
要素1を削除してもページは動きます。ただし同じ商品を必要とする2つのコンポーネントがそれぞれフェッチすることになります。
ファイルシステムアダプターでは、要素2はルートモジュールの `route` エクスポートに移ります。[ファイルシステムマニフェストの変換](/routing/solid-router/route-definitions#convert-a-file-system-manifest)を参照してください。

## コンポーネントが実行される前に処理を始める

ルートの `preload` はルートがマッチした時点で、マッチした `params`、遷移先の `location`、そして `intent` を受け取って実行されます：

```tsx
preload: ({ params, intent }) => {
	void getProduct(params.id);
	if (intent !== "preload") void getReviews(params.id);
},
```

`intent` はその処理がなぜ開始されたのかを示します：

| `intent`     | 発生するタイミング                            |
| ------------ | -------------------------------------------- |
| `"initial"`  | サーバーレンダーを含む最初のレンダー           |
| `"navigate"` | リンクのクリックや `navigate()` 呼び出し      |
| `"native"`   | ブラウザの戻る・進む                           |
| `"preload"`  | ユーザーがリンクをホバー・フォーカス・タッチしたとき |

ホバーで実行するには重すぎる処理をスキップするのに使えます。

ローダーがデータそのものであるルーターに慣れていると、ページが必要とするものを return したくなります：

```tsx
// Avoid: props.data is captured once, so a param change shows the old product
preload: async ({ params }) => getProduct(params.id),

// Prefer: start the request and let the page read it reactively
preload: ({ params }) => void getProduct(params.id),
```

`Avoid` 版では、`props.data.name` をレンダーするページは `/products/mug` から `/products/bowl` に移動した後もマグカップを表示したままです。`props.data` はルートが最初にマッチしたときに `preload` が返したものだからです。
`Prefer` 版は `props.params.id` を追跡するメモの中でクエリを読み取るので、ボウルが表示されます。
`preload` から値を返すのは、ルートがマッチしている間ずっと変わらないはずのものだけにしてください。

### リンクからのプリロード

ルーターは、ユーザーがリンクをホバー・フォーカス・タッチしたときに、短い遅延の後にプリロードを開始します。
デフォルトでは、遅延コンポーネントのチャンクを準備し、ルートの `preload` を実行します。
クエリキャッシュは結果を数秒間保持するので、続くナビゲーションは準備済みの結果を見つけられます。

データのプリロードが高コストだったり副作用があったりする場合は、そのリンクだけ無効にできます：

```tsx
<a href={paths.account.orders} preload="false">
	Orders
</a>
```

または `createRouter` の `preloadLinks: false` で、チャンクもデータも含めてリンクのプリロードをすべて無効にできます。
コードからルートを準備するには、たとえばリストが画面内にスクロールしてきたとき：

```tsx
const preloadRoute = usePreloadRoute();
preloadRoute(paths.products("mug"), { preloadData: true });
```

## `query` で読み取りをキャッシュする

`query` は非同期関数をラップして名前を付けます。
名前と引数がキャッシュキーになり、キャッシュの有効期間中に同じキーで行われた呼び出しはすべて1つのリクエストと1つの結果を共有します：

```ts
export const getProduct = query(fetchProduct, "product");

getProduct.key; // "product"
getProduct.keyFor("mug"); // 'product["mug"]'
```

これにより preload とコンポーネントがリクエストを共有でき、リスト内の `ProductCard` と `Product` ページが同じ id を読み取るときにも1つを共有できます。

キャッシュの有効期間は実行場所によって異なります：

- サーバーでは1リクエストの間だけ生きます。
  1回のサーバーレンダー中に同じ商品をレンダーする2つのコンポーネントは1回の呼び出しで済み、次のリクエストは空の状態から始まります。
- ブラウザでは新しい結果が数秒間再利用されるので、プリロードとそれに続くナビゲーションがそれを共有します。
  その後は、何かが読み取っている間エントリーは生き続け、最後の読み手がいなくなってから数分後に掃き出されます。
  ブラウザの戻る・進むは保持されたエントリーを再利用できるので、ページに戻るのは通常一瞬です。

`fullstack` プロジェクトでは `query` の中の関数は通常[サーバー関数](/building-apps/server-functions)です。
その関数に宣言されたメソッドがない場合、`query` はそれを `GET` として宣言するので、その読み取りはブラウザや CDN がキャッシュでき、ミューテーションの経路を通りません。

クエリは他の非同期値と同じく、メモ経由で読み取ります：

```tsx
const product = createMemo(() => getProduct(props.params.id));
```

`props.params.id` が変わると、メモは新しい id で `getProduct` を呼び出します。これはキャッシュミスとなり新しいリクエストになります。
読み込み中も古い商品は画面に残ります。その挙動とそこから得られる選択肢は[非同期リアクティビティ](/concepts/async-reactivity#settled-view-and-in-flight-work)で説明しています。

### 再検証

キャッシュされた値は、何かが無効化するまで残ります。
キーを指定して `revalidate` を呼ぶと、マッチするエントリーが古いものとしてマークされ、読み取り中のものは再実行されます：

```ts
import { revalidate } from "@solidjs/router";

revalidate(getProduct.keyFor("mug")); // one product
revalidate(getProduct.key); // every product
revalidate(); // everything
```

キーは前方一致でマッチするので、広いキーはすべての引数の組み合わせに届きます。
手で呼ぶことは稀です。通常のきっかけはアクションの完了で、これは後述します。

## アクションでミューテーションする

`action` はミューテーションをラップし、フォームとして送信でき、実行中を追跡でき、その後に再検証が続くようにします。
まずサーバー関数から：

```ts
// src/data/cart.ts
import { query, action } from "@solidjs/router";
import { markSafeError, reload } from "@solidjs/web";
import { currentSessionId } from "./session";

export const getCart = query(async () => {
	"use server";
	return db.cart.forSession(currentSessionId());
}, "cart");

export const addToCart = action(async (form: FormData) => {
	"use server";
	const productId = String(form.get("productId"));
	const quantity = Number(form.get("quantity") ?? 1);
	if (!Number.isInteger(quantity) || quantity < 1) {
		throw markSafeError(new Error("Quantity must be a whole number"));
	}
	await db.cart.add(currentSessionId(), productId, quantity);
	return reload({ revalidate: getCart.key });
});
```

`currentSessionId()` はセッション層が提供するもののプレースホルダーです。[セッションと認証](/building-apps/sessions-and-auth)では署名付き Cookie ベースの実装を示しています。

続いてフォームです：

```tsx
// src/pages/Product.tsx
<form method="post" action={addToCart}>
	<input type="hidden" name="productId" value={props.params.id} />
	<input type="number" name="quantity" value="1" min="1" />
	<button>Add to cart</button>
</form>
```

**Add to cart** をクリックすると、呼び出しとその再検証が確定するまでフォームに `aria-busy="true"` が付きます。その後、`getCart` のすべての読み手に新しい行が表示されます。

このフォームをブラウザの視点で読んでみましょう。
これは `FormData` を伴う URL への `POST` であり、JavaScript が無効でも動作します。サーバーが `addToCart` を実行し、`reload` を見て、ブラウザをページに送り返します。
JavaScript がある場合は、ルーターが送信をインターセプトし、サーバー関数のトランスポート経由でアクションを呼び出し、レスポンスを適用します。

フォームが契約であることから、2つのルールが導かれます：

- アクションは `POST` フォームのみを受け付けます。`GET` フォームは `Only POST forms are supported for Actions` をスローします。
  `GET` フォームが記述するのはミューテーションではなく URL です。検索やフィルターには[型付き検索パラメータ](/routing/solid-router/navigation#type-search-parameters)を持つルートを使ってください。
- アクションが必要とするものはすべて、フォームの中にあるか、アクションにバインドされている必要があります。
  hidden input が素直な方法で、`.with()` が型付きの方法です。

[フォームのガイド](/guides/forms)では、この形で、バリデーションメッセージや JavaScript なしの場合の結果を含む完全なフォームを構築します。

### `.with()` で引数をバインドする

引数がフォームをレンダーする場所で分かっているなら、hidden input を追加する代わりにバインドします：

```tsx
export const removeFromCart = action(
	async (productId: string, form: FormData) => {
		"use server";
		await db.cart.remove(currentSessionId(), productId);
		return reload({ revalidate: getCart.key });
	}
);

<For each={cart()}>
	{(line) => (
		<form method="post" action={removeFromCart.with(line.productId)}>
			<button>Remove</button>
		</form>
	)}
</For>;
```

`.with(...)` は、バインドされた引数の後から始まる残りのパラメータを持つアクションを返します。
バインドされた値はアクションの URL に載るので、JavaScript なしの経路でもそれらを受け取れます。

### クライアントサイドのアクション

アクションはサーバー関数を呼ばなくても構いません。
クライアントだけのミューテーションやサードパーティ API の呼び出しには、素の非同期関数が使えます：

```ts
const savePreference = action(async (form: FormData) => {
	localStorage.setItem("theme", String(form.get("theme")));
}, "save-preference");
```

:::caution[サーバーでレンダーされるクライアントアクションには名前を付ける]
サーバーでレンダーされるクライアントアクションには明示的な名前が必要です。両側がフォームの URL で一致できるようにするためで、これがないとサーバーレンダーは `Client Actions need explicit names if server rendered` をスローします。
サーバー関数はすでに安定した URL を持っているので名前は不要です。
:::

## 何が起きているかを表示する

ミューテーションには UI が反映したい3つの瞬間があります：実行中、失敗したとき、そしてサーバーが確認する前です。

### 実行中

ルーターは送信中のフォームに `aria-busy="true"` を設定します。
CSS でスタイルを付ければ、コンポーネントのコードは不要です：

```css
form[aria-busy] button {
	opacity: 0.6;
	pointer-events: none;
}
```

### 失敗したとき

`useSubmissions(action)` は、そのアクションで完了した送信のうち結果またはエラーを生成したもののリアクティブなリストを返します：

```tsx
import { Show } from "solid-js";
import { useSubmissions } from "@solidjs/router";

function AddToCartForm(props: { productId: string }) {
	const submissions = useSubmissions(addToCart);
	const failure = () => submissions.at(-1)?.error as Error | undefined;

	return (
		<form method="post" action={addToCart}>
			<input type="hidden" name="productId" value={props.productId} />
			<input type="number" name="quantity" value="1" min="1" />
			<button>Add to cart</button>
			<Show when={failure()}>
				{(error) => <p role="alert">{error().message}</p>}
			</Show>
		</form>
	);
}
```

数量 `0` を送信すると、ボタンの下に "Quantity must be a whole number" と表示されます。
各送信には、送られた `input`、`result` または `error`、そして `retry()` と `clear()` が含まれます。
リダイレクトしたり何も返さなかった送信はリストに残りません。それらも観測したい場合は `.onSettled` を使います。

このメッセージがブラウザに届くのは、`addToCart` が `markSafeError` を通してスローしたからです。
素の `throw new Error(...)` は本番環境では `Internal Server Error` として届くので、データベースやインフラの詳細は漏れません。`markSafeError` と、バリデーションの問題を `respond()` でスローする代替手段については[ミューテーションとレスポンス](/building-apps/server-functions/mutations-and-responses)を参照してください。

### サーバーが確認する前

`.onSubmit` は、ミューテーションが送信される前に、ミューテーションと同じトランザクション内でアクションの引数を受け取るコールバックを実行します。
楽観的ストアと組み合わせれば、アクションが確定して再検証されたデータが届いたときに、書き込みは自動で巻き戻ります：

```tsx
import { For, createOptimisticStore } from "solid-js";
import { getCart, addToCart } from "../data/cart";

function CartPanel() {
	const [cart, setCart] = createOptimisticStore(
		() => getCart(),
		[] as CartLine[]
	);

	addToCart.onSubmit((form) => {
		setCart((draft) => {
			draft.push({
				productId: String(form.get("productId")),
				quantity: Number(form.get("quantity") ?? 1),
				pending: true,
			});
		});
	});

	return (
		<ul>
			<For each={cart}>
				{(line) => (
					<li class={{ pending: !!line.pending }}>
						{line.productId} × {line.quantity}
					</li>
				)}
			</For>
		</ul>
	);
}
```

新しい行は `pending` クラス付きですぐに表示されます。
アクションが終わると `reload` が `getCart` を再検証し、ストアはサーバーのカートと突き合わせを行い、楽観的な行は本物の行に置き換わります。サーバーが拒否した場合は消えます。
コンポーネント内で `.onSubmit` を登録すると、そのフックはコンポーネントのライフタイムに紐付きます。

このためにフォームを変えたわけではありません。
ハイドレーション前は、[アクションでミューテーションする](#mutate-with-actions)と同じ `POST` です：ブラウザが送信し、サーバーが `addToCart` を実行し、データベースのカートでページを再レンダーします。
ハイドレーション後は、ルーターが送信をインターセプトし、アクションのトランザクションの最初のステップとして `.onSubmit` フックを実行し、呼び出しを送り、再検証されたデータを予測の上に突き合わせます。
楽観的レイヤーは、すでに動作するフォームの上にハイドレーション済みページが追加するものです。サーバー関数と HTML はどちらの場合も同じです。

[ミューテーション](/concepts/mutations)では楽観的モデルを深く説明しています。ここでは同じモデルを、ルーターがアクションを提供する形で使っています。

## コードからアクションを呼び出す

フォームがない場合、たとえばキーボードショートカットやドラッグ＆ドロップハンドラーでは、アクションをルーターにバインドして呼び出します：

```tsx
import { useAction } from "@solidjs/router";

const remove = useAction(removeFromCart);

onKeyDown={(event) => {
	if (event.key === "Delete") void remove(selectedId(), new FormData());
}}
```

それ以外はすべて同じです：再検証、送信、`.onSubmit`。
失われるのは JavaScript なしの経路で、それはフォームだけが提供します。

## ミューテーション後に再検証されるもの

アクションが完了すると、ルーターはクエリキャッシュを再検証します。
デフォルトでは全エントリーが対象です。書き込みの後は、何でも変わっているかもしれないと想定するのが最も安全だからです。

サーバー関数のレスポンスから範囲を絞れます：

```ts
return reload({ revalidate: getCart.key }); // this query only
return respond(cart, { revalidate: [getCart.key, getTotals.key] }); // a value plus keys
return redirect(paths.cart, { revalidate: getCart.key }); // navigate, then revalidate
```

同一オリジンの `redirect` はルーターのナビゲーションになり、それ以外はアプリの外に出ます。
再検証はナビゲーションと同じ更新内で実行されるので、遷移先のページは古いデータを一瞬表示してからではなく、新しいデータでレンダーされます。

:::deep-dive[リダイレクトとデータが同時に届く理由]
ルーターはレスポンスのリダイレクトと再検証メタデータを1つの更新内で適用します。
共有レイアウトのカート数のようにナビゲーションを越えて生き残る読み手は、その更新内で再フェッチし、値が揃うまでコミットを保留するので、新しいページが古いカートで描画されることはありません。
ルーターのシングルフライトコレクターが組み込まれた `fullstack` プロジェクトでは、サーバーはさらに一歩進んで、新しいクエリ結果をミューテーションのレスポンスに含めます。そのためクライアントは二度目の往復をせず、ペイロードからキャッシュを初期化できます。
セットアップは[サーバーレンダリングとハイドレーション](/routing/solid-router/server-rendering#one-round-trip-for-a-mutation)を参照してください。
:::

## よくある問題

### ミューテーション後もリストが古いデータのまま

ミューテーションが `action` を通っていないため、何も再検証されませんでした。イベントハンドラーから直接呼ばれたサーバー関数はデータベースを更新しますが、キャッシュはそのままです。
`action` でラップし、フォームまたは `useAction` 経由で送信してください。
アクションなのに一部のリストだけが古い場合は、レスポンスが `revalidate` をそのリストのクエリを含まないキーに絞ったためです。キーを追加するか、キーなしの `reload()` を返してすべてを再検証してください。

### クエリ実行時に `'use' router primitives can be only used inside a Route`

リアクティブなスコープ内での `query` の読み取りはルーターにバインドされるので、`<Router>` の外で読み取るコンポーネント、たとえば `App` 内でその隣にあるものは、このエラーをスローします。
読み手をルーターの関数の子要素かルートコンポーネントの内側に移してください。

### アクションは実行されたのに `useSubmissions` に何も表示されない

アクションが何も返さなかったか、リダイレクトしました。
結果またはエラーを生成した送信だけがリストに入ります。void のものを含むすべての完了を観測するには `.onSettled` を登録してください。

### 本番環境でエラーメッセージが `Internal Server Error` になる

アクションが素の `Error` をスローしました。
ブラウザにメッセージを送るには `markSafeError` でラップするか、バリデーションの問題を `respond(issues, { status: 400 })` でスローしてください。返されたエンベロープはエラーではなく成功した結果です。

## まとめ

- 読み取りは `query(fn, "name")` で一度だけ宣言します。名前と引数が、2つの読み手が共有するキャッシュキーです。
- 読み取りはルートの `preload` で `void` を付けて開始し、ページではメモ経由で読み取ります。`props.data` は一度だけキャプチャされます。
- ミューテーションは `action` でラップし `<form method="post" action={...}>` で送信すれば、JavaScript が読み込まれる前から動きます。
- ミューテーションに必要なものはすべてフォームに入れるか `.with()` でバインドします。
- 進行中は `form[aria-busy]`、失敗は `useSubmissions`、楽観的な状態は楽観的ストア上の `.onSubmit` で表示します。
- ユーザーに見せるべきメッセージは `markSafeError` をスローするか `respond()` でスローします。
- 再検証は `reload`、`respond`、`redirect` のオプションで絞ります。キーがなければ全クエリが再検証されます。

## 次のステップ

- [フォーム](/guides/forms)：ルーターアクションを使った完全なフォーム。JavaScript なしの場合からインラインバリデーションまで。
- [サーバーレンダリングとハイドレーション](/routing/solid-router/server-rendering)：クエリ結果のハイドレーションとシングルフライトのミューテーション。
- [データフェッチのパターン](/guides/data-fetching-patterns)：検索、ページネーション、共有、ポーリング、失敗の扱い。ルーターあり・なし両方。
- [保護されたルート](/guides/protected-routes#redirect-before-render)：ページが描画される前に未ログインの訪問者をリダイレクトする `preload` と `query`。
