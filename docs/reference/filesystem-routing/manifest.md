---
title: "マニフェストモジュール"
category: "ファイルシステムルーティング"
order: 6
version: "2.0"
description: "virtual:file-routes のランタイム出力と TypeScript 宣言に関するリファレンス。"
source_repo: "solidjs/filesystem-routing"
source_ref: "v0.2.1"
source_path: "types.d.ts"
---

Vite アダプターはデフォルトで `virtual:file-routes` から中立なルートマニフェストを提供します。

## インポート

```ts
import routes, { pageRoutes } from "virtual:file-routes";
```

`routes` はスキャン順のフラットなマニフェストです。
`routes` のパスはルートグループを保持します。

`pageRoutes` は `page: true` のエントリーだけを含みます。
`pageRoutes` はエントリーをマニフェストパスでネストし、URL パスからグループを取り除き、子パスを親に対する相対パスに変えます。
両方のエクスポートは同じシリアライズされたエントリーオブジェクトを再利用します。

## 配信される ref

```ts
interface FileRouteLazyRef<M = Record<string, unknown>> {
	src: string;
	import(): Promise<M>;
}

interface FileRouteEagerRef<M = Record<string, unknown>> {
	src?: string;
	require(): M;
}

interface FileRouteEntry {
	path: string;
	page?: boolean;
	$component?: FileRouteLazyRef | FileRouteEagerRef;
	$$route?: FileRouteEagerRef;
	[key: string]: unknown;
}

interface FileRouteTreeEntry extends FileRouteEntry {
	id: string;
	children?: readonly FileRouteTreeEntry[];
}
```

デフォルトのコード分割では、`$` キーは `{ src, import }` を、`$$` キーは `{ require }` を含みます。
`codeSplitting: false` の場合、両形式とも `require` を含み、配信されるコンポーネントとハンドラーの ref は `src` も保持します。

`$component` はルートコンポーネントのエクスポートと CSS を選択します。
`$$route` は即時の `route` エクスポートを選択します。
HTTP メソッドが有効な場合、`$GET`・`$POST` および同等のキーがハンドラーのエクスポートを選択します。

## 環境ごとの出力

1 つの共有ルーターで HTTP メソッドを有効にしている場合：

- サーバー側コンシューマーの環境は、ページ、ルート設定、ハンドラーの ref を受け取ります。
- クライアント側コンシューマーの環境では、ハンドラーの ref は除去されます。
- ハンドラーのみのエントリーはクライアント側コンシューマーの出力に含まれません。
- ハンドラーも持つページエントリーは、ハンドラーの ref を除いた状態で残ります。

プラグインは `fileRoutes({ routers })` で割り当てられたルーターを、その環境向けに変更せずシリアライズします。

## `filesystem-routing/types`

生成されるタプル型が無効な場合は、パッケージ同梱の汎用宣言を追加します：

```ts
/// <reference types="filesystem-routing/types" />
```

同梱の宣言は `routes` を `FileRouteEntry[]` として、`pageRoutes` を `FileRouteTreeEntry[]` として型付けします。
この宣言はデフォルトのモジュール ID にのみ適用されます。

## 生成されるリテラルタプル宣言

リテラルパスとモジュールエクスポートの型を保持するには、型生成を有効にします：

```ts
fileRoutes({ types: true });
```

デフォルトの出力は Vite ルートの `file-routes.d.ts` です。
生成される宣言は設定されたモジュール ID を宣言し、JavaScript と TypeScript の ref を `typeof import(...)` で型付けし、ネストされたページタプルを再現します。
TypeScript が解決できない拡張子のモジュールには、汎用の ref 型が使われます。

生成される宣言は自己完結しています。
両方ともデフォルトの仮想モジュールを宣言するため、`filesystem-routing/types` を同時に参照しないでください。

プラグインはビルド開始時とルート変更後にファイルを再生成します。
プラグインは内容に変更がある場合にのみファイルを書き込みます。
