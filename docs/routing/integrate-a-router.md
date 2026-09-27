---
title: "ルーターを統合する"
version: "2.0"
description: "Solid が同梱していないルーターを start モードに組み込みます: リクエスト URL とリクエストごとのインスタンスを渡し、シングルフライトミューテーションのトランスポートへ接続します。"
---

このページは、Solid Router や TanStack Router 以外のルーターを start モードに組み込む人、あるいはそうしたルーターの Solid アダプターを書く人向けです。
サポート対象のルーターのどちらかを使うアプリケーション開発者には不要です。[ルーティング概要](/routing/overview)と各ルーター自身のページが、それらが関わるすべてをカバーしています。

このページが扱う状況: ルーターはブラウザーでは問題なくレンダーされるのに、最初のサーバーレンダーされるリクエストで、間違った URL にマッチしてしまう、ルートを読み込むためのリクエストスコープのインスタンスがない、あるいは Solid Router なら1回で済む往復をミューテーションが2回行ってしまう、というものです。
関係するのはプラットフォームの2つの部分、リクエストパイプラインとサーバー関数トランスポートで、それぞれがルーター中立の小さな接地面を公開しています。

## ルーティングをリクエストに接続する

サーバーサイドレンダリング（SSR）では、ルーターはリクエスト URL と、そのローダーが読むリクエストスコープのデータを必要とします。
start モードのリクエストハンドラーは、Web の `Request` ごとに `RequestEvent` を作成し、そのイベントのスコープ内でレンダーを実行するため、`getRequestEvent()` はレンダー内のどこでも値を返します。

Solid Router は、サーバー統合を作成する際にそのイベントからリクエスト URL を読み取り、イベントがない場合は `url` prop にフォールバックします。
同じことを行うルーターであれば、同期的なルートツリーに関してプラットフォームから必要なものは他にありません。

### リクエストごとにインスタンスを準備する

レンダーの前に非同期処理（リクエストに紐づくインスタンスの作成やルートローダーの待機など）が必要なルーターは、`start.setup` オプションを使います:

```ts
// vite.config.ts
solid({
	start: {
		setup: "./src/setup.tsx",
	},
	ssr: true,
});
```

設定したモジュールはサーバー専用です。
そのデフォルトエクスポートは SSR リクエストごとに1回、ミドルウェアチェーンがページレンダーへディスパッチした後、`renderToStream` の直前に実行されます:

```tsx
// src/setup.tsx
import type { RequestEvent } from "@solidjs/web";

export default async function setup(event: RequestEvent) {
	const url = new URL(event.request.url);
	const router = createRequestRouter(url.pathname + url.search); // your router's per-request factory
	await router.load();
	return () => <RouterProvider router={router} />;
}
```

