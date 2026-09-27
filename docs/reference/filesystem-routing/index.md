---
title: "filesystem-routing"
titleTemplate: ":title"
mainNavExclude: true
version: "2.0"
description: "filesystem-routing のスキャン、規約、Vite 配信、API ディスパッチの公開エクスポート。"
source_repo: "solidjs/filesystem-routing"
source_ref: "v0.2.1"
source_path: "package.json"
---

`filesystem-routing` はルートファイルをスキャンして、ルーター中立のマニフェストを生成します。
Vite がそのマニフェストを配信し、各ルーターがルーター固有の定義への変換を担います。

## パッケージのエクスポート

### `filesystem-routing`

- [`PageFileSystemRouter`、`FlatFileSystemRouter`、ファイル名ヘルパー](/reference/filesystem-routing/conventions)
- [`BaseFileSystemRouter`、スキャンユーティリティ、モジュール解析、マニフェスト型](/reference/filesystem-routing/core)
- [`buildRouteTree`、`stripRouteGroups`、`RouteTreeEntry`](/reference/filesystem-routing/tree)

### `filesystem-routing/tree`

スキャナーを読み込まずに、[ツリー構築の関数と型](/reference/filesystem-routing/tree)をエクスポートします。

### `filesystem-routing/vite`

[`fileRoutes(options?)`](/reference/filesystem-routing/vite)、そのオプション型、および低レベルの Vite アダプターヘルパーをエクスポートします。

### `filesystem-routing/api`

[API マッチャーと fetch スタイルのミドルウェアアダプター](/reference/filesystem-routing/api)をエクスポートします。

### `filesystem-routing/types`

[`virtual:file-routes`](/reference/filesystem-routing/manifest) 用の ambient 宣言を提供します。

### `virtual:file-routes`

生成されるモジュールは、フラットなマニフェストをデフォルトエクスポートし、ネストされたページエントリーを `pageRoutes` としてエクスポートします。
[マニフェストモジュール](/reference/filesystem-routing/manifest)を参照してください。

## Solid Router との境界

`filesystem-routing` は Solid Router アダプターをエクスポートしません。
`pageRoutes` を Solid Router のルート定義に変換するには、`@solidjs/router/fs` から `fileRoutes` をインポートします。

```tsx
import { pageRoutes } from "virtual:file-routes";
import { createRouter } from "@solidjs/router";
import { fileRoutes } from "@solidjs/router/fs";

const Router = createRouter({ routes: fileRoutes(pageRoutes) });
```
