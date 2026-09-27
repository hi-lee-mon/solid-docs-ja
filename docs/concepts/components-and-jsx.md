---
title: "コンポーネントと JSX"
version: "2.0"
description: "一度だけ実行される関数としてのコンポーネント: props、children、制御フロー、ref、そしてそこから導かれる JSX のルール。"
---

Solid のコンポーネントは一度だけ実行される関数です。
状態をセットアップして JSX を返し、そのコンポーネントの生存期間中に再び呼び出されることはありません。
コンポーネントが再レンダーされるフレームワークから来た場合、このページを読む間ずっと心に留めておくべき事実がこれです: 以下の props・children・制御フローに関するすべてのルールは、関数本体が二度目に実行されないために存在します。

[リアクティビティ](/concepts/reactivity)のページでは、コンポーネント内の JSX が関数の return 後も更新され続ける仕組みを説明しています。
このページではコンポーネントが行う残りの部分を扱います: props の受け取り、イベントの処理、DOM への到達、リストや条件のレンダリング、他のコンポーネントとの合成です。
例はあのページのショッピングカートを引き続き使います。

## JSX の実行のしくみ

JSX は要素の構造と JavaScript の式を同じソース内に保持します。
要素の内部に式を置くには波括弧を使います。
小文字で始まる JSX の名前はネイティブ要素を表し、大文字で始まる名前はコンポーネントを参照します。

Solid は JSX をレンダラー操作にコンパイルします。
ブラウザービルドでは、それらの操作が DOM ノードを作成または引き受け、リアクティブな式をそれらに接続します。
サーバービルドでは、同じ JSX ソースがサーバーレンダリング操作にコンパイルされます。
Solid が繰り返し再構築して比較するような仮想 DOM の値は存在しません。

コンパイルされたコードは `createComponent` を通してコンポーネント関数を一度だけ呼び出し、その関数は追跡されない（untracked）状態で実行されるため、本体内のリアクティブな読み取りが親を購読させることはありません。
コンポーネントが返す各 JSX 式は、それぞれ独自の依存関係を持つ独立した追跡スコープになります。

```tsx
import { createSignal } from "solid-js";

function LineItem() {
	const [quantity, setQuantity] = createSignal(1);

	return (
		<button type="button" onClick={() => setQuantity(quantity() + 1)}>
			Quantity: {quantity()}
		</button>
	);
}
```

`LineItem` は一度だけ実行されてボタンを返します。
式 `{quantity()}` は追跡されるため、クリックごとにテキストが更新されます。それを囲む関数が再び実行されることはありません。

## Props

親は JSX 属性を通して子にデータを渡し、子はそれらを1つの `props` オブジェクトとして受け取ります。
ここではカートが各明細行にその商品を渡しています:

```tsx
type Product = { id: string; name: string; price: number };

function LineItem(props: { product: Product; quantity: number }) {
	return (
		<li>
			{props.product.name} × {props.quantity} = $
			{props.product.price * props.quantity}
		</li>
	);
}

function Cart() {
	const [quantity, setQuantity] = createSignal(1);
	return (
		<ul>
			<LineItem
				product={{ id: "mug", name: "Mug", price: 12 }}
				quantity={quantity()}
			/>
		</ul>
	);
}
```

`quantity={quantity()}` は、`Cart` の実行時にシグナルを一度だけ読み取るように見えます。
実際は違います。
コンパイラーは動的な属性を props オブジェクト上のゲッターに変換するため、`quantity()` の読み取りは `LineItem` が `props.quantity` を読み取るとき、その JSX 内部の追跡スコープで行われます。
これが、どちらの関数も再実行されないにもかかわらず、親のシグナルが変わると子の `props.quantity` が更新される理由です。

これが機能するのは、読み取りが props オブジェクト上に留まっている間だけです。

:::pitfall[props の分割代入は一度しか読み取らない]
プレーンなオブジェクトで有効なショートカットが、ここでは破綻します:

