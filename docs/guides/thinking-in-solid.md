---
title: "Thinking in Solid"
version: "2.0"
description: "ストアフロントの商品検索をエンドツーエンドで構築しながら、各ステップで React や Vue の開発者なら何に手を伸ばすか、そして Solid では代わりに何をするかを見ていきます。"
---

ストアフロントには検索ページが必要です。テキストボックス、カテゴリーフィルター、サーバーから取得した一致する商品のリスト、そしてヘッダーのカートバッジを更新する各行の **Add to cart** ボタンです。
React や Vue でこれを作ったことがあれば、すでに頭の中に設計があります。クエリ用の状態、メモ化したフィルター、フェッチを行うエフェクト、ローディングフラグ、そしてリクエスト成功後の状態更新です。

このガイドでは同じページを Solid で構築し、各ステップでその設計のどの部分が持ち越せないかを説明します。
[クイックスタート](/docs/getting-started/quick-start.md)では、ここでのすべてが従う唯一のルールを示しました。コンポーネントは 1 回だけ実行され、更新されるのは JSX・メモ・エフェクトの計算関数の内部で行われた読み取りです。

## マークアップから始める

まず静的なリストから始めます。

```tsx
// src/routes/search.tsx
import { For } from "solid-js";

type Product = {
	id: string;
	name: string;
	price: number;
	category: string;
	inStock: boolean;
};

const catalog: Product[] = [
	{ id: "mug", name: "Mug", price: 12, category: "kitchen", inStock: true },
	{ id: "tee", name: "T-shirt", price: 20, category: "apparel", inStock: true },
	{ id: "cap", name: "Cap", price: 15, category: "apparel", inStock: false },
];

export default function Search() {
	return (
		<main>
			<h1>Products</h1>
			<ul>
				<For each={catalog}>
					{(product) => (
						<li>
							{product.name} ${product.price}
						</li>
					)}
				</For>
			</ul>
		</main>
	);
}
```

ページを読み込むと 3 行がレンダーされます。
`Search` はこのとき唯一の 1 回の実行を終えています。このページ上のどの要素もそれを再実行させません。