コンポーネントを返すと、生成されるエントリーは `Document` 内で `App` の代わりにそれをレンダーします。何も返さなければ `<App />` がそのままレンダーされます。
ハイドレーションが一致するよう、ブラウザー側の `App` は対応するルーターツリーを生成しなければなりません。
[TanStack Router](/routing/tanstack#what-the-server-does-per-request) のページには、ルーターからのリダイレクトや `404` をレスポンスへコピーする方法を含む、完全な `setup.tsx` が示されています。

:::caution[このフックが実行される場所とされない場所]
`start.setup` は、生成されたサーバーエントリーが SSR リクエストをレンダーするときだけ実行されます。
`ssr` がオフの場合は無視され、自作の `entry-server` と併せて設定するとビルドエラーになります。自作のエントリーはレンダー関数をすでに所有しており、同じ準備を自身で行わなければならないからです。
:::

### ミドルウェアはイベントを共有する

独立した `start.middleware` オプションは、ページレンダー、サーバー関数呼び出し、APIルート、JavaScript なしのフォーム送信の前段に、fetch スタイルのチェーンを組み込みます。
チェーンと `start.setup` は同じリクエストイベントを受け取るため、ミドルウェアが `event.locals` に格納した値（セッションなど）は、setup フックが構築するルーターインスタンスから見えます。
チェーン自体は[ミドルウェアと APIルート](/building-apps/middleware-and-api-routes)で説明しています。

## シングルフライトミューテーションを統合する

シングルフライトは、ミューテーションの結果と再取得されたページデータを1つのサーバー関数レスポンスにまとめます。
プラットフォームのトランスポートは、ワイヤーの両側に1つずつ、ルーター中立の拡張ポイントを2つ提供します:

- クライアント側では、`@solidjs/web/server-functions` の `subscribeFlightData` でコンシューマーを登録することがオプトインです。
  いずれかのコンシューマーが登録されている間、トランスポートは非 `GET` のサーバー関数呼び出しにシングルフライトのリクエストヘッダーを追加します。`GET` の読み取りはプレーンなままでキャッシュ可能です。
- サーバー側では、`collectFlightData` フックが、クライアントが次に表示するターゲット URL、ミューテーションが宣言した再検証キー、ミューテーションの Cookie 変更がすでに折り込まれたリクエストヘッダーを受け取ります。

サーバー関数ランタイムは、ミューテーションの値で呼び出しを解決する前にコンシューマーを待機するため、呼び出し元の `await` が返る頃には、コンシューマーは自身が所有するキャッシュへすでにデータを投入済みです。
その間のすべては統合側が決めます: ターゲット URL のマッチ方法、再実行するローダーやプリロード、生成するシリアライズ可能なペイロード、そしてクライアントでの適用方法です。

サーバーフックは起動時に1回だけ登録します。生成されるハンドラーがサーバー関数をディスパッチする前にインポートするモジュールから登録します:

```ts
// src/server-config.ts
import { configureServerFunctionsServer } from "@solidjs/web/server-functions/server";

configureServerFunctionsServer({
	collectFlightData: async (event, outcome) => {
		if (!outcome.targetUrl) return undefined;
		// match outcome.targetUrl against your route tree, run its loaders
		// (outcome.revalidateKeys scopes the work), and return a serializable
		// payload; undefined sends nothing
	},
});
```

```ts
// vite.config.ts
solid({
	start: true,
	serverFunctions: { configure: "./src/server-config.ts" },
});
```

`configure` モジュールはハンドラーグラフに固定されるため、開発用ミドルウェアでも本番ハンドラーでも、最初のディスパッチより前にロードされます。
独自のサーバー関数ハンドラーを持つアプリケーションは、代わりにリクエストごとに `collectFlightData` を `handleServerFunctionRequest` へ渡します。

名前なしの `collectFlightData` スロットは、データ生成を担う統合、つまりルーターのものです。
クエリライブラリが自身のエントリーを再取得するような2つ目のキャッシュは、サーバーでは `registerFlightDataSource(id, hook)`、クライアントでは `subscribeFlightData(id, consumer)` で追加的に登録します。
名前付きの各ソースはペイロードの自分の部分だけを受け取るため、両者がスロットを取り合ったり互いを上書きしたりすることはありません。

:::deep-dive[サポート対象の2つのルーターがこれらのフックを使う方法]
Solid Router は `@solidjs/router/server` から `createFlightDataCollector` を提供します。
これはルーターのルートツリー、base、ルートプリロードを消費し、ターゲット URL にマッチした `query` の結果を収集します。
クライアント側では、デフォルトで有効な `singleFlight` がオンのときにマウント済みのルーターを登録し、最初のルーターアクションが作成されたときにフライトコンシューマーをインストールします。
両側はランデブーを使うため、どちらが先にロードされても構いません: 遅延ロードされたルート内のアクションモジュールも、すでにマウントされたルーターにアタッチされ、アクションを一度も作成しないルーターのみのアプリは購読しないため、サーバーが収集を求められることもありません。
コンシューマーはレスポンスのリダイレクトと再検証メタデータを適用し、ペイロードから Solid Router の `query` キャッシュへデータを投入します。

TanStack Router の統合は、代わりに名前付きソースを登録します。
その `QueryClientProvider` はマウントされている間 `"sq"` として購読し、サーバーフックはターゲット URL 用のルーターを構築してそのローダーを新しい `QueryClient` へ実行し、ペイロードはクライアントが TanStack 自身の `hydrate` でハイドレートする、デハイドレートされた TanStack Query キャッシュです。
[Solid が所有しないルーターでのシングルフライト](/routing/tanstack#single-flight-on-a-router-solid-does-not-own)でそのコードを順にたどれます。
:::

## よくある問題

### `start.setup only applies to generated entries` でビルドが失敗する

プロジェクトに自作の `entry-server` と `start.setup` オプションが同時に存在しています。
どちらかを取り除きます: 自作のエントリーを削除して生成されるエントリーにフックを実行させるか、準備処理を自作エントリー自身のレンダー関数へ移して `start.setup` を外します。

### setup モジュールが一度も実行されない

`start.setup` はサーバーモード専用です。
`ssr: false` では準備すべきリクエストごとのアプリレンダーが存在しないため、このオプションは受け入れられますが無視されます。
モジュールを調べる前に `vite.config.ts` の `ssr` フラグを確認してください。

### ミューテーションのレスポンスにフライトデータが乗らない

クライアントでコンシューマーが購読されていないため、トランスポートはシングルフライトヘッダーを送らず、サーバーは収集をスキップします。レスポンスはプレーンな呼び出しとバイト単位で同一です。
ミューテーションが呼ばれる前にコンシューマーを購読してください。また `GET` 呼び出しはヘッダーを乗せないため、そのミューテーションが `GET` 宣言されていないか確認してください。

### サーバーフックは動くがペイロードが適用されない

フックが、クライアントが購読していないソース id でペイロードを返したか、クライアントが別の id で購読しています。
名前なしのサーバーフックは1引数の `subscribeFlightData(consumer)` と対になります。名前付きの `registerFlightDataSource(id, hook)` は `subscribeFlightData(id, consumer)` と対になり、id は完全に一致しなければなりません。

## まとめ

- SSR 中はリクエストイベントからリクエスト URL を読み取ります。ハンドラーはそのイベントのスコープ内でレンダーを実行します。
- リクエストごとのインスタンスやレンダー前の非同期ロードが必要なルーターには `start.setup` を使い、`App` の代わりにレンダーするコンポーネントを返します。
- `start.setup` は `ssr` がオンの生成されたサーバーエントリーにのみ適用されます。自作のエントリーは同じ処理を自身で行います。
- ミドルウェアが `event.locals` に格納した値は、両者が同じリクエストイベントを受け取るため、setup フックから見えます。
- クライアントでは `subscribeFlightData` でシングルフライトにオプトインします。コンシューマーが登録されている間、非 `GET` 呼び出しにヘッダーが送信されます。
- サーバー側の `collectFlightData` フックは `serverFunctions.configure` モジュールから登録し、最初のディスパッチより前にロードされるようにします。
- 2つ目のキャッシュが往復を共有する場合は、`registerFlightDataSource` と2引数の `subscribeFlightData` を使います。

## 次のステップ

- [TanStack Router](/routing/tanstack): これらのフックの上に構築された完全な統合。setup モジュールとフライトデータソースの全体が載っています。
- [メタデータとトランスポート](/building-apps/server-functions/metadata-and-transport): シングルフライトのエンベロープを含め、サーバー関数のリクエストとレスポンスがワイヤー上でどう見えるか。
- [アプリ構造](/building-apps/app-structure): 生成されるエントリーと `Document`、および代わりにエントリーを自作するべき場合。
- [ミドルウェアと APIルート](/building-apps/middleware-and-api-routes): setup フックの前に実行される `start.middleware` チェーン。
