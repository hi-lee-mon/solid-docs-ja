---
title: "デプロイ"
version: "2.0"
description: "start モードのビルドをホストに載せます。dist/client を静的ファイルとして配信し、それ以外のすべてをビルド済みのリクエストハンドラーに回し、起動時にサーバー環境を供給し、Node サーバーまたはプロバイダーアダプターを選びます。"
---

`fullstack` プロジェクトの初回デプロイは、たいてい2つのうちどちらかの形で失敗します。
HTML は届くのに `/assets/*.js` と `.css` のリクエストがすべて 404 を返し、ページがスタイルなしでハイドレートもされないか。
あるいはホームページは動くのに `/account/orders` をリロードするとホストの 404 ページが返ってくるかです。
どちらも、ホストがビルドの半分しか配信していないことを意味します。`dist/client` は静的ファイルのディレクトリ、`dist/server/server.js` はリクエストハンドラーであり、ホストは前者を後者の前に置く必要があります。

`bare` や `basic` のプロジェクトは `dist/client` だけにビルドされ、任意の静的ホストが配信できます。
このページは `ssr: true` またはサーバー関数を持つプロジェクトについてのもので、静的アセットとサーバーハンドラーにビルドされます。
[プロジェクト構成](/getting-started/project-shapes)ではどの構成がどの出力を生成するかを、[アプリの構造](/building-apps/app-structure)ではハンドラーが実行するエントリーを説明しています。

ほとんどのアプリで必要なのはリクエストハンドラーのセクションと、その後にあるホストのセクションのうち1つです。出力された `dist/server/node.js` を使う Node か、プロバイダープラグインのどれかです。
残りは細部を確認したり、リストにないホストを配線したりするためのものです。

## ビルドが生成するもの

設定された Vite ビルドを実行します:

```bash
pnpm build
```

`start` と `ssr: true` で、1回のビルドが生成するもの:

- `dist/client`。ブラウザーの JavaScript、CSS、画像、その他の静的アセットを含み、ファイル名はハッシュ付きです。
- `dist/server/server.js`。サーバーエントリーと、エクスポートされたリクエストハンドラーを含みます。

サーバー関数が有効な場合、サーバーバンドルはそのエンドポイント（デフォルトは `/_server`）もディスパッチします。
ページとサーバー関数は1つのデプロイです。レンダーはサーバー関数を同じプロセス内で直接呼び出し、リクエストイベントとその `locals` を手元に持つため、サーバーバンドルを「ページはこのホスト、関数は別のホスト」に分割することはできません。

`ssr: true` なしでは、start モードは空のドキュメントシェルを `dist/client/index.html` に書き出し、アプリケーションにサーバー関数がなければ `dist/server` を削除します。
サーバー関数が有効な場合は、`dist/client` をページ用にデプロイし、`dist/server` を関数エンドポイント用に実行し続けます。
ブラウザーから1つのオリジンに見える限り、両者は別のホストに置けます。サーバー関数のクライアント呼び出しは契約上同一オリジンなので、クライアントを別のオリジンに向けるのではなく、ページを配信する CDN やプロキシーから `/_server/*` を関数ホストにルーティングしてください。

## リクエストハンドラー

ビルドされたサーバーエントリーは、ハンドラーを2つの形でエクスポートします:

```ts
import app, { handleRequest } from "./dist/server/server.js";

const response = await handleRequest(request);
const sameResponse = await app.fetch(request);
```

`handleRequest(Request)` は直接的な Solid API です。
デフォルトエクスポートは Workers、Nitro、Netlify Functions、Bun、`deno serve` で使われる Fetchable モジュールの慣例に従います:

```ts
export default {
	fetch(request: Request) {
		return handleRequest(request);
	},
};
```

このラッパーは意図的にリクエストだけを受け取ります。
ホストによっては追加の環境や実行コンテキストの引数を付けて `fetch` を呼びますが、それらは Solid ハンドラーのオプションではありません。

ハンドラーはリクエストイベントを作成し、設定されたミドルウェアを実行し、有効な場合はサーバー関数のエンドポイントをディスパッチし、ページをレンダーし、レスポンスのメタデータを確定します。
また、クライアントビルドマニフェストを通してビルド済みのクライアントエントリーとスタイルシートの URL を解決します。

