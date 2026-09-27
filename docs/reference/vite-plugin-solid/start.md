---
title: "StartOptions"
category: "@solidjs/vite-plugin"
order: 2
version: "2.0"
description: "@solidjs/vite-plugin のクライアントまたは SSR start モードを設定します。"
source_repo: "solidjs/solid-vite-plugin"
source_ref: "next"
source_path: "src/ssr/index.ts"
---

`StartOptions` は `solidPlugin({ start })` で有効になるサーブレイヤーを設定します。

## インポート

```ts
import solidPlugin, { type StartOptions } from "@solidjs/vite-plugin";
```

## 型

```ts
interface StartOptions {
	app?: string;
	entryServer?: string;
	entryClient?: string;
	document?: string;
	middleware?: string;
	setup?: string;
	env?: boolean | string;
	external?: boolean;
	node?: boolean;
}
```

すべてのパスは Vite ルートに対して相対解決され、存在する必要があります。
`app`、エントリー、ドキュメント、ミドルウェア、セットアップ、環境スキーマの各パスはそのルート内に収まっている必要があります。

## オプション

### `app`

- **型:** `string`
- **デフォルト:** `src/App.{tsx,jsx,ts,js}` または `src/app.{tsx,jsx,ts,js}` の最初の一致

生成されるエントリーが使う、デフォルトエクスポートされたルートコンポーネントを指定します。
クライアントモードで自作のクライアントエントリーが使えない場合、または SSR モードで自作のエントリーペアが使えない場合、プラグインは `app` を要求します。

### `entryServer`

- **型:** `string`
- **デフォルト:** `src/entry-server.{tsx,jsx,ts,js,mjs}` が存在すればそれ、なければ生成

SSR start モード用の自作サーバーエントリーを指定します。
自作サーバーエントリーは次をエクスポートする必要があります:

```ts
function render(
	request?: Request,
	context?: { clientEntry: string; [key: string]: unknown }
): RenderToStreamResult | string | Response | Promise<string | Response>;
```

クライアント start モードでは、プラグインは `entryServer` と慣例のサーバーエントリーを無視します。

### `entryClient`

- **型:** `string`
- **デフォルト:** `src/entry-client.{tsx,jsx,ts,js,mjs}` が存在すればそれ、なければ生成

ブラウザエントリーを指定します。
SSR モードでは、自作のサーバーエントリーとクライアントエントリーの両方が存在する必要があります。
クライアントモードでは、自作のクライアントエントリーは単独で使えます。

生成されるクライアントエントリーは、SSR モードでは `hydrate()` を、クライアントモードでは `document.body` への `render()` を呼び出します。

### `document`

- **型:** `string`
- **デフォルト:** `src/Document.{tsx,jsx}` が存在すればそれ、なければ組み込みドキュメント

生成されるサーバーエントリーが使う、デフォルトエクスポートされたドキュメント全体のコンポーネントを指定します。
ドキュメントはアプリケーションを `props.children` として受け取ります。
SSR モードでは、自作ドキュメントは `<html>` ドキュメントと `<HydrationScript />` を出力する必要があります。
ハンドラーはクライアントエントリーを `<head>` に注入します。

クライアントモードでは、ドキュメントはアプリケーションなしでレンダーされます。
ハンドラーは自作のハイドレーションスクリプトをその静的シェルから取り除きます。

### `middleware`

- **型:** `string`
- **デフォルト:** `undefined`

デフォルトエクスポートが単一のミドルウェア関数またはその配列であるサーバー専用モジュールを指定します。

```ts
type Middleware = (
	request: Request,
	next: (request?: Request) => Response | Promise<Response>
) => Response | Promise<Response>;
```

ミドルウェアはリクエストイベントスコープ内で配列の順に実行されます。
生成されるハンドラーがディスパッチするすべてのリクエスト（ページとサーバー関数エンドポイントを含む）の前段にミドルウェアが入ります。

### `setup`

- **型:** `string`
- **デフォルト:** `undefined`

生成される SSR が始まる前にアプリケーションを準備するデフォルトエクスポートを持つサーバー専用モジュールを指定します。

```ts
type Setup = (
	event: RequestEvent,
	App: Component
) => Component | void | Promise<Component | void>;
```

コンポーネントを返すと、そのリクエストでは `App` が置き換えられます。
何も返さなければ `App` がそのまま使われます。
クライアントモードではプラグインは `setup` を無視し、SSR が自作エントリーを使う場合は拒否します。
サーバー関数エンドポイントのディスパッチではセットアップ関数は実行されません。

### `env`

- **型:** `boolean | string`
- **デフォルト:** `env.ts`、次に `env.js` を探索。どちらも存在しなければ機能を無効化

Standard Schema による環境変数バリデーションを設定します。
`true` は慣例のスキーマファイルを要求し、文字列はスキーマファイルを選択し、`false` は探索を無効にします。

スキーマは `server` と `client` のマップのみをデフォルトエクスポートする必要があります。
すべての値は Standard Schema の `~standard.validate` を実装している必要があります。
クライアントキーは Vite の `envPrefix`（デフォルト `VITE_`）で始まる必要があり、同じキーを両方のマップに入れることはできません。

```ts
export default {
	server: {
		DATABASE_URL: z.url(),
	},
	client: {
		VITE_APP_NAME: z.string(),
	},
};
```

