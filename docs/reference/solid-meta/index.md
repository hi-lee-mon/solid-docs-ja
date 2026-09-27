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

[Head とメタデータ](/docs/building-apps/head-and-metadata.md)では、デフォルトと上書きのパターンと、サーバーレンダリング時に何が起きるかを示しています。

## コンポーネント

- [`Title`](/docs/reference/solid-meta/title.md) はドキュメントのタイトルを設定します。最後に登録された `Title` が優先され、アンマウントすると前のものに復元されます。
- [`Meta`](/docs/reference/solid-meta/meta.md) は `<meta>` 要素を追加します。同じ identity（`name`、`property` などの属性）を持つタグは互いに置き換わります。
- [`Link`](/docs/reference/solid-meta/link.md) は `<link>` 要素を追加します。
- [`Stylesheet`](/docs/reference/solid-meta/stylesheet.md) はスタイルシートのリンクを追加します。
- [`Style`](/docs/reference/solid-meta/style.md) はインラインの `<style>` 要素を追加します。
- [`Script`](/docs/reference/solid-meta/script.md) は `<script>` 要素を追加します。
- [`Base`](/docs/reference/solid-meta/base.md) はドキュメントのベース URL を設定します。
- [`Head`](/docs/reference/solid-meta/head.md) は複数のタグをまとめて置き換わる 1 つのセットにグループ化します。

各ページにはそのコンポーネントの identity ルールが記載されています。新しいタグがどの既存のタグを置き換え、どれと共存するかを説明しています。
