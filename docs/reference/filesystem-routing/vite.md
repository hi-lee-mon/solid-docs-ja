---
title: "filesystem-routing/vite"
category: "ファイルシステムルーティング"
order: 4
version: "2.0"
description: "ファイルシステムルートマニフェストの Vite 配信を設定します。"
source_repo: "solidjs/filesystem-routing"
source_ref: "v0.2.1"
source_path: "src/vite/index.ts"
---

`filesystem-routing/vite` は Vite 配信アダプターと、その低レベルの構成要素をエクスポートします。

## `fileRoutes`

```ts
import { fileRoutes, type FileRoutesOptions } from "filesystem-routing/vite";

function fileRoutes(options?: FileRoutesOptions): PluginOption[];
```

返されるプラグインは、ルートをスキャンし、仮想マニフェストを提供し、pick で選択されたモジュールエクスポートをツリーシェイクし、開発中にマニフェストを更新します。

## `FileRoutesOptions`

```ts
interface FileRoutesOptions {
	dir?: string;
	extensions?: string[];
	components?: boolean;
	httpMethods?: boolean | readonly string[];
	toPath?: FileSystemRouterConfig["toPath"];
	toRoute?: FileSystemRouterConfig["toRoute"];
	router?: BaseFileSystemRouter;
	routers?: Record<string, BaseFileSystemRouter>;
	moduleId?: string;
	buildInputs?: string | string[];
	codeSplitting?: boolean;
	optimizeDepsExclude?: string[];
	types?: boolean | string;
}
```

### `dir`

- **型:** `string`
- **デフォルト:** `"src/routes"`

Vite ルートからの相対パスでルートディレクトリを指定します。

### `extensions`

- **型:** `string[]`
- **デフォルト:** `["js", "jsx", "ts", "tsx"]`

スキャン対象の拡張子を先頭のドットなしで指定します。

### `components`

- **型:** `boolean`
- **デフォルト:** `true`

ページエントリーが `$component` の ref を含むかどうかを制御します。
`false` の場合でも、ページのステータスと即時の `route` 設定 ref は残ります。

### `httpMethods`

- **型:** `boolean | readonly string[]`
- **デフォルト:** `false`

`true` を指定すると `HEAD`、`GET`、`POST`、`PUT`、`DELETE`、`PATCH`、`OPTIONS` のエクスポートが認識されます。
配列を指定すると別の認識対象セットを与えられます。

共有ルーターでは、サーバー側コンシューマーの環境がハンドラーの ref を受け取ります。
クライアント側コンシューマーの環境では、それらの ref が除去され、ハンドラーのみのエントリーも除去されます。
プラグインは `routers` で明示されたルーターを変更せずに配信します。

### `toPath`

デフォルトのファイル名からパスへの変換関数をオーバーライドします。
`undefined` を返すとそのファイルをスキップします。
[`FileSystemRouterConfig`](/docs/reference/filesystem-routing/core.md#filesystemrouterconfig)を参照してください。

### `toRoute`

モジュールからマニフェストへの変換をオーバーライドします。
`undefined` を返すとそのファイルをスキップします。

### `router`

- **型:** `BaseFileSystemRouter`
- **デフォルト:** 上記のオプションから設定された `PageFileSystemRouter`

`routers` にエントリーのない環境で使われるスキャナーと規約を指定します。

### `routers`

- **型:** `Record<string, BaseFileSystemRouter>`
- **デフォルト:** `undefined`

Vite 環境名をキーとするルーターを指定します。
存在しない環境名へのフォールバックとして `router` を使います。
`client` ルーターが生成されるリテラルタプル型の供給元になります。

### `moduleId`

- **型:** `string`
- **デフォルト:** `"virtual:file-routes"`

仮想マニフェストのモジュール ID を指定します。

### `buildInputs`

- **型:** `string | string[]`
- **デフォルト:** `[]`

配信されるすべての遅延モジュール ref を Rollup の入力として追加するビルドを行う Vite 環境名を指定します。
プラグインは既存の入力を保持します。
即時 ref と、クライアントコンシューマーから除去されたハンドラー ref は追加されません。
`codeSplitting` が `false` の場合、このオプションは効果がありません。

### `codeSplitting`

- **型:** `boolean`
- **デフォルト:** `true`

`codeSplitting: true` を設定すると、`$` の ref が動的 `import()` 関数と個別のルートチャンクとして出力されます。
`codeSplitting: false` を設定すると、`require()` 関数の背後にある静的な名前空間インポートとして出力されます。
その場合、生成されるモジュールには動的インポートが含まれません。

`@solidjs/router` で即時配信を使うには、`2.0.0-next.14` より新しいリリースが必要です。

### `optimizeDepsExclude`

- **型:** `string[]`
- **デフォルト:** `[]`

Vite の依存関係プリバンドル除外リストにパッケージを追加します。
仮想モジュールを自身でインポートするパッケージに使います。

### `types`

- **型:** `boolean | string`
- **デフォルト:** `false`

マニフェストがリテラルタプルになる、自己完結した ambient 宣言を書き込みます。
`true` で Vite ルートに `file-routes.d.ts` を書き込みます。
文字列を指定すると別の出力パスを設定します。

`filesystem-routing/types` の代わりに、この生成される宣言を参照してください。

## 出力

生成されるモジュールのエクスポート：

```ts
import routes, { pageRoutes } from "virtual:file-routes";
```

`routes` はフラットなマニフェストです。
`pageRoutes` は、マニフェストパスでネストされ、URL パスからルートグループが取り除かれたページエントリーを含みます。
[マニフェストモジュール](/docs/reference/filesystem-routing/manifest.md)を参照してください。

ルートソース ID は `?pick=` クエリを使い、各 ref が選択されたエクスポートのみを含むようにします。
JavaScript と TypeScript の ID は `lang.<extension>` マーカーで終わるため、拡張子ベースの Vite プラグインもそれらにマッチします。
ルートチャンク名はこのクエリサフィックスを省略します。

## アダプター構築用エクスポート

これらの低レベルエクスポートはカスタム配信アダプターを支えます。
アプリケーション設定では通常、代わりに `fileRoutes()` を使います。

### `DEFAULT_EXTENSIONS`

```ts
const DEFAULT_EXTENSIONS = ["js", "jsx", "ts", "tsx"];
```

### `moduleId`

```ts
const moduleId = "virtual:file-routes";
```

### `toPickId`

```ts
function toPickId(src: string, pick: string[]): string;
```

選択された各エクスポートにつき 1 つの `pick` クエリを含み、JavaScript と TypeScript の拡張子には言語マーカーを持つルートモジュール ID を構築します。

### `sanitizeChunkFileName`

```ts
function sanitizeChunkFileName(name: string): string;
```

ルートチャンク名から pick クエリのサフィックスを取り除き、Rollup 互換の無効文字置換を適用します。

### `treeShake`

```ts
function treeShake(): Plugin;
```

`?pick=` モジュール ID に対して、選択されたエクスポート、そのランタイム依存関係、および選択された CSS インポートを保持するプリトランスフォームプラグインを返します。

### `fileSystemWatcher`

```ts
function fileSystemWatcher(
	getRouter: (environment: string) => BaseFileSystemRouter | undefined,
	moduleId: string,
	onReload?: () => void | Promise<void>
): PluginOption;
```

Vite のファイルウォッチャーを環境ごとのルーターに接続します。
ルートの追加と削除は仮想モジュールをリロードします。
ルート内容の更新は仮想モジュールを無効化し、ルートモジュールのホット更新に委ねます。
