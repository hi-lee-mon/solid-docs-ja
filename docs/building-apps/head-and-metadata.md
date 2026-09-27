---
title: head とメタデータ
version: "2.0"
description: "各ページに、そのページを所有するコンポーネントから独自のタイトルとメタタグを与え、ページのアンマウント時にはレイアウトのデフォルトを復元し、読み込み中のデータからタイトルを読み取ります。"
---

ストアのすべての商品ページでブラウザータブのタイトルが同じ "Solid App" になっています。`<title>` が `Document.tsx` にしかないためです。
商品リンクをチャットに貼ると、どの商品でもプレビューには同じデフォルト画像が表示されます。
商品名を知っているコンポーネントは `<body>` の内側でレンダーされますが、その情報を必要とするタグは `<head>` にあり、コンポーネントはそこにレンダーできません。

このために、Solid は `@solidjs/web` に head レジストリを同梱しています。
コンポーネントはどこにいてもタイトルやメタタグを宣言でき、レジストリはそのタグをドキュメントの head に配置し、後のコンポーネントが同じタグを宣言したら置き換え、そのコンポーネントがアンマウントしたら元のものを復元します。
`@solidjs/meta` はこのレジストリをコンポーネントでラップしたものです。
`basic` と `fullstack` のプロジェクト構成には含まれています。`bare` プロジェクトでは次で追加します:

```package-install
@solidjs/meta
```

プロバイダーもセットアップも不要です。
ほとんどのアプリで必要なのは最初の2セクションだけです。デフォルトタイトルとページごとの上書き、ページあたり1、2個の `<Meta>` です。残りは、グルーピング、その内部のレジストリ、サーバーレンダリングでストリーミングされる内容を扱います。

## デフォルトとページごとの上書き

テンプレートがしているように `App` でデフォルトを設定し、ページで上書きします:

```tsx
// src/App.tsx
import { Title } from "@solidjs/meta";

<Title>Solid Store</Title>;
```

```tsx
// src/routes/products/[id].tsx
import { Title } from "@solidjs/meta";
import type { RouteProps } from "@solidjs/router";

export default function Product(props: RouteProps<"/products/:id">) {
	return (
		<>
			<Title>{`Product ${props.params.id} - Solid Store`}</Title>
			<h1>Product {props.params.id}</h1>
		</>
	);
}
```

`/products/mug` を開くと、タブには "Product mug - Solid Store" と表示されます。
独自の `<Title>` を持たないページに移動すると、再び "Solid Store" になります。
`/products/mug` から `/products/tee` に移動すると、タイトルはその場で更新されます。

この動作は3つのルールから生まれ、すべてのタグに適用されます。

後のものが勝つ。
タグには同一性があります。`<Title>` は常に同じ1つであり、`<Meta name="description">` はその `name` で識別されます。
ある同一性について最も最近マウントされたタグがドキュメントに残るため、`App` の後にマウントされたページの `<Title>` が勝ちます。

破棄で復元。
勝ったタグがアンマウントすると、前のものが戻ります。
商品ページを離れると、クリーンアップコードなしでストアのタイトルが復元されます。

更新はリアクティブ。
テキストの子要素や属性値はシグナルを読め、更新はオーバーライド順でのタグの位置を変えずにその場で適用されます。
パラメーターの変更は、新しいタイトルをマウントするのではなく、既存のタイトルを更新します。

各コンポーネントのリファレンスページに同一性のルールが記載されています。[`Title`](/reference/solid-meta/title) が最も単純です。

:::caution[レジストリが管理するタグは Document に置かない]
`Document.tsx` の静的な `<title>Solid App</title>` は、`<Title>` が1つもマウントされないレンダーのためのフォールバックであり、1つでもマウントされればレジストリが置き換えます。
他のタグはそのような扱いを受けません。

```tsx
// Avoid: a hardcoded description next to a rendered one
<head>
	<meta name="description" content="A store built with Solid" />
</head>
<Meta name="description" content={product().summary} />

// Prefer: one default rendered through the registry
<Meta name="description" content="A store built with Solid" />
<Meta name="description" content={product().summary} />
```

