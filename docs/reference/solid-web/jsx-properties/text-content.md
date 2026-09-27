---
title: "textContent"
category: "JSX プロパティ"
use_cases: "プレーンテキストのレンダー、最適化されたテキスト更新"
tags:
  - "textcontent"
  - "jsx"
  - "dom"
  - "text"
  - "reference"
  - "v2"
version: "2.0"
description: "最適化されたテキスト専用パスを通じて、プレーンテキストを要素の完全な内容として書き込みます。"
source_repo: "ryansolid/dom-expressions"
source_ref: "next"
source_path: "packages/compiler/src/dom/attrs.rs"
---

`textContent` は文字列または数値を要素の完全な内容として書き込みます。
ブラウザはその値をテキストとして扱い、HTML としてパースしません。

## 型

```ts
textContent?: string | number;
```

`textContent` は組み込み DOM 要素で利用できます。
インポートは不要です。

## 使い方

```tsx
function Status(props: { message: string }) {
	return <p textContent={props.message} />;
}
```

リアクティブな式は既存のテキストノードを更新します:

```tsx
import { createSignal } from "solid-js";

const [count, setCount] = createSignal(0);

return <output textContent={`Count: ${count()}`} />;
```

コンパイラは、その要素がテキストのみを含むことを認識しています。
動的な値に対しては、一般的な子要素挿入パスではなく、テキストノードを作成してそのノードの文字データを直接更新します。
要素の内容全体がテキストであり、明示的なテキスト専用パスが有用な場合にこのプロパティを使います。
ほとんどのテキストでは、通常の JSX children のほうが明確です:

```tsx
<output>Count: {count()}</output>
```

## エスケープ

値に含まれるマークアップはテキストとしてレンダーされます:

```tsx
<p textContent={"<strong>Not bold</strong>"} />
```

サーバーレンダリングでも値はエスケープされます。
値に、ブラウザがパースすべき信頼されたまたはサニタイズ済みのマークアップが含まれる場合のみ [`innerHTML`](/docs/reference/solid-web/jsx-properties/inner-html.md) を使ってください。

## 子要素

`textContent` と JSX children を組み合わせないでください。
どちらも要素の完全な内容を定義するため、互いの更新が衝突する可能性があります。
