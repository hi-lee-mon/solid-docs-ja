---
title: "状態管理"
version: "2.0"
description: "ストアフロントの各状態がどこに置かれるべきか（コンポーネント、コンテキストプロバイダー、URL、サーバーのいずれか）を決め、サーバーでも実行されるコードではモジュールスコープに置かないようにします。"
---

[Thinking in Solid](/docs/guides/thinking-in-solid.md) の検索ページは、`Search` コンポーネント内で作成されたカート件数で終わりました。
ヘッダーはすべてのページでその件数を表示するため、別の場所へ移す必要があります。
同じ問題は、サインイン中の顧客名、リロード後も残るべき検索フィルター、商品カタログ、そして **Remove item?** ダイアログの開閉フラグにも当てはまります。

それぞれに正しい置き場所が1つずつあり、間違った置き場所は症状として現れます。ページ遷移でリセットされる件数、リロードで消えるフィルター、ユーザーが移動した後も開いたままのダイアログ、別の来訪者のものになっているカートなどです。
このガイドでは置き場所を1つずつ見ていき、最後に判断リストを示します。

## 状態の5種類

| 種類                | ストアフロントでの例                            | 置き場所                                              |
| ------------------- | --------------------------------------------- | ----------------------------------------------------- |
| ローカル            | ダイアログの開閉フラグ、ホバー中の行           | それをレンダーするコンポーネント内のシグナルまたはストア |
| サブツリーで共有    | ヘッダーとチェックアウトから読まれるカート      | プロバイダー内で作成し、コンテキスト経由で読み取るストア |
| アプリ全体で共有    | 現在の顧客、テーマ                            | 同じプロバイダーを `App` のルートに配置                 |
| URL 内              | 検索クエリ、カテゴリ、並び順、ページ            | `useSearchParams` で読み取る検索パラメータ              |
| サーバー上          | カタログ、注文、セッション                      | サーバー関数。クライアントが持つのはコピーではなくビュー |

最初の3つは、プロバイダーを置く場所が違うだけです。
最後の2つは Solid の状態としては一切保持されません。URL とサーバーがそれらを所有し、コンポーネントはルーターのプリミティブかサーバー関数を通して読み取ります。

## ローカルな状態はローカルに保つ

**Remove item?** ダイアログに必要なのは1つの真偽値です:

```tsx
import { Show, createSignal } from "solid-js";

function RemoveButton(props: { onConfirm: () => void }) {
	const [open, setOpen] = createSignal(false);

	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>
				Remove
			</button>
			<Show when={open()}>
				<dialog open>
					<p>Remove this item?</p>
					<button type="button" onClick={() => setOpen(false)}>
						Keep
					</button>
					<button
						type="button"
						onClick={() => {
							setOpen(false);
							props.onConfirm();
						}}
					>
						Remove
					</button>
				</dialog>
			</Show>
		</>
	);
}
```

**Remove** をクリックするとダイアログが表示され、**Keep** をクリックすると閉じます。
その行がリストから削除されると `RemoveButton` は破棄されシグナルも一緒に消えるため、次の行のダイアログは閉じた状態で始まります。

