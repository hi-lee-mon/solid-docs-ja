---
title: "アプリの構造"
version: "2.0"
description: "start モードのプロジェクトで編集する2つのファイル、その周辺をプラグインが生成するもの、生成されたエントリーを置き換えるべきとき、サーバーレンダーにルーターをフックすべきときを理解します。"
---

[クイックスタート](/getting-started/quick-start)で作成したプロジェクトを開くと、すべての Vite テンプレートにある2つのものが見つかりません。`index.html` がなく、`render()` や `hydrate()` を呼び出すファイルもありません。
代わりにあるのは `src/App.tsx`、`src/Document.tsx`、そして `start: true` が設定された `vite.config.ts` です。

この2つのコンポーネントがアプリケーションの表面全体です。
`App` はすべてのページがその内部でレンダーされるコンポーネントで、`Document` はそれを包む HTML のシェルです。
残りはプラグインの start モードが生成します。`<Document><App /></Document>` をレンダーするサーバーエントリー、それをマウントまたはハイドレートするクライアントエントリー、そして両方を配信するリクエストハンドラーです。

ほとんどのアプリで必要なのは `App.tsx` と `Document.tsx` だけで、以下の最初の2つのセクションはこれらのファイルについてのものです。
生成エントリーと `start.setup` のセクションは、独自のサーバーエントリーやレンダー開始前にロードする必要のあるルーターなど、デフォルトを変更する必要があるプロジェクト向けです。

## 3つのレンダリングモード、1つのレイアウト

Start モードは `start: true`（オプションを渡す場合は `start: {}`）で有効になり、`ssr` が生成されたエントリーの動作を決めます:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";

export default defineConfig({
	plugins: [solid({ start: true, ssr: true })],
});
```

[レンダリングモードを選ぶ](/guides/choose-a-rendering-mode)ガイドで比較している3つのモードは、すべて同じ `App` と `Document` ファイルを使います:

- `ssr` なしの場合のデフォルトである、ブラウザーでレンダーされる静的シェル。
  ビルドはアプリを含まない `Document` を `dist/client/index.html` に書き出し、生成されたクライアントエントリーが `render()` を呼んで `App` を `document.body` にマウントします。
  サーバー関数がなければビルドは `dist/server` を削除するため、`dist/client` は任意の静的ホストにデプロイできます。
- `ssr: true` でのストリーミングサーバーレンダリング。
  各リクエストでサーバー上で `<Document><App /></Document>` をレンダーしてストリーミングし、生成されたクライアントエントリーが同じツリーに対して `hydrate()` を呼びます。
  ビルドは `dist/client` と `dist/server` 内のリクエストハンドラーを出力します。
- ビルド時にプリレンダー。
  `solid()` の隣に追加する `prerender-crawler` プラグインが、到達可能なページごとにサーバービルドを1回実行し、HTML を `dist/client` に書き出します。
  これは start モードの設定ではなくプラグインで、同じ2つのファイルをレンダーします。

`ssr` を切り替えると、ビルドが生成するものとホストが実行するものが変わります。
`App.tsx`、`Document.tsx`、ルートは変わりません。これが、[プロジェクト構成](/getting-started/project-shapes)が同じレイアウトに異なるオプションを持つ形になっている理由です。

:::note[サーバー関数はサーバーハンドラーを維持する]
`serverFunctions` が有効で `ssr` が無効の場合、ページは静的ファイルのままですが、サーバー関数の呼び出しに応答する `/_server` エンドポイントは `dist/server` に存在するため、ビルドはそのディレクトリを保持し、ホストはそれを実行する必要があります。
[レンダリングモードを選ぶ](/guides/choose-a-rendering-mode#what-the-host-runs)では、これとプリレンダーとを比較検討しています。
:::

## アプリコンポーネント

`src/App.tsx` はルートコンポーネントをデフォルトエクスポートします。
`bare` テンプレートではそれがアプリのすべてで、`basic` と `fullstack` ではルーターをマウントし、サイト全体のレイアウトを保持します:

```tsx
// src/App.tsx
import { createSignal } from "solid-js";
import logo from "./logo.svg";
import "./App.css";

