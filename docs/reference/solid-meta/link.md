---
title: Link
order: 3
use_cases: >-
  canonical リンク、ファビコン、プリロードヒント、スタイルシート、代替リンク
tags:
  - link
  - head
  - favicon
  - preload
  - component
version: "1.0"
source_repo: "solidjs/solid-meta"
source_ref: "next"
source_path: "src/index.ts"
description: >-
  Link は Solid Meta を通じてドキュメントの head に link 要素を追加します。
---

`Link` はドキュメントの head に [`<link>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link) 要素を追加します。

## インポート

```tsx
import { Link } from "@solidjs/meta";
```

## 型

```tsx
const Link: Component<
	JSX.LinkHTMLAttributes<HTMLLinkElement> & { key?: string }
>;
```

## Props

[`<link>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link) の属性を受け取ります。
属性値にはリアクティブな式を使えます。

### `key`

- **型:** `string`
- **省略可能:** はい

重複排除に使われるデフォルトの identity を上書きします。

## 動作

- `rel` + `href` で重複排除します: 最後に登録されたタグが優先され、アンマウントすると直前のものが復元されます。
- **アイコン**（`rel="icon"`、`rel="apple-touch-icon"`）は代わりに `rel` + `sizes` + `type` で重複排除します — `href` は意図的に除外されています。
  `href` を差し替えると、ファビコンは累積ではなく _置き換えられ_ ます。一方、サイズと type のバリアントは共存します。
- **リソース系の rel**（`preload`、`modulepreload`、`prefetch`、`preconnect`、`dns-prefetch`）は即座にレンダーされ、取り消されることはありません — フェッチヒントを意味のある形で元に戻すことはできないためです。
- **スタイルシート**（`rel="stylesheet"`）は eager に出力され（SSR では登録されるとすぐにストリームされます）、オーナーが破棄されると削除されます。

## 例

### canonical リンク

```tsx
import { Link } from "@solidjs/meta";

export default function Page() {
	return <Link rel="canonical" href="https://solidjs.com/" />;
}
```

### ルートごとのファビコン

アイコンの identity には `href` が含まれないため、これはルートがマウントされている間はサイトのファビコンを置き換え、離れると以前のものを復元します:

```tsx
import { Link } from "@solidjs/meta";

export default function Inbox(props: { unread: () => number }) {
	return (
		<Link
			rel="icon"
			href={props.unread() > 0 ? "/favicon-badge.ico" : "/favicon.ico"}
		/>
	);
}
```

## 関連項目

- [`Stylesheet`](/reference/solid-meta/stylesheet)
- [`Meta`](/reference/solid-meta/meta)