`open` を必要とするものは他にないので、他の何にも見えないようにすべきです。
コンポーネント内で作成された状態はそのコンポーネントに所有されます。コンポーネントがページから離れるとき Solid が破棄し、新しいインスタンスには新しい値が入ります。
破棄の対象範囲は [オーナーシップ](/docs/concepts/reactivity.md#ownership) で説明しています。

値を持ち上げるのは、2つ目のコンポーネントがそれを必要とするときだけです。
カートページでも、1つのダイアログが開いている間は他のすべての **Remove** ボタンを無効にしたい場合、`open` はリストコンポーネントに移され、prop として各行に渡されます。
props はそれ自体がリアクティブなので、持ち上げた値のコストは渡すための2行だけです。理由は [props](/docs/concepts/components-and-jsx.md#props) を参照してください。

## コンテキストで共有する

ヘッダーのバッジとチェックアウトページはツリー上で離れており、間にあるすべてのレイアウトにカートを通していくと、各レイアウトが使いもしないカートを知ることになります。
カートをプロバイダー内で一度だけ作成し、両方から読み取らせます:

```tsx
// src/cart.tsx
import {
	action,
	createContext,
	createStore,
	refresh,
	useContext,
	type ParentProps,
} from "solid-js";
import { addToCart, getCart } from "./data/cart";

type CartItem = { id: string; name: string; quantity: number };

function createCart() {
	const [cart] = createStore(() => getCart(), { items: [] as CartItem[] });

	const add = action(function* (item: CartItem) {
		yield addToCart(item.id);
		refresh(cart);
	});

	return { cart, add };
}

const CartContext = createContext<ReturnType<typeof createCart>>();

export function CartProvider(props: ParentProps) {
	return <CartContext value={createCart()}>{props.children}</CartContext>;
}

export function useCart() {
	return useContext(CartContext);
}
```

```tsx
export default function App() {
	return (
		<Router>
			{(props) => (
				<CartProvider>
					<Header />
					<Loading fallback={<main>Loading…</main>}>{props.children}</Loading>
				</CartProvider>
			)}
		</Router>
	);
}
```

```tsx
function Header() {
	const { cart } = useCart();
	return (
		<Loading fallback={<span>Cart</span>}>
			<span>Cart ({cart.items.length})</span>
		</Loading>
	);
}
```

検索ページからチェックアウトページへ遷移しても、バッジは数値を保持します。
`createCart()` は `App` のレンダー時に `CartProvider` 内で一度だけ実行されました。その配下のページは遷移のたびに入れ替わりますが、プロバイダーは残り続けます。

[`createContext`](/docs/reference/solid-js/components-context/create-context.md) が返すコンテキストオブジェクトはプロバイダーコンポーネントでもあり、children 用のスコープ付きオーナーを作成します。
`useCart()` は、間にあるどのコンポーネントにも prop を付けずに、プロバイダー配下のどこからでも同じオブジェクトを返します。
この形は [コンポーネント間での状態の共有](/docs/concepts/reactivity.md#share-state-between-components) で紹介しています。この節の残りでは `value` に何を入れるかを扱います。

### スナップショットではなくストアかアクセサーを渡す

プロバイダーは `value` を作成時に一度だけ読み取ります。
その時点でオブジェクトに入っているものが、すべてのコンシューマーが受け取るものになります:

```tsx
// Avoid: the count is read here, once, and the consumers get a number
<CartContext value={{ count: cart.items.length }}>

// Prefer: the consumers read the store themselves, in their own tracking scopes
<CartContext value={{ cart, add }}>
```

`Avoid` の方を実行してアイテムを追加すると、プロバイダーの `value` 式を二度目に実行するものは何もないため、バッジはプロバイダーが実行されたときに見た数値のままになります。
`Prefer` の方では `cart` はストアのプロキシであり、ヘッダー内の `cart.items.length` は追跡される読み取りで、長さが変わると更新されます。
ルールは props に適用されるものと同じです。リアクティブな値を渡し、使う場所で読み取ってください。

### デフォルト値かスローされるエラーか

デフォルトなしの `createContext<T>()` はプロバイダーを必須にします。その外側での `useContext` は `ContextNotFoundError` をスローし、戻り値の型は `undefined` を含まない `T` になるため絞り込みは不要です。
リアクティブな状態を運ぶものにはこれが正しい形です。`undefined` と静かに読み取れるカートは、最初の読み取りでスローするものよりも発見が遅れるバグだからです。

`createContext<T>(defaultValue)` はプロバイダーの外側ではデフォルト値を返します。
これは意味のあるフォールバックを持つプリミティブ（テーマ名やロケールなど）に限ってください。テストやストーリーで単体レンダーされるコンポーネントでも動作すべき場合に使います。

:::deep-dive[コンテキストの読み取りはどう解決されるか]
各オーナーは親から継承したコンテキストのレコードを持ちます。
`useContext` は現在のオーナーのレコードでコンテキストを検索します。エントリが `undefined` ならコンテキストのデフォルト値にフォールバックし、それも `undefined` なら `ContextNotFoundError` をスローします。
プロバイダーは自身が作成するオーナー用にレコードの新しいコピーへ `value` を書き込むため、兄弟や祖先からは見えず、同じコンテキストのネストされたプロバイダーは自身のサブツリーの値だけを置き換えます。
この検索にはオーナーが必要です。だからこそ `useContext` はイベントハンドラー内ではなくコンポーネントのセットアップ中に呼び出します。
:::

## モジュールレベルの状態とサーバー

カートを共有する最短の方法は、モジュールからエクスポートすることです:

```ts
// Avoid: one store object for every request the server ever handles
export const [cart, setCart] = createStore({ items: [] as CartItem[] });

// Prefer: one store per client, created when the provider runs
function createCart() {
	const [cart, setCart] = createStore({ items: [] as CartItem[] });
	return { cart, setCart };
}
```

`ssr: true` のプロジェクトで `Avoid` の方を実行してみてください。
生成されたサーバーエントリーは、エントリーの読み込み時に一度だけ `App`（そしてそれを通してこのモジュール）をインポートし、各リクエストは同じインポート済みの `App` で `renderToStream` を呼び出します。
サーバー上で `createStore(value)` はオブジェクトそのものを返し、そのセッターはオブジェクトをその場で変更して `[SERVER_WRITE]` の警告を出します。そのため、あるリクエストのレンダー中に行われた書き込みが、次のリクエストで読み取られるものになります。
来訪者ごとに1つではなく、サーバー全体で1つのカートになってしまいます。

`Prefer` の方は `createStore` を `createCart()` 内で実行し、それをプロバイダーがレンダー中に呼び出します。
これはクライアントではブラウザータブごとに1回、サーバーではリクエストごとに1回実行され、各インスタンスはそのプロバイダーに所有され、一緒に破棄されます。

サーバー関数から派生したモジュールスコープのストアは、もっと早い段階で失敗します:

```ts
// Avoid: runs while the module loads, with no request in scope
export const [cart] = createStore(() => getCart(), { items: [] as CartItem[] });
```

サーバー上ではストアが作成されるとすぐ、モジュールがまだ評価中の段階で派生が実行され、プロセス内の `getCart()` 呼び出しはリクエストイベントがまだ存在しないため `Cannot call server function outside of a request` をスローします。これが現れる他の場面は [サーバー関数](/docs/building-apps/server-functions/index.md#cannot-call-server-function-outside-of-a-request-on-the-server) に一覧があります。
`createCart()` 内では同じ行がリクエスト中、ミドルウェアが装飾したリクエストイベントの下で実行されるため、`getCart()` 内の `getRequestEvent()?.locals.userId` は正しい顧客を指します。

:::note[サーバーレンダリングを使わないプロジェクト]
`ssr: true` を付けずにビルドされたプロジェクトでは、モジュールはブラウザータブごとに1回評価され、モジュールスコープのストアはタブごとに1つのストアになります。そこではそれがアプリ全体の状態の意味するところです。
代償は移植性です。`ssr: true` を追加した日に、同じファイルがサーバーでも一度読み込まれ、ストアは上で説明した共有オブジェクトになります。
最初からプロバイダー内で作成しておけば、その作業は不要になります。
:::

定数はモジュールスコープに置いて問題ありません。
カテゴリリスト、通貨フォーマッター、`createContext` 呼び出しには来訪者ごとの状態がなく、サーバーで1つのコピーが共有されるのは意図された動作です。

## URL 内の状態

検索フィルターはシグナルに置かれていたため、リロードで消え、共有リンクは空の検索を開きました。
ユーザーがどのページを見ているかを表す値は URL に置くべきです:

```tsx
import { For, createMemo, latest } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { searchProducts } from "../data/products";

export default function Search() {
	const [search, setSearch] = useSearchParams();

	const results = createMemo(() => {
		const text = String(search.q ?? "").trim();
		const category = String(search.category ?? "all");
		if (!text) return [];
		return searchProducts(text, { category, inStockOnly: false });
	});

	return (
		<>
			<input
				type="search"
				value={latest(() => String(search.q ?? ""))}
				onInput={(event) => setSearch({ q: event.currentTarget.value })}
			/>
			<select
				value={latest(() => String(search.category ?? "all"))}
				onChange={(event) => setSearch({ category: event.currentTarget.value })}
			>
				<option value="all">All</option>
				<option value="kitchen">Kitchen</option>
			</select>
			<ul>
				<For each={results()}>{(product) => <li>{product.name}</li>}</For>
			</ul>
		</>
	);
}
```

`mug` と入力して **Kitchen** を選ぶと、アドレスバーは `/search?q=mug&category=kitchen` になります。
リロードしても同じ結果が戻り、URL を別のタブに貼れば同じ検索で開きます。

`setSearch` は渡されたキーを現在のクエリ文字列にマージしてスクロールなしで遷移するため、`q` と `category` を2つのハンドラーから互いに消し合うことなく設定できます。
`search.q` はストアのプロパティと同様のリアクティブな読み取りなので、**戻る** を含め URL が変わるとメモが再実行されます。
2つのコントロールが `latest` 経由で読み取るのは、`results` がフェッチしている間 URL への書き込みが保留されるためで、ユーザーが触れたコントロールは古いリストが待っている間に新しい値を表示すべきだからです。この組み合わせは [入力を今すぐ表示する](/docs/concepts/async-reactivity.md#show-the-input-now-latest) で説明しています。
スキーマがなければすべての値は文字列または文字列の配列です。ルートの `search` スキーマが `"2"` を `2` に変えてデフォルト値を与える方法は [検索パラメータの型付け](/docs/routing/solid-router/navigation.md#type-search-parameters) を参照してください。

:::caution[検索パラメータはユーザー入力です]
クエリ文字列の値はユーザー入力です。
`String(search.category ?? "all")` は `?category=<script>` を受け入れてしまうため、サーバー関数は他の引数と同じ方法でそれを検証しなければなりません。
`searchProducts` に入れるべきチェックは [引数とセキュリティ](/docs/building-apps/server-functions/arguments-and-security.md) で説明しています。
:::

ページ上のすべてが URL に属するわけではありません。
ダイアログの開閉フラグ、ホバー中の行、送信前にフォームフィールドへ入力されたテキストはローカルな状態です。判断基準は、共有リンクでそれが再現されるべきかどうかです。

## サーバー上の状態

サインイン中の顧客、カタログ、注文履歴はデータベースとセッションクッキーに存在します。
クライアントがそれらを持つことはありません。持つのはサーバー関数が返したビューです:

```ts
// src/data/account.ts
import { getRequestEvent } from "@solidjs/web";
import { database } from "../server/database";

export async function getCurrentUser() {
	"use server";
	const userId = getRequestEvent()?.locals.userId;
	if (!userId) return null;
	return database.customers.find(userId);
}
```

```tsx
// src/components/Header.tsx
import { Loading, Show, createMemo } from "solid-js";
import { getCurrentUser } from "../data/account";

export function Header() {
	const user = createMemo(() => getCurrentUser());

	return (
		<Loading fallback={<span />}>
			<Show when={user()} fallback={<a href="/sign-in">Sign in</a>}>
				{(current) => <span>{current().name}</span>}
			</Show>
		</Loading>
	);
}
```

サインアウトした状態でページを読み込むと、ヘッダーは **Sign in** を表示します。
サインインすると、次のリクエストはセッションクッキーを運びます。ミドルウェアが `getSession()` から `event.locals.userId` を設定し、`getCurrentUser()` が顧客を見つけ、ヘッダーが名前をレンダーします。
どのコンポーネントもクッキーを見ることはありません。

`user` はユーザーのコピーではなく、Promise のメモです。
サーバー側で `getCurrentUser()` の返す内容が変わっても、再読み取りされるまでビューは古いままです。名前変更アクションの後の `refresh(user)`、またはサインアウト後の完全な遷移が必要です。
クッキー、ミドルウェア、サインイン・サインアウト関数は [セッションと認証](/docs/building-apps/sessions-and-auth.md) が扱います。このようなビューの上に、第2の情報源にならずに楽観的レイヤーを重ねる方法は [ミューテーション](/docs/concepts/mutations.md) を参照してください。

メモはそれを読む側がある場所に置いてください。
`App` はヘッダーを一度だけレンダーするため、`Header` 内のメモはアプリごとに1回作成されます。ユーザーを必要とする商品ページは、サーバー関数を二度目に呼ぶのではなく、カートの隣のプロバイダー経由で読み取るべきです。

## 判断する

次を順に尋ね、最初の「はい」で止めてください:

1. 共有リンクやリロードでそれを再現すべきですか？
   検索パラメータに置いてください。
2. データベースやセッション由来のため、サーバーが所有していますか？
   サーバー関数を通してメモか関数から作成したストアに読み取り、アクションを通して変更してください。
3. 読み書きするコンポーネントが正確に1つですか？
   そのコンポーネント内にシグナルかストアを作成してください。
4. 近くにある2つのコンポーネントが必要としますか？
   共通の親で作成し、props として渡してください。
5. 離れたコンポーネントやすべてのページが必要としますか？
   プロバイダー内で作成し `useContext` で読み取ってください。アプリ全体の状態にはプロバイダーを `App` のルートに置いてください。

モジュールスコープはこのリストにありません。
定数と `createContext` 呼び出し自体にだけ使ってください。

## よくある問題

### `useContext` が `ContextNotFoundError` をスローする

コンポーネントがプロバイダーの外でレンダーされたか、プロバイダーが読み取り側よりツリーの下にあります。
開発環境ではメッセージは `Context must either be created with a default value or a value must be provided before accessing it.` と表示されます。
プロバイダーを上に移動してください（通常は `App` へ）。値がリアクティブな状態のとき、デフォルト値を追加するのは修正ではなく間違いを隠すだけです。

### `Context can only be accessed under a reactive root`

`useContext` がイベントハンドラーやコールバックから呼び出されました。そこにはコンテキストを検索するオーナーがありません。
コンポーネントのセットアップ中に呼び出し、結果をハンドラーがクロージャーで捕捉する変数に保持してください。

### ヘッダーが別の顧客のカート件数を表示する

サーバーレンダリングを使うプロジェクトでモジュールスコープにストアが作成されたため、1つのオブジェクトがすべてのリクエストに応答し、あるレンダー中の書き込みが次に見えてしまいました。
`createStore` 呼び出しをプロバイダーかコンポーネントに移し、信頼できる情報源は `event.locals` から顧客を読むサーバー関数の後ろに置いてください。

### ページをリロードするとフィルターが消える

フィルターがシグナルに置かれていました。シグナルは読み込みのたびに初期値から始まります。
`useSearchParams` で読み書きして URL に持たせてください。[URL 内の状態](#state-in-the-url) を参照。

### コンテキストの値が更新されない

プロバイダーに `value={{ count: cart.items.length }}` のようなスナップショットが渡されました。これはプロバイダー実行時に一度だけ読み取られます。
ストア、アクセサー、関数のいずれかを渡し、コンシューマー側で読み取ってください。[スナップショットではなくストアかアクセサーを渡す](#pass-a-store-or-accessors-not-a-snapshot) を参照。

## まとめ

- 状態はそれを読むコンポーネント内で作成し、2つ目のコンポーネントが必要とするときだけ親に持ち上げてください。
- 離れたコンポーネント間の状態共有は、ストアを作成するプロバイダーとその配下の `useContext` の読み取りで行います。アプリ全体の状態にはプロバイダーを `App` のルートに置いてください。
- コンテキストにはストア・アクセサー・関数を渡してください。プロバイダーは `value` を一度だけ読み取ります。
- リアクティブな状態にはデフォルトなしの `createContext<T>()` を使い、プロバイダーが無ければスローされるようにしてください。
- サーバーで実行されるコードではモジュールスコープにシグナルやストアを作成しないでください。モジュールは一度だけ読み込まれ、1つのオブジェクトがすべてのリクエストに応答してしまいます。
- 共有リンクで再現すべきものはすべて `useSearchParams` で検索パラメータに置いてください。
- サーバーが所有するデータはサーバー関数を通してメモかストアに読み取ってください。クライアントが持つのはビューであり、`refresh` で再読み取りします。

## 次のステップ

- [ミューテーション](/docs/concepts/mutations.md): `action`、`createOptimisticStore`、`refresh` によるサーバー所有の状態への書き込み。データの第2のコピーなしに重ねられます。
- [セッションと認証](/docs/building-apps/sessions-and-auth.md): `event.locals.userId` がどう設定され、各サーバー関数がどうそれを確認するか。
- [ナビゲーションと型付きパス](/docs/routing/solid-router/navigation.md): スキーマによる型付き検索パラメータと、状態としての URL の残りの部分。
- [レンダリングと SSR](/docs/concepts/rendering-and-ssr.md): サーバーとクライアントの両方で実行されるコードに関する他のルール。