export default function App() {
	const [count, setCount] = createSignal(0);

	return (
		<header class="header">
			<img src={logo} class="logo" alt="Solid logo" />
			<button onClick={() => setCount(count() + 1)}>Clicks: {count()}</button>
		</header>
	);
}
```

開発サーバーを起動すると、カウンター付きのヘッダーがページに表示されます。
このファイルのどこにも、どのモードで動作しているかを知る部分はありません。`ssr: true` では、同じコンポーネントがサーバーで1回、ブラウザーで1回レンダーされます。

すべてのページに表示すべきものはここに置きます。ルーター、ナビゲーション、デフォルトの `<Title>`、ルーティングされたコンテンツを囲む `Loading` バウンダリです。
特定のページに属するものは、そのページのルートモジュールに置きます。

プラグインは `src/App` を `.tsx`、`.jsx`、`.ts`、`.js` の順に探し、大文字のステムが見つからない場合は同じ拡張子で小文字の `src/app` にフォールバックします。
`start.app` を設定すると、Vite ルート内の別のモジュールを指せます。

## ドキュメントコンポーネント

`src/Document.tsx` は HTML ドキュメント全体をデフォルトエクスポートします。
アプリを `props.children` として受け取り、charset、viewport、favicon などのサイト全体の head タグを置く場所です:

```tsx
// src/Document.tsx
import type { ParentProps } from "solid-js";
import { HydrationScript } from "@solidjs/web";

export default function Document(props: ParentProps) {
	return (
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="icon" href="/favicon.ico" />
				<title>Solid App</title>
				<HydrationScript />
			</head>
			<body>{props.children}</body>
		</html>
	);
}
```

ページのソースを表示すると、これがアプリを囲むマークアップです。
プラグインはクライアントエントリーの `<script>` を head に注入するため、そのタグを自分で書く必要はありません。

このファイルにはルールのある行が2つあります:

```tsx
// Avoid: a document with no hydration script under ssr: true
<head>
	<meta charset="utf-8" />
</head>

// Prefer: HydrationScript once, before the app markup
<head>
	<meta charset="utf-8" />
	<HydrationScript />
