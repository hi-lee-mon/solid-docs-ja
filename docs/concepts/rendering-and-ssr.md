---
title: "レンダリングと SSR"
version: "2.0"
description: "同じコンポーネントをブラウザーとサーバーで実行します。ブラウザー専用コードをサーバーから隔離し、ハイドレーション用に一致する HTML を得て、文字列レンダリングとストリーミングレンダリングを使い分けます。"
---

`vite.config.ts` に `ssr: true` を追加してリロードすると、ターミナルにこう出力されます:

```text
ReferenceError: window is not defined
```

スタックは、インポート時に `localStorage` を読んだモジュールを指しています。
ブラウザーではコンポーネントに何の問題もなかったのですが、今それは `window` のない Node でも実行されており、同じソースが両方の場所で正しくある必要があります。

Solid はクライアントレンダリングとサーバーサイドレンダリング（SSR）に1つのコンポーネントソースを使います。
JSX のビルドターゲットが、ブラウザー向けの DOM 操作かサーバー向けの HTML 生成操作かを選択します。
このページでは、それがコードに何を求めるのか、そしてどのレンダリング関数がどの状況に合うのかを説明します。

ほとんどのアプリケーションがこのページから必要とするのは2つです。ブラウザー専用コードのための[サーバーとクライアントのバウンダリ](#server-and-client-boundaries)のルール、そして `Loading` バウンダリをどこに置くかという[ストリーミングレンダリング](#streaming-rendering)のルールです。
CLI で作ったプロジェクトでは、生成されたエントリーがすでに `render`・`hydrate`・`renderToStream` を呼んでいます。それらの関数の節は、レンダラーを直接呼ぶコード向けです。

## サーバーとクライアントのバウンダリ

`window`・`document`・`localStorage`・ブラウザー専用ライブラリーに触れるコードは、サーバーがレンダリングしている間に実行してはいけません。
安全な場所は3つあります。エフェクト関数、`onSettled` コールバック、またはブラウザーでのみレンダリングされるサブツリーです。

```tsx
// Avoid: runs on import, on the server too
const saved = localStorage.getItem("cart");
const [cart, setCart] = createStore(saved ? JSON.parse(saved) : { items: [] });

// Prefer: read the browser API after hydration, which happens only in the browser
const [cart, setCart] = createStore({ items: [] as CartItem[] });
onSettled(() => {
	const saved = localStorage.getItem("cart");
	if (saved) {
		setCart((draft) => {
			draft.items = JSON.parse(saved).items;
		});
	}
});
```

`Avoid` 版は `ReferenceError: localStorage is not defined` でサーバーレンダリングをクラッシュさせます。
`Prefer` 版ではサーバーが空のカートをレンダリングし、ブラウザーがそれをハイドレートし、`onSettled` コールバックがストレージから内容を埋めます。
`createEffect` のエフェクト関数と `onSettled` のコールバックはサーバーレンダリング中には実行されません。それらの計算関数は実行されることがあります。

共有コード内でのチェックには、[`isServer`](/docs/reference/solid-web/rendering-ssr/is-server.md) がビルド時定数です。ブラウザービルドでは `false`、サーバービルドでは `true` をエクスポートするため、バンドラーが到達不能な側を除去できます。

```tsx
import { isServer } from "@solidjs/web";

if (!isServer) {
	window.addEventListener("online", reportOnline);
}
```

マップやリッチテキストエディターのようにサーバーで実行できないコンポーネント全体には、[`clientOnly`](/docs/reference/solid-web/rendering-ssr/client-only.md) を使います。
サーバーはそのフォールバックをレンダリングし、インポートを開始しません。ブラウザーはフォールバックをハイドレートし、モジュールとハイドレーションの確定を待ってから、コンポーネントに入れ替えます:

```tsx
import { clientOnly } from "@solidjs/web";

const Map = clientOnly(() => import("./Map"));

export function StoreLocator() {
	return <Map fallback={<div class="map-placeholder" />} />;
}
```

デフォルトでは `clientOnly` は宣言が実行されたときに読み込みを開始します。
`{ lazy: true }` を渡すと、コンポーネントの初回レンダリングまでインポートを遅延します。

:::caution[モジュールスコープの状態はすべてのリクエストで共有される]
サーバーでは1つのモジュールインスタンスがすべてのリクエストに応答するため、モジュールスコープのシグナルやストアはあるユーザーの状態を別のユーザーのレスポンスへ漏らします。
状態はコンポーネントかコンテキストプロバイダーの内側で作ってください。これらはブラウザーではアプリごとに1回、サーバーではリクエストごとに1回実行されます。
[状態管理](/docs/guides/state-management.md#module-level-state-and-the-server) でこのパターンと、サーバーがモジュールスコープ版をどう扱うかを示しています。
:::

## クライアントレンダリング

[`render`](/docs/reference/solid-web/rendering-ssr/render.md) はツリーを DOM コンテナにマウントし、そのツリーとリアクティブスコープを解体する破棄関数を返します:

```tsx
import { render } from "@solidjs/web";
import { App } from "./App";

const root = document.getElementById("app");

if (!root) {
	throw new Error("Missing #app");
}

const dispose = render(() => <App />, root);

// Call dispose() when this root must be unmounted.
```

関数を渡すと、Solid はコンポーネントツリーを評価する前にルートを作ります。
ルートはそのコンテナのデリゲートされたイベントリスナーを所有し、破棄はそれらを取り除きます。
最初のレンダリングに未解決の非同期読み取りがなければ、`render` は戻る前にその処理をフラッシュします。非同期読み取りが保留中なら、確定後にマウントが取り付けられます。

## サーバー HTML のハイドレーション

[`hydrate`](/docs/reference/solid-web/rendering-ssr/hydrate.md) は、`renderToString` または `renderToStream` からの HTML をすでに保持しているコンテナに対する `render` です。
既存のノードを引き継ぎ、それらを作り直さずにイベントハンドラーとリアクティブバインディングを取り付けます:

```tsx
import { hydrate } from "@solidjs/web";
import { App } from "./App";

const root = document.getElementById("app");

if (!root) {
	throw new Error("Missing #app");
}

hydrate(() => <App />, root);
```

サーバーとクライアントは、ハイドレートされる各領域で同じ初期構造をレンダリングしなければなりません。
Solid は SSR 中にハイドレーションキーを割り当てるため、クライアントビルドは一致するノードを引き継げます。構造が異なると、クライアントは期待するノードを見つけられません。

```tsx
// Avoid: a different element on each side
{
	isServer ? (
		<p>Rendered on the server</p>
	) : (
		<time>Rendered at {Date.now()}</time>
	);
}

// Prefer: the same structure, with the browser-only value filled in after hydration
const [renderedAt, setRenderedAt] = createSignal<number>();
onSettled(() => setRenderedAt(Date.now()));

<p>
	{renderedAt() ? `Rendered at ${renderedAt()}` : "Rendered on the server"}
</p>;
```

`Avoid` 版は開発環境で `Hydration tag mismatch for key "...": expected <time> but found` のような警告を記録し、その後に代わりに見つかった `<p>` が続きます。そしてその領域のクライアントのバインディングは間違ったノードに取り付けられます。
`Prefer` 版はクリーンにハイドレートし、ブラウザーが引き継いだ後にテキストを更新します。
テキストだけが異なる値（`<p>{Date.now()}</p>` など）は警告を出しません。ハイドレーションはサーバーのテキストノードをそのまま採用するため、リアクティブな更新が置き換えるまでページはサーバーの値を表示し続けます。
[SSR セーフなコード](/docs/guides/ssr-safe-code.md#values-that-differ-on-every-run) でこれらのケースと各警告の読み方を解説しています。

アプリケーションがドキュメント全体を所有している場合は、アプリケーションマークアップの前に `HydrationScript` を1回含めます。
これはハイドレーションサポートを初期化し、クライアントバンドルがハイドレートする前に発火したデリゲートされたイベントを記録するため、読み込み中のクリックが失われません。
1ページに複数のルートがある場合は、各サーバーレンダリングに別々の `renderId` を与え、同じ値をその `hydrate` 呼び出しに渡してください:

```tsx
// Server
const accountHtml = renderToString(() => <Account />, { renderId: "account" });

// Client
hydrate(() => <Account />, accountRoot, { renderId: "account" });
```

## 同期的な文字列レンダリング

[`renderToString`](/docs/reference/solid-web/rendering-ssr/render-to-string.md) はコンポーネントツリーを同期的に実行し、HTML 文字列を返します。
ツリーが同期的に完了できる場合、または保留中の部分がフォールバックをレスポンスに含めてよい `Loading` バウンダリの内側にある場合に使います:

```tsx
import { Loading } from "solid-js";
import { renderToString } from "@solidjs/web";
import { App } from "./App";

const html = renderToString(() => (
	<Loading fallback={<main>Loading…</main>}>
		<App />
	</Loading>
));
```

`Loading` の内側で読み取りが保留中のとき、文字列にはそのバウンダリのフォールバックが含まれ、後から届くものはありません。
非同期処理が確定したらクライアントに本物のコンテンツを届けたい場合は、ストリーミングを使ってください。

## ストリーミングレンダリング

[`renderToStream`](/docs/reference/solid-web/rendering-ssr/render-to-stream.md) はまず同期のシェルを出力し、次に各 `Loading` バウンダリのコンテンツが確定するたびにフラグメントを出力します:

```tsx
import { renderToStream } from "@solidjs/web";
import { App } from "./App";

export function handleRequest(): Response {
	const stream = renderToStream(() => <App />);
	return new Response(stream.readable, {
		headers: { "content-type": "text/html; charset=utf-8" },
	});
}
```

返されたオブジェクトは、Node の writable へパイプする、Web の `WritableStream` へパイプする、`ReadableStream<Uint8Array>` を公開する、あるいは完全に確定した HTML として await することができます。
レンダリングごとに出力形式を1つ選んでください。

上に `Loading` バウンダリのない非同期読み取りは、確定するまでシェルをブロックします。
バウンダリの内側では、シェルはフォールバックを載せ、後のフラグメントがそれを置き換えます。
つまり `Loading` の配置はクライアントだけでなくサーバーの決定でもあります。商品詳細の周りのバウンダリは、商品クエリがまだ実行中の間に、ヘッダー・ナビゲーション・フッターをブラウザーへ届けます。
[バウンダリ](/docs/concepts/boundaries.md) で配置と、`Reveal` がフラグメントをどう並べるかを解説しています。

## ドキュメントを所有するのは誰か

サーバーレンダリングは完全なドキュメントを生成することも、別のホストが所有するドキュメントに埋め込まれるフラグメントを生成することもできます。
その選択が、head コンテンツとレンダリングアセットがどうページに届くかを決めます。

レンダリング出力に閉じる `</head>` が含まれる場合、レンダラーは登録された head コンテンツとアセットをそのドキュメントに挿入します:

```tsx
import { HydrationScript, renderToString } from "@solidjs/web";
import { App } from "./App";

const html = renderToString(() => (
	<html lang="en">
		<head>
			<meta charset="utf-8" />
			<HydrationScript />
		</head>
		<body>
			<div id="app">
				<App />
			</div>
		</body>
	</html>
));
```

別のホストがドキュメントを所有する場合は、アプリケーションフラグメントをレンダリングし、`onHead` で head の HTML を受け取ります。
`renderToString` では `onHead` は関数が戻る前に同期的に実行され、`renderToStream` ではシェルが出力される前に実行されます:

```tsx
let head = "";

const body = renderToString(() => <App />, {
	onHead(value) {
		head = value;
	},
});

const documentHtml = `<!doctype html>
<html>
  <head>${head}</head>
  <body><div id="app">${body}</div></body>
</html>`;
```

レンダラーは HTML 生成と head の受け渡しを処理します。
サーバーアダプター、ルーティング、レスポンス生成、デプロイはアプリケーション層の仕事です。[アプリの構造](/docs/building-apps/app-structure.md) で CLI テンプレートがそれらをどう配線するかを示しています。

## ハイドレーションの制御

これらの制御は、ハイドレーションの所有権をサーバーとクライアントで分けます。
サーバーレンダリングされたマーケティングページにインタラクティブな島が1つあるなど、両者が意図的にドキュメントの異なる部分を管理する場合にのみ使ってください。

[`NoHydration`](/docs/reference/solid-js/advanced/manual-hydration/no-hydration.md) は、ハイドレーションキーやシリアライズされた状態なしで、その子をサーバー上にレンダリングします。
クライアントのハイドレーション中、Solid はそのサブツリーをスキップし、その DOM を触れないままにします:

```tsx
import { NoHydration } from "solid-js";

<NoHydration>
	<aside>This server-rendered content is not hydrated.</aside>
</NoHydration>;
```

[`Hydration`](/docs/reference/solid-js/advanced/manual-hydration/hydration.md) は `NoHydration` 領域の内側でハイドレーションを再有効化し、サーバー上で新しいハイドレーション id 名前空間を開始します。
それをハイドレートするクライアントルートの `renderId` と同じ id を渡してください:

```tsx
import { Hydration, NoHydration } from "solid-js";

<NoHydration>
	<div id="account">
		<Hydration id="account">
			<Account />
		</Hydration>
	</div>
</NoHydration>;
```

```tsx
import { hydrate } from "@solidjs/web";

const accountRoot = document.getElementById("account")!;

hydrate(() => <Account />, accountRoot, { renderId: "account" });
```

## よくある問題

### `window is not defined` または `document is not defined`

サーバーがレンダリングしている間に、モジュールやコンポーネント本体がブラウザー API を読んでいます。
読み取りをエフェクト関数や `onSettled` コールバックへ移すか、`isServer` でガードするか、コンポーネントを `clientOnly` で包んでください。
[サーバーとクライアントのバウンダリ](#server-and-client-boundaries)を参照してください。

### コンソールに `Hydration tag mismatch`・`Hydration structure mismatch`・`Hydration key miss`

サーバーとクライアントが同じ領域に異なる要素をレンダリングしました。別のタグを選ぶ `isServer` の条件分岐はタグ不一致を報告し、`Math.random()` に依存する条件の `Show` や、リクエストとブラウザーで異なるデータはテンプレート内の構造不一致を報告します。
両側で同じ構造をレンダリングし、ブラウザー専用の値はハイドレーション後に埋めてください。[ハイドレーション警告の読み方](/docs/guides/ssr-safe-code.md#reading-the-hydration-warnings)で各メッセージが何をチェックするかを説明しています。
メッセージが名前空間に言及するキーミスは、サブツリーがサーバーが使ったのとは異なる `renderId` でハイドレートされたことを意味します。[ハイドレーションの制御](#controlling-hydration)を参照してください。

### ページはレンダリングされるが最初のクリックが何もしない

クライアントバンドルがハイドレートする前に発火したクリックは、`HydrationScript` がドキュメントの head にない限り失われます。
アプリケーションマークアップの前に、1回だけ含めてください。

### 何かが送られる前にシェルがすべてのリクエストを待つ

どの `Loading` バウンダリの外側にもある非同期読み取りが、ストリームのシェルをブロックしています。
その読み取りに依存する領域の周りにバウンダリを置けば、シェルはフォールバックを載せ、コンテンツは後でストリーミングされます。

## まとめ

- 1つのコンポーネントソースがブラウザーとサーバーで実行されます。`window` を必要とするコードは、エフェクト、`onSettled` コールバック、`isServer` の内側、または `clientOnly` の内側で実行します。
- 状態はコンポーネントやプロバイダーの内側で作り、モジュールスコープには作らないでください。リクエスト間で共有されないようにするためです。
- 両側で同じ初期構造をレンダリングし、ブラウザー専用の値はハイドレーション後に埋めます。
- アプリケーションがドキュメントを所有する場合は `HydrationScript` を1回含めます。
- `renderToString` はフォールバック入りのシェルを返し、`renderToStream` はシェルを送り、各バウンダリのコンテンツを確定するたびにストリーミングします。
- `Loading` バウンダリはシェルに含まれるものと後でストリーミングされるものを決めるため、その配置もサーバーの決定です。
- `NoHydration`・`Hydration`・`renderId` は、サーバーとクライアントが意図的にページの異なる部分を所有する場合にのみ使います。

## 次のステップ

- [レンダリングモードを選ぶ](/docs/guides/choose-a-rendering-mode.md): start-mode のプロジェクトがこれらの API のどれを使うか、そして静的シェル・ストリーミング SSR・プリレンダリングの選び方。
- [アプリの構造](/docs/building-apps/app-structure.md): `render`・`hydrate`・`renderToStream` を代わりに呼ぶ生成済みエントリー。
- [バウンダリ](/docs/concepts/boundaries.md): `Loading` の配置が、シェルにストリーミングされるものと後で届くものをどう決めるか。
- [head とメタデータ](/docs/building-apps/head-and-metadata.md): コンポーネントで宣言されたタイトルとメタタグが、両側でドキュメントの head に届く仕組み。
- [SSR セーフなコード](/docs/guides/ssr-safe-code.md): 両方の場所で実行されるコードのチェックリストと、各ハイドレーション警告の読み方。
