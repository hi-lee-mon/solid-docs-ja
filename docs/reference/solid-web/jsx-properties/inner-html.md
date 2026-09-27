---
title: "innerHTML"
category: "JSX プロパティ"
use_cases: "信頼された HTML のレンダー、サニタイズ済みマークアップのレンダー"
tags:
  - "innerhtml"
  - "jsx"
  - "dom"
  - "html"
  - "reference"
  - "v2"
version: "2.0"
description: "HTML 文字列を要素の完全な内容としてパースします。"
source_repo: "ryansolid/dom-expressions"
source_ref: "next"
source_path: "packages/compiler/src/ssr/transform.rs"
---

`innerHTML` は HTML 文字列を要素の完全な内容としてパースします。
信頼されたマークアップ、または HTML サニタイザーを通過した信頼できないマークアップに使用します。

## 型

```ts
innerHTML?: string;
```

`innerHTML` は組み込み DOM 要素で利用できます。
インポートは不要です。

## 使い方

```tsx
import { createMemo } from "solid-js";

const html = createMemo(() => sanitize(renderMarkdown(props.source)));

return <article innerHTML={html()} />;
```

リアクティブな式は、値が変わったときに要素のパース済み内容を置き換えます。
以前の値から作成されたノードは、同一性や状態を保持しません。

## セキュリティ

Solid は `innerHTML` の値をエスケープもサニタイズもしません。
サーバーレンダリング中、Solid はその値を生の HTML としてレスポンスに書き込みます。

ユーザーが制御するコンテンツを直接渡さないでください:

```tsx
// Avoid: an attacker can inject markup or executable content.
<article innerHTML={comment.body} />
```

信頼できないコンテンツを `innerHTML` に渡す前に、アプリケーションのマークアップおよび URL ポリシーに合ったサニタイザーを使用してください。
値をプレーンテキストとしてレンダーすべき場合は [`textContent`](/reference/solid-web/jsx-properties/text-content) を使います。

## 子要素

`innerHTML` と JSX children を組み合わせないでください。
どちらも要素の完全な内容を定義するため、互いの更新が置き換え合うことがあります。
