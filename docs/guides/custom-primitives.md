---
title: "カスタムプリミティブ"
version: "2.0"
description: "繰り返し登場するリアクティブなセットアップを、オーナーの内側で実行され、アクセサーを受け取り、アクセサーを返し、開始したものをクリーンアップし、サーバーレンダリング中も正しく動作する createX 関数に移す。"
---

カタログページは `searchProducts` を呼ぶ前に検索クエリをデバウンスします。
注文ページはビューポート幅を下回るとテーブルからカードへ切り替わります。
チェックアウトページはカートの下書きを `localStorage` に保持し、リフレッシュしても失われないようにしています。
これらはどれも、シグナルとタイマーまたはリスナー、そしてクリーンアップの組み合わせであり、ほぼ同じ 6 行が細かな違いだけの 3 つのコンポーネントに置かれています。

カスタムプリミティブとは、そうした行をひとまとめにする関数です。シグナル・メモ・エフェクトを作成し、コンポーネントが読み取る必要のあるものを返します。
そのような関数をどこで呼んでもよいかについて、Solid にはすべてのプリミティブがすでに従っているルール以外の決まりはありません。このガイドはそのルールについてのものです。
追跡・エフェクト・オーナーシップについては [リアクティビティ](/concepts/reactivity) ページで説明しています。このページはそれらを前提とします。

## プリミティブはオーナーの内側で実行される関数

まずデバウンスから始めます。
検索ボックスはキーストロークごとにサーバーを呼ぶべきではないので、クエリのシグナルはタイピングが止まってからだけ変わるようにします。

```ts
import { createSignal, onCleanup } from "solid-js";

export function createDebouncedSignal(initial: string, ms: number) {
	const [value, setValue] = createSignal(initial);
	let timer: ReturnType<typeof setTimeout> | undefined;

	const setDebounced = (next: string) => {
		clearTimeout(timer);
		timer = setTimeout(() => setValue(next), ms);
	};

	onCleanup(() => clearTimeout(timer));

	return [value, setDebounced] as const;
}
```

```tsx
import { For, Loading, createMemo } from "solid-js";
import { createDebouncedSignal } from "./createDebouncedSignal";
import { searchProducts } from "../data/products";

function SearchBox() {
	const [query, setQuery] = createDebouncedSignal("", 150);
	const results = createMemo(() => searchProducts(query()));

	return (
		<>
			<input
				type="search"
				onInput={(event) => setQuery(event.currentTarget.value)}
			/>
			<Loading fallback={<p>Searching…</p>}>
				<ul>
					<For each={results()}>{(product) => <li>{product.name}</li>}</For>
				</ul>
			</Loading>
		</>
	);
}
```

`mug` と入力すると、最後のキーストロークから 150 ミリ秒後にリクエストが 1 回開始されます。`results` が `m` や `mu` を見ることはありません。
タイマーが保留中にページを離れると、タイマーはクリアされます。