</head>
```

`Avoid` 版では、HTML が到着してからクライアントバンドルがハイドレートするまでの間に起きたクリックや入力が失われます。[レンダリングと SSR](/concepts/rendering-and-ssr#the-page-renders-but-the-first-clicks-do-nothing) でその症状を説明しています。
静的シェルのプロジェクトでも `<HydrationScript />` をドキュメントに残してください。ハンドラーはプリレンダーされたシェルからその出力を取り除くため、`ssr` を有効にするまでコストはかかりません。

もう1つのルールは `{props.children}` です。
生成されたサーバーエントリーは `<Document><App /></Document>` をレンダーするため、children をレンダーしない body はアプリを決してレンダーしません。

プラグインは `src/Document.tsx` を探し、次に `src/Document.jsx` を探します。`start.document` は別のモジュールを指定し、優先されます。
ファイルを削除すると、生成されたエントリーは charset、viewport タグ、ハイドレーションスクリプトを持つ組み込みのシェルを使います。
静的な `<title>Solid App</title>` は、どのページも `<Title>` をマウントしていない場合のフォールバックです。ページごとのタグによる置き換えは [head とメタデータ](/building-apps/head-and-metadata) で説明しています。

## 生成エントリーと自作エントリー

:::advanced[このセクションを読むべきとき]
生成されたエントリーは、公式テンプレートのルーターを含むすべてのプロジェクト構成をカバーします。
サーバーレンダーが生成されたものでは返せないもの（リクエストごとのカスタム `Response` や別のホストが組み立てるドキュメントなど）を返す必要がある場合に、独自のエントリーを作成します。
:::

エントリーのペアは次の順序で選択されます。明示的な `start.entryServer` と `start.entryClient` のパス、次に慣例の `src/entry-server.*` と `src/entry-client.*` ファイル（`.tsx`、`.jsx`、`.ts`、`.js`、`.mjs` の順に探索）、そして `App` と `Document` から構築される生成ペアです。

`ssr: true` の下では、ハイドレーションが一致するには両側が同じドキュメントツリーをレンダーしなければならないため、自作エントリーはペアで必要です。
サーバーエントリーは `render(request, context)` をエクスポートし、`renderToStream` の結果、HTML 文字列、または `Response` を返せます。
クライアントエントリーはハイドレーションを担当し、サーバードキュメントは自分のクライアント `<script>` 要素を持ちます。`context.clientEntry` が解決済みのクライアントエントリー URL を保持し、本番ハンドラーはルート相対のリテラル参照も自作クライアントエントリーに書き換えます。
自作エントリーは `App` と `Document` の慣例をバイパスします。これら2つのモジュールは生成エントリーに属するものです。

`ssr` なしでは、サーバーエントリーは常に生成されます。開発サーブとビルド時プリレンダーのためにシェルをレンダーするからです。
このモードでは自作のクライアントエントリーは単独で成立し、ブラウザーへのマウントを担当します。`start.entryServer` と `src/entry-server.*` ファイルは無視され、選択された `Document` が引き続きシェルを提供します。

`ssr: true` の下で片方だけの自作エントリーを提供するのは設定エラーで、メッセージが不足しているファイル名を示します。

## ルーターのマウント

Start モードはルーターを選択しません。
テンプレートの両方のルーターバリアントがそうしているように、`App` の内部でルーターまたはそのプロバイダーをマウントします。ルートモジュールとルートテーブルの生成は、選択したルーターに委ねられます。

ルーターの中には、サーバーレンダーが始まる前にマッチしたルートをロードできるよう、現在のリクエストにバインドされたインスタンスを必要とするものがあります。
`start.setup` はそのためのサーバー専用モジュールを指定します:

```ts
// vite.config.ts
solid({
	start: {
		setup: "./src/setup.tsx",
	},
	ssr: true,
});
```

このモジュールは、リクエストイベントと `App` コンポーネントを受け取る関数をデフォルトエクスポートします。
生成されたサーバーエントリーは、ミドルウェアチェーンがページレンダーにディスパッチした後、`renderToStream()` が始まる前にそれを呼び出します。
戻り値はコンポーネント、何も返さない、またはそのいずれかの Promise のいずれでも構いません。返されたコンポーネントは `Document` 内で `App` の代わりにレンダーされ、戻り値がなければ `<App />` が使われます。
ブラウザー側の `App` は同じルーターツリーを生成しなければなりません。さもないとハイドレーションが一致しません。

`start.setup` は、`ssr: true` の下で生成されたサーバーエントリーが行うページレンダーに対してのみ実行されます。
`ssr` なしでは無視され、自作のサーバーエントリーとの組み合わせはエラーです。

[ルーターを統合する](/routing/integrate-a-router)では、サポートされている2つのルーターがこのフックをどう使うか、そしてどんなプロジェクトでそれが必要になるかを示しています。

## よくある問題

### `the start option needs an app root`

`src/App.tsx`（または `.jsx`、`.ts`、`.js`、小文字の `app` バリアント）がなく、`start.app` も設定されていません。
ファイルを追加するか `start.app` を設定してください。`ssr: true` の下では、自作の `src/entry-server.*` と `src/entry-client.*` のペアがもう1つの満たし方です。

### `found entry-server but no entry-client; entry files come in pairs`

`ssr: true` の下で片方の自作エントリーが存在します。
対になるエントリーを追加するか、既存のものを削除して生成ペアに戻してください。

### サーバーレンダーされたページで body が空になる

`Document` が `props.children` をレンダーしていません。
アプリは children として渡されるため、内容をハードコードした body はそれを決してレンダーしません。

### 開発時にエラーが表示された場所で本番が 500 ページを表示する

本番ビルドは生成されたエントリーをデフォルトのエラーバウンダリで包み、サーバーで `console.error` によりエラーをログ出力し、500 ステータスで `500 | Internal Server Error` をレンダーします。開発ビルドにはそのようなバウンダリはありません。
実際のエラーはサーバーログを読んでください。
ミドルウェアがエラー処理を担う場合は `start.errorBoundary: false` を設定します。そのミドルウェアは [ミドルウェアと API ルート](/building-apps/middleware-and-api-routes#catching-errors) にあります。

### `start.setup only applies to generated entries`

プロジェクトに自作の `src/entry-server.*`（または `start.entryServer`）と `start.setup` が同時に存在します。
自分の `render()` からセットアップ処理を呼び出して `start.setup` を削除するか、自作エントリーを削除してください。

## 計測コードを最初にロードする

サーバー上のエラーモニターやトレーシング SDK は `node:http` や観測対象の他のモジュールにパッチを当てるため、それらのモジュールがインポートされる前に実行する必要があります。
エントリーの先頭に `import "./instrument"` と書いても ESM ではそれは実現できません。静的インポートは巻き上げられて依存関係の順序で評価されるため、エントリー自身の依存関係が先にロードされます。
`start.instrument` は、プラグインがサーバーグラフの他のすべての前に await するサーバー専用モジュールを指定します:

```ts
// vite.config.ts
solid({
	start: {
		instrument: "./src/instrument.ts",
	},
	ssr: true,
});
```

```ts
// src/instrument.ts
import * as monitor from "my-monitor/server";

