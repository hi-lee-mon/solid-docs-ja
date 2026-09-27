---
title: Meta
order: 2
use_cases: >-
  メタタグ、SEO メタデータ、Open Graph タグ、ソーシャル共有、description、
  テーマカラー
tags:
  - meta
  - head
  - seo
  - og-tags
  - component
version: "1.0"
source_repo: "solidjs/solid-meta"
source_ref: "next"
source_path: "src/index.ts"
description: >-
  Meta は Solid Meta を通じてドキュメントの head に meta 要素を追加します。
---

`Meta` はドキュメントの head に [`<meta>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta) 要素を追加します。

## インポート

```tsx
import { Meta } from "@solidjs/meta";
```

## 型

```tsx
const Meta: Component<
	JSX.MetaHTMLAttributes<HTMLMetaElement> & { key?: string }
>;
```

## Props

[`<meta>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta) の属性を受け取ります。
属性値にはリアクティブな式を使えます。

### `key`

- **型:** `string`
- **省略可能:** はい

重複排除に使われるデフォルトの identity を上書きします。

## 動作

- `name`、`property`、`http-equiv` のいずれかで重複排除します。
  これらは別々の名前空間です: `<Meta name="og:image" />` と `<Meta property="og:image" />` は共存します。
- `media` 属性は identity を分岐させるため、`theme-color` のライトとダークのバリアントは共存します:

```tsx
<Meta name="theme-color" media="(prefers-color-scheme: light)" content="white" />
<Meta name="theme-color" media="(prefers-color-scheme: dark)" content="black" />
```

- ある identity では最後に登録されたタグが優先され、アンマウントすると前の登録が復元されます。
- identity 属性を 1 つも持たない（`key` も持たない）`<Meta>` は追加専用です。
- `<Meta charset>` はサーバーシェル専用です: 最初のフラッシュで head のプリリュードにレンダーされ、クライアントでは（開発時警告とともに）無視されます。

## 例

### 基本的な使い方

```tsx
import { Meta } from "@solidjs/meta";

export default function Page() {
	return (
		<>
			<Meta name="description" content="A description of this page." />
			<Meta property="og:title" content="My Page" />
		</>
	);
}
```

### タグ同士を強制的に上書きさせる

```tsx
{/* These override each other despite different attributes: */}
<Meta key="social-image" name="twitter:image" content="/twitter.png" />
<Meta key="social-image" property="og:image" content="/og.png" />
```

### 同じ identity を持つ複数のタグ

意図的なセットは [`<Head>`](/reference/solid-meta/head) でラップすると、共存しつつ一単位として上書きされます:

```tsx
<Head>
	<Meta property="og:image" content="/image-1.png" />
	<Meta property="og:image" content="/image-2.png" />
</Head>
```

## 関連項目

- [`Head`](/reference/solid-meta/head)
- [`Title`](/reference/solid-meta/title)
