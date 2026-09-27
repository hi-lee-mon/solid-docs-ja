---
title: "filesystem-routing/api"
category: "ファイルシステムルーティング"
order: 5
version: "2.0"
description: "マニフェストの HTTP ハンドラーをマッチさせ、fetch スタイルのミドルウェアとしてディスパッチします。"
source_repo: "solidjs/filesystem-routing"
source_ref: "v0.2.1"
source_path: "src/api.ts"
---

`filesystem-routing/api` はフラットなルートマニフェストから HTTP ハンドラーの ref をマッチさせます。

## `createAPIHandler`

```ts
import { createAPIHandler } from "filesystem-routing/api";

function createAPIHandler(
	routes: readonly FileRouteHandlers[],
	options?: APIHandlerOptions
): (
	request: Request,
	next: (request?: Request) => Response | Promise<Response>
) => Promise<Response>;
```

fetch スタイルのミドルウェアを返します。
このミドルウェアは eager と lazy のハンドラー ref を読み込み、マッチしたパラメーターをリクエストイベントに書き込み、メソッドのエクスポートを呼び出します。

```ts
import routes from "virtual:file-routes";
import { createAPIHandler } from "filesystem-routing/api";

export default [createAPIHandler(routes)];
```

マッチしないパスとメソッドは `next()` を呼び出します。
`HEAD` はエクスポートされていれば `HEAD` を使い、なければ `GET` を使います。

アダプターはハンドラーの結果を次のように変換します:

- `Response` はそのまま返されます。
- 文字列は `new Response(value)` になります。
- その他の定義済みの値は `Response.json(value)` になります。
- `GET` 以外のハンドラーからの `undefined` はスローされます。
- ページモジュールの `GET` からの `undefined` は `next()` を呼び出します。
- ハンドラーのみのモジュールの `GET` からの `undefined` は `404` レスポンスを返します。

## `APIHandlerOptions`

```ts
interface APIHandlerOptions {
	base?: string;
	getEvent?: () => APIEvent;
}
```

### `base`

- **型:** `string`
- **デフォルト:** `"/"`

マッチングの前に取り除く先頭の URL パスを指定します。

### `getEvent`

- **型:** `() => APIEvent`
- **デフォルト:** 現在の `solid.RequestContext` ストアを読み取ります

ハンドラーに渡すイベントを提供します。
デフォルトでは、ディスパッチがリクエストイベントのスコープ外で実行されるとスローされます。

## `createAPIMatcher`

```ts
function createAPIMatcher(
	routes: readonly FileRouteHandlers[]
): (path: string, method: string) => APIMatch | undefined;
```

ハンドラー ref を持つエントリに対して radix マッチャーを構築します。
マッチャーはルートグループを取り除き、静的セグメントをエンコードし、`*rest` キャッチオールをマップし、マッチした params を返します。

マッチャーはオプションのパラメーターを含むパスを拒否します。
また、グループ除去後に重複となるパスも拒否します。

## `stripPathBase`

```ts
function stripPathBase(path: string, base: string): string;
```

`base` がパスと一致するか、完全な先頭セグメントを形成する場合のみ `base` を取り除きます。
完全一致の場合は `/` を返します。

## 型

```ts
interface APIEvent {
	request: Request;
	params?: Record<string, string>;
	[key: string]: unknown;
}

type APIHandler = (event: APIEvent) => unknown;

type APIHandlerRef =
	| { import(): Promise<Record<string, APIHandler>> }
	| { require(): Record<string, APIHandler> };

interface FileRouteHandlers {
	path: string;
	page?: boolean;
	$component?: unknown;
	$HEAD?: APIHandlerRef;
	$GET?: APIHandlerRef;
	$POST?: APIHandlerRef;
	$PUT?: APIHandlerRef;
	$PATCH?: APIHandlerRef;
	$DELETE?: APIHandlerRef;
	[key: string]: unknown;
}

interface APIMatch {
	handler: APIHandlerRef;
	params?: Record<string, string>;
	isPage: boolean;
}
```

`isPage` は、マッチしたエントリが `page: true` であり、かつ `$component` が定義されている場合のみ `true` になります。
