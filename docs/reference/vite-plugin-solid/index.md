---
title: "@solidjs/vite-plugin"
titleTemplate: ":title"
mainNavExclude: true
version: "2.0"
description: "Solid 2.0 向けに @solidjs/vite-plugin 3.0 が提供する公開エクスポートと生成モジュールです。"
source_repo: "solidjs/solid-vite-plugin"
source_ref: "next"
source_path: "src/index.ts"
---

`@solidjs/vite-plugin` 3.0 は、Solid 2.0 向けに Solid の JSX トランスフォーム、オプションの start モード、`"use server"` コンパイルを提供します。

## パッケージエクスポート

### `@solidjs/vite-plugin`

- [`default: solidPlugin(options?)`](/docs/reference/vite-plugin-solid/options.md) は Vite プラグインの配列を返します。
- [`serverFunctions(options?)`](/docs/reference/vite-plugin-solid/server-functions.md) はスタンドアロンのサーバー関数プラグイン配列を返します。
- [`devStylePatch`](/docs/reference/vite-plugin-solid/modules.md) は開発用スタイルの重複除去スクリプトです。
- [`Options`、`Compiler`、`ExtensionOptions`、`RefreshOptions`、`SolidOptions`](/docs/reference/vite-plugin-solid/options.md) はトランスフォーム設定を記述します。
- [`StartOptions`](/docs/reference/vite-plugin-solid/start.md) は start モードを記述します。
- [`ServerFunctionsOptions` と `ServerFunctionsFilter`](/docs/reference/vite-plugin-solid/server-functions.md) はサーバー関数のコンパイルとディスパッチを記述します。
- [`ViteManifest`](/docs/reference/vite-plugin-solid/modules.md) はサーバーレンダリングが消費するアセットマニフェストを記述します。

### `@solidjs/vite-plugin/virtual-solid-manifest`

プラグインの[仮想モジュール](/docs/reference/vite-plugin-solid/modules.md)に対する TypeScript 宣言を追加します。

### `@solidjs/vite-plugin/boundary-modules`

[`server-only` と `client-only` のマーカーモジュール](/docs/reference/vite-plugin-solid/modules.md#boundary-marker-modules)に対する TypeScript 宣言を追加します。

## 最小構成

```ts
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";

export default defineConfig({
	plugins: [solid()],
});
```

デフォルトエクスポートは配列を返します。
`solidPlugin()` は Vite の `plugins` 配列の要素として直接渡してください。
Vite はネストされたプラグイン配列を平坦化します。
