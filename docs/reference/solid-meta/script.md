---
title: Script
order: 6
use_cases: >-
  json-ld、構造化データ、アナリティクススクリプト、head スクリプト
tags:
  - script
  - json-ld
  - structured-data
  - head
  - component
version: "1.0"
source_repo: "solidjs/solid-meta"
source_ref: "next"
source_path: "src/index.ts"
description: >-
  Script は Solid Meta を通じてドキュメントの head に script 要素を追加します。
---

`Script` は、インラインの本文を含めて、ドキュメントの head に [`<script>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script) 要素を追加します。
JSON-LD（`type="application/ld+json"`）による構造化データが代表的なユースケースです。

:::note[1.0 の新機能]
`Script` は `@solidjs/meta` 0.x には存在しませんでした — 以前、head スクリプトには 0.x の `useHead` エスケープハッチが必要でした。
:::

## インポート

```tsx
import { Script } from "@solidjs/meta";
```

## 型

```tsx
const Script: Component<
	JSX.ScriptHTMLAttributes<HTMLScriptElement> & { key?: string }
>;
```

## Props

[`<script>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script) の属性を受け取ります。

### `children`

- **型:** `JSX.Element`
- **省略可能:** はい

`script` 要素のテキスト本文です。
`textContent` 経由で適用されるため、常にエスケープされます。
リアクティブな式を指定できます。

### `key`

- **型:** `string`
- **省略可能:** はい

重複排除に使われるデフォルトの identity を上書きします。

## 動作

- `src` を持つスクリプトは URL で重複排除され、リソースとして扱われます: 即座にレンダーされ、アンマウントしても取り消されません。
- key なしのインラインスクリプトは追加専用です: それぞれが独自の要素を追加し、アンマウントすると削除されます。
- インラインスクリプトを置き換え可能にするには `key` を指定します — 同じ `key` を持つ後の登録がそれを上書きし、アンマウントすると以前の本文が復元されます。

## 例

### JSON-LD 構造化データ

```tsx
import { Script } from "@solidjs/meta";

export default function Product(props: {
	product: () => { name: string; price: number };
}) {
	return (
		<Script type="application/ld+json">
			{JSON.stringify({
				"@context": "https://schema.org",
				"@type": "Product",
				name: props.product().name,
				offers: { "@type": "Offer", price: props.product().price },
			})}
		</Script>
	);
}
```

## 関連項目

- [`Style`](/docs/reference/solid-meta/style.md)
- [`Head`](/docs/reference/solid-meta/head.md)
