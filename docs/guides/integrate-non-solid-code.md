---
title: "Solid 以外のコードを統合する"
version: "2.0"
description: "Solid の状態からチャートライブラリ、地図、Web コンポーネント、分析スクリプトを駆動します。適切なタイミングで DOM ノードを取得し、インスタンスを一度だけ作成し、エフェクトで更新を流し込み、ブラウザ専用のインポートをサーバーから切り離します。"
---

アカウント領域には注文合計のチャートが必要で、チャートライブラリは `<canvas>` と `chart.update(data)` の呼び出しを要求します。
店舗検索には、インポートされた瞬間に `window` を読むライブラリの地図が必要です。
チェックアウトフォームでは、無効化する日付の配列を受け取る `<date-picker>` カスタム要素を使い、分析スクリプトはナビゲーションのたびに現在の URL を知りたがります。

これらはどれもシグナルを知りません。
どれも Solid に求めるものは同じ4つです。存在した時点での DOM ノード、インスタンスを一度だけ作成する場所、確定した値をライブラリへ流し込むエフェクト、そしてコンポーネントと一緒に解体するクリーンアップです。
このガイドでは、その4つと、状態が流れる2つの方向（Solid からライブラリへ、ライブラリから Solid へ）を順に見ていきます。
動作するようになったら、その結果をパッケージ化する方法は[カスタムプリミティブ](/docs/guides/custom-primitives.md)ガイドで説明しています。

## DOM ノードを取得する

変数またはコールバックを `ref` に渡すと、Solid は要素を作成した時点で代入します:

```tsx
function OrderTotalsChart(props: { totals: number[] }) {
	let canvas!: HTMLCanvasElement;

	// Avoid: the JSX below has not run yet, so canvas is still undefined here
	const chart = new Chart(canvas, { data: props.totals });

	return <canvas ref={canvas} />;
}
```

`Avoid` 版を実行するとライブラリは `undefined` で例外を投げます。コンポーネント本体は上から下へ実行され、`<canvas>` が作られるのは `return` 文の中だからです。
要素が存在するのは JSX が評価された後です。`ref` コールバックはその瞬間、周囲のレンダーがまだ構築されている最中に実行されます。