```tsx
// Avoid: both read props.quantity in the component body, once
function LineItem({ product, quantity }: LineItemProps) {
	return <li>{quantity}</li>;
}

function LineItem(props: LineItemProps) {
	const quantity = props.quantity;
	return <li>{quantity}</li>;
}

// Prefer: read the prop where it is used
function LineItem(props: LineItemProps) {
	return <li>{props.quantity}</li>;
}
```

親で数量を変更しても `Avoid` 側のバージョンは最初の値を表示し続け、開発環境ではコンポーネント名とともに `[STRICT_READ_UNTRACKED]` の警告が出ます。
`props` をそのまま保ち、JSX の内部で `props.quantity` を読み取ってください。
:::

props からの派生値に独自の同一性が必要なときは、`createMemo` でラップします:

```tsx
import { createMemo } from "solid-js";

function LineItem(props: { product: Product; quantity: number }) {
	const lineTotal = createMemo(() => props.product.price * props.quantity);
	return (
		<li>
			{props.product.name} × {props.quantity} = ${lineTotal()}
		</li>
	);
}
```

:::deep-dive[コンパイラーが動的な prop に対して行うこと]
`<LineItem product={{ id: "mug", name: "Mug", price: 12 }} quantity={quantity()} />` に対して、コンパイラーは次の形の呼び出しを出力します:

```js
createComponent(LineItem, {
	product: { id: "mug", name: "Mug", price: 12 },
	get quantity() {
		return quantity();
	},
});
```

静的な値はプレーンなプロパティになります。
変化し得る式はゲッターになるため、`quantity()` は子が `props.quantity` を読み取るたびに、その読み取りが行われた追跡スコープ内で実行されます。
分割代入はコンポーネント本体でゲッターを一度だけ呼び出します。JSX 内で `props.quantity` を読み取れば、追跡スコープ内で呼び出されます。
:::

