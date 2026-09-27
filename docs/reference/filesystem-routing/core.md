---
title: "filesystem-routing コア"
category: "ファイルシステムルーティング"
order: 1
version: "2.0"
description: "バンドラー非依存のスキャナー、マニフェスト型、モジュール解析のエクスポートに関するリファレンス。"
source_repo: "solidjs/filesystem-routing"
source_ref: "v0.2.1"
source_path: "src/index.ts"
---

ルートインポートは、バンドラー非依存のスキャナーとマニフェスト構築ユーティリティを公開します。

## `BaseFileSystemRouter`

```ts
import { BaseFileSystemRouter } from "filesystem-routing";

class BaseFileSystemRouter extends EventTarget {
	routes: RouteManifestEntry[];
	config: FileSystemRouterConfig;

	constructor(config: FileSystemRouterConfig);
	glob(): string;
	buildRoutes(): Promise<RouteManifestEntry[]>;
	isRoute(src: string): boolean;
	toPath(src: string): string | undefined;
	toRoute(src: string): RouteManifestEntry | undefined;
	addRoute(src: string): Promise<void>;
	updateRoute(src: string): Promise<void>;
	removeRoute(src: string): void;
	reload(route: string, type: "update" | "remove" | "add"): void;
	on(type: string, callback: (event: RouterEvent) => void): () => void;
	getRoutes(): Promise<RouteManifestEntry[]>;
}
```

コンストラクターは `config.dir` をカレントワーキングディレクトリに対して解決し、区切り文字を正規化します。
基本の `toPath` と `toRoute` メソッドは設定された関数を呼び出し、設定されていない場合は `"Not implemented"` をスローします。
サブクラスはいずれかのメソッドをオーバーライドして規約を提供します。

`getRoutes()` はキャッシュされる 1 回のディレクトリスキャンを開始し、変更可能なルート配列を返します。
追加・更新・削除の各操作は `reload` イベントを発行します。
追加されたルートが既存エントリーと同じマニフェストパスを持つ場合、スキャナーは既存エントリーを置き換えます。

## `FileSystemRouterConfig`

```ts
interface FileSystemRouterConfig {
	dir: string;
	extensions: string[];
	toPath?: (
		routeFile: string,
		config: FileSystemRouterConfig
	) => string | undefined;
	toRoute?: (
		src: string,
		router: BaseFileSystemRouter
	) => RouteManifestEntry | undefined;
}
```

`dir` は必須です。
`extensions` にはドットを含まない拡張子名を指定します。
`toPath` は `dir` からの相対パス（拡張子を除いたもの）を受け取ります。
いずれのコールバックも `undefined` を返すことでそのファイルをスキップできます。

## マニフェスト型

### `ModuleRef`

```ts
interface ModuleRef {
	src: string;
	pick: string[];
}
```

`src` はソースの絶対パスです。
`pick` はそのモジュールから選択されたエクスポート名を列挙します。

### `RouteManifestEntry`

```ts
interface RouteManifestEntry {
	path: string;
	page?: boolean;
	$component?: ModuleRef;
	$$route?: ModuleRef;
	[key: string]: unknown;
}
```

`path` では `:param`、省略可能な `:param?`、キャッチオールの `*rest`、そして保持される `(group)` セグメントが使えます。
デリバリーアダプターは `$` プレフィックス付きの ref を遅延で、`$$` プレフィックス付きの ref を即時で実体化します。
デリバリーアダプターはどちらの形式も即時で実体化でき、利用側は配信された `import()` または `require()` の形で分岐します。

## パスとスキャンのヘルパー

### `cleanPath`

```ts
function cleanPath(src: string, config: FileSystemRouterConfig): string;
```

設定されたルートディレクトリのプレフィックスと設定された拡張子を取り除きます。

### `glob`

```ts
const glob: (path: string) => string[];
```

`fast-glob` による同期スキャンを実行し、絶対パスの結果を返します。

### `normalizePath`

```ts
function normalizePath(path: string): string;
```

Windows の区切り文字をフォワードスラッシュに変換し、それ以外のパスは変更しません。

## 静的エクスポート解析

### `analyzeModule`

```ts
function analyzeModule(src: string): StaticExportEntry[];
```

`oxc-parser` でソースファイルを TSX として解析し、型ではない静的エクスポートを返します。
パースエラーは、ソースコードフレームまたはパーサーメッセージを含む `SyntaxError` をスローします。

### `getExportName`

```ts
function getExportName(entry: StaticExportEntry): string;
```

エクスポート名を返し、デフォルトエクスポートの場合は `"default"` を返します。

### `getLocalExportName`

```ts
function getLocalExportName(entry: StaticExportEntry): string | undefined;
```

エクスポートが同名のローカルまたはインポートされたバインディングを参照している場合に限り、デフォルト以外のエクスポート名を返します。

### `StaticExportEntry`

エクスポートされる型は `oxc-parser` 由来です。