プラグインはスキーマの隣に `solid-env.d.ts` を書き込みます。
`virtual:env/client` には検証済みのクライアント値が含まれ、クライアントバンドルに焼き込まれます。
`virtual:env/server` にはサーバー値とクライアント値の両方が含まれ、サーバー起動時に `process.env` からサーバー値を読み取ります。
クライアントモジュールグラフからの `virtual:env/server` インポートは拒否されます。

クライアントのバリデーションエラーは開発とビルドを失敗させます。
サーバーのバリデーションエラーは開発を失敗させ、ビルド時は警告を出し、ビルド済みサーバーモジュールの起動時に失敗します。

### `external`

- **型:** `boolean`
- **デフォルト:** `false`

SSR start モードのビルド配線と HTTP サーブをホスト統合に委譲します。
プラグインは生成エントリー、クライアントマニフェスト、`virtual:solid-ssr-handler` を保持しますが、`dist/server` とその開発ミドルウェアは設定しません。
クライアントモードでは `external` は無視されます。

ホスト管理で実行不可能な `ssr` 開発環境は、このオプションなしでも検出されます。
開発用エンドポイントのディスパッチだけを委譲するには `serverFunctions.devMiddleware: false` を使ってください。

### `node`

- **型:** `boolean`
- **デフォルト:** `false`

`vite build` 時に `dist/server/server.js` の隣へ、完全な Node サーバーである `dist/server/node.js` を出力します。
`server.js`、`handleRequest`、デフォルトの `{ fetch }` エクスポートは変わりません。

出力されるモジュールは:

- ハンドラーより前に、ルート相対の `base` の下でクライアントビルドを静的ファイルとしてサーブします。
  `build.assetsDir` 配下のファイルには `Cache-Control: public, max-age=31536000, immutable` が、それ以外のファイルには `public, max-age=0, must-revalidate` と `Last-Modified` が付きます。
  ドットセグメントを含むパスと `..` によるトラバーサルは拒否されます。
- 残りのリクエストを `vite dev` と `vite preview` が使うブリッジ経由で `handleRequest(request, { event: { nativeEvent: req } })` に渡します。
  スローされたエラーは `console.error` にログ出力され、`500` を返します。
- サーバー関数を使うクライアントモードでは、どのファイルにも一致しない HTML `GET` リクエストに `dist/client/index.html` をサーブし、サーバー関数エンドポイントをディスパッチします。
- `node dist/server/node.js` で直接実行した場合、`PORT`（デフォルト `3000`）と `HOST` でリッスンします。

```ts
// dist/server/node.js
import type { IncomingMessage, Server, ServerResponse } from "node:http";

type Listener = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

interface ListenerOptions {
	static?: boolean;
	event?: (req: IncomingMessage) => Record<string, unknown>;
}

export declare const listener: Listener; // createListener()
export declare function createListener(options?: ListenerOptions): Listener;
export declare function serve(
	options?: { port?: number; host?: string } & ListenerOptions
): Server;
```

`static: false` はファイル検索とクライアントモードの `index.html` フォールバックをスキップします。
`event` は `{ nativeEvent: req }` にマージされるフィールドを返します。

ビルドが `node.js` を出力するのは `ssr` 環境のみで、そのビルドに `server.js` が含まれる場合だけです。
`external` 指定時や、サーバー関数なしのクライアントモードでは、プラグインは警告を出して何も出力しません。

## 有効なモードの組み合わせ

### トランスフォームのみ

```ts
solidPlugin();
solidPlugin({ ssr: true });
```

`start` なしでは、プラグインはトランスフォームのみを設定します。
`ssr: true` はクライアントとサーバーのトランスフォームを有効にし、エントリーとサーブはアプリケーションが提供します。

### クライアント start モード

```ts
solidPlugin({ start: true });
```

- 開発時は HTML `GET` リクエストにドキュメントシェルをサーブし、`render()` でアプリケーションをマウントします。
- `vite build` はプリレンダーされたシェルとクライアントアセットを `dist/client` に書き込みます。
- サーバー関数がハンドラーを必要としない限り、ビルドは `dist/server` を削除します。
- `vite preview` は静的な SPA フォールバックを使い、有効な場合はサーバー関数エンドポイントをディスパッチします。

### SSR start モード

```ts
solidPlugin({ start: true, ssr: true });
```

- 開発時は実行可能な `ssr` 環境を通じて HTML をストリーミングします。
- `vite build` はまずクライアントをビルドし、クライアントアセットと Vite マニフェストを `dist/client` に、`dist/server/server.js` を書き込みます。
- `node: true` の場合、ビルドは `dist/server/node.js` も書き込みます。
- サーバーバンドルは `handleRequest(request, options?)` をエクスポートします。
- `vite preview` はクライアントアセットをサーブし、それ以外のリクエストをビルド済みハンドラーに渡します。

### サーバー関数

`serverFunctions` はどちらの start モードとも組み合わせられます。
クライアントモードでは、ページは静的なまま、`dist/server/server.js` がエンドポイントリクエスト用に残ります。
`node: true` では、`dist/server/node.js` が静的ページとエンドポイントを 1 つのプロセスからサーブします。
SSR モードでは、同じハンドラーがページをレンダーする前にエンドポイントをディスパッチします。