静的ファイルが先です:

```ts
// Avoid: every request goes to the handler, assets included
const server = createServer(async (req, res) => {
	const response = await handleRequest(webRequest(req));
	await sendWebResponse(res, response);
});

// Prefer: serve dist/client, then hand the rest to the handler
const server = createServer(async (req, res) => {
	if (await serveStatic("dist/client", req, res)) return;
	const response = await handleRequest(webRequest(req));
	await sendWebResponse(res, response);
});
```

`Avoid` 版では、`/assets/app-BpJ2g.js` へのリクエストが HTML ページをレンダーします。本番ではミドルウェアチェーンの最後まで到達したリクエストはすべてレンダーされるためで、ブラウザーはスクリプトを期待した場所でドキュメントを受け取ります。
`start.node` では、出力される Node エントリーは `Prefer` 版です。このセクションの残りは、自分で書くブリッジ向けです。

ホストのリクエストを適合させるときは、URL、メソッド、ヘッダー、そして `GET` と `HEAD` 以外のリクエストのボディを保持してください。
結果を適合させるときは、ステータス、ヘッダー、各 `Set-Cookie` の値を個別に、そしてストリーミングされたボディを保持してください。

:::caution[Set-Cookie をカンマで連結してはならない]
レスポンスは複数の `Set-Cookie` ヘッダーを持てるため、それらを1つのカンマ区切りの値に連結すると、中のすべての Cookie が壊れます。
出力される Node エントリーは `headers.getSetCookie()` でそれらを読み取り、配列を Node に渡します。他のサーバー向けのブリッジにも同じ配慮が必要です。
:::

## Node

Node には Fetchable モジュールを受け取るサーバー API がないため、プラグインが Node サーバーを出力します。
`start.node` を設定すると、ビルドは `dist/server/server.js` の隣に `dist/server/node.js` を書き出します:

```ts title="vite.config.ts"
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";

export default defineConfig({
	plugins: [
		solid({
			start: { node: true },
			ssr: true,
		}),
	],
});
```

`server.js` は変わりません。`handleRequest` とデフォルトの `{ fetch }` エクスポートはオプションなしの場合と同じなので、プロバイダー統合や Fetch ランタイムはそのファイルから動作し続けます。

ビルドしてから、出力されたファイルを実行します:

```bash
pnpm build
node dist/server/node.js
```

サーバーは `PORT` で待ち受け（デフォルトは `3000`）、`HOST` が設定されていればそれにバインドします。
この2つの変数が唯一のランタイム設定です。
fullstack テンプレートは start スクリプトをこのファイルに向けています:

```json
{
	"scripts": {
		"start": "node --env-file-if-exists=.env dist/server/node.js"
	}
}
```

そのコマンドを `PORT` とサーバー環境を設定して実行できる Node ホストなら、それで完了です。