[`ref` リファレンス](/docs/reference/solid-web/jsx-properties/ref.md)に受け付ける形式の一覧があり、[ref とディレクティブ](/docs/concepts/components-and-jsx.md#refs-and-directives)ではディレクティブファクトリーが要素のセットアップを引き受ける仕組みを示しています。
このページのすべての統合に関係する事実が2つあります。`ref` コールバックは追跡されずオーナーなしで実行されるため、エフェクトを作ったりクリーンアップを登録したりする場所ではないということ。そして、要素がドキュメント内にある必要があるセットアップは、最初のレンダーが確定した後に実行される `onSettled` に置くということです。

## インスタンスは一度だけ作成し、エフェクトで更新する

チャートは一度だけ作成され、合計が変わると更新され、コンポーネントと一緒に破棄されます:

```tsx
import { createEffect, onSettled } from "solid-js";
import { Chart } from "chart-lib";

function OrderTotalsChart(props: { totals: number[] }) {
	let canvas!: HTMLCanvasElement;
	let chart: Chart | undefined;

	// Avoid: props.totals is read in the settled callback, which is untracked
	onSettled(() => {
		const chart = new Chart(canvas, { data: props.totals });
		return () => chart.destroy();
	});

	// Prefer: create once in onSettled, and let an effect drive every update
	onSettled(() => {
		chart = new Chart(canvas, { data: props.totals });
		return () => chart?.destroy();
	});

	createEffect(
		() => props.totals,
		(totals) => chart?.update(totals)
	);

	return <canvas ref={canvas} />;
}
```

`Avoid` 版を実行すると、チャートは最初の合計を描画してそれ以降変わりません。`onSettled` はコールバックを一度だけ実行し、その中の読み取りを追跡しないからです。
`Prefer` 版では、新しい `totals` 配列がコンピュート関数を再実行し、更新が適用された後にエフェクト関数がその値をライブラリへ渡します。

この分担はドキュメント全体の方針に従っています。ティアダウンを返す一回限りのセットアップには [`onSettled`](/docs/reference/solid-js/lifecycle-actions/on-settled.md) を、Solid の外に出さなければならない確定値ごとの処理には [`createEffect`](/docs/reference/solid-js/reactivity/create-effect.md) のエフェクト関数を使います。
どちらもサーバーレンダリング中は実行されないので、`chart-lib` をサーバーでインポートできる限り、このコンポーネントはサーバーでレンダリングしても安全です。できない場合は[サーバーから切り離す](#keep-it-off-the-server)を参照してください。
すべての入力をコンピュート関数に置くべき理由は[命令的バウンダリではエフェクトを使う](/docs/guides/avoid-unnecessary-effects.md#use-an-effect-at-an-imperative-boundary)で説明しています。

分析スクリプトも同じ形ですが、DOM ノードはありません:

```tsx
import { createEffect } from "solid-js";
import { useLocation } from "@solidjs/router";

function PageViews() {
	const location = useLocation();

	createEffect(
		() => location.pathname,
		(path) => analytics.pageView(path)
	);

	return null;
}
```

`/account` から `/account/orders` へ移動すると `pageView` が新しいパスで一度呼ばれます。[ロケーションを読む](/docs/routing/solid-router/navigation.md#read-the-location)で説明しているとおり、`location.pathname` はリアクティブです。

## Web コンポーネント

カスタム要素は、JSX ではネイティブ要素として書きます。
属性・プロパティ・イベントにはそれぞれ書き方があります:

```tsx
function DeliveryDate(props: {
	value: string;
	holidays: string[];
	onChange: (value: string) => void;
}) {
	return (
		<date-picker
			value={props.value}
			prop:disabledDates={props.holidays}
			onDatechange={(event) => props.onChange(event.detail.value)}
		/>
	);
}
```

日付を選ぶと `onChange` がそれを受け取ります。親で `holidays` を変えると、要素の `disabledDates` プロパティが再代入されます。

名前にハイフンを含む要素では、通常の属性は `setAttribute` で設定されます。そのため `value={props.value}` は文字列属性になり、`null` や `false` を渡すと属性が削除されます。
この方法で配列やオブジェクトを渡すと文字列化されます。
`prop:` 名前空間は代わりにプロパティへ代入します。`disabledDates` をプロパティとして公開するカスタム要素が期待するのはこちらです。
サーバーは HTML に属性を出力しますが `prop:` バインディングはスキップします。プロパティへの代入は、ブラウザが要素をレンダリングまたはハイドレートする時点で行われます。

`onDatechange` は名前を小文字にして、`addEventListener` で `datechange` のリスナーを追加します。
大文字やハイフンを含むイベント名はこの方法では書けません。[ref とディレクティブ](/docs/concepts/components-and-jsx.md#refs-and-directives)にある `listen` ファクトリーにならい、正確な名前で `addEventListener` を呼ぶディレクティブを使います。
`onInput` や `onClick` のように Solid がデリゲーションするイベントはレンダールート上のリスナーで処理されるため、そうした名前のイベントを発行するカスタム要素は、ハンドラーを実行させるには `bubbles: true` で発行しなければなりません。

TypeScript は `<date-picker>` を知りません。
その要素がサポートする属性・プロパティ・イベント名をまとめて一度だけ宣言します:

```ts
// src/types/date-picker.d.ts
declare module "@solidjs/web" {
	namespace JSX {
		interface IntrinsicElements {
			"date-picker": JSX.HTMLAttributes<HTMLElement> & {
				value?: string;
				"prop:disabledDates"?: string[];
				onDatechange?: (event: CustomEvent<{ value: string }>) => void;
			};
		}
	}
}
```

## Solid を外部のコンテナへレンダリングする

Solid のコンテンツを、Solid が作っていない DOM ノードへ移したい状況が2つあります。

1つ目は、祖先から脱出しなければならないサブツリーです。たとえば、オーバーフローをクリップする地図ライブラリのコンテナの中にある確認ダイアログです。
[`Portal`](/docs/reference/solid-web/components/portal.md)は子要素を別の要素（デフォルトでは `document.body`）へレンダリングします。子要素はコンポーネントのリアクティブスコープに留まったままです:

```tsx
import { Show, type ParentProps } from "solid-js";
import { Portal } from "@solidjs/web";

function AddedToCart(props: ParentProps<{ open: boolean }>) {
	return (
		<Show when={props.open}>
			<Portal>
				<dialog open>{props.children}</dialog>
			</Portal>
		</Show>
	);
}
```

ダイアログを開くと `<body>` の子として、クリップされたコンテナの外側に表示されます。閉じれば、ポータルのノードは `Show` のブランチと一緒に削除されます。
サーバーはポータルに対して何もレンダリングせず、その子要素はハイドレーションが確定した後にブラウザで新たにレンダリングされます。そのためポータル内の非同期読み取りはクライアントで開始されます。
データはポータルの上位でフェッチして渡し込んでください。

2つ目はその逆で、別のフレームワークやサーバーテンプレートが所有するページの中に、Solid にしたい領域が1つある場合です。
[`render`](/docs/reference/solid-web/rendering-ssr/render.md)はツリーをノードにマウントし、破棄関数（disposer）を返します:

```ts
import { render } from "@solidjs/web";
import { MiniCart } from "./MiniCart";

const node = document.getElementById("mini-cart")!;
const dispose = render(() => <MiniCart />, node);

// When the host removes the region:
dispose();
```

`dispose` はリアクティブルートを破棄し、ルートが追加したデリゲーションイベントリスナーを削除し、コンテナを空にします。
`render` は `MiniCart` 内のすべてのプリミティブがぶら下がるオーナーを作り、DOM を新たにレンダリングします。サーバーがすでにレンダリングした領域には、代わりに [`hydrate`](/docs/reference/solid-web/rendering-ssr/hydrate.md)を使います。

## 外部ソースをグラフに流し込む

商品の在庫数をプッシュしてくる在庫フィードを考えます。
その値は、サブスクリプションのコールバックから書き込むシグナルを通じて Solid に入ります。サブスクリプションは、それを開いたエフェクトに結び付けます:

```ts
import { createEffect, createSignal, type Accessor } from "solid-js";
import { stockFeed } from "./stockFeed";

export function createStock(productId: Accessor<string>) {
	const [stock, setStock] = createSignal<number>();

	createEffect(
		() => productId(),
		(id) => stockFeed.subscribe(id, (count) => setStock(count))
	);

	return stock;
}
```

プッシュのたびに `stock()` を読んでいるものすべてが更新されます。商品を変えると、前のサブスクリプションのアンサブスクライブ関数（エフェクト関数が返したもの）が、新しいサブスクリプションが開かれる前に実行されます。

この書き込みが許されるのは、別のリアクティブな値をコピーするのではなく、観測を記録しているからです。その線引きは[外部の観測を新しい入力にする](/docs/guides/avoid-unnecessary-effects.md#let-external-observations-become-new-inputs)で説明しています。
ライブラリから受け取る `Map`・クラスインスタンス・`Date` は1つの値としてシグナルに入れます。プレーンなオブジェクトや配列にはストアを使います。

:::advanced[リアクティブシステム全体を橋渡しする]
外部ソースそれ自体が MobX のようなリアクティブシステムで、その値を Solid の計算の中で直接読み取る場合は、[`enableExternalSource`](/docs/reference/solid-js/advanced/interop-async/enable-external-source.md)でアプリ全体に一度だけアダプターを登録します。
`factory` は各計算の関数と `trigger` を受け取り、外部ライブラリの追跡下でその関数を実行する `track` と `dispose` を返します。
Solid はすべての計算をアダプターで包み、`trigger` が呼ばれたら計算を再実行し、計算が破棄されるときに `dispose` を呼びます。
複数回呼び出した場合はチェーンになり、それぞれが前のアダプターを包みます。
`subscribe` メソッドを持つライブラリなら、上のシグナルの方が小さな道具として適しています。
:::

## サーバーから切り離す

地図ライブラリはインポート時に `window` を読むため、サーバーでレンダリングするコンポーネントからインポートすると、コンポーネントのコードが走る前に失敗します。
[`clientOnly`](/docs/reference/solid-web/rendering-ssr/client-only.md)は動的インポートを受け取り、ブラウザでのみレンダリングされるコンポーネントを返します:

```tsx
import { clientOnly } from "@solidjs/web";

const StoreMap = clientOnly(() => import("./StoreMap"));

function StoreLocator() {
	return (
		<StoreMap fallback={<div class="map-placeholder" />} center={[51.5, 0]} />
	);
}
```

サーバーはフォールバックをレンダリングし、インポートは実行しません。
ブラウザはフォールバックをハイドレートし、モジュールとハイドレーションの確定を待ってから、渡された props とともに `StoreMap` に入れ替えます。
デフォルトでは `clientOnly` が呼ばれた時点でインポートが始まります。`{ lazy: true }` を渡すと、コンポーネントの初回レンダリング時に開始できます。

:::tip[バウンダリの上位でフェッチする]
インポートされたコンポーネント内の非同期読み取りは、入れ替え後にブラウザで開始されます。
店舗リストのメモは、サーバーでレンダリングされる `StoreLocator` で作成し、結果を `StoreMap` に prop として渡してください。
:::

ライブラリが必要なのが1か所だけなら、`onSettled` 内で動的インポートすれば、コンポーネントの残りはサーバーに残せます:

```tsx
import { onSettled } from "solid-js";

function StoreMap(props: { center: [number, number] }) {
	let container!: HTMLDivElement;

	onSettled(() => {
		let map: MapInstance | undefined;
		let disposed = false;
		import("map-lib").then(({ createMap }) => {
			if (disposed) return;
			map = createMap(container, { center: props.center });
		});
		return () => {
			disposed = true;
			map?.remove();
		};
	});

	return <div ref={container} class="map" />;
}
```

このコールバックはブラウザでのみ実行され、`disposed` フラグは、インポートが解決する前にコンポーネントがページから消えた場合をカバーします。
[SSR 安全なコード](/docs/guides/ssr-safe-code.md)ガイドでは、`isServer` をはじめとするブラウザ専用コードの書き方を網羅しています。

## よくある問題

### インポート時に `window is not defined` になる

ライブラリがモジュール本体で `window` や `document` を読んでいて、それをインポートしたコンポーネントがサーバーでレンダリングされています。
コンポーネントを `clientOnly` で包むか、インポートを `onSettled` コールバックの中に移してください。
[サーバーから切り離す](#keep-it-off-the-server)を参照してください。

### チャートが一度だけ描画されて更新されない

データが `onSettled` の中かエフェクト関数の中で読まれています。どちらも追跡されません。
[インスタンスは一度だけ作成し、エフェクトで更新する](#create-the-instance-once-update-it-in-an-effect)のように、`createEffect` のコンピュート関数で読み、その値をエフェクト関数へ渡してください。

### カスタム要素がオブジェクトや配列の prop を無視する

値が属性として設定され、ブラウザに文字列として保存されています。
`prop:disabledDates={holidays()}` のように `prop:` 名前空間を使えば、Solid がプロパティへ代入します。

### カスタムイベントのハンドラーが発火しない

`onDateChange` は `datechange` をリッスンします。大文字やハイフンを含む名前は決して一致しません。
正確な名前で `ref` ディレクティブからリスナーを追加してください。
イベントが `input` のようなデリゲーションされる名前で、要素が `bubbles: true` なしで発行しているなら、ルートのリスナーにも届きません。

### `ref` コールバック内のエフェクトやクリーンアップが実行されない

ref コールバックはオーナーなしで実行されます。
セットアップはコンポーネント本体の `onSettled`、あるいはコールバックを返すディレクティブファクトリーに移してください。
[ref コールバック内のエフェクトや onCleanup が実行されない](/docs/concepts/components-and-jsx.md#an-effect-or-oncleanup-inside-a-ref-callback-never-runs)を参照してください。

## まとめ

- `ref` の変数は JSX が評価された後に読み、要素がドキュメント内にある必要があるセットアップは `onSettled` の中で行います。
- ライブラリのインスタンスは `onSettled` で一度だけ作り、ティアダウンを返します。新しい値のたびに、すべての入力を読むコンピュート関数を持つエフェクトで流し込みます。
- カスタム要素では、通常の属性は文字列になります。プロパティには `prop:`、小文字のイベント名には `onXxx` を使います。
- `Portal` はコンポーネントのスコープを離れずにサブツリーを別のノードへ移します。サーバーはポータルを何もレンダリングしません。
- `render` は別のホストが所有するノードに Solid をマウントし、アンマウントする破棄関数を返します。
- 外部の値は、サブスクリプションのコールバックからシグナルに書き込んで取り込み、エフェクト関数からアンサブスクライブ関数を返します。
- ブラウザ専用のコンポーネントは `clientOnly` で包むか、`onSettled` の中でライブラリをインポートします。

## 次のステップ

- [カスタムプリミティブ](/docs/guides/custom-primitives.md): チャート・フィード・地図を `createX` 関数にパッケージ化します。このページが依拠したオーナーとクリーンアップのルールを使います。
- [SSR 安全なコード](/docs/guides/ssr-safe-code.md): 両側で動くコードの完全なチェックリスト。ライブラリ出力によるハイドレーションの不一致も含みます。
- [レンダリングと SSR](/docs/concepts/rendering-and-ssr.md): `render`・`hydrate`、そしてレンダリング関数の中での `clientOnly` の位置づけ。
- [不要なエフェクトを避ける](/docs/guides/avoid-unnecessary-effects.md): エフェクトが適切な道具になる2つのケース。このページはその両方を使いました。
