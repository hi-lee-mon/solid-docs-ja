---
title: "TypeScript"
version: "2.0"
description: "ストアフロント内の any アノテーションを、props、children、アクセサー、ストアのドラフト、イベントハンドラー、ref、サーバー関数の戻り値、型付きルートのために Solid がエクスポートする型に置き換える。"
---

ストアフロントはコンパイルが通りますが、`src` 内を `any` で検索すると 6 箇所見つかります。`LineItem` の props、`Panel` の `children`、`SearchResults` に渡される `query`、`setCart` コールバック内のドラフト、`onInput` ハンドラー、そして `ref` です。
どれも、当時は意味が分からなかったエラーメッセージを黙らせるために書かれたものです。

このガイドでは、その 6 箇所を順に見て、それぞれにどのエクスポートされた型が対応するのか、間違った型を使ったときに型チェッカーが何を報告するのかを示します。
[型リファレンスのページ](/reference/solid-js/types/component-types)にエクスポートの一覧があり、[コンポーネントと JSX](/concepts/components-and-jsx#children-and-composition)で `ParentProps` を紹介しています。
このガイドはそこから出発し、それらのページで作ったカートページと商品ページの中で各型を示します。

## セットアップ

テンプレートには、Solid で重要な 3 つの設定を含む `tsconfig.json` が同梱されています。

```json
{
	"compilerOptions": {
		"jsx": "preserve",
		"jsxImportSource": "@solidjs/web",
		"strict": true
	}
}
```

`jsx: "preserve"` は JSX をそのまま残し、Vite プラグイン内の Solid コンパイラが `.tsx` と `.jsx` ファイルを自ら処理します。
`jsxImportSource` は TypeScript を `@solidjs/web/jsx-runtime` に向けます。そこには DOM レンダラーの要素・属性・イベントの型があります。
`strict` は null チェックを有効にし、最初のレンダーより先に `createSignal<Product>()` が `undefined` を報告するようにします。

## コンポーネントの props に型を付ける

コンポーネントは一つの `props` オブジェクトを受け取る関数なので、最初の選択肢はパラメータにアノテーションを付けるか、関数にアノテーションを付けるかです。

```tsx
import type { Component } from "solid-js";

type Product = { id: string; name: string; price: number };

// A function declaration with a typed parameter
function LineItem(props: { product: Product; quantity: number }) {
	return <li>{props.product.name}</li>;
}

// The same contract, as a value
const LineItem: Component<{ product: Product; quantity: number }> = (props) => (
	<li>{props.product.name}</li>
);
```

どちらも同じ JSX を受け入れ、同じ間違いを拒否します。
`Component<P>` は `(props: P) => Element` なので、コンポーネントが値として扱われる場合——マップに格納する、`dynamic()` に渡す、`lazy()` から返す——にはこちらを使います。
それ以外では関数宣言を使います。同じように読めて、インポートも不要です。

3 つのヘルパーが props 型に `children` の契約を追加します。

```tsx
import type { ParentProps, VoidProps } from "solid-js";

// children is optional
function Panel(props: ParentProps<{ title: string }>) {
	return <section>{props.children}</section>;
}

// children is forbidden
function Price(props: VoidProps<{ amount: number }>) {
	return <span>{props.amount}</span>;
}
```

`<Price amount={12}>USD</Price>` と書くと、チェッカーは `'Price' components don't accept text as child elements. Text in JSX has the type 'string', but the expected type of 'children' is 'undefined'` と報告します。
`VoidProps` がなければ、このテキストは型チェックを通過し、実行時に捨てられます。コンポーネントは自分が読み取る children しかレンダーしないからです。
`FlowProps` は 3 つ目のヘルパーで、特定の型の children を必須にします。次のセクションで登場します。

別のコンポーネントの props を再利用するには、そのコンポーネントから取得します。`function IconButton(props: ComponentProps<typeof Button> & { icon: JSX.Element })` のように書きます。
`ComponentProps<typeof Button>` は `Button` が宣言したものそのものなので、`Button` に `variant` を追加すれば、二箇所目の編集なしに `IconButton` にも追加されます。

デフォルト値と rest props は、`merge` と `omit` を通しても型を保ちます。

```tsx
import { merge, omit } from "solid-js";
import type { JSX } from "@solidjs/web";

function Button(
	_props: {
		label: string;
		variant?: "primary" | "ghost";
	} & JSX.ButtonHTMLAttributes<HTMLButtonElement>
) {
	const props = merge({ variant: "primary" } as const, _props);
	const rest = omit(props, "label", "variant");

	return (
		<button {...rest} class={props.variant}>
			{props.label}
		</button>
	);
}
```

`merge` の後、`props.variant` は `undefined` が取り除かれた `"primary" | "ghost"` になります。
`omit` の後、`rest.label` は型エラーになるので、コンポーネントが消費したものが `<button>` に漏れ出すことはありません。
どちらもリアクティビティを保持します。これが分割代入やスプレッドの代わりにこれらを使う理由です。[`merge`](/reference/solid-js/stores/merge)と[`omit`](/reference/solid-js/stores/omit)のリファレンスにシグネチャがあります。

:::pitfall[分割代入は型チェックを通っても壊れる]

```tsx
// Avoid: valid TypeScript, reads quantity once
function LineItem({ quantity }: { quantity: number }) {
	return <li>{quantity}</li>;
}

// Prefer: read the prop where it is used
function LineItem(props: { quantity: number }) {
	return <li>{props.quantity}</li>;
}
```

`Avoid` 側は警告なくコンパイルされます。パラメータの分割代入は普通の TypeScript だからです。
実行時には、親の次の `quantity` はその行に届かず、開発環境ではコンポーネント名とともに `[STRICT_READ_UNTRACKED]` が出力されます。
型は `props` の形を記述するもので、いつ読み取られるかは記述しません。コンパイラが生成するゲッターについては [Props](/concepts/components-and-jsx#props) を参照してください。
:::

## 要素と children の型

ほとんどのコンポーネントは戻り値のアノテーションを必要としません。チェッカーが JSX から推論します。
マークアップを受け取る prop やそれを返す関数など、型が必要な場合は `@solidjs/web` の `JSX.Element` を使います。

:::note[2 つのパッケージが型をエクスポートする]
`solid-js` はレンダラー非依存の型をエクスポートします。`Component`、`Element`、`ParentProps`、`Accessor`、`Store` です。
`@solidjs/web` は DOM レンダラーの `JSX` 名前空間と、タグ名も受け取れる独自の `ComponentProps` をエクスポートするので、`ComponentProps<"button">` はネイティブの button の属性型になります。
`solid-js` に `JSX` のエクスポートはありません。
`@solidjs/web` の `JSX.Element` は、コアの `Element` 型を DOM の `Node` で広げたものなので、コンポーネントは手作業で作ったノードを返すこともできます。
:::

children に値を渡すコンポーネントは、`FlowProps` でコールバックの型を宣言します。

```tsx
import { createMemo, type Accessor, type FlowProps } from "solid-js";
import type { JSX } from "@solidjs/web";

function ProductLoader(
	props: FlowProps<{ id: string }, (product: Accessor<Product>) => JSX.Element>
) {
	const product = createMemo(() => getProduct(props.id));
	return <>{props.children(product)}</>;
}

<ProductLoader id="mug">
	{(product) => <h1>{product().name}</h1>}
</ProductLoader>;
```

コールバックのパラメータは宣言から型付けされるので、`product().name` は補完が効き、`product().nmae` はエラーになります。
関数ではなく要素を渡すと、チェッカーは `Type 'Element' is not assignable to type '(product: Accessor<Product>) => Element'` と報告します。

コンポーネントが children を調べる必要がある場合、[`children`](/reference/solid-js/components-context/children)ヘルパーは `ChildrenReturn` を返します。これは `ResolvedElement[]` を返す `toArray()` を持つ `Accessor<ResolvedChildren>` です。
どちらの型も `solid-js` からエクスポートされています。

## シグナル・メモ・セッター

`createSignal` は初期値から型を推論し、引数なしの形式は `undefined` を含みます。

```tsx
import { createMemo, createSignal } from "solid-js";

const [quantity, setQuantity] = createSignal(1); // Signal<number>
const [selected, setSelected] = createSignal<string>(); // Signal<string | undefined>

setQuantity((prev) => prev + 1);
setSelected(); // clears to undefined; allowed because the type includes it

const product = createMemo(() => getProduct(props.id)); // SourceAccessor<Product>
```

`product()` は `Promise<Product>` ではなく `Product` です。
計算関数は Promise を返すことができ、メモの型は確定後の値になります。Promise が保留中の間に読み取り側に見えるものについては、[非同期リアクティビティ](/concepts/async-reactivity#a-memo-that-returns-a-promise)を参照してください。

アクセサーが props として渡される方法は 2 通りあり、それらを混同したときのエラーはこのページで最も多いものです。

```tsx
import type { Accessor } from "solid-js";

function Results(props: { query: string }) {
	return <p>{props.query}</p>;
}

// Avoid: the accessor is passed where the value is expected
<Results query={query} />;

// Prefer: read it in the attribute; the compiler makes the attribute a getter
<Results query={query()} />;
```

`Avoid` 側は `Type 'SourceAccessor<string>' is not assignable to type 'string'` と報告されます。
`Prefer` 側はリアクティブのままです。動的な属性は `props` 上のゲッターにコンパイルされるので、`Results` 内の `props.query` は使われる場所で `query()` を読み直します。
prop を `Accessor<T>` と型付けするのは、プリミティブに渡したり読み取りを遅らせたりするために、子が関数そのものを必要とする場合だけです。どちらの形式も受け取れるようにする方法は[カスタムプリミティブ](/guides/custom-primitives)ガイドで説明しています。

`Setter<T>` は、`props: { value: Accessor<number>; setValue: Setter<number> }` のように下へ渡されるセッターを型付けします。子は値でもアップデーターでも呼び出せます。

:::caution[セッターに渡した関数はアップデーターになる]
`setHandler(() => console.log("saved"))` は `Type 'void' is not assignable to type 'Handler'` と報告されます。セッターは関数引数を `(prev) => next` と解釈し、その戻り値をチェックするからです。
関数を値として保存するには、アップデーターから返します。`setHandler(() => next)` のように書きます。
同じルールが `createSignal` にも適用されます。最初の引数の関数は初期値ではなく、派生した書き込み可能な形式です。
:::

## ストア

`createStore<T>` は `[Store<T>, StoreSetter<T>]` を返し、`Store<T>` は `T` です。

```tsx
import { createStore, reconcile } from "solid-js";

type CartItem = { id: string; name: string; price: number; quantity: number };
type Cart = { items: CartItem[]; coupon: string };

const [cart, setCart] = createStore<Cart>({ items: [], coupon: "" });

setCart((draft) => {
	draft.coupon = 5; // Type 'number' is not assignable to type 'string'
	draft.items.push({ id: "mug" }); // Property 'quantity' is missing
});

setCart(reconcile(await getCart()));
```

ドラフトは `Cart` なので、間違ったプロパティへの書き込みや不完全なアイテムは、それを書いた行で報告されます。
`Store<Cart>` は `Cart` なので、`<CartLines items={cart.items} />` のように `Cart` や `CartItem[]` が期待される場所には、キャストなしでプロキシを渡せます。
`reconcile(value)` は `(state: Cart) => Cart` を返します。これはセッターが受け取るものと正確に一致します。

関数形式の `createStore(async () => getCart(), seed)` はシードと戻り値で型付けされ、[`createProjection`](/reference/solid-js/stores/create-projection)はそのシード型の `Store<T>` を返します。
ドラフトが実行時に何をするかは、[ストア](/concepts/stores#update-with-a-draft)を参照してください。

## イベントと ref

インラインのハンドラーは、それが置かれた要素から型付けされます。

```tsx
<input onInput={(event) => setQuery(event.currentTarget.value)} />
<button onClick={(event) => event.currentTarget.disabled} />
```

`event.currentTarget` はハンドラーが置かれた要素です。1 行目では `HTMLInputElement`、2 行目では `HTMLButtonElement` です。
input、select、textarea 上の `onInput`、`onChange`、フォーカスイベントでは、`event.target` も同じ要素に絞り込まれます。
それ以外のハンドラーでは `event.target` は `Element` なので、`onClick` 内の `event.target.value` は `Property 'value' does not exist on type 'EventTarget & Element'` と報告されます。`currentTarget` を読んでください。

JSX の外で定義するハンドラーには、`JSX` 名前空間のハンドラー型のいずれかを使います。

```tsx
import type { JSX } from "@solidjs/web";

const onInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (event) =>
	setQuery(event.target.value);

const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) =>
	event.currentTarget.blur();
```

要素へ転送する prop（例: `onClick: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>`）は、要素の属性が受け取るのと同じユニオンを受け取ります。そこにはバインド済みの `[handler, data]` 形式も含まれます。

`ref` の変数は、Solid が要素を作成するまでは `undefined` です。

```tsx
// Avoid: the checker is right, and so is the runtime
let input: HTMLInputElement | undefined;
input.select(); // 'input' is possibly 'undefined'

// Prefer: assert assignment, and read it from a handler or onSettled
let input!: HTMLInputElement;
<input ref={(element) => (input = element)} />;
<button type="button" onClick={() => input.select()} />;
```

`!` は、その変数が読まれる前に代入されることを宣言します。すべての読み取りがイベントハンドラーか `onSettled` の中で行われるならこの条件は満たされます。どちらも要素が存在した後に実行されるからです。

要素を公開するコンポーネントは、`solid-js` の `Ref<T>` prop（`T | ((val: T) => void) | undefined | Ref<T>[]`）を受け取り、それをそのまま `ref` に渡します。
この属性が受け取るものの一覧は、[`ref` のリファレンス](/reference/solid-web/jsx-properties/ref)を参照してください。

## サーバー関数とルーター

`"use server"` 関数は他の非同期関数と同じように型付けされ、呼び出し側には宣言された戻り値が見えます。

```tsx
import { getRequestEvent, redirect } from "@solidjs/web";

export async function getCart() {
	"use server";
	const userId = getRequestEvent()?.locals.userId;
	if (!userId) throw redirect("/sign-in");
	return database.cart.forUser(userId); // Promise<Cart>
}

export async function deleteAccount() {
	"use server";
	const userId = getRequestEvent()?.locals.userId;
	if (!userId) return redirect("/sign-in");
	return database.cart.forUser(userId); // Promise<Cart | Response>
}
```

`redirect()` は `Response` を返します。
throw された場合は戻り値の型は変わらず、`await getCart()` は `Cart` のままです。return された場合は結果が `Cart | Response` に広がり、これは普通のコードが関数を直接呼んだときに受け取るものと一致します。
どの呼び出し側がリダイレクトに従うかは、[呼び出し側のリダイレクト](/building-apps/server-functions/mutations-and-responses#redirect-the-caller)を参照してください。

Solid Router はルートテーブルから型を導出します。
`defineRoutes` はパスのリテラルを保持し、`RouteComponent<typeof Router.paths.products>` は `props.params.id` を `string` と型付けし、`PathParamsOf<typeof Router.paths.products>` は `{ id: string }` です。

```tsx
import type { PathParamsOf, RouteComponent } from "@solidjs/router";
import type { Router } from "../router";

const Product: RouteComponent<typeof Router.paths.products> = (props) => (
	<h1>{props.params.id}</h1>
);
type ProductParams = PathParamsOf<typeof Router.paths.products>; // { id: string }
```

orders ルートに `matchFilters: { id: int }` がある場合、`Router.paths.account.orders("latest")` は `Argument of type 'string' is not assignable to parameter of type 'number'` と報告します。
`defineRoute`、フィルター、検索スキーマについては、[ルートを定義時点で型付けする](/routing/solid-router/route-definitions#type-a-route-at-its-definition)と[検索パラメータの型付け](/routing/solid-router/navigation#type-search-parameters)を参照してください。

## ジェネリックなコンポーネント

サイズ・色・配送方法のいずれにも使えるサイズ選択コンポーネントは、型パラメータを受け取ります。

```tsx
import { For } from "solid-js";

function Select<T>(props: {
	options: T[];
	label: (option: T) => string;
	onChange: (value: T) => void;
}) {
	return (
		<select
			onChange={(event) =>
				props.onChange(props.options[event.currentTarget.selectedIndex])
			}
		>
			<For each={props.options}>
				{(option) => <option>{props.label(option)}</option>}
			</For>
		</select>
	);
}
```

`<Select options={sizes} label={(size) => size.label} onChange={(size) => setSize(size.code)} />` とレンダーすると、`T` は `options` から `Size` と推論されるので、両方のコールバックで `size.code` が補完されます。
アロー関数では型パラメータリストに末尾のカンマが必要です（`const Select = <T,>(props: ...) => ...`）。`.tsx` ファイルでは単独の `<T>` が JSX タグとして読まれ、`JSX element 'T' has no corresponding closing tag` と報告されるからです。

## よくある問題

### `Type 'SourceAccessor<string>' is not assignable to type 'string'`

prop 型が値を期待する場所にアクセサーが渡されています。
`query={query()}` のように属性内で呼び出せばリアクティブのままです。prop を `Accessor<string>` と型付けするのは、子が関数を必要とする場合だけにしてください。

### 子が更新されず、型エラーも出ない

子が `props` を分割代入したか、prop をローカル変数にコピーしています。
TypeScript はどちらも許可します。開発環境では `[STRICT_READ_UNTRACKED]` が出力されます。
JSX の中で `props.name` を読んでください。[Props](/concepts/components-and-jsx#props) を参照。

### `'Price' components don't accept text as child elements`

そのコンポーネントの props は `VoidProps` を使っており、`children` が `never` と型付けされるので、どんな子も拒否されます。
子を取り除くか、コンポーネントが children をレンダーすべきなら props を `ParentProps` に変えてください。

### `Type 'SourceAccessor<number>' is not assignable to type 'Element'`

シグナルが呼び出されずに JSX に置かれています。`{quantity()}` ではなく `{quantity}` と書いています。
関数は有効な子ではないためチェッカーが報告します。括弧を追加してください。

### `'input' is possibly 'undefined'`

`ref` の変数が `HTMLInputElement | undefined` と型付けされ、要素が存在する前のコンポーネント本体で読まれています。
読み取りをイベントハンドラーか `onSettled` の中に移し、すべての読み取りが作成後に行われるようになったら `!` 付きで変数を宣言してください。

## まとめ

- `props` の型はパラメータに付けるか、コンポーネントが値の場合は `Component<P>` を使います。どちらも同じチェックになります。
- `children` の追加には `ParentProps`（任意）、`FlowProps`（必須・型指定あり）、`VoidProps`（禁止）を使います。
- `JSX` は `@solidjs/web` からインポートします。`solid-js` はレンダラー非依存の `Component`、`Element`、リアクティブな型をエクスポートします。
- `string` と型付けされた prop には `query()` を渡します。コンパイルされたゲッターがリアクティブ性を保ち、`Accessor<T>` は関数そのものが必要な子のためのものです。
- Promise を返すメモは確定後の値として型付けされます。引数なしの `createSignal<T>()` は `undefined` を含みます。
- ストアのドラフトはストアの型を持ち、`Store<T>` は `T` なので、プレーンなオブジェクトが期待される場所にストアを渡せます。
- `event.currentTarget` を読みます。`event.target` が絞り込まれるのはフォームコントロール上の入力イベントだけです。
- throw された `redirect()` はサーバー関数の戻り値の型を変えません。return されたものは `Response` を追加します。

## 次のステップ

- [コンポーネントと JSX](/concepts/components-and-jsx): このページの props、children、ref の型の背後にある実行時の動作。
- [カスタムプリミティブ](/guides/custom-primitives): `createX` 関数で値またはアクセサーを受け取り、アクセサーを返す。
- [ルート定義](/routing/solid-router/route-definitions): `defineRoute`、マッチフィルター、遅延ロードされるルートテーブル。すべてパスリテラルから型付けされます。
- [サーバー関数](/building-apps/server-functions): 引数のエンコードとバリデーション。`unknown` の引数が型を得るのはここです。
