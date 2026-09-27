---
title: "style"
category: "JSX プロパティ"
use_cases: "インラインスタイルの設定、CSS 宣言の更新、CSS カスタムプロパティの設定"
tags:
  - "style"
  - "jsx"
  - "dom"
  - "css"
  - "reference"
  - "v2"
version: "2.0"
description: "CSS 文字列または宣言オブジェクトから要素のインラインスタイルを設定します。"
source_repo: "ryansolid/dom-expressions"
source_ref: "next"
source_path: "packages/runtime/src/client.js"
---

`style` prop は要素のインラインスタイルを設定します。
CSS 文字列または CSS 宣言のオブジェクトを受け取ります。

## 型

```ts
style?: string | JSX.CSSProperties | false | undefined;
```

## CSS 文字列

文字列は完全な `style` 属性を指定します:

```tsx
<div style="color: white; background-color: navy">Status</div>
```

リアクティブな文字列は、変化時に要素の完全な `cssText` 値を置き換えます。

## スタイルオブジェクト

オブジェクトは CSS プロパティ名で宣言を設定します:

```tsx
<div
	style={{
		color: props.color,
		"background-color": props.background,
		"font-weight": props.important ? 700 : 400,
		"--accent-color": props.accent,
	}}
>
	Status
</div>
```

`backgroundColor` のような JavaScript 名ではなく、`background-color` のような CSS プロパティ名を使います。
`--` で始まる名前は CSS カスタムプロパティを設定します。

Solid は変更された宣言を更新し、値が `null` または `undefined` になった宣言を削除します。
数値は単位を付けずにそのまま CSS プロパティへ渡されます。
プロパティが単位を必要とする場合は単位を含めてください:

```tsx
<div style={{ width: `${props.width}px` }} />
```

`style` の値全体に `false` または `undefined` を渡すと、style 属性が削除されます。
