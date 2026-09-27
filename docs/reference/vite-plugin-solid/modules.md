---
title: "モジュールとマニフェスト"
category: "@solidjs/vite-plugin"
order: 4
version: "2.0"
description: "@solidjs/vite-plugin のマニフェスト型、仮想モジュール、バウンダリマーカーモジュールのリファレンスです。"
source_repo: "solidjs/solid-vite-plugin"
source_ref: "next"
source_path: "virtual-solid-manifest.d.ts"
---

このプラグインは、1 つのランタイムヘルパー、1 つのマニフェスト型、生成される仮想モジュール、そして 2 つの型専用パッケージサブパスを公開します。

## `@solidjs/vite-plugin`

### `devStylePatch`

```ts
const devStylePatch: string;
```

同じ `data-vite-dev-id` を持つ重複した SSR および Vite 開発用のスタイル要素を取り除く、インラインのブラウザスクリプトです。
start モードのハンドラーは `devStylePatch` を自動的に注入します。
独自の開発ホストは、ドキュメントを自分でレンダーする際にこのスクリプトを注入できます。
アプリケーションコードからこのヘルパーを呼ぶことはありません。

### `ViteManifest`

```ts
type ViteManifest = Record<
	string,
	{
		file: string;
		css?: string[];
		isEntry?: boolean;
		isDynamicEntry?: boolean;
		imports?: string[];
	}
> & {
	_base?: string;
};
```

`virtual:solid-manifest` が消費するクライアントアセットのマニフェストを記述します。
プラグインは `_base` を追加し、出力された遅延ファサードを動的エントリーとしてマークします。

## `@solidjs/vite-plugin/virtual-solid-manifest`

型専用サブパスは次のモジュールを宣言します:

### `virtual:solid-manifest`

```ts
import type { ViteManifest } from "@solidjs/vite-plugin";

const manifest: ViteManifest;
export default manifest;
```

開発出力は、モジュールの JavaScript と CSS 向けのリゾルバーベースのマニフェストを提供します。
ビルド出力には、設定された Vite の base を含む `dist/client/.vite/manifest.json` が含まれます。

### `virtual:solid-server-function-manifest`

検出されたすべてのサーバー関数を登録する、副作用のみのモジュールです。

### `virtual:solid-server-function-handler`

`endpoint` と `handleServerFunctionRequest` をエクスポートします。
[`serverFunctions`](/reference/vite-plugin-solid/server-functions#virtualsolid-server-function-handler) を参照してください。

### `virtual:solid-ssr-handler`

```ts
export function handleRequest(
	request: Request,
	options?: {
		clientEntry?: string;
		context?: Record<string, unknown>;
		responseInit?: ResponseInit;
		serverFunctions?: Record<string, unknown>;
	}
): Promise<Response>;
```

`virtual:solid-ssr-handler` は start モードのサーバービルドエントリーです。
このモジュールはリクエストイベントを作成し、設定されたミドルウェアを実行し、有効な場合はサーバー関数エンドポイントへディスパッチして、ページレスポンスを返します。
生成される HTML は `virtual:solid-manifest` からクライアントエントリーと CSS を解決します。

環境宣言ファイルから宣言を参照します:

```ts
/// <reference types="@solidjs/vite-plugin/virtual-solid-manifest" />
```

## start モードの環境モジュール

[`start.env`](/reference/vite-plugin-solid/start#env) が有効な場合、生成される `solid-env.d.ts` は次を宣言します:

```ts
import env, { env as namedEnv } from "virtual:env/client";
import serverEnv from "virtual:env/server";
```

`virtual:env/client` にはクライアントスキーマのキーが含まれます。
`virtual:env/server` には両方のスキーママップが含まれ、サーバー専用です。

## バウンダリマーカーモジュール

メインプラグインは常に素のマーカー指定子を解決します:

```ts
import "server-only";
import "client-only";
```

`server-only` はサーバーモジュールグラフでは空で、クライアントグラフからインポートされると失敗します。
`client-only` はクライアントモジュールグラフでは空で、サーバーグラフからインポートされると失敗します。
エラーにはインポートしたモジュール名が示されます。

アンビエント宣言を追加するには:

```ts
/// <reference types="@solidjs/vite-plugin/boundary-modules" />
```

同名のパッケージがインストールされている場合でも、マーカーリゾルバーがこれらの素の指定子の解決を受け持ちます。
