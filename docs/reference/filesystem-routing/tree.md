---
title: "filesystem-routing/tree"
category: "ファイルシステムルーティング"
order: 3
version: "2.0"
description: "ネストされたルートツリーを構築し、ルートグループのセグメントを取り除きます。"
source_repo: "solidjs/filesystem-routing"
source_ref: "v0.2.1"
source_path: "src/tree.ts"
---

`filesystem-routing/tree` は Node やバンドラーのインポートを含まないルートツリー操作を提供します。
同じエクスポートは `filesystem-routing` からも利用できます。

## インポート

```ts
import {
	buildRouteTree,
	stripRouteGroups,
	type RouteTreeEntry,
} from "filesystem-routing/tree";
```

## `RouteTreeEntry`

```ts
interface RouteTreeEntry extends RouteManifestEntry {
	id: string;
	children?: RouteTreeEntry[];
}
```

`id` はルートグループを含む、ネストに使われるマニフェストパスを記録します。
ネストされた子では、`id` と `path` は親に対する相対パスになります。

## `stripRouteGroups`

```ts
function stripRouteGroups(path: string): string;
```

`(name)` にマッチするセグメントを取り除き、連続するスラッシュを 1 つにまとめます。

```ts
stripRouteGroups("/(app)/dashboard"); // "/dashboard"
stripRouteGroups("/(app)"); // "/"
```

## `buildRouteTree`

```ts
function buildRouteTree(
	entries: readonly RouteManifestEntry[]
): RouteTreeEntry[];
```

エントリーをコピーしてパス長でソートし、各エントリーを、そのパスプレフィックスとなる `id` を持つ最初の既存ルートの下にネストします。
この関数はネストされた `path` の値を親に対する相対パスに変え、URL パスからグループセグメントを取り除きます。
この関数は入力を変更しません。

ページツリーに属するエントリーだけを渡してください：

```ts
const tree = buildRouteTree(entries.filter((entry) => entry.page));
```
