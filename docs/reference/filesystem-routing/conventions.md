---
title: "ルートの規約"
category: "ファイルシステムルーティング"
order: 2
version: "2.0"
description: "ネスト規約とフラット規約のルートファイル名に関するリファレンスです。"
source_repo: "solidjs/filesystem-routing"
source_ref: "v0.2.1"
source_path: "src/convention.ts"
---

ルートの `filesystem-routing` インポートは、ファイル名規約が異なりモジュール規約が共通の 2 つのスキャナーをエクスポートします。

## ネスト規約

### `routePathFromFile`

```ts
import { routePathFromFile } from "filesystem-routing";

function routePathFromFile(routeFile: string): string;
```

拡張子を除いたルート相対のファイル名を変換します:

- `/index` は `/` になります。
- `/blog/index` は `/blog/` になります。
- `/blog/[id]` は `/blog/:id` になります。
- `/blog/[[page]]` は `/blog/:page?` になります。
- `/docs/[...path]` は `/docs/*path` になります。
- `/(marketing)/about` はフラットマニフェスト内で `/(marketing)/about` のままです。

ルートグループはツリー構築でネストできるよう、マニフェストのパス内に残ります。
生成される `pageRoutes` ビューでは URL パスからグループが取り除かれます。

ルートファイルとディレクトリを組み合わせるとネストが作られます。
たとえば `blog.tsx` は `blog/` 配下のルートのレイアウトになります。

### `PageFileSystemRouter`

```ts
import {
	PageFileSystemRouter,
	type PageFileSystemRouterConfig,
} from "filesystem-routing";

class PageFileSystemRouter extends BaseFileSystemRouter {
	constructor(config: PageFileSystemRouterConfig);
}
```

`PageFileSystemRouter` は `config.toPath` が指定されていればそれを使い、なければ `routePathFromFile` を使います。
そのマニフェストエントリについては[モジュール規約](#module-convention)を参照してください。

## フラット規約

### `flatRoutePathFromFile`

```ts
import { flatRoutePathFromFile } from "filesystem-routing";

function flatRoutePathFromFile(routeFile: string): string | undefined;
```

フラットルート名を変換します:

- `/_index` は `/` になります。
- `/concerts.trending` は `/concerts/trending` になります。
- `/concerts.$city` は `/concerts/:city` になります。
- `/concerts.($page)` は `/concerts/:page?` になります。
- `/files.$` は `/files/*splat` になります。
- `/_auth.login` は `/(_auth)/login` になります。これはパスを持たないレイアウトグループです。
- `/concerts_.mine` は `/(concerts_)/concerts/mine` になり、`concerts` レイアウトの外側に置かれます。
- `/[sitemap.xml]` は `/sitemap.xml` になります。

角括弧はフラット規約の特殊文字をエスケープします。
この規約は `(en)` のようなオプションの静的セグメントを拒否します。ニュートラルなパス構文がオプションのパラメーターしか表現できないためです。

トップレベルのディレクトリはその `route` モジュールのみを提供します。
そのディレクトリ内の他のファイルと、より深くネストされたディレクトリは `undefined` を返します。

### `FlatFileSystemRouter`

```ts
import { FlatFileSystemRouter } from "filesystem-routing";

class FlatFileSystemRouter extends PageFileSystemRouter;
```

`flatRoutePathFromFile` を使い、ページモジュール規約を継承します。

```ts
import { resolve } from "node:path";
import { FlatFileSystemRouter } from "filesystem-routing";
import { fileRoutes } from "filesystem-routing/vite";

fileRoutes({
	router: new FlatFileSystemRouter({
		dir: resolve("src/routes"),
		extensions: ["js", "jsx", "ts", "tsx"],
	}),
});
```

## モジュール規約

JavaScript または TypeScript のルートモジュールは、デフォルトエクスポートまたは認識される HTTP メソッドのエクスポートを持つ場合に対象となります。

- デフォルトエクスポートは `page: true` を設定します。
- `$component` は同名のローカルランタイムエクスポート、`default`、`$css` を遅延選択します。
  `route` エクスポートと認識される HTTP ハンドラーは除外します。
- エクスポートされた `route` 値は eager の `$$route` ref を作成します。
- 認識される大文字のハンドラーエクスポートは `$GET`、`$POST` などの同等の ref を作成します。
- 認識される `GET` は、モジュールが `HEAD` をエクスポートしていない限り、`GET` を選択する `$HEAD` も作成します。
- ハンドラーのみのモジュールは `page: false` となり、コンポーネント ref を持ちません。
- 設定にそれらの拡張子が含まれる場合、スキャナーは `.md` と `.mdx` ファイルをページとして扱います。

`components: false` を設定すると、ページの状態とルート設定を維持したままコンポーネント ref を省略します。
`httpMethods: true` を設定すると、標準のメソッドセットを認識します。

### `HTTP_METHODS`

```ts
import { HTTP_METHODS } from "filesystem-routing";

const HTTP_METHODS = [
	"HEAD",
	"GET",
	"POST",
	"PUT",
	"DELETE",
	"PATCH",
	"OPTIONS",
] as const;
```

### `PageFileSystemRouterConfig`

```ts
interface PageFileSystemRouterConfig extends FileSystemRouterConfig {
	components?: boolean;
	httpMethods?: boolean | readonly string[];
}
```

`components` のデフォルトは `true` です。
`httpMethods` のデフォルトは `false` です。`true` は `HTTP_METHODS` を選択し、配列は列挙されたエクスポート名のみを選択します。
