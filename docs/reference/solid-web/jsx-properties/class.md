---
title: "class"
category: "JSX プロパティ"
use_cases: "クラス名の設定、条件付きクラスの切り替え、クラス値のマージ"
tags:
  - "class"
  - "jsx"
  - "dom"
  - "css"
  - "reference"
  - "v2"
version: "2.0"
description: "文字列・オブジェクト・ネストした配列から静的・条件付きのクラス名を設定します。"
source_repo: "ryansolid/dom-expressions"
source_ref: "next"
source_path: "packages/runtime/src/client.js"
---

`class` prop は要素のクラス名を設定します。
文字列、条件付き名のオブジェクト、またはクラス値を組み合わせるネストした配列を受け取ります。

## 型

```ts
type ClassValue =
	| string
	| number
	| boolean
	| null
	| undefined
	| Record<string, boolean>
	| ClassValue[];
```

## 文字列の値

文字列は完全な class 属性を指定します:

```tsx
<button class="button primary">Save</button>
```

リアクティブな文字列は、変化時に完全な値を置き換えます。

## 条件付きクラス

オブジェクトは、値が truthy な各キーを追加します:

```tsx
<button
	class={{
		active: props.active,
		"saving muted": props.saving,
	}}
>
	Save
</button>
```

キーにはスペース区切りで複数のクラス名を含められます。
Solid は条件が変わったときに該当するクラストークンを切り替えます。

## クラス値をマージする

配列は文字列・オブジェクト・他の配列を組み合わせます:

```tsx
function Button(props: { class?: string; active: boolean; saving: boolean }) {
	return (
		<button
			class={[
				"button",
				props.class,
				{
					active: props.active,
					"saving muted": props.saving,
				},
			]}
		>
			Save
		</button>
	);
}
```

配列形式は、コンポーネントの基本クラス・呼び出し側が渡すクラス・条件付きクラスを組み合わせるのに使います。
Solid はネストした配列を再帰的に平坦化します。

Solid 1 の `classList` prop は、`class` のオブジェクト形式と配列形式に置き換えられました。
