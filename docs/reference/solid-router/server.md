---
title: "サーバー統合"
version: "2.0"
description: "Solid Router のサーバー関数フライトデータコレクターのリファレンス。"
source_repo: "solidjs/solid-router"
source_ref: "next"
source_path: "src/server.ts"
---

## インポート

```ts
import {
	createFlightDataCollector,
	type FlightDataCollectorOptions,
} from "@solidjs/router/server";
```

このサーバー専用エントリーはクライアントバンドルに含めないでください。
サーバーエントリーはリクエストイベントストレージ統合をインポートします。

## `createFlightDataCollector`

Solid のサーバー関数ハンドラー向けの `collectFlightData` フックを作成します。

```ts
function createFlightDataCollector(
	options: FlightDataCollectorOptions | RouterInstanceLike
): CollectFlightDataHook;
```

`createRouter` インスタンスを渡します:

```ts
const collectFlightData = createFlightDataCollector(Router);
```

またはオプションオブジェクトを渡します:

```ts
interface FlightDataCollectorOptions {
	routes:
		| RouteDefinition
		| readonly RouteDefinition[]
		| (() => RouteDefinition | readonly RouteDefinition[]);
	rootPreload?: RoutePreloadFunc;
	base?: string;
}
```

`routes` はサンクによって遅延構築できます。
`rootPreload` はルーター設定の `preload` に対応します。
`base` はルーター設定の `base` に対応します。

## サーバー関数への登録

```ts
import { configureServerFunctionsServer } from "@solidjs/web/server-functions/server";

configureServerFunctionsServer({
	collectFlightData: createFlightDataCollector(Router),
});
```

コレクターは次の処理を行います:

1. サーバー関数の結果からターゲットと再検証キーを読み取ります。
2. 直前の URL またはターゲット URL にマッチする遅延ルートサブツリーを解決します。
3. `intent: "initial"` でルートプリロードを実行します。
4. `intent: "preload"` でターゲットルートのプリロードを実行します。
5. 収集したキー付きクエリ値を返します。

結果にターゲット URL がない、または収集された値がない場合は `undefined` を返します。
コレクターは遅延解決やプリロード収集で発生したエラーをログに記録します。
これらのエラーはミューテーションの結果を置き換えません。

サーバー関数ハンドラーは、返されたデータをミューテーションレスポンスに折り込みます。
マウント済みのクライアントルーターは、シングルフライトが有効な場合にそのデータを消費します。

## 型

サーバーエントリーは次を再エクスポートします:

```ts
type CollectFlightDataHook;
type ServerFunctionOutcome;
```

`CollectFlightDataHook` と `ServerFunctionOutcome` は `@solidjs/web/server-functions/server` 由来です。

## 関連項目

- [データ API](/reference/solid-router/data)
- [`createRouter`](/reference/solid-router/router-factory#createrouter)
