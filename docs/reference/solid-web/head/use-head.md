---
title: "useHead"
category: "Head"
use_cases: "ドキュメント head タグの登録、リアクティブなメタデータグループ、ライブラリの head 統合"
tags:
  - "head"
  - "metadata"
  - "ssr"
  - "api"
  - "reference"
  - "v2"
version: "2.0"
description: "1 つ以上の head タグ記述子を Solid のアンビエント head レジストリに登録します。"
source_repo: "ryansolid/dom-expressions"
source_ref: "0.50.0-next.40"
source_path: "packages/runtime/src/client.d.ts"
---

`useHead` は、現在のリアクティブオーナーのもとで head タグをアンビエントレジストリに登録します。
そのオーナーが破棄されると登録は解除され、以前の勝者タグが復元されます。

Solid Meta は内部で `useHead` を使用しています。
一般的なアプリケーションのメタデータには Solid Meta コンポーネントを優先してください。
`useHead` はライブラリ、リアクティブな記述子グループ、より低レベルの制御が必要なタグに使います。

## インポート

```ts
import { useHead } from "@solidjs/web";
```

## 型シグネチャ

```ts
function useHead(tag: HeadTag | HeadTag[] | (() => HeadTag | HeadTag[])): void;
```

## 1 つのタグを登録する

記述子の prop 値にはゲッターを使えます。
Solid はそれらの読み取りを追跡し、勝者タグをその場で更新します。

```tsx
import { useHead } from "@solidjs/web";

function PageDescription(props: { description: string }) {
	useHead({
		tag: "meta",
		props: {
			name: "description",
			content: () => props.description,
		},
	});

	return null;
}
```

## グループを登録する

複数のタグが 1 つの置き換えセットを構成する場合は配列を渡します。
配列内で同一性が同じタグは共存します。
後のグループは前のセットを 1 つの単位として置き換え、破棄すると前のセットが復元されます。

```tsx
useHead([
	{
		tag: "meta",
		props: { property: "og:image", content: "/wide.png" },
	},
	{
		tag: "meta",
		props: { property: "og:image", content: "/square.png" },
	},
]);
```

グループの構成要素がリアクティブに変化する場合は関数を渡します:

```tsx
useHead(() =>
	images().map((content) => ({
		tag: "meta",
		props: { property: "og:image", content },
	}))
);
```

リアクティブな更新は、登録の元のオーバーライド順序内の位置を維持します。
記述子ゲッター内で新しいリアクティブオーナーを作成すると、サーバーとクライアントで異なるハイドレーション ID を消費する可能性があります。
メモなどのヘルパーは `useHead` を呼ぶ前に作成し、ゲッターからそれらを読み取ってください。

## サーバーレンダリング

サーバーレンダリング中、勝者タグはドキュメントの head に書き込まれます。
ストリーミングシェルの後に検出された登録は、そのバウンダリとともに head パッチとして届くことがあります。
ホストがドキュメントを所有する場合は、レンダラーの `onHead` オプションで生成された head マークアップを受け取ります。

ハイドレーション中は、ハイドレーションが完了するまでサーバーがフラッシュした head の状態が権威であり続けます。
その後クライアントは、採用済みタグを不必要に置き換えることなくリアクティブな更新を適用します。

## 関連項目

- [`HeadTag`](/docs/reference/solid-web/head/head-tag.md)
- [Head とメタデータ](/docs/building-apps/head-and-metadata.md)
- [`Head`](/docs/reference/solid-meta/head.md)