出力されるエントリーは [リクエストハンドラーのセクション](#the-request-handler) の `Prefer` 版に、本番ブリッジが必要とする詳細を加えたものです:

- まず `dist/client` を配信します。
  `assets/` 以下のハッシュ付きファイルには `Cache-Control: public, max-age=31536000, immutable` が付き、他のファイルには `public, max-age=0, must-revalidate` と `Last-Modified` ヘッダーが付きます。
  `..` を含むパスはディレクトリの外に出られず、`.vite/manifest.json` のようなドットセグメントを含むパスは決して配信されません。
- どのファイルにもマッチしなかったすべてのリクエストを、`vite dev` と `vite preview` が使うのと同じ Node から Web へのブリッジを通して `handleRequest(request, { event: { nativeEvent: req } })` に渡します。
  ブリッジは `GET` と `HEAD` 以外のメソッドのリクエストボディをストリーミングし、各 `Set-Cookie` ヘッダーを個別に転送し、`HEAD` にはボディなしで応答し、クライアントが切断したらレンダーを中断し、さらに書き込む前にソケットがドレインするのを待ちます。
- クライアント start モードでサーバー関数がある場合、ファイルにマッチしない HTML を受け入れる `GET` リクエストには `dist/client/index.html` を配信し、サーバー関数のエンドポイントをハンドラーにルーティングします。
- プレーンな HTTP を話します。
  TLS の終端と圧縮は、前面のリバースプロキシーや CDN で行うか、以下に示すように Express の `compression()` の後ろにマウントしてください。

:::tip[生のリクエストは1オプションで取れる]
出力されるエントリーは `handleRequest(request, { event: { nativeEvent: req } })` で Node のリクエストをイベントに渡すため、`getRequestEvent().nativeEvent` が Node の `IncomingMessage` です。
ミドルウェアとサーバー関数は、ソケットのリモートアドレスのようなプラットフォームの詳細をこれから読み取ります。
プロキシーの背後では、代わりに `getRequestEvent().request` の転送ヘッダーを読んでください。ただしプロキシーが信頼できる場合に限ります。
:::

### 独自の Node サーバー

アプリに圧縮、カスタム `http` サーバー、または既存の Express や Fastify アプリ内での配置が必要な場合は、手書きのエントリーを維持してください。
そのために `dist/server/node.js` は3つをエクスポートします。出力されるサーバーが実行する `(req, res)` 関数である `listener`、オプション付きでリスナーを構築する `createListener(options)`、そして `PORT` と `HOST` で `http.Server` を作成・起動してそれを返す `serve(options)` です。
このファイルをインポートするだけではサーバーは起動せず、直接実行した場合のみ起動します。

```js
// server.js
import { createServer } from "node:http";
import { listener } from "./dist/server/node.js";

createServer(listener).listen(process.env.PORT || 3000);
```

Express では、圧縮を前に置いてリスナーにすべてを配信させるか:

```js
// server.js
import express from "express";
import compression from "compression";
import { listener } from "./dist/server/node.js";

const app = express();
app.use(compression());
app.use(listener); // static files, pages, server functions
app.listen(process.env.PORT || 3000);
```

あるいは Express に静的ファイルを持たせ、ブリッジだけを残します:

```js
// server.js
import express from "express";
import { createListener } from "./dist/server/node.js";

const app = express();
app.use(express.static("dist/client", { immutable: true, maxAge: "1y" }));
app.use(createListener({ static: false }));
app.listen(process.env.PORT || 3000);
```

`static: false` はファイル検索と、クライアント start モードでは `index.html` の履歴フォールバックをスキップします。Express がその両方を担当します。
`createListener({ event: (req) => ({ ...fields }) })` はリクエストイベントの `nativeEvent` の隣に追加フィールドをマージし、`serve()` は `port` と `host` に加えて `static` と `event` を受け取ります。

`dist/server/server.js` の `handleRequest` に対して書くブリッジは最後の手段で、Node のリクエストリスナーをマウントできないサーバー向けです。
それは [リクエストハンドラーのセクション](#the-request-handler) の要件を満たす必要があります。`GET` と `HEAD` 以外のメソッドではリクエストボディをストリーミングし、複数の `Set-Cookie` ヘッダーを個別の値として転送し、Node のリクエストを `event.nativeEvent` として渡します。

## 本番アーティファクトのプレビュー

start モードの統合は、`vite preview` が `dist/client` を配信し、残りのリクエストをビルド済みハンドラーでディスパッチするように設定します:

```bash
pnpm build
pnpm exec vite preview
```

公式の fullstack テンプレートは Vite のプレビュースクリプトに `serve` という名前を付け、`start` は出力される Node サーバー用に予約しています。
プレビューはビルド済みハンドラーと静的アセットを一緒に検証しますが、対象ホストでのテストを代替するものではありません。

## プロバイダー統合

プロバイダーの Vite プラグインは、プラットフォームの開発機能を追加し、デプロイ出力を準備できます。
通常の `ssr` 環境は、開発と本番の両方で、デフォルトの Fetchable ハンドラーを `index` サービスエントリーとして公開します。そのためプロバイダープラグインはその環境を採用し、自分のランタイムとビルドオーケストレーションを供給して、カスタムのソースファイルや明示的な Rollup 入力なしで Solid のエントリーを使えます。

以下の統合は通常の `ssr` 環境を採用します。
カスタムホストが異なる名前や独自に設定されたサーバー環境を制御する場合は、代わりに `start.external` を使ってください。
external モードでは、サーバービルドと開発時の HTTP 配信はそのホストに委ねられ、Solid は生成されたエントリー、マニフェスト、仮想リクエストハンドラーを提供し続けます。

### Netlify

Netlify の Vite プラグインは Solid の通常の `ssr` ビルドを消費し、その Fetchable サーバーエントリーをストリーミングする Netlify Function に変換します。

```package-install-dev
@netlify/vite-plugin
```

`solid()` の後に Netlify プラグインを追加し、ビルドサポートを有効にします:

```ts title="vite.config.ts"
import netlify from "@netlify/vite-plugin";
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";

export default defineConfig({
	plugins: [
		solid({
			start: true,
			ssr: true,
		}),
		netlify({
			build: {
				enabled: true,
			},
		}),
	],
});
```

Netlify が `ssr` 環境を消費できるよう、通常の Solid サーバービルドは有効のままにしてください。

プラグイン直接利用時のビルドのデフォルトを明示的に設定します:

```toml title="netlify.toml"
[build]
command = "pnpm build"
publish = "dist/client"
```

Netlify プラグインはキャッチオールの関数を生成し、静的ファイルを優先し、ストリーミングレスポンスを保持します。
`vite dev` の間は Netlify プラットフォームの機能もエミュレートします。
手書きの Netlify Function は不要です。

### Nitro

[Nitro v3](https://nitro.build/) は Solid の `ssr` 環境を採用し、そのプリセット、ルートルール、タスク、ランタイム機能を Solid ハンドラーに適用します。

```package-install
nitro
```

`solid()` の後に `nitro()` を追加します:

```tsx title="vite.config.ts"
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";

export default defineConfig({
	plugins: [
		solid({
			start: true,
			ssr: true,
		}),
		nitro({ serverEntry: false }),
	],
});
```

Nitro は環境の `index` サービスエントリーを通して Fetchable ハンドラーを見つけます。
カスタムのサーバーエントリーや Rollup 入力は不要です。

デプロイプリセット、プリレンダー、タスク、WebSocket、その他の Nitro オプションにはトップレベルの `nitro` プロパティを使います。[Nitro 設定リファレンス](https://nitro.build/config)を参照してください。

### Cloudflare Workers

[Cloudflare Vite プラグイン](https://developers.cloudflare.com/workers/vite-plugin/)は、開発中にサーバービルドを Workers ランタイムで実行し、Cloudflare へのデプロイ用に準備します。

```package-install-dev
@cloudflare/vite-plugin wrangler
```

Worker を Solid の `ssr` 環境にマッピングします:

```tsx title="vite.config.ts"
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";

export default defineConfig({
	plugins: [
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		solid({ start: true, ssr: true }),
	],
});
```

Cloudflare はプラグインリストで `solid()` の前に来ます。これは Cloudflare のフレームワーク統合の順序に合わせたものです。
Solid がアプリケーションエントリーを供給する前に、Worker を `ssr` 環境に関連付けます。

`wrangler.jsonc` で Worker を Solid が生成する仮想ハンドラーに向けます:

```jsonc
{
	"$schema": "./node_modules/wrangler/config-schema.json",
	"name": "solid-store",
	"main": "virtual:solid-ssr-handler",
	"compatibility_date": "2026-07-22",
	"compatibility_flags": ["nodejs_compat"],
	"assets": {
		"directory": "./dist/client",
		"binding": "ASSETS",
	},
	"observability": {
		"enabled": true,
	},
}
```

`viteEnvironment` オプションは Workers ランタイムの設定を Solid のサーバー環境にマージします。
Cloudflare プラグインは環境の Fetchable `index` エントリーを解決し、workerd で実行します。
カスタムの Worker ソースエントリーは不要です。
プラットフォームのバインディングを追加するには Cloudflare のガイドに従ってください。

## その他の Fetch ランタイム

ランタイムがデフォルトの Fetchable モジュールを受け付ける場合、`dist/server/server.js` を指し、`dist/client` 用の静的アセット配信を設定してください。
例えば Bun と `deno serve` は、`fetch` メソッドを持つオブジェクトをデフォルトエクスポートするモジュールを起動します。
ランタイムには依然として、サーバーバンドルの本番依存関係と環境変数が必要です。

## よくある問題

### `public/` のファイルが本番で 404 になる

そのパスでホストが `dist/client` を配信していません。
ビルドは `public/` を `dist/client` にコピーするため、ハッシュ付きアセットを配信しているものがこのファイルも配信します。静的ディレクトリが `dist` や `public` ではなく `dist/client` になっているか確認してください。

### `/assets/*` のすべてのリクエストが 404 になるか HTML を返す

ホストがハンドラーの前で `dist/client` を配信していません。
404 はそのディレクトリを配信するものが何もないことを意味し、HTML はすべてのリクエストが `handleRequest` に到達していることを意味します。これはそこまで到達した任意の URL でページをレンダーします。
まず `dist/client` を配信し、マッチしなかったリクエストだけをハンドラーに渡してください。

### クライアントルートをリロードするとホストの 404 ページが返る

`ssr: true` の下では、ページへのリクエストが `handleRequest` に到達していません。ホストは静的ディレクトリだけを配信しています。
ファイルではないすべてのリクエストをハンドラーにルーティングしてください。
静的シェルのプロジェクトにはハンドラーがありません。あらゆるシングルページアプリが必要とするように、ファイルではないパスに対して `dist/client/index.html` を配信するようホストを設定してください。

### `Cannot find module 'dist/server/node.js'`

ビルドは `start.node` が `true` の場合にのみ `dist/server/node.js` を書き出します。
`vite.config.ts` に `start: { node: true }` を設定してビルドを再実行してください。`server.js` だけではハンドラーであり、サーバーではありません。
`dist/server` がまるごと存在しない場合は、次の問題を参照してください。

### `Cannot find module './dist/server/server.js'`

ビルドがサーバーディレクトリを生成していません。
`ssr: true` なしでサーバー関数もない場合、start モードはシェルを書き出した後に `dist/server` を削除します。実行するものがないため、`dist/client` を静的ファイルとしてデプロイしてください。
`start.external` の場合、プロバイダーがサーバービルドを所有し、その出力はそのプロバイダーが置く場所に入ります。

### サーバーが起動時に `server env validation failed at boot` で終了する

`env.ts` で `server` として宣言された変数が、プロセス環境で欠けているか無効です。
サーバーの値はビルド時ではなく起動時に読まれるため、ホストの環境やシークレット設定で設定してください。ルールは [環境](/building-apps/environment) にあります。
クライアントの `VITE_` の値は逆です。`vite build` を実行するマシンで設定します。

### ローカルではサインインできるのに本番でセッションが失われる

ブリッジが複数の `Set-Cookie` ヘッダーを1つのカンマ区切りの値に連結しており、それらが壊れています。
出力される Node エントリーが `getSetCookie()` で行うように、個別のヘッダーとして転送してください。

## まとめ

- まず `dist/client` を静的ファイルとして配信し、それ以外のすべてのリクエストを `handleRequest` に渡します。
- `handleRequest(request)` とデフォルトの `{ fetch }` エクスポートは同じハンドラーです。デフォルトエクスポートはリクエスト以降のホスト引数を無視します。
- 入りではメソッド、ヘッダー、ストリーミングされたボディを保持し、出ではステータス、ヘッダー、個別の `Set-Cookie` の値、ストリーミングされたボディを保持します。
- `start.node` を設定して任意の Node ホストで `node dist/server/node.js` を実行します。`PORT` と `HOST` が唯一の設定です。
- `server` の環境変数は起動時に読まれるためホストで設定します。`VITE_` の値はビルド時に確定します。
- プロバイダープラグインは `ssr` 環境を採用します。`start.external` が必要なのは、ホストがサーバー環境の名前や設定を独自に行う場合だけです。
- `vite preview` はビルド済みのハンドラーとアセットを一緒に実行しますが、対象ホストでのテストを代替するものではありません。

## 次のステップ

- [環境](/building-apps/environment): ホストが起動時に供給しなければならない変数と、ビルド時に確定する変数。
- [レンダリングモードを選ぶ](/guides/choose-a-rendering-mode): プロジェクトにサーバーハンドラーが本当に必要か、プリレンダーしたサイトで十分か。
- [ミドルウェアと API ルート](/building-apps/middleware-and-api-routes): ページがレンダーされる前にハンドラー内で実行されるコード。