このプリミティブが機能するのは、呼び出される場所のおかげです。
`SearchBox` は一度だけ実行され、その実行中、Solid はそのコンポーネントを現在のオーナーとして記録します。
`onCleanup` はその時点のオーナーに取り付けられるため、このクリーンアップは `SearchBox` に属し、それが破棄されるときに実行されます。
オーナーツリーについては [オーナーシップ](/concepts/reactivity#ownership) で説明しています。プリミティブのルールは、`createX` 関数はコンポーネント本体、あるいはそこから呼ばれる別のプリミティブの中で呼び出され、それより後で呼ばれることはない、というものです。
本体の内側では単なる関数呼び出しです。`if` の中でもループの中でも、早期リターンの後でも構いません。最初の実行と呼び出し順が一致しなければならない 2 回目の実行は存在しないからです。

:::pitfall[イベントハンドラーからプリミティブを呼び出す]

```tsx
// Avoid: a new signal and a new cleanup on every keystroke, owned by nothing
<input
	onInput={(event) => {
		const [query, setQuery] = createDebouncedSignal("", 150);
		setQuery(event.currentTarget.value);
	}}
/>;

// Prefer: create it once in the body, and call the setter from the handler
const [query, setQuery] = createDebouncedSignal("", 150);
<input onInput={(event) => setQuery(event.currentTarget.value)} />;
```

`Avoid` 側ではキーストロークごとに誰も読み取らないシグナルが作られ、開発ビルドは `[NO_OWNER_CLEANUP] onCleanup called outside a reactive context will never be run` と警告します。
同じ方法で作られたエフェクトは `[NO_OWNER_EFFECT] Effects created outside a reactive context will never be disposed` と警告され、ページの存続期間中ずっと実行され続けます。
イベントに応じてプリミティブを開始したい場合は、本体で作成し、ハンドラーがセットするシグナルでゲートしてください。
:::

## 開始したものはクリーンアップする

注文ページは広い画面ではテーブルを、それ以外ではカードリストを表示します。
メディアクエリのリスナーはプリミティブが所有すべき種類のものです。ページが離れるときにリスナーを削除しなければならないからです。

```ts
import { createSignal, onSettled } from "solid-js";

export function createMediaQuery(query: string) {
	const [matches, setMatches] = createSignal(false);

	onSettled(() => {
		const media = window.matchMedia(query);
		setMatches(media.matches);
		const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	});

	return matches;
}
```

```tsx
function Orders() {
	const wide = createMediaQuery("(min-width: 60rem)");
	return (
		<Show when={wide()} fallback={<OrderCards />}>
			<OrderTable />
		</Show>
	);
}
```

ウィンドウを 60rem をまたいでリサイズすると、ページはテーブルとカードを切り替えます。
ページを離れると `change` リスナーは削除されます。

[`onSettled`](/reference/solid-js/lifecycle-actions/on-settled) は、コンポーネントの最初のレンダーが確定した後にコールバックを一度だけ実行し、コールバックが返すクリーンアップはオーナーが破棄されるときに実行されます。
ブラウザに触れるセットアップの置き場所はここです。コールバックはサーバーレンダリング中に実行されないからです。
`matches` は両側で `false` で始まるため、サーバーはカードをレンダーし、ブラウザはクエリが一致すればハイドレーション後にテーブルへ切り替わります。
その最初のフレームが重要な場合の対処は [SSR セーフなコード](/guides/ssr-safe-code) ガイドで扱っています。

レンダー後にセットアップするものがなく、解放するだけでよい場合は、デバウンスがタイマーに対して行ったように [`onCleanup`](/reference/solid-js/advanced/specialized-reactivity/on-cleanup) を使います。
これは現在のオーナーにコールバックを登録するだけで、それ以外のことはしません。

:::caution[クリーンアップは onSettled から返す。内側で登録しない]
`onSettled` コールバックの内側で `onCleanup` を呼ぶと `[CLEANUP_IN_FORBIDDEN_SCOPE] Cannot use onCleanup inside createTrackedEffect or onSettled; return a cleanup function instead` がスローされます。
同じコールバック内でシグナル・メモ・エフェクトを作成することもできません。開発ビルドは `[PRIMITIVE_IN_FORBIDDEN_SCOPE]` をスローします。
プリミティブは `createX` 関数の本体で作成し、コールバックは命令的なセットアップと、それが返すティアダウンのために使ってください。
:::

## アクセサーまたは値を受け取る

`createMediaQuery("(min-width: 60rem)")` は文字列を受け取ります。クエリが定数である間は文字列で問題ありません。
クエリが prop やシグナルから来るようになった瞬間、単純なパラメータはそれを固定してしまいます。

```tsx
// Avoid: props.breakpoint is read once, when the body runs
const wide = createMediaQuery(props.breakpoint);

// Prefer: pass a function, and let the primitive read it in a tracking scope
const wide = createMediaQuery(() => props.breakpoint);
```

`Avoid` 側を実行して親で `breakpoint` を変更すると、`wide` は最初のクエリに答え続け、開発ビルドはコンポーネント名とともに `[STRICT_READ_UNTRACKED]` と警告します。コンポーネント本体での prop の読み取りは一度きりの読み取りだからです。

`Prefer` 側にするには、プリミティブがどちらの形も受け取れる必要があります。
そのパターンは、`MaybeAccessor<T>` パラメータと、それを展開する `access` ヘルパーです。

```ts
import { createEffect, createSignal, type Accessor } from "solid-js";

export type MaybeAccessor<T> = T | Accessor<T>;

export function access<T>(value: MaybeAccessor<T>): T {
	return typeof value === "function" ? (value as Accessor<T>)() : value;
}

export function createMediaQuery(query: MaybeAccessor<string>) {
	const [matches, setMatches] = createSignal(false);

	createEffect(
		() => access(query),
		(current) => {
			const media = window.matchMedia(current);
			setMatches(media.matches);
			const onChange = (event: MediaQueryListEvent) =>
				setMatches(event.matches);
			media.addEventListener("change", onChange);
			return () => media.removeEventListener("change", onChange);
		}
	);

	return matches;
}
```

親で `breakpoint` を変更すると、古いリスナーは削除され、新しいクエリ用の `MediaQueryList` が作成され、`wide` はそれに答えます。

入力が変わり得るようになったため、セットアップは `onSettled` から [`createEffect`](/reference/solid-js/reactivity/create-effect) に移りました。
計算関数が入力を読み取り、エフェクト関数がブラウザでの処理を行ってそのクリーンアップを返します。Solid は次のエフェクト実行の前と破棄時にそのクリーンアップを実行します。
`onSettled` と同様、エフェクト関数はサーバーレンダリング中に実行されません。
[`Accessor<T>`](/reference/solid-js/types/reactive-types) はシグナルのゲッターや任意の `() => T` の型なので、呼び出し側はシグナル、メモ、または props を参照するアロー関数を渡せます。

単純な `T` を受け取るのは、`createDebouncedSignal` の `initial` のように、プリミティブが設計上一度だけ読み取る値に限ってください。
そのようなパラメータには、一度きりの読み取りであることが分かる名前を付けてください。

## 値ではなくアクセサーを返す

同じルールが戻り値にも適用されます。
プリミティブは、呼び出し側が追跡スコープの内側で読み取るものを返します。

```ts
// Avoid: the boolean is read here, in the component body, once
return matches();

// Prefer: return the accessor and let the JSX call it
return matches;
```

`Avoid` 側は永遠に `false` を返し、開発ビルドはその return で `[STRICT_READ_UNTRACKED]` と警告します。
`Prefer` 側は関数を返し、JSX 内の `wide()` がその JSX をシグナルに購読させます。

プリミティブが追加の振る舞いを持つシグナルである場合は `[value, setValue] as const` というタプルを返し、呼び出し側が `createSignal` と同じように分割代入できるようにします。
値やアクションが複数ある場合は、[コンポーネント間で状態を共有する](/concepts/reactivity#share-state-between-components) で `createCart` が行っているように、アクセサーと関数のオブジェクトを返します。
ストアのプロキシはすでにライブビューなので、プリミティブはストアをそのまま返すことができます。

## プリミティブ内の非同期

プリミティブは、関数が Promise を返すメモを返すことができます。
商品ページもカートも id で商品を必要とするので、サーバー関数を一度だけラップします。

```ts
import { createMemo } from "solid-js";
import { getProduct } from "../data/products";
import { type MaybeAccessor, access } from "./access";

export function createProduct(id: MaybeAccessor<string>) {
	return createMemo(() => getProduct(access(id)));
}
```

```tsx
function ProductTitle(props: { id: string }) {
	const product = createProduct(() => props.id);

	return (
		<Loading fallback={<p>Loading…</p>}>
			<h1>{product().name}</h1>
		</Loading>
	);
}
```

最初の `product()` の読み取りは、`getProduct` が解決するまで `Loading` のフォールバックを表示します。
`props.id` を変更しても、次の商品が読み込まれる間、現在の名前は画面に残ります。

このプリミティブに非同期特有の部分はありません。
メモはコンポーネントのオーナーの下で作成され、呼び出し側の JSX がそれを読み取るため、その読み取りの上にある最も近い `Loading` バウンダリが応答します。
最初の読み込み・保留される更新・`isPending` については [非同期リアクティビティ](/concepts/async-reactivity) で説明しています。
再取得をまたいで項目の同一性を保つべきリストには、代わりに `createStore` の関数形式を返してください。[ストアへのフェッチ](/concepts/stores#fetch-into-a-store) でその方法を示しています。

## Solid の外部と同期する

カートの下書きはリフレッシュを越えて残る必要があるため、ストアと `localStorage` の両方に置きます。
ストレージの読み取りはレンダー後のセットアップです。書き込みは、Solid の状態が Solid の外に出る境界にあるエフェクトです。

```ts
import { createEffect, createStore, deep, onSettled } from "solid-js";

const STORAGE_KEY = "cart:draft";

export function createCartDraft() {
	const [cart, setCart] = createStore({ items: [] as CartItem[] });

	onSettled(() => {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			setCart((draft) => {
				draft.items = JSON.parse(saved).items;
			});
		}
	});

	createEffect(
		() => JSON.stringify(deep(cart)),
		(json) => localStorage.setItem(STORAGE_KEY, json),
		{ defer: true }
	);

	return [cart, setCart] as const;
}
```

マグを追加してリフレッシュしても、マグはまだカートに残っています。

`onSettled` はハイドレーション後にストレージを一度だけ読み取り、保存されていた項目をセッターのドラフト経由でストアに書き込みます。
[`deep`](/reference/solid-js/advanced/store-advanced/deep) は計算関数をストアのすべての階層に購読させ、そのプレーンなビューを返すため、どの項目を変更してもエフェクトが再実行されます。
`defer: true` はエフェクトの最初の実行をスキップするため、空のシード値がストレージに書き込まれることはなく、変更だけが書き込まれます。

`onSettled` コールバックもエフェクト関数も、サーバーレンダリング中には実行されません。
サーバーは空のカートをレンダーし、ブラウザはハイドレーション後に下書きを埋めます。
本体自身が行わなければならないチェックには、`@solidjs/web` の [`isServer`](/reference/solid-web/rendering-ssr/is-server) を使います。これはビルド時定数で、サーバービルドでは `true`、ブラウザビルドでは `false` です。
両側で最初のフレームが異なる場合については [SSR セーフなコード](/guides/ssr-safe-code) ガイドで扱っています。

## コンポーネントの外で実行する

プリミティブが開始した処理が、本体が返った後に終わることがあります。
アカウントページはアナリティクスモジュールをオンデマンドで読み込み、ページビューを報告するエフェクトはモジュールが到着してから、オーナーを持たない Promise コールバックの中でしか作成できません。

```ts
import {
	createEffect,
	getOwner,
	isDisposed,
	onSettled,
	runWithOwner,
	type Accessor,
} from "solid-js";

export function createPageViews(path: Accessor<string>) {
	const owner = getOwner();

	onSettled(() => {
		import("./analytics").then((analytics) => {
			if (!owner || isDisposed(owner)) return;
			runWithOwner(owner, () => {
				createEffect(
					() => path(),
					(current) => analytics.pageView(current)
				);
			});
		});
	});
}
```

アカウント領域内を移動すると、モジュールの読み込み後に各パスが報告されます。読み込み前にアカウント領域を離れた場合は何も作成されません。

[`getOwner`](/reference/solid-js/advanced/owner-introspection/get-owner) は本体の実行中にコンポーネントのオーナーを捕捉します。
[`runWithOwner`](/reference/solid-js/advanced/owner-introspection/run-with-owner) は後からそのオーナーに再入するため、コールバック内で作成されたエフェクトはコンポーネントとともに破棄されます。
[`isDisposed`](/reference/solid-js/advanced/owner-introspection/is-disposed) は、すでにページを離れたコンポーネントに対してコールバックをガードします。

コンポーネントがまったく存在しない場合、[`createRoot`](/reference/solid-js/advanced/owner-introspection/create-root) がオーナーを作成し、その破棄関数を返します。

```ts
import { createRoot } from "solid-js";

const dispose = createRoot((dispose) => {
	const [query, setQuery] = createDebouncedSignal("", 150);
	setQuery("mug");
	return dispose;
});

dispose();
```

これはプリミティブ自体のテストや、`render` 呼び出しのないコードに Solid のリアクティビティを組み込むインテグレーションで使います。
アプリケーションコードで必要になることはないはずです。複数のコンポーネントが共有する状態はモジュールスコープのルートではなく [コンテキスト](/concepts/components-and-jsx#context) に置きます。

## よくある問題

### プリミティブ内のエフェクトは実行されるがクリーンアップが実行されない

プリミティブがイベントハンドラー・Promise コールバック・`ref` コールバックのいずれかから呼び出されました。これらにはオーナーがありません。
開発ビルドは呼び出し時に `[NO_OWNER_EFFECT]` または `[NO_OWNER_CLEANUP]` と警告します。
プリミティブはコンポーネント本体で呼び出すか、`getOwner` でオーナーを捕捉して `runWithOwner` で再入してください。

### `onSettled` の内側で `onCleanup` がスローされる

`onSettled` コールバックはクリーンアップを登録したりプリミティブを作成したりできません。開発ビルドは `[CLEANUP_IN_FORBIDDEN_SCOPE]` または `[PRIMITIVE_IN_FORBIDDEN_SCOPE]` をスローします。
クリーンアップ関数はコールバックから返し、シグナルとエフェクトはプリミティブの本体で作成してください。

### プリミティブが返す値が変わらない

`createMediaQuery(props.breakpoint)` のように、プリミティブが一度だけ読み取る場所に呼び出し側が単純な値を渡したか、プリミティブが `matches` ではなく `matches()` を返したかのどちらかです。
どちらもコンポーネント本体でリアクティブな値を読み取っており、開発ビルドは `[STRICT_READ_UNTRACKED]` と警告します。
`() => props.breakpoint` を渡し、アクセサーを返してください。

### プリミティブはブラウザでは動くがサーバーレンダーをクラッシュさせる

`window`・`matchMedia`・`localStorage` に触れるセットアップがプリミティブの本体にあります。
サーバーで実行されない `onSettled` コールバックかエフェクト関数に移すか、`isServer` でガードしてください。
完全なチェックリストは [SSR セーフなコード](/guides/ssr-safe-code) ガイドにあります。

## まとめ

- `createX` 関数はコンポーネント本体か別のプリミティブの中で呼び出し、イベントハンドラーやコールバックでは決して呼び出さないでください。プリミティブは実行時の現在のオーナーに取り付けられます。
- ティアダウンはセットアップがある場所に登録してください。本体で開始したものには `onCleanup` を、`onSettled` やエフェクト関数の中で開始したものにはそこから返す関数を使います。
- `MaybeAccessor<T>` を受け取り、追跡スコープの内側で展開してください。単純なパラメータは一度きりの読み取りです。
- アクセサー・アクセサーのタプル・ストアのいずれかを返してください。それを呼び出した結果を返してはいけません。
- 非同期のメモも同期のものと同じように返してください。待機は呼び出し側の `Loading` バウンダリが処理します。
- ブラウザの状態は `onSettled` で読み取り、エフェクト関数で書き込み、最初の実行で書き込むべきでない場合は `defer: true` を使ってください。
- `await` の後で何かを作成しなければならないプリミティブでは、`getOwner` でオーナーを捕捉し、`runWithOwner` で再入してください。

## 次のステップ

- [不要なエフェクトを避ける](/guides/avoid-unnecessary-effects): プリミティブが返す値のどれをメモにすべきか、そしてそのエフェクトが存在すべきでないものなのはどんなときか。
- [Solid 以外のコードを統合する](/guides/integrate-non-solid-code): 同じオーナーとクリーンアップのルールを、チャートライブラリ・地図・Web コンポーネントに適用する。
- [SSR セーフなコード](/guides/ssr-safe-code): サーバーとブラウザで最初のフレームが異なるプリミティブのためのチェックリスト。
- [TypeScript](/guides/typescript): `Accessor`・`Setter`・`MaybeAccessor` のパラメータと戻り値の型付け。
