---
title: "serverFunctions"
category: "@solidjs/vite-plugin"
order: 3
version: "2.0"
description: "`use server` ディレクティブをコンパイルし、サーバー関数のマニフェストとハンドラーモジュールを出力します。"
source_repo: "solidjs/solid-vite-plugin"
source_ref: "next"
source_path: "src/server-functions/index.ts"
---

`serverFunctions` はスタンドアロンの `"use server"` コンパイラプラグインを提供します。
`solidPlugin` の `serverFunctions` オプションは同じコンパイラを使い、エンドポイントミドルウェアもインストールできます。
アプリケーションでの使い方は[サーバー関数ガイド](/building-apps/server-functions)、生成されるランタイムは [`@solidjs/web/server-functions` リファレンス](/reference/solid-web/server-functions)を参照してください。

## インポート

```ts
import {
	serverFunctions,
	type ServerFunctionsFilter,
	type ServerFunctionsOptions,
} from "@solidjs/vite-plugin";
```

## シグネチャ

```ts
function serverFunctions(options?: ServerFunctionsOptions): Plugin[];
```

スタンドアロンエクスポートは開発用エンドポイントミドルウェアをインストールしません。
プラグインの順序とリクエストディスパッチを制御するホストでは、スタンドアロンエクスポートを使用してください。

## `ServerFunctionsOptions`

```ts
interface ServerFunctionsOptions {
	runtime?: {
		server: string;
		client: string;
	};
	manifest?: string;
	filter?: ServerFunctionsFilter;
	directive?: string;
	endpoint?: string;
	devMiddleware?: boolean;
	configure?: string;
	components?: boolean;
}

interface ServerFunctionsFilter {
	include?: FilterPattern;
	exclude?: FilterPattern;
}
```

### `runtime`

- **型:** `{ server: string; client: string }`
- **デフォルト:** 両フィールドとも `"@solidjs/web/server-functions"`

コンパイラが出力するランタイムインポートを指定します。
サーバーランタイムは `registerServerReference`、`createServerReference`、`handleServerFunctionRequest`、`configureServerFunctionsServer` をエクスポートする必要があります。
クライアントランタイムは `registerServerReference` と `createServerReference` をエクスポートする必要があります。
解決されたエンドポイントがデフォルトと異なる場合、クライアントランタイムは `configureServerFunctionsClient` もエクスポートする必要があります。

### `manifest`

- **型:** `string`
- **デフォルト:** `"virtual:solid-server-function-manifest"`

コンパイル済みサーバー関数を含むすべてのモジュールを副作用としてインポートする仮想モジュールを指定します。
プロダクションハンドラーは、ツリーシェイキングで登録が失われないようこのモジュールをインポートします。

### `filter`

- **型:** `ServerFunctionsFilter`
- **デフォルトの include:** `"src/**/*.{jsx,tsx,ts,js,mjs,cjs}"`
- **デフォルトの exclude:** `"node_modules/**/*.{jsx,tsx,ts,js,mjs,cjs}"`

ディレクティブのコンパイルを Vite のフィルターパターンで制限します。
相対パターンは Vite ルートに対して解決されます。

### `directive`

- **型:** `string`
- **デフォルト:** `"use server"`

コンパイラが認識するディレクティブの文字列を指定します。

### `endpoint`

- **型:** `string`
- **デフォルト:** `"/_server"`

リクエストパスを指定します。
プラグインは先頭のスラッシュがなければ追加し、その後 Vite の `base` を前置します。
解決されたパスが `/_server` と異なる場合、コンパイル済みモジュールは両側のランタイムにその解決済みエンドポイントを設定します。

### `devMiddleware`

- **型:** `boolean`
- **デフォルト:** `solidPlugin({ serverFunctions })` 経由では `true`

`false` に設定すると、開発用エンドポイントのディスパッチを別のホストに委ねます。
コンパイルと両方の仮想モジュールは有効なままです。
スタンドアロンの `serverFunctions()` エクスポートは、値に関わらずこのミドルウェアをインストールしません。

ディスパッチがホスト管理の場合、ホストは `virtual:solid-server-function-handler` をロードします。
クライアントコードからのみ参照される関数をディスパッチ前に登録する必要がある場合、ホストのサーバーエントリーはマニフェストもインポートすべきです。
ホストは [`configureServerFunctionsServer()`](/reference/solid-web/server-functions/host-configuration) を通じて、リクエストスコープ、オリジンチェック、呼び出しポリシー、結果の処理を設定できます。

### `configure`

- **型:** `string`
- **デフォルト:** `undefined`

ハンドラーの設定とディスパッチの前にインポートするサーバー専用モジュールを指定します。
相対パスは Vite ルートに対して解決されます。
ファイルが存在しない場合、プラグインは設定時に拒否します。

```ts
serverFunctions: {
  configure: "./src/server-config.ts",
}
```

### `components`

- **型:** `boolean`
- **デフォルト:** `false`
- **ステータス:** 実験的

コンポーネントを含むサーバー関数の結果を有効にします。
生成されるハンドラーはフレームレスポンスのトランスフォームをインストールします。

生成された SSR start モードのエントリーでは、プラグインはドキュメントレンダープラグイン、ブートストラップデータ、クライアントインストール呼び出しも追加します。
`start: true` と `ssr: true` を使わない場合、または自作のエントリーを使う場合、それらのドキュメントレベルの要素はアプリケーションのエントリーコードが提供します。

## 生成されるモジュール

### `virtual:solid-server-function-manifest`

検出されたサーバー関数モジュールをインポートする、副作用のみのモジュールです。
クライアントビルドは検出結果を `dist/client/.vite/solid-server-functions.json` に保存し、別の SSR ビルドがクライアントコードからのみ参照される関数を含められるようにします。

### `virtual:solid-server-function-handler`

```ts
export const endpoint: string;

export function handleServerFunctionRequest(
	request: Request,
	options?: Record<string, unknown>
): Promise<Response>;
```

`virtual:solid-server-function-handler` は設定されたセットアップモジュールとプロダクションマニフェストをインポートします。
このハンドラーはリクエストイベントのスコープも設定し、選択されたランタイムを通じてディスパッチします。

## メインプラグインでの指定

```ts
import solid from "@solidjs/vite-plugin";

export default {
	plugins: [
		solid({
			serverFunctions: {
				endpoint: "/_server",
				configure: "./src/server-config.ts",
			},
		}),
	],
};
```

start モードでは、エンドポイントリクエストは `start.middleware` を通り、そのリクエストイベントを共有します。
