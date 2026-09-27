---
title: "ref"
category: "JSX プロパティ"
use_cases: "DOM 要素へのアクセス、要素ディレクティブの合成"
tags:
  - "ref"
  - "jsx"
  - "dom"
  - "directives"
  - "reference"
  - "v2"
version: "2.0"
description: "DOM 要素を受け取るか、要素に振る舞いを適用する複数のコールバックを合成します。"
source_repo: "ryansolid/dom-expressions"
source_ref: "next"
source_path: "packages/runtime/src/client.js"
---

`ref` は、Solid が作成した DOM 要素へのアクセスを提供します。
代入可能な変数、コールバック、またはコールバックのネストした配列を受け取ります。

## 型

```ts
type RefCallback<T> = (element: T) => void;
type Ref<T> = T | RefCallback<T> | undefined | Ref<T>[];
```

`ref` は組み込み DOM 要素で利用できます。
インポートは不要です。

## 要素を代入する

代入可能な変数を渡して要素を格納します:

```tsx
function SearchField() {
	let input!: HTMLInputElement;

	return (
		<>
			<input ref={input} type="search" />
			<button type="button" onClick={() => input.select()}>
				Select query
			</button>
		</>
	);
}
```

コールバックも同じ要素を受け取ります:

```tsx
<input ref={(element) => (input = element)} />
```

## コールバックを合成する

複数の独立した振る舞いが要素を必要とする場合は配列を渡します:

```tsx
function autofocus(element: HTMLInputElement) {
	element.autofocus = true;
}

<input
	ref={[(element) => (input = element), autofocus, registerAnalytics("search")]}
/>;
```

Solid はネストした ref 配列を再帰的に平坦化し、各コールバックを順に呼び出します。
これにより、ラッパーコールバックなしで要素アクセス・再利用可能なディレクティブ・サードパーティ統合を合成できます。

## オーナーシップとクリーンアップ

ref コールバックは追跡されず、リアクティブオーナーなしで実行されます。
その戻り値は無視されます。
ref コールバック内でオーナーを持つリアクティブプリミティブを作成したり、クリーンアップ関数を返したりしないでください。

再利用可能なディレクティブがセットアップとクリーンアップを必要とする場合は、オーナーを持つファクトリー内でそれらのプリミティブを作成し、要素を受け取るコールバックだけを返してください。
完全なパターンは [ref とディレクティブ](/concepts/components-and-jsx#refs-and-directives) を、ref を通じて駆動するチャート・マップ・Web コンポーネントの例は [非 Solid コードの統合](/guides/integrate-non-solid-code) を参照してください。