props は子側からは読み取り専用です。
子が値を変更する必要があるときは、親が prop として関数を渡し、子はイベントハンドラーからそれを呼び出します（次のセクションの `onSave` がそうです）。
prop のローカルな編集可能なコピーが必要なときは、[ローカルな上書きに書き込み可能な派生値を使う](/guides/avoid-unnecessary-effects#use-a-writable-derivation-for-a-local-override)を参照してください。

コンポーネントの契約の型付けについては、[`Component`、`ParentProps`、`FlowProps` の型](/reference/solid-js/types/component-types)を参照してください。

## イベントの処理

`onClick` や `onInput` のような camelCase のイベント prop に関数を渡します。
Solid は対応するイベントを、所有するレンダーまたはハイドレーションのルートを通してデリゲーションします。
ハンドラーはブラウザがイベントをディスパッチしたときに実行されるため、ハンドラー内のリアクティブな読み取りは最新の値を使います。

```tsx
function SaveButton(props: { onSave: () => void }) {
	return (
		<button type="button" onClick={() => props.onSave()}>
			Save
		</button>
	);
}
```

キャプチャやパッシブ処理のようなネイティブのリスナーオプションが必要なときは、`ref` ディレクティブと `addEventListener` を使います。

## ref とディレクティブ

`ref` コールバックは、Solid が要素を作成した後にその要素を受け取ります。
コールバックを使って要素への参照を保持したり、DOM ノードを必要とする動作を適用したりします。
[非 Solid コードの統合](/guides/integrate-non-solid-code)では、これをチャート・マップ・Web コンポーネントに適用しています。

```tsx
function SearchField() {
	let input!: HTMLInputElement;

	return (
		<>
			<input ref={(element) => (input = element)} type="search" />
			<button type="button" onClick={() => input.select()}>
				Select query
			</button>
		</>
	);
}
```

ディレクティブは `ref` に渡す関数です。独立したディレクティブ構文はありません。
ディレクティブファクトリーはコンポーネントのセットアップ時にオーナーを持つリアクティブプリミティブを作成し、要素にディレクティブを適用するコールバックを返します。

ref コールバックは追跡されず、オーナーも持たない状態で実行されます。
返されたコールバックの内部でエフェクトを作成したりクリーンアップを登録したりしないでください。
それらはコンポーネントのオーナーに属するファクトリー内で作成します。

```tsx
import { onSettled } from "solid-js";

function listen(
	type: string,
	listener: EventListener,
	options?: AddEventListenerOptions
) {
	let element: HTMLElement | undefined;

	onSettled(() => {
		const target = element;
		if (!target) return;

		target.addEventListener(type, listener, options);
		return () => target.removeEventListener(type, listener, options);
	});

	return (next: HTMLElement) => {
		element = next;
	};
}
```

ファクトリーはオーナーを持つ間にセットアップとクリーンアップを登録します。
返されるコールバックは、確定時の処理のために要素を保存するだけです。

`ref` prop は配列も受け付けます。
Solid は配列を再帰的に平坦化して各コールバックを順に呼び出すため、個別のディレクティブが1つの要素を共有できます。

```tsx
function autofocus(element: HTMLInputElement) {
	element.autofocus = true;
}

function SearchField(props: { onInput: EventListener }) {
	let input!: HTMLInputElement;

	return (
		<>
			<input
				type="search"
				ref={[
					(element) => (input = element),
					autofocus,
					listen("input", props.onInput, { passive: true }),
				]}
			/>
			<button type="button" onClick={() => input.select()}>
				Select query
			</button>
		</>
	);
}
```

ref 配列を使うと、要素アクセス・再利用可能なディレクティブ・サードパーティ統合を、1つのラッパーコールバックを作らずに合成できます。
ref コールバックの戻り値は無視されます。クリーンアップは `onSettled` などのオーナーを持つプリミティブを通して登録してください。
受け付ける値とコールバックの動作については [`ref` リファレンス](/reference/solid-web/jsx-properties/ref)を参照してください。

## クラス

静的・条件付きのクラス名には `class` prop を使います。
文字列・オブジェクト・ネストした配列を受け付けます:

```tsx
function SaveButton(props: {
	class?: string;
	active: boolean;
	saving: boolean;
}) {
	return (
		<button
			class={[
				"button",
				props.class,
				{
					active: props.active,
					"saving muted": props.saving,
				},
			]}
		>
			Save
		</button>
	);
}
```

- 文字列は完全なクラス値、または常に存在する配列要素を1つ提供します。
- オブジェクトは値が truthy な各キーを追加します。
  キーにはスペース区切りで複数のクラス名を含められます。
- 配列は文字列・オブジェクト・他の配列を組み合わせます。

条件付きのクラス名は、連結や `filter(Boolean)`、`join` で文字列を組み立てるのではなく、オブジェクトに入れてください。
そうすれば Solid は影響を受けるクラストークンを直接追加・削除できます。
サポートされる各値の形式は [`class` リファレンス](/reference/solid-web/jsx-properties/class)を参照してください。

## children と合成

コンポーネントが children を受け取れるのは、その props 型に `children` プロパティが含まれる場合だけです。
任意の要素 children には `ParentProps` を使うか、レンダーコールバック用の具体的な children 型を書いてください。

ほとんどのラッパーコンポーネントは `props.children` をそのままレンダーできます。

```tsx
import type { ParentProps } from "solid-js";

function Panel(props: ParentProps<{ title: string }>) {
	return (
		<section>
			<h2>{props.title}</h2>
			<div>{props.children}</div>
		</section>
	);
}
```

コンポーネントが children を解決・検査・反復する必要があるときは、[`children` ヘルパー](/reference/solid-js/components-context/children)を使います。
これはアクセサーを返し、反復用の `toArray()` を追加します。

```tsx
import { children, type ParentProps } from "solid-js";

function Stack(props: ParentProps) {
	const resolved = children(() => props.children);
	return <div class="stack">{resolved.toArray()}</div>;
}
```

親がネストされた JSX に値を提供する必要がある場合、合成に関数の子を使うこともできます。
制御フローコンポーネントは、絞り込まれた値やリスト行にこのパターンを使います。

## コンテキスト

コンテキストは、中間のコンポーネントすべてに転送せずに、コンポーネントのサブツリーへ値を渡します。
値がある1つのサブツリーに属し、複数の子孫がその値を必要とするとき（アプリケーション全体の状態を含む）に使います: `App` のルートにあるプロバイダーはすべてのコンポーネントに届きます。
モジュールスコープのシグナルやストアよりもこちらを推奨します。
モジュールスコープの状態はオーナーを持たず、サーバーでは1つのモジュールインスタンスがリクエスト間で共有されます。コンテキスト値はアプリごと、またはリクエストごとに作成されます。
[コンポーネント間での状態共有](/concepts/reactivity#share-state-between-components)ではプロバイダーと `useX` プリミティブのパターンを示し、[状態管理](/guides/state-management#share-with-context)では `value` に何を入れるか、デフォルトが適切なのはいつかを扱っています。
[`createContext`](/reference/solid-js/components-context/create-context)はプロバイダーコンポーネントでもあるコンテキストを返します。
[`useContext`](/reference/solid-js/components-context/use-context)は現在のオーナーに関連付けられた値を読み取ります。

```tsx
import { createContext, useContext, type ParentProps } from "solid-js";

type Theme = "light" | "dark";

const ThemeContext = createContext<Theme>("light");

function ThemeProvider(props: ParentProps<{ value: Theme }>) {
	return <ThemeContext value={props.value}>{props.children}</ThemeContext>;
}

function ThemeButton() {
	const theme = useContext(ThemeContext);
	return <button class={theme}>Save</button>;
}
```

コンテキストにデフォルト値がある場合、`useContext` は対応するプロバイダーの外側でその値を返します。
デフォルトがない場合、対応するプロバイダーの外で読み取ると `ContextNotFoundError` をスローします。
プロバイダーはスコープ付きのオーナーを作成するため、ネストしたプロバイダーは自身の子孫に対して値を置き換えられます。

## リストのレンダリング

行が配列から来る場合は [`For`](/reference/solid-js/components-jsx/for)を使います。
デフォルトのキー付きモードでは、同一の同一性を持つアイテムに対してマップされた行を再利用します。
コールバックは生のアイテムとリアクティブなインデックスアクセサーを受け取ります。

```tsx
import { For, createSignal } from "solid-js";

type Todo = { id: number; text: string };

function TodoList() {
	const [todos] = createSignal<Todo[]>([
		{ id: 1, text: "Read the guide" },
		{ id: 2, text: "Build an example" },
	]);

	return (
		<ul>
			<For each={todos()} fallback={<li>No tasks</li>}>
				{(todo, index) => (
					<li>
						{index() + 1}. {todo.text}
					</li>
				)}
			</For>
		</ul>
	);
}
```

位置ベースのマッピングには `keyed={false}` を設定します。
その形式ではアイテムアクセサーと安定した数値インデックスを受け取ります。
同一性を各アイテムの一部から取るべき場合はキー関数を渡します。その形式ではアイテムとインデックスの両方のアクセサーを提供します。

ストア上の位置ベースのレンダリングには [`Repeat`](/reference/solid-js/components-jsx/repeat)を使います。
`Repeat` は配列やアイテムの同一性を差分比較するのではなく、数値範囲から行を作成します。
各行はストア内の自身の位置を直接読み取るため、ストアの更新は変更されたプロパティを読んでいる式だけに通知できます。

`from` と `count` を設定すると、スライスした配列を作らずにスライディングウィンドウをレンダーできます。
ウィンドウが移動すると、`Repeat` は範囲内に留まるインデックスの行を保持し、範囲を出た行を破棄し、新しいインデックスの行を作成します。

```tsx
import { Repeat, createSignal, createStore } from "solid-js";

function ActivityLog() {
	const [rows] = createStore(
		Array.from({ length: 1_000 }, (_, id) => ({
			id,
			message: `Activity ${id}`,
		}))
	);
	const [from, setFrom] = createSignal(0);
	const size = 20;

	return (
		<>
			<button
				onClick={() =>
					setFrom((index) => Math.min(index + 1, rows.length - size))
				}
			>
				Next
			</button>
			<ul>
				<Repeat from={from()} count={Math.min(size, rows.length - from())}>
					{(index) => <li>{rows[index].message}</li>}
				</Repeat>
			</ul>
		</>
	);
}
```

[リストのガイド](/guides/lists)では、編集・フィルタリング・選択・サーバー再取得をまたいだ行の同一性の維持を扱っています。

## 条件付きコンテンツ

[`Show`](/reference/solid-js/components-jsx/show)は `when` が truthy のとき children をレンダーし、それ以外では `fallback` をレンダーします。
デフォルトの関数の子の形式では、絞り込まれた値のアクセサーを受け取り、`when` が truthy の間は子を保持します。

```tsx
import { Show, createSignal } from "solid-js";

type User = { name: string };

function Account() {
	const [user] = createSignal<User | undefined>({ name: "Ada" });

	return (
		<Show when={user()} fallback={<a href="/sign-in">Sign in</a>}>
			{(current) => <p>Signed in as {current().name}</p>}
		</Show>
	);
}
```

`keyed` を付けると、コールバックは生の絞り込まれた値を受け取り、その値の同一性が変わると子が再マウントされます。

複数の条件が相互に排他的な場合は [`Switch` と `Match`](/reference/solid-js/components-jsx/switch-and-match)を使います。
`Switch` は最初に truthy となった `Match` をレンダーし、どれも一致しなければフォールバックをレンダーします。
関数の子は `Show` と同じキー付き・非キー付きの値のルールに従います。

```tsx
import { Match, Switch } from "solid-js";

function Status(props: { code: number }) {
	return (
		<Switch fallback={<p>Unknown status</p>}>
			<Match when={props.code === 200}>
				<p>Ready</p>
			</Match>
			<Match when={props.code === 404}>
				<p>Not found</p>
			</Match>
		</Switch>
	);
}
```

## 動的コンポーネント

`dynamic` は `@solidjs/web` からインポートします。
`dynamic()` は、リアクティブなソースからコンポーネントやネイティブ要素を選択するための標準 API です。
props と children を転送する安定したコンポーネント参照を返します。

```tsx
import { createSignal, type Component } from "solid-js";
import { dynamic } from "@solidjs/web";

const Compact: Component<{ value: string }> = (props) => (
	<span>{props.value}</span>
);
const Detailed: Component<{ value: string }> = (props) => (
	<strong>{props.value}</strong>
);

const [detailed, setDetailed] = createSignal(false);
const Result = dynamic(() => (detailed() ? Detailed : Compact));

export function Preview() {
	return (
		<>
			<button onClick={() => setDetailed((value) => !value)}>
				Toggle detail
			</button>
			<Result value="Current result" />
		</>
	);
}
```

ソースはネイティブのタグ名や非同期コンポーネントに解決されることもあります。
[`dynamic()` リファレンス](/reference/solid-web/components/dynamic)を参照してください。

## 試してみよう: カートから1行を削除する

[Props](#props)セクションの `Cart` と `LineItem` コンポーネントを取り上げ、カートが複数のアイテムをシグナルに保持するようにします。
`For` でアイテムごとに1つの `LineItem` をレンダーし、各行に **Remove** ボタンを追加して、クリックでそのアイテムをカートから削除するようにしてください。

まず、どのコンポーネントがアイテムを所有するか、子がどうやって削除するアイテムを親に伝えるかを決めてください。

:::solution[カートから1行を削除する]

```tsx
import { For, createSignal } from "solid-js";

type Product = { id: string; name: string; price: number };
type Line = { product: Product; quantity: number };

function LineItem(props: Line & { onRemove: (id: string) => void }) {
	return (
		<li>
			{props.product.name} × {props.quantity} = $
			{props.product.price * props.quantity}
			<button type="button" onClick={() => props.onRemove(props.product.id)}>
				Remove
			</button>
		</li>
	);
}

function Cart() {
	const [lines, setLines] = createSignal<Line[]>([
		{ product: { id: "mug", name: "Mug", price: 12 }, quantity: 1 },
		{ product: { id: "tee", name: "T-shirt", price: 20 }, quantity: 2 },
	]);
	const remove = (id: string) =>
		setLines((list) => list.filter((line) => line.product.id !== id));

	return (
		<ul>
			<For each={lines()} fallback={<li>Your cart is empty</li>}>
				{(line) => (
					<LineItem
						product={line.product}
						quantity={line.quantity}
						onRemove={remove}
					/>
				)}
			</For>
		</ul>
	);
}
```

`Cart` がリストを所有するため、書き込むのは `Cart` だけです。
`LineItem` は関数 prop を受け取り、自身の id を渡して呼び出します。リストには一切触れません。
`For` は行を line オブジェクトでキー付けするため、T シャツを削除するとその1行だけが破棄され、マグカップの行は無傷のままです。
最後の行がなくなると `fallback` がレンダーされます。
:::

## よくある問題

### 親のシグナルが変わっても子が更新されない

子が本体で prop を読み取ったか、パラメーターを分割代入したためです。
代わりに JSX の内部で `props.name` を読み取ってください。
[Props](#props)を参照。

### リストが変更のたびにすべての行を作り直す

`For` はアイテムの同一性で行を再利用します。
各更新が同じ行に対して新しいオブジェクトを生成する場合（たとえば読み取りのたびに取得した配列をマップするなど）、すべての行が新規になり `For` がそれらを再構築します。
アイテムの同一性を安定させるか、`id` を読み取るキー関数を渡すか、[ストア](/concepts/stores)を使って変更が既存のオブジェクトに届くようにしてください。

### 値がセットされているのに `Show` がフォールバックをレンダーする

`when` は truthy かどうかで判定されます。
`0` や空文字列は falsy で、フォールバックが表示されます。
`when={count() !== undefined}` のように明示的に比較するか、複数のケースがある場合は `Switch` と `Match` を使ってください。

### `ref` コールバック内のエフェクトや `onCleanup` が一度も実行されない

ref コールバックは追跡されずオーナーも持たないため、そこで作成されたプリミティブは破棄されません。
コンポーネントのセットアップ時にディレクティブファクトリー内でエフェクトを作成し、要素を保存するコールバックを返してください。
[ref とディレクティブ](#refs-and-directives)を参照。

## まとめ

- コンポーネントは一度だけ実行されます。返された JSX 式は実行され続けます。
- `props` はそのまま保ち、使う場所で `props.name` を読み取ります。分割代入は一度しか読み取りません。
- 子が共有状態を変えるときは、親が渡した関数を呼び出します。props に書き込んではいけません。
- 要素に到達するには `ref` コールバック（またはその配列）を渡します。エフェクトやクリーンアップはコールバック内ではなく、コールバックを返すファクトリー内で作成します。
- 条件付きのクラス名は文字列を組み立てるのではなく、`class` の下のオブジェクトに入れてください。
- 配列からの行には `For`、条件には `Show`・`Switch`・`Match` を使います。行が再利用されるようアイテムの同一性を安定させてください。
- 共有状態はモジュールスコープのシグナルではなく、コンポーネント内で作成したコンテキストを通して提供してください。

## 次のステップ

- [ストア](/concepts/stores)はカートそのものを保持します: 各プロパティが個別に追跡されるアイテムの配列で、1つの数量を編集しても行は再構築されません。
- [非同期リアクティビティ](/concepts/async-reactivity)では、Promise からデータを読み取るコンポーネント、次のビューが読み込まれる間に現在のビューが画面に残る理由、`Loading` が代わりにフォールバックを表示するタイミングを扱います。
- [バウンダリ](/concepts/boundaries)では `Loading`・`Errored` と、それらをツリーのどこに置くかを説明します。
- [不要なエフェクトを避ける](/guides/avoid-unnecessary-effects)は、コンポーネントにエフェクトを追加する前に読むべきガイドです。
- [TypeScript](/guides/typescript)では、このページの props・children・ref・イベントの型付け（ジェネリックコンポーネントを含む）を扱います。
- [アプリの構造](/building-apps/app-structure)では、書いたコンポーネントの周囲に `App` とドキュメントシェルがどう収まるかを示します。
