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

- [`PageFileSystemRouter`、`FlatFileSystemRouter`、ファイル名ヘルパー](/docs/reference/filesystem-routing/conventions.md)
- [`BaseFileSystemRouter`、スキャンユーティリティ、モジュール解析、マニフェスト型](/docs/reference/filesystem-routing/core.md)
- [`buildRouteTree`、`stripRouteGroups`、`RouteTreeEntry`](/docs/reference/filesystem-routing/tree.md)

### `filesystem-routing/tree`

スキャナーを読み込まずに、[ツリー構築の関数と型](/docs/reference/filesystem-routing/tree.md)をエクスポートします。

### `filesystem-routing/vite`

[`fileRoutes(options?)`](/docs/reference/filesystem-routing/vite.md)、そのオプション型、および低レベルの Vite アダプターヘルパーをエクスポートします。

### `filesystem-routing/api`

[API マッチャーと fetch スタイルのミドルウェアアダプター](/docs/reference/filesystem-routing/api.md)をエクスポートします。

### `filesystem-routing/types`

[`virtual:file-routes`](/docs/reference/filesystem-routing/manifest.md) 用の ambient 宣言を提供します。

### `virtual:file-routes`

生成されるモジュールは、フラットなマニフェストをデフォルトエクスポートし、ネストされたページエントリーを `pageRoutes` としてエクスポートします。
[マニフェストモジュール](/docs/reference/filesystem-routing/manifest.md)を参照してください。

## Solid Router との境界

`filesystem-routing` は Solid Router アダプターをエクスポートしません。
`pageRoutes` を Solid Router のルート定義に変換するには、`@solidjs/router/fs` から `fileRoutes` をインポートします。

```tsx
import { pageRoutes } from "virtual:file-routes";
import { createRouter } from "@solidjs/router";
import { fileRoutes } from "@solidjs/router/fs";

const Router = createRouter({ routes: fileRoutes(pageRoutes) });
```