`Avoid` 版はドキュメントに `<meta name="description">` タグを2つ置いてしまいます。レジストリは自分が登録していない head タグには触れないためです。
`Prefer` 版は1つだけで、商品ページのものが勝ちます。
:::

### 読み込んだデータからタイトルを取る

タイトルは、まだ読み込み中のデータに依存することがよくあります。
他の非同期の値と同じように読み取ります:

```tsx
import { Title } from "@solidjs/meta";
import { Loading, createMemo } from "solid-js";
import type { RouteProps } from "@solidjs/router";

export default function Product(props: RouteProps<"/products/:id">) {
	const product = createMemo(() => getProduct(props.params.id));
	return (
		<Loading fallback={<p>Loading…</p>}>
			<Title>{product().name}</Title>
			<h1>{product().name}</h1>
		</Loading>
	);
}
```

ストリーミング SSR では、シェルはフォールバックと `App` のデフォルトタイトルとともに送信され、商品が到着するとタイトルのパッチがコンテンツとともにストリーミングされます。
ブラウザーでも、データが届いたときに同じ読み取りがタイトルを更新します。
ここで `<Title>` に特別なことは何もありません。メモを読むコンポーネントにすぎません。

## その他のタグ

`Meta`、`Link`、`Style`、`Script`、`Base` も同じルールに従います:

```tsx
import { Link, Meta } from "@solidjs/meta";

<Link rel="canonical" href={`https://example.com${location.pathname}`} />
<Meta name="description" content={product().summary} />
<Meta property="og:image" content={product().image} />
```

すべてのコンポーネントは、デフォルトの同一性を上書きする `key` prop を受け付けます。
これを使えば、通常は別物のタグ同士を上書きさせたり、衝突するはずの同一性を分岐させたりできます:

```tsx
{/* These override each other despite different attributes: */}
<Meta key="social-image" name="twitter:image" content="/twitter.png" />
<Meta key="social-image" property="og:image" content="/og.png" />
```

## 関連タグをグループ化する

複数のタグが1つの置き換えセットを構成する場合は [`<Head>`](/reference/solid-meta/head) を使います。
同じ同一性を持つタグは、グループ内では共存できます。
後のグループは前のセットを1つの単位として置き換え、後のグループがアンマウントされると前のセットが復元されます。
グループの構成は、子タグのマウント・アンマウントに応じてリアクティブであり続けます。

このレイアウトは2つのデフォルトのソーシャル画像を提供します:

```tsx
import { Head, Meta } from "@solidjs/meta";

function SocialDefaults() {
	return (
		<Head>
			<Meta property="og:image" content="/default-wide.png" />
			<Meta property="og:image" content="/default-square.png" />
		</Head>
	);
}
```

商品ページは、マウントされている間、両方のデフォルトを置き換えられます:

```tsx
function ProductSocialTags(props: { image: string }) {
	return (
		<Head>
			<Meta property="og:image" content={props.image} />
			<Meta name="twitter:card" content="summary_large_image" />
		</Head>
	);
}
```

商品を開くと、2つのデフォルト画像は消え、商品画像とカードタイプに置き換わります。
ページを離れると、2つのデフォルトが戻ります。

内側の `<Head>` は独立したグループを開始します。
そのタグを周囲のグループに参加させたい場合は、子コンポーネントからはラップなしの `Meta` コンポーネントをレンダーします。

:::deep-dive[コンポーネントの下にあるレジストリ]
Solid Meta は `@solidjs/web` の `useHead` の薄いレイヤーであり、ライブラリーやアプリケーションは、ディスクリプターレベルの制御のためにそのプリミティブを直接呼び出せます:

```tsx
import { useHead } from "@solidjs/web";

