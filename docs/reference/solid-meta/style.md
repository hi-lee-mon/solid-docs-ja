---
title: Style
order: 5
use_cases: >-
  インラインスタイル、クリティカル CSS、CSS-in-JS の出力
tags:
  - style
  - css
  - head
  - component
version: "1.0"
source_repo: "solidjs/solid-meta"
source_ref: "next"
source_path: "src/index.ts"
description: >-
  Style は Solid Meta を通じてドキュメントの head にインラインの style 要素を追加します。
---

`Style` はインラインの本文を持つ [`<style>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style) 要素をドキュメントの head に追加します。

## インポート

```tsx
import { Style } from "@solidjs/meta";
```

## 型

```tsx
const Style: Component<
	JSX.StyleHTMLAttributes<HTMLStyleElement> & { key?: string }
>;
```

## Props

[`<style>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style) の属性を受け取ります。

### `children`

- **型:** `JSX.Element`
- **省略可能:** はい

`style` 要素の CSS テキストです。
`textContent` 経由で適用されるため、常にエスケープされます — これを通じてマークアップを注入することはできません。
リアクティブな式を指定できます。

### `key`

- **型:** `string`
- **省略可能:** はい

重複排除に使われるデフォルトの identity を上書きします。

## 動作

- key なしの `<Style>` インスタンスは追加専用です: それぞれが独自の要素を追加し、アンマウントすると削除されます。
- 置き換え可能にするには `key` を指定します — 同じ `key` を持つ後の登録がそれを上書きし、アンマウントすると以前の本文が復元されます。

## 例

### 基本的な使い方

```tsx
import { Style } from "@solidjs/meta";

export default function Page() {
	return <Style>{`.hero { background: papayawhip; }`}</Style>;
}
```

### 置き換え可能なテーマのスタイル

```tsx
import { Style } from "@solidjs/meta";

export default function Theme(props: { accent: () => string }) {
	return <Style key="theme">{`:root { --accent: ${props.accent()}; }`}</Style>;
}
```

## 関連項目

- [`Stylesheet`](/reference/solid-meta/stylesheet)
- [`Script`](/reference/solid-meta/script)
