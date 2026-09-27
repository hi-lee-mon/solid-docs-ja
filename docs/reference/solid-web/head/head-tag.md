---
title: "HeadTag"
category: "Head"
use_cases: "head タグ記述子型、useHead 記述子、メタデータの同一性"
tags:
  - "head"
  - "metadata"
  - "type"
  - "reference"
  - "v2"
version: "2.0"
description: "Solid のアンビエント head レジストリに登録されるタグを記述します。"
source_repo: "ryansolid/dom-expressions"
source_ref: "0.50.0-next.40"
source_path: "packages/runtime/src/client.d.ts"
---

`HeadTag` は [`useHead`](/reference/solid-web/head/use-head) の 1 つのタグを記述します。

## インポート

```ts
import type { HeadTag } from "@solidjs/web";
```

## 型シグネチャ

```ts
type HeadTag = {
	tag: "title" | "meta" | "link" | "style" | "script" | "base";
	props: Record<string, any>;
	key?: string | (() => string);
};
```

## プロパティ

### `tag`

登録する head 要素です。
`noscript` はこの記述子のユニオンに含まれません。ドキュメントシェルに静的に記述してください。

### `props`

タグの属性とテキストコンテンツです。
値にはリアクティブなゲッターを使えます。
`title`、`style`、インライン `script` の記述子のテキスト本文には `children` を使います。

記述子は管理対象の DOM 要素ではなくデータです。
ref やイベントハンドラーはアタッチしないでください。

### `key`

組み込みの置き換え同一性を上書きします。
値には文字列またはリアクティブなゲッターを使えます。

`title` はドキュメント全体で単一のままであり、キーで分岐させることはできません。
その他の置き換え可能なタグでは、本来は異なるタグ同士を互いに置き換えさせたり、本来は一致するタグ同士を独立させたりするためにキーを使います。

## 例

```tsx
const description: HeadTag = {
	tag: "meta",
	key: "page-description",
	props: {
		name: "description",
		content: () => summary(),
	},
};

useHead(description);
```

## 関連項目

- [`useHead`](/reference/solid-web/head/use-head)
- [Head とメタデータ](/building-apps/head-and-metadata)
