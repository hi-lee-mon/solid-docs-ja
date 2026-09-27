---
title: "@solidjs/meta"
titleTemplate: ":title"
version: "1.0"
description: "@solidjs/meta のリファレンス: ツリー内のどこからでもドキュメントのタイトル・メタタグ・リンク・スクリプト・スタイルを設定するコンポーネント。"
source_repo: "solidjs/solid-meta"
source_ref: "next"
source_path: "src/index.ts"
---

`@solidjs/meta` はドキュメントの `<head>` のためのコンポーネントを提供します。
それぞれのコンポーネントは `@solidjs/web` の head レジストリにタグを登録するため、プロバイダーなしでツリーの深い場所にあるコンポーネントからタイトルやメタタグを設定できます。
サーバーではタグは HTML の head にレンダーされ、ブラウザではライブのドキュメントを更新します。

```tsx
import { Title, Meta } from "@solidjs/meta";

function ProductPage(props: { name: string }) {
	return (
		<>
			<Title>{props.name} · Storefront</Title>
			<Meta name="description" content={`Buy ${props.name} today.`} />
			{/* ... */}
		</>
	);
}
```

[Head とメタデータ](/building-apps/head-and-metadata)では、デフォルトと上書きのパターンと、サーバーレンダリング時に何が起きるかを示しています。

## コンポーネント

- [`Title`](/reference/solid-meta/title) はドキュメントのタイトルを設定します。最後に登録された `Title` が優先され、アンマウントすると前のものに復元されます。
- [`Meta`](/reference/solid-meta/meta) は `<meta>` 要素を追加します。同じ identity（`name`、`property` などの属性）を持つタグは互いに置き換わります。
- [`Link`](/reference/solid-meta/link) は `<link>` 要素を追加します。
- [`Stylesheet`](/reference/solid-meta/stylesheet) はスタイルシートのリンクを追加します。
- [`Style`](/reference/solid-meta/style) はインラインの `<style>` 要素を追加します。
- [`Script`](/reference/solid-meta/script) は `<script>` 要素を追加します。
- [`Base`](/reference/solid-meta/base) はドキュメントのベース URL を設定します。
- [`Head`](/reference/solid-meta/head) は複数のタグをまとめて置き換わる 1 つのセットにグループ化します。

各ページにはそのコンポーネントの identity ルールが記載されています。新しいタグがどの既存のタグを置き換え、どれと共存するかを説明しています。