monitor.init({ dsn: process.env.MONITOR_DSN });
```

生成されたハンドラーエントリーは `await import(instrument); await import(handler)` になるため、そのモジュールはアプリ、ミドルウェア、`@solidjs/web`、その他の依存関係が評価される前に、トップレベルの `await` を含めて完了まで実行されます。
プラグインはすべての局面でこれを尊重します。`vite dev`、`vite build`、`vite preview`、そしてハンドラーエントリーを直接インポートするホスト（ホストごとの `node --import` フラグを置き換えます）です。
このモジュールにエクスポートは不要です。
サーバービルドでコード分割を有効のままにしてください（デフォルト）。動的インポートをインライン化すると、ハンドラーグラフが instrument の上に巻き上げられてしまいます。

## まとめ

- すべてのページで共有するものは `src/App.tsx`、HTML シェルは `src/Document.tsx` を編集します。プラグインがそれらを取り囲むエントリーを生成します。
- 静的シェル、ストリーミング SSR、プリレンダーはすべて同じ2つのファイルを使います。`ssr` とクローラープラグインが変えるのはビルドとホストであり、コードではありません。
- `<HydrationScript />` を `Document` に残してください。これがないとハイドレーション前の入力が失われます。静的シェルは無料でそれを取り除きます。
- ドキュメントの body で `{props.children}` をレンダーしてください。さもないとアプリはサーバーに現れません。
- `Document` の静的な `<title>` はフォールバックです。ページごとのタイトルは head メタデータから来ます。
- `entry-server` と `entry-client` はセットで自作し、生成ペアが必要なレスポンスを生成できない場合に限ってください。
- ルーターがサーバーレンダーの前にリクエストに対してロードする必要がある場合は `start.setup` を使います。これは `ssr: true` の生成エントリーにのみ適用されます。
- サーバーグラフがロードされる前に実行が必要なモジュール（監視 SDK の `init()` など）には `start.instrument` を使います。エントリー先頭の静的インポートは最初には実行されません。

## 次のステップ

- [スタイリングとアセット](/building-apps/styling-and-assets): リンク元の `index.html` がなくなった今、CSS と画像を置く場所。
- [head とメタデータ](/building-apps/head-and-metadata): `Document` シェルの上に載せるページごとのタイトルとメタタグ。
- [レンダリングモードを選ぶ](/guides/choose-a-rendering-mode): ユーザーが見るものとホストが実行するものから、3つのモードのどれがプロジェクトに合うか。
- [デプロイ](/building-apps/deployment): 初回デプロイで `dist/client` と `dist/server` をどうするか。
- [オブザーバビリティ](/guides/observability): instrument モジュールが何にフックするか、そして本番でレコードとトレースを運ぶ `observe` ビルド。
