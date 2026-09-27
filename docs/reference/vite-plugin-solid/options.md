---
title: "solidPlugin"
category: "@solidjs/vite-plugin"
order: 1
version: "2.0"
description: "Solid の JSX コンパイルと、オプションのサーブモード・サーバー関数モードを設定します。"
source_repo: "solidjs/solid-vite-plugin"
source_ref: "next"
source_path: "src/index.ts"
---

`solidPlugin` は Solid のコンパイルを設定し、選択したモードに必要な Vite プラグインを返します。

## インポート

```ts
import solidPlugin from "@solidjs/vite-plugin";
```

## シグネチャ

```ts
function solidPlugin(options?: Partial<Options>): Plugin[];
```

## `Options`

```ts
interface Options {
	include?: FilterPattern;
	exclude?: FilterPattern;
	dev?: boolean;
	ssr?: boolean;
	start?: boolean | StartOptions;
	compiler?: "babel" | "native";
	hot?: boolean;
	extensions?: (string | [string, ExtensionOptions])[];
	babel?:
		| babel.TransformOptions
		| ((source: string, id: string, ssr: boolean) => babel.TransformOptions)
		| ((
				source: string,
				id: string,
				ssr: boolean
		  ) => Promise<babel.TransformOptions>);
	solid?: SolidOptions;
	serverFunctions?: boolean | ServerFunctionsOptions;
	refresh?: RefreshOptions;
}
```

### `include`

- **型:** `FilterPattern`
- **デフォルト:** `undefined`

変換対象のファイルを Vite のフィルターパターンで制限します。
相対パターンは Vite ルートに対して解決されます。

### `exclude`

- **型:** `FilterPattern`
- **デフォルト:** `undefined`

ファイルを Vite のフィルターパターンで除外します。
相対パターンは Vite ルートに対して解決されます。

### `dev`

- **型:** `boolean`
- **デフォルト:** Vite の `serve` コマンドでは有効

`solid-js` と `@solidjs/web` の開発用エクスポートを選択します。
`serve` 以外でも選択するには `true`、`serve` 中にその選択を無効にするには `false` を設定します。

### `ssr`

- **型:** `boolean`
- **デフォルト:** `false`

ハイドレーション可能なクライアント出力と SSR 出力を有効にします。
[`start`](/reference/vite-plugin-solid/start) と併用する場合、`ssr: true` はクライアント start モードではなく SSR start モードを選択します。
オブジェクト値は設定時に拒否されます。

### `start`

- **型:** `boolean | StartOptions`
- **デフォルト:** `undefined`

start モードを有効にします。
`true` と `{}` は同等です。
[`StartOptions`](/reference/vite-plugin-solid/start) を参照してください。

### `compiler`

- **型:** `Compiler = "babel" | "native"`
- **デフォルト:** `"native"`

JSX コンパイラを選択します。
どちらの値でも、`lazy()` のモジュール URL、refresh、サーバー関数の各パスには `@dom-expressions/compiler` を使います。
`"babel"` は JSX パスに `babel-preset-solid` を使います。
ネイティブコンパイラのローダーは、プラットフォームにネイティブバイナリがない場合 WebAssembly フォールバックを使います。

### `hot`

- **型:** `boolean`
- **デフォルト:** 開発時は `true`
- **非推奨:** `refresh.disabled` を使用してください

`false` に設定すると refresh トランスフォームとランタイムが無効になります。
プロダクション出力には影響しません。

### `refresh`

```ts
interface RefreshOptions {
	disabled?: boolean;
	granular?: boolean;
}
```

`disabled` は開発用の refresh トランスフォームを無効にします。
`granular` はコンポーネントのシグネチャと依存関係メタデータを制御し、デフォルトは `true` です。

### `extensions`

```ts
interface ExtensionOptions {
	typescript?: boolean;
}
```

- **型:** `(string | [string, ExtensionOptions])[]`
- **デフォルト:** 追加の拡張子なし

`.jsx` と `.tsx` に加えて拡張子を登録します。
タプルで指定すると、その拡張子は TypeScript としてパースされます。

```ts
solidPlugin({
	extensions: [".mdx", [".page", { typescript: true }]],
});
```

### `babel`

- **型:** `babel.TransformOptions`、または同期・非同期のオプションファクトリー
- **デフォルト:** `{}`

Babel オプションをトランスフォームにマージします。
ネイティブ JSX コンパイラ使用時にこのオプションを指定すると、ネイティブ JSX コンパイルの前に Babel サポートパスが追加されます。
ファクトリーはソース、クリーンなファイル ID、SSR トランスフォームフラグを受け取ります。

### `solid`

```ts
type SolidOptions = Omit<JsxCompilerOptions, "filename" | "sourceMap">;
```

- **デフォルト:** `{}`

プラグインのデフォルトの後に適用される DOM Expressions コンパイラオプションを上書きします。
デフォルトには `moduleName: "@solidjs/web"`、Solid の組み込みコンポーネント、カスタム要素コンテキスト、条件付きラッピング、モード別の `generate` と `hydratable`、解決済みの開発フラグが含まれます。

### `serverFunctions`

- **型:** `boolean | ServerFunctionsOptions`
- **デフォルト:** `undefined`

`"use server"` コンパイルを有効にします。
`true` はすべてのデフォルトを使います。
[`ServerFunctionsOptions`](/reference/vite-plugin-solid/server-functions) を参照してください。

## トランスフォーム出力

- プレーンなクライアントビルドは、ハイドレーションマーカーなしの DOM 出力を使います。
- `ssr: true` は、クライアントトランスフォームにハイドレーション可能な DOM 出力、サーバートランスフォームにハイドレーション可能な SSR 出力を使います。
- クライアント start モードではアプリケーションコードは非ハイドレーションのままです。
  SSR トランスフォームを受けるのはドキュメントシェルのみです。
- Vitest はデフォルトでクライアント条件、DOM 出力、`jsdom` になります。
  `test.environment: "node"` または `"edge-runtime"` のプロジェクトはサーバー条件と SSR 出力を受け取ります。

このプラグインは常に `server-only` と `client-only` のバウンダリリゾルバーをインストールします。
