---
title: Title
order: 1
use_cases: >-
  ページタイトル、ドキュメントタイトル、ブラウザタブのテキスト、head メタデータ
tags:
  - title
  - head
  - meta
  - component
version: "1.0"
source_repo: "solidjs/solid-meta"
source_ref: "next"
source_path: "src/index.ts"
description: >-
  Title は Solid Meta を通じてドキュメントのタイトルを設定します。
---

`Title` はドキュメントのタイトルを設定する [`<title>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/title) 要素を追加します。

## インポート

```tsx
import { Title } from "@solidjs/meta";
```

## 型

```tsx
const Title: Component<JSX.HTMLAttributes<HTMLTitleElement> & { key?: string }>;
```

## Props

### `children`

- **型:** `JSX.Element`
- **省略可能:** はい

`title` 要素のテキスト内容です。
`textContent` 経由で適用されるため、常にエスケープされます。
リアクティブな式を指定できます。

### `key`

- **型:** `string`
- **省略可能:** はい

Solid Meta の共通 head タグ props の一部として受け取られます。
ドキュメントのタイトルはシングルトンであり続けるため、タイトルの identity は変わりません。

## 動作

- `title` は厳格なシングルトンです: 属性に関わらず、最後に登録された `<Title>` が優先されます。
- 優先された `<Title>` がアンマウントされると前のものが復元されます。サーバーシェル内の静的な `<title>` が最終的なフォールバックです。

## 例

### 基本的な使い方

```tsx
import { Title } from "@solidjs/meta";

export default function Page() {
	return <Title>Solid Docs</Title>;
}
```

### リアクティブなタイトル

```tsx
import { Title } from "@solidjs/meta";

export default function Product(props: { name: () => string }) {
	return <Title>{props.name()} | My Store</Title>;
}
```

## 関連項目

- [`Meta`](/reference/solid-meta/meta)
- [`Head`](/reference/solid-meta/head)
