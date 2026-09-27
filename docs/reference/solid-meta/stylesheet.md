---
title: Stylesheet
order: 4
use_cases: >-
  スタイルシート、CSS の読み込み、ルートスコープのスタイル
tags:
  - stylesheet
  - css
  - link
  - head
  - component
version: "1.0"
source_repo: "solidjs/solid-meta"
source_ref: "next"
source_path: "src/index.ts"
description: >-
  Stylesheet は Solid Meta を通じてドキュメントの head に
  スタイルシートの link 要素を追加します。
---

`Stylesheet` は [`<Link rel="stylesheet">`](/docs/reference/solid-meta/link.md) の糖衣構文です。

## インポート

```tsx
import { Stylesheet } from "@solidjs/meta";
```

## 型

```tsx
const Stylesheet: Component<
	Omit<JSX.LinkHTMLAttributes<HTMLLinkElement>, "rel"> & { key?: string }
>;
```

## Props

[`<link>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link) の属性を受け取りますが、`stylesheet` に固定されている `rel` は除きます。

### `key`

- **型:** `string`
- **省略可能:** はい

重複排除に使われるデフォルトの identity を上書きします。

## 動作

- eager に出力されます: SSR ではスタイルシートは登録されるとすぐにストリームされるため、スタイルができるだけ早く読み込まれます。
- オーナーが破棄されると削除されます — ルートから離れると、そのルートスコープのスタイルシートが削除されます。
- URL で重複排除します: 同じ `href` を 2 回登録しても要素は 1 つになります。

## 例

### ルートスコープのスタイルシート

```tsx
import { Stylesheet } from "@solidjs/meta";

export default function Dashboard() {
	return <Stylesheet href="/styles/dashboard.css" />;
}
```

## 関連項目

- [`Link`](/docs/reference/solid-meta/link.md)
- [`Style`](/docs/reference/solid-meta/style.md)
