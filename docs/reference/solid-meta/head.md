---
title: Head
order: 8
use_cases: >-
  グループ化されたメタタグ、複数の og 画像、ソーシャルタグのブロック、
  アトミックな head の置き換え
tags:
  - head
  - group
  - og-tags
  - component
version: "1.0"
source_repo: "solidjs/solid-meta"
source_ref: "next"
source_path: "src/index.ts"
description: >-
  Head は Solid Meta を通じて、子の head タグを 1 つの置き換えセットにグループ化します。
---

`Head` は子の head タグを 1 つの置き換えセットにグループ化します。
head の状態には単一のタグではなく _セット_ であるものがあります —
複数の `og:image` や、まとめて上書きされるべきソーシャルタグの
ブロックなどです。

:::note[1.0 の新機能]
`Head` は `@solidjs/meta` 0.x には存在しませんでした。
:::

## インポート

```tsx
import { Head } from "@solidjs/meta";
```

## 型

```tsx
const Head: ParentComponent;
```

## Props

### `children`

- **型:** `JSX.Element`
- **省略可能:** はい

head タグコンポーネント（およびそれらをレンダーするコンポーネント）。

## 動作

- **グループ内では、同一 identity のタグが共存します。**
  1 つの `<Head>` の中にある 2 つの `<Meta property="og:image">` タグは両方ともレンダーされます。
- **グループはまとめて置き換わります。**
  後のグループは、ある identity について前のグループのセットを一単位として置き換え、アンマウントすると前のセットが復元されます。
- **メンバーシップはリアクティブです。**
  `<Head>` の中で条件付きで（または子コンポーネントによって）レンダーされるタグは、マウント・アンマウントに応じてセットに参加・離脱します。
  グループのスコープはコンテキストを通じてコンポーネント呼び出しをまたいで伝播します。
- **ネストすると新しいグループが始まります。**
  別の `<Head>` の children 内にある `<Head>` は独自の独立したグループを形成します。周囲のグループ _へ_ タグを追加したい場合は、裸のタグコンポーネントをレンダーしてください。

## 例

### デフォルトのセットを上書きする

```tsx
// Layout
<Head>
	<Meta property="og:image" content="/default-1.png" />
	<Meta property="og:image" content="/default-2.png" />
</Head>

// Page — replaces BOTH defaults while mounted, restores them on leave
<Head>
	<Meta property="og:image" content={product().image} />
</Head>
```

### ソーシャルタグのブロック

```tsx
import { Head, Meta, Title } from "@solidjs/meta";

export default function Article(props: {
	article: () => { title: string; image: string };
}) {
	return (
		<Head>
			<Title>{props.article().title}</Title>
			<Meta property="og:title" content={props.article().title} />
			<Meta property="og:image" content={props.article().image} />
			<Meta name="twitter:card" content="summary_large_image" />
		</Head>
	);
}
```

## 関連項目

- [`Meta`](/docs/reference/solid-meta/meta.md)
- [`Title`](/docs/reference/solid-meta/title.md)