function ProductDescription(props: { description: string }) {
	useHead({
		tag: "meta",
		props: {
			name: "description",
			content: () => props.description,
		},
	});

	return null;
}
```

配列を渡すと1つの置き換えグループとして登録され、関数を渡すとグループの構成がリアクティブになります。`<Head>` は、コンテキストから集めたグループでこの呼び出しを行うものです。
ディスクリプターは現在のオーナーの下に登録されるため、`useHead` を呼んだコンポーネントとともに破棄されます。
アプリケーションのメタデータには、JSX 内のコンポーネントの方が読みやすいでしょう。[`useHead`](/reference/solid-web/head/use-head) と [`HeadTag`](/reference/solid-web/head/head-tag) にディスクリプターの契約が記載されています。
:::

## サーバーレンダリング

Start モードのプロジェクトでは配線作業は不要です。生成されたエントリーが `Document` をレンダーし、レジストリがその `<head>` に書き込みます。
自作のサーバーエントリーでも `renderToStream` で同じ動作が得られ、ドキュメントを手で組み立てる場合は `onHead` レンダーオプションで head マークアップを受け取れます。

ワイヤー上では:

- 最初のフラッシュ時点で確定しているタグは `<head>` に挿入されます。`<base>` と `<meta charset>` は `<head>` が開いた直後、リソースリンクは早め、その他はその後に続きます。
- 後で確定する `Loading` バウンダリの下に登録されたタグは、パッチとしてストリーミングされ、バウンダリが表示されるときに適用されます。上記のデータ駆動タイトルはこうして動作しています。
- クライアントでは、ハイドレーションがサーバーレンダーされた head タグをその場で引き継ぐため、読み込み時の削除・再挿入によるちらつきはありません。

## よくある問題

### 新しいページの読み込み中もタイトルが前のページのまま

新しいページの `<Title>` が保留中のデータを読んでいるため、更新はページの他の部分とともに保留され、前の勝者が残ります。
これはコンテンツが受けるのと同じ[保留された更新](/concepts/async-reactivity#settled-view-and-in-flight-work)です。
タイトルがそのデータを必要としないなら、それを読まないページの部分から `<Title>` をレンダーしてください。

### 1つのはずの `og:image` タグが2つ現れる

`<Meta name="og:image">` と `<Meta property="og:image">` は異なる同一性を持ちます。
Open Graph には `property` を使うか、両方に同じ `key` を与えてください。

### コンソールに `Multiple <title> tags in one head group; the last one wins`

同じ `<Head>` グループ内に2つの `<Title>` コンポーネントがレンダーされています。
`<title>` は `key` で分岐できない単一の同一性を持つため、ドキュメントには最後の1つだけが残ります。
グループごとに `<Title>` は1つにしてください。

### ページから離れてもメタタグが残る

コンポーネントのオーナーの外で `useHead` に登録されたため、破棄するものがありません。
コンポーネントの内側、またはオーナーのあるスコープから登録してください。

### ページが1つを上書きするとレイアウトのデフォルトが消える

レイアウトが `<Head>` グループでタグをレンダーしており、ページがグループ全体を置き換えたためです。
ページが1つずつ上書きすべき場合は、デフォルトをラップなしのコンポーネントとしてレンダーしてください。

## まとめ

- `<Title>` と `<Meta>` は値を知っているコンポーネントからレンダーします。プロバイダーはありません。
- ある同一性で最も最近マウントされたタグが勝ち、それがアンマウントされると前のものが復元されます。
- タグ内では他のコンポーネントと同じようにシグナルや非同期の値を読みます。保留中の値はページの他の部分とともにタイトルを保留します。
- `Document.tsx` に置くのは、静的な `<title>` フォールバック、charset、レジストリが管理しないタグだけにします。
- `key` を使って、別物のタグに同一性を共有させたり、衝突する同一性を分割したりします。
- タグをセットとして置き換え・復元する必要があるときは `<Head>` で囲み、ページが1つずつ上書きすべきときはラップなしでレンダーします。
- ストリーミング SSR では、確定済みのタグはシェルで配信され、遅いタグはそのバウンダリとともにパッチで適用されます。

## 次のステップ

- [サーバー関数](/building-apps/server-functions): タイトルが読む商品をサーバーから読み込み、読み取りをブラウザーバンドルから外します。
- [レンダリングと SSR](/concepts/rendering-and-ssr#who-owns-the-document): 別のホストがドキュメントを所有する場合の `onHead` の用途です。
- [Solid Meta 0.x からの移行](/migration/from-solid-meta): プロバイダーベースのバージョンからの変更点です。