React ではコンポーネント関数がそのままレンダーであり、状態が変わるたびに先頭から再実行されます。
Vue では `setup` 関数は 1 回だけ実行されますが、読み取ったリアクティブな状態が変わるとテンプレートが再レンダーされます。
Solid では 2 回目の実行を想定する必要はありません。関数はページをセットアップして JSX を返し、それ以降はその JSX 内の各式が自分自身を最新の状態に保ちます。
これを実現するためにコンパイラが JSX をどう処理するかは [コンポーネントと JSX](/docs/concepts/components-and-jsx.md#how-jsx-executes) で説明しています。

## 変化する状態を追加する

クエリは、ユーザーがキー入力のたびに置き換える文字列です。
フィルターは、ページの異なる部分が読み取る 2 つのフィールドを持つオブジェクトです。

```tsx
import { For, createSignal, createStore } from "solid-js";

export default function Search() {
	const [query, setQuery] = createSignal("");
	const [filter, setFilter] = createStore({
		category: "all",
		inStockOnly: false,
	});

	return (
		<main>
			<input
				type="search"
				onInput={(event) => setQuery(event.currentTarget.value)}
			/>
			<select
				onChange={(event) =>
					setFilter((draft) => {
						draft.category = event.currentTarget.value;
					})
				}
			>
				<option value="all">All</option>
				<option value="kitchen">Kitchen</option>
				<option value="apparel">Apparel</option>
			</select>
			<label>
				<input
					type="checkbox"
					checked={filter.inStockOnly}
					onInput={(event) =>
						setFilter((draft) => {
							draft.inStockOnly = event.currentTarget.checked;
						})
					}
				/>
				In stock only
			</label>
			<p>
				Showing {filter.category} products matching "{query()}"
			</p>
			{/* the list from above */}
		</main>
	);
}
```

`m` と入力するとコントロール下の文が変わります。**Apparel** を選ぶと同じ文が再び変わります。
変更された値を読み取っている 2 つの式だけが更新され、ページの他の部分には一切触れられません。
**In stock only** にチェックを入れても、まだ見た目は何も変わりません。チェックボックス自身以外に `filter.inStockOnly` を読み取るものがページ上にないからです。

2 つのプリミティブの使い分けは、値がどう読み取られるかで決まります。
`createSignal` は 1 つの単位として読み取られ・置き換えられる値を保持し、そのゲッターは呼び出して使います（`query()`）。
`createStore` は部分ごとに読み取られるオブジェクトや配列を保持し、そのプロパティは値として読み取ります（`filter.category`）。
React のプリミティブは `useState` の 1 つだけで、オブジェクトか文字列かの問題は各更新でどれだけコピーするかという話になります。Vue には `ref` と `reactive` があり、それぞれシグナルとストアにほぼ対応します。
ドラフトセッターとプロパティ単位の追跡については [ストア](/docs/concepts/stores.md) で詳しく説明しています。

:::note[読み取りがどこで起きるかがモデルのすべてです]
JSX 内の `query()` は、そのテキストノードだけをシグナルに購読させます。
同じ呼び出しをコンポーネント本体で行うとセットアップ時に 1 回だけ実行され、文は二度と変わりません。そのような場合、開発ビルドは `[STRICT_READ_UNTRACKED]` を出力します。
追跡スコープについては [リアクティビティ](/docs/concepts/reactivity.md#signals) で説明しています。これは React や Vue の開発者が新たに身につける必要のある唯一の概念です。
:::

## それ以外はすべて派生させる

リストにはクエリとフィルターに一致する商品を表示し、見出しにはその件数を表示したいとします。
他のフレームワークでの定石は、1 つ目の状態と同期を保つ 2 つ目の状態を持つことです。

```tsx
import { createEffect, createMemo, createSignal } from "solid-js";

type Filter = { category: string; inStockOnly: boolean };

function matches(product: Product, text: string, filter: Filter) {
	return (
		(filter.category === "all" || product.category === filter.category) &&
		(!filter.inStockOnly || product.inStock) &&
		product.name.toLowerCase().includes(text.toLowerCase())
	);
}

// Avoid: a second signal, filled by an effect whenever the inputs change
const [filtered, setFiltered] = createSignal<Product[]>([]);
createEffect(
	() => catalog.filter((product) => matches(product, query(), filter)),
	(list) => setFiltered(list)
);

// Prefer: derive the list where it is read
const filtered = createMemo(() =>
	catalog.filter((product) => matches(product, query(), filter))
);
const count = () => filtered().length;
```

`Avoid` 版を実行して 1 文字入力してみます。
コントロール下の文はキー入力が引き起こしたフラッシュで更新されます。エフェクトはそのフラッシュの後に実行されて `filtered` に書き込むため、リストは次のフラッシュで更新されます。その結果、1 フレームの間、ページには新しいクエリと古いリストが並んで表示されます。
attribution を有効にすると、開発ビルドはこのパターンを `[EFFECT_RELAY_TEAR]` と名付けます。そのレポートと、同じ問題が取る他の形については [不要なエフェクトを避ける](/docs/guides/avoid-unnecessary-effects.md#calculate-values-when-they-are-read) を参照してください。

`Prefer` 版には 2 つ目のコピーはありません。
`createMemo` は関数を追跡スコープ内で実行するため、`matches` 内で行われる `query()`・`filter.category`・`filter.inStockOnly` の読み取りがそのまま依存関係リストになります。書くべき配列はなく、同期を保つべきものもありません。
React の `useMemo` では `[query, filter]` を明示する必要があり、変わった項目を伴ってコンポーネントが再レンダーされたときに再計算されます。Vue の `computed` が、ここでのメモの動作に最も近い対応物です。

`count` はメモではなく素の関数です。
読み取り側が 1 つだけなので、読み取り場所で再計算してもコストはかかりません。メモにはノードと等値チェックのコストがかかり、複数の読み取り側が結果を共有するときにそのコストが報われます。
この使い分けについては [派生値](/docs/concepts/reactivity.md#derived-values) で説明しています。

このメモは、カタログが保持しているのと同じ商品オブジェクトをフィルタリングして返します。
`For` はオブジェクトの同一性で行をキー付けするため、結果に残った商品は同じ `<li>` を保ちます。派生したコレクションが実行のたびに新しいオブジェクトから構築される場合は、代わりに [プロジェクション](/docs/concepts/stores.md#derive-a-store-with-a-projection) を使って `id` で行を照合します。

## サーバーから読み取る

カタログはデータベースに置かれています。
サーバー関数で検索をそちらに移し、メモから呼び出します。

```ts
// src/data/products.ts
import { database } from "./database";

export async function searchProducts(
	query: string,
	filter: { category: string; inStockOnly: boolean }
) {
	"use server";
	return database.products.search({ query, ...filter });
}
```

```tsx
// src/routes/search.tsx
import {
	For,
	Loading,
	createMemo,
	createSignal,
	createStore,
	isPending,
} from "solid-js";
import { searchProducts } from "../data/products";

export default function Search() {
	const [query, setQuery] = createSignal("");
	const [filter, setFilter] = createStore({
		category: "all",
		inStockOnly: false,
	});

	const results = createMemo(() => {
		const text = query().trim();
		const current = {
			category: filter.category,
			inStockOnly: filter.inStockOnly,
		};
		if (!text) return [] as Product[];
		return searchProducts(text, current);
	});

	return (
		<main>
			{/* the input and select from above */}
			<Loading fallback={<p>Searching…</p>}>
				<ul class={{ stale: isPending(results) }}>
					<For each={results()} fallback={<li>No products match.</li>}>
						{(product) => (
							<li>
								{product.name} ${product.price}
							</li>
						)}
					</For>
				</ul>
			</Loading>
		</main>
	);
}
```

`mug` と入力します。
キーストロークごとに 1 つ、合計 3 つのリクエストが開始されます。リストには `mug` に対する答えだけが表示され、各答えが届くまでの間、前のリストが `stale` クラス付きで画面に残ります。
メモが初めて Promise を返したとき、`Loading` バウンダリがリストの代わりに **Searching…** を表示します。最初の答えが返った後、フォールバックが再び現れることはありません。

メモが Promise を返す。変更はそれだけです。
`results()` の読み取り側が見るのは `Promise` でも `undefined` でもなく `Product[]` です。まだ準備できていない値を読み取った式は待機し、その間に何をレンダーするかは最も近い `Loading` バウンダリが決めます。
古くなった実行への答えは破棄されるため、リクエストカウンターも `AbortController` も必要ありません。
キーストロークから答えが届くまでの間に何が起きるかは [非同期リアクティビティ](/docs/concepts/async-reactivity.md) で説明しています。古いリストを保持したまま `value` に新しいテキストを表示する制御付き入力向けの `latest` もそこで扱っています。

React ではこの節は、フェッチ・結果の状態・ローディング状態・古いレスポンスを無視するフラグを持つ `useEffect` か、それら 4 つを隠すデータフェッチングライブラリになります。
Vue では同じ組の ref を伴う、クエリへの `watch` になります。
Solid ではリクエスト自体が派生値であり、ローディング状態と stale 状態はそれに対する問い合わせです。ここでは `isPending(results)`、最初の答えには `Loading` バウンダリです。

:::tip[クエリが空ならリクエストもなし]
`if (!text) return []` は確定済みの値を同期的に返すため、ボックスが空ならフォールバックが表示されることも、サーバーへの問い合わせもありません。
ガードは、すべてのリアクティブな入力を読み取った後・呼び出しの前に置きます。関数自体が `async` のときに順序が重要になる理由は [最初の await の前にすべての入力を読み取る](/docs/concepts/async-reactivity.md#read-every-input-before-the-first-await) で説明しています。
:::

サーバーレンダリング中は、同じ `searchProducts(text, current)` 呼び出しが HTTP リクエストなしで現在のプロセス内で実行されます。ブラウザではサーバー関数エンドポイントへの `POST` になります。
転送の仕組みと呼び出し側が送れるものについては [サーバー関数](/docs/building-apps/server-functions/index.md) で説明しています。

## 書き戻す

各行に **Add to cart** ボタンを付け、ヘッダーのバッジが商品数を数えるようにします。
カウントはサーバーのデータですが、クリックは即座に表示に反映したいとします。

```ts
// src/data/cart.ts
import { getRequestEvent, redirect } from "@solidjs/web";
import { database } from "./database";

export async function getCart() {
	"use server";
	const userId = getRequestEvent()?.locals.userId;
	if (!userId) return { items: [] };
	return database.cart.forUser(userId);
}

export async function addToCart(productId: string) {
	"use server";
	const userId = getRequestEvent()?.locals.userId;
	if (!userId) throw redirect("/sign-in");
	await database.cart.add(userId, productId);
}
```

```tsx
// src/routes/search.tsx
import { Loading, action, createOptimistic, refresh } from "solid-js";
import { addToCart, getCart } from "../data/cart";

export default function Search() {
	// query, filter, and results from above

	const [cartCount, setCartCount] = createOptimistic(async () => {
		const cart = await getCart();
		return cart.items.length;
	});

	const add = action(function* (productId: string) {
		setCartCount((count) => count + 1);
		yield addToCart(productId);
		refresh(cartCount);
	});

	return (
		<main>
			<header>
				<Loading fallback={<span>Cart</span>}>
					<span>Cart ({cartCount()})</span>
				</Loading>
			</header>
			{/* the input, select, and list from above, with a button in each row: */}
			<button type="button" onClick={() => void add(product.id)}>
				Add to cart
			</button>
		</main>
	);
}
```

**Add to cart** をクリックすると、バッジが即座に 2 から 3 になります。
`addToCart` が解決すると `refresh(cartCount)` がサーバーへ再問い合わせし、バッジはサーバーが持つ値を表示します。両者が一致していれば、見た目は何も変わりません。
リクエストが拒否された場合、バッジは 2 に戻ります。そのためのコードを書く必要はありません。

`yield` の前の書き込みが暫定的なのは、[`createOptimistic`](/docs/reference/solid-js/reactivity/create-optimistic.md) の値に対する [`action`](/docs/reference/solid-js/lifecycle-actions/action.md) 内で行われるからです。即座に表示され、アクションが確定すると Solid がそれを破棄します。
ジェネレーターの本体が、往復をまたいで書き込みと再取得を 1 つのトランザクションに保つ仕組みです。
[ミューテーション](/docs/concepts/mutations.md) では `createOptimisticStore` を使ってカート全体にこの仕組みを組み立て、アクション内の素の `await` がなぜトランザクションから外れてしまうかを説明しています。

React ではこれは、状態更新・リクエスト・そして 2 回目の状態更新または `catch` でのロールバック、あるいはトランジション内の `useOptimistic` です。
Vue では同じ手順を手で書くことになります。
Solid では、同期的な書き込みがすでに期待される結果を表しており、アクションがそれをどれだけ長く保つかを決めます。

:::caution[カウントは検索ページではなくカートのものです]
`cartCount` と `add` は `Search` 内で作成されるため、ユーザーがページを離れると破棄され、次の訪問で再作成されます。
ヘッダーはすべてのページで同じカウントを表示するため、この値はツリーのより上位で 1 回だけ作成し、コンテキストを通じて共有すべきです。
[状態管理](/docs/guides/state-management.md) でその移動を行います。
:::

## 起きなかったこと

- 依存配列は 1 つも書かれませんでした。
  メモの追跡対象の読み取りがそのまま依存関係であり、読み取りそのものなので最初から正しいものでした。
- 再レンダーを防ぐためのラップは何もされませんでした。
  `Search` は 1 回だけ実行され、スキップすべきレンダーがそもそも存在しないため、`React.memo` も `useCallback` もキーの工夫もありませんでした。
- 派生値の同期を保つエフェクトはありませんでした。
  フィルター済みリストとカウントは派生であり、このページで唯一のエフェクトは `Avoid` 版のものでした。
- ローディングフラグ・リクエストカウンター・abort コントローラーは宣言されませんでした。
  リクエストがメモの値そのものであり、`Loading` と `isPending` がその状態を読み取ります。
- ロールバックのコードは書かれませんでした。
  楽観的な書き込みは、リクエストが成功しても失敗しても、アクションが確定した時点で破棄されます。
- 状態が変わっても再実行されたコンポーネントはありませんでした。
  変更された値を読み取る各 JSX 式が、それぞれ個別に更新されました。

追加すべき習慣は [クイックスタート](/docs/getting-started/quick-start.md#make-a-change) で示した 1 つだけです。リアクティブな値は JSX・メモ・エフェクトの計算関数の中で読み取り、シグナルは読み取るときに呼び出します。

## よくある問題

### 行が最初の商品を表示したまま変わらない

行コンポーネントが props を分割代入しています（`function Row({ product })`）。
分割代入は各 prop をコンポーネント本体で 1 回だけ読み取るため、その行は作成時の値で凍結されます。
`props` は分割せずに保持し、JSX 内で `props.product.name` を読み取ります。これを可能にするコンパイル済みゲッターについては [Props](/docs/concepts/components-and-jsx.md#props) を参照してください。

### `props.query is not a function`

親が `query={query()}` を渡したため、子は文字列を受け取り、それを `props.query` として読み取っています。
動的な prop は、子が読み取ったときに親の式を実行するゲッターにコンパイルされるため、子はそれを呼び出しません。
子が関数を受け取るべき場合はアクセサー自体を渡します（`query={query}`）。その場合は `props.query()` と呼び出します。

### 値があるべき場所に `() => ` や `function` と表示される

シグナルが呼び出されないまま JSX に置かれたか、文字列に連結されています。
`{query}` ではなく `{query()}` と書きます。バリエーションについては [リアクティビティ](/docs/concepts/reactivity.md#the-page-shows-the-words-function-or---instead-of-the-value) を参照してください。

### リストが上の文より 1 キーストローク遅れる

上の `Avoid` 版のように、エフェクトが派生値をシグナルにコピーしています。
そのシグナルとエフェクトを削除し、リストをメモにします。診断手順は [不要なエフェクトを避ける](/docs/guides/avoid-unnecessary-effects.md#the-copied-value-is-one-step-behind-the-source) で説明しています。

## まとめ

- コンポーネントは 1 回だけ実行されます。関数の再実行ではなく、JSX の式が更新されることを前提に設計します。
- 全体が置き換えられる値はシグナルに保持して呼び出します（`query()`）。部分ごとに読み取るオブジェクトはストアに保持してプロパティを読み取ります（`filter.category`）。
- フィルター済みリストとカウントは読み取られる場所で派生させます。シグナルとそれを埋めるエフェクトの組み合わせは、同じ状態が 1 フラッシュ遅れたものです。
- サーバー関数の Promise はメモから返し、結果は素の配列として読み取ります。`Loading` が最初の答えを処理し、`isPending` がそれ以降を報告します。
- 非同期メモでは、すべてのリアクティブな入力をリクエストの前・先頭で読み取ります。
- 楽観的な書き込みは `createOptimistic` の値に対する `action` 内で行い、リクエストを `yield` してからソースを `refresh` します。
- `props` は分割せずに保持し、JSX 内で `props.name` を読み取ります。

## 次のステップ

- [状態管理](/docs/guides/state-management.md): カートのカウント・サインイン中のユーザー・現在のフィルターをどこに置くべきか、そしてモジュールスコープの状態を使わずに共有する方法。
- [データフェッチングパターン](/docs/guides/data-fetching-patterns.md): 制御付き入力を使った検索ボックス、ページあたり複数のリクエスト、ページネーション、再取得。
- [不要なエフェクトを避ける](/docs/guides/avoid-unnecessary-effects.md): 派生が属する場所にエフェクトが書かれがちなすべての箇所と、エフェクトが適切な 2 つのケース。
- [React からの移行](/docs/migration/from-react.md): 既存のコードベース向けのフック単位の対応表。
