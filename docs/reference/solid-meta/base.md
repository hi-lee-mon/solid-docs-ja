---
title: Base
order: 7
use_cases: >-
  ベース URL、相対 URL の解決、ドキュメントの base
tags:
  - base
  - head
  - url
  - component
version: "1.0"
source_repo: "solidjs/solid-meta"
source_ref: "next"
source_path: "src/index.ts"
description: >-
  Base はサーバーレンダリング中に Solid Meta を通じてドキュメントのベース URL を設定します。
---

`Base` はドキュメント内のすべての相対 URL のベースとなる URL を指定する [`<base>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base) 要素を追加します。

## インポート

```tsx
import { Base } from "@solidjs/meta";
```

## 型

```tsx
const Base: Component<JSX.BaseHTMLAttributes<HTMLBaseElement>>;
```

## Props

[`<base>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base) の属性（`href`、`target`）を受け取ります。

## 動作

- **サーバーのシェルのみ。**
  `<base>` には厳格な配置制約があります — 相対 URL が解決されるより前に出現する必要がある — ため、最初のサーバーフラッシュで head のプリリュードにレンダーされます。
- シェルがフラッシュされた後に届いた登録は開発時警告とともに無視され、クライアントでも `Base` は（開発時警告とともに）無視されます。相対 URL の解決後に変わる base は定義上、一貫性を持ち得ません。
- `Base` は `key` を受け取らず、カスケード・復元のセマンティクスにも参加しません。

## 例

### 基本的な使い方

```tsx
import { Base } from "@solidjs/meta";

export default function App() {
	return <Base href="https://example.com/app/" target="_blank" />;
}
```

## 関連項目

- [`Link`](/reference/solid-meta/link)
- [`Meta`](/reference/solid-meta/meta)
