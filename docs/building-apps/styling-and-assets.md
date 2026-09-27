---
title: "スタイリングとアセット"
version: "2.0"
description: "グローバル CSS・CSS モジュール・Tailwind・インラインのスタイルオブジェクトでコンポーネントにスタイルを当て、文字列を組み立てずにクラスを切り替え、ビルド後の URL がハッシュ化されるように画像を参照します。"
---

商品カードには枠線が必要で、ヘッダーにはストアのロゴが必要です。
Vite のシングルページアプリなら、`index.html` に `<link rel="stylesheet">` を置き、`<img src="/src/logo.svg">` と書くのが定石です。
start モードのプロジェクトには `index.html` がなく、本番では `src/` が配信されないため、この定石には置き場所がありません。

代わりに、すべては import を通してページに届きます。
スタイルシートを import すれば Vite がビルドに含め、画像を import すればその import がハッシュ化された最終 URL になります。
Solid はこのパイプラインに何も追加しません。Solid が追加するのは、その結果を適用する `class` と `style` の props です。

ほとんどのアプリで必要なのは最初の2つのセクションです。レイアウトとタイポグラフィ用のグローバルスタイルシートが1つと、コンポーネントごとの CSS モジュールです。
このページの残りでは、他の手法と、固定 URL を維持しなければならないファイルの置き場所を説明します。

## スタイリング手法を選ぶ

### グローバル CSS

どのテンプレートも、副作用として1つのスタイルシートを import します:

```tsx
// src/App.tsx
import "./App.css";
```

そのルールはドキュメント全体に適用されます。
どこから import してもスコープは限定されません。あるルートモジュールから import したスタイルシートも、そのモジュールが読み込まれた後はすべてのページに適用されます。
リセット、タイポグラフィ、レイアウトに使います。

### CSS モジュール

ファイル名を `*.module.css` にして、クラスマップを import します:

```css
/* src/components/ProductCard.module.css */
.card {
	border-radius: 0.5rem;
	padding: 1rem;
}
```

```tsx
// src/components/ProductCard.tsx
import styles from "./ProductCard.module.css";

export function ProductCard(props: { name: string }) {
	return <article class={styles.card}>{props.name}</article>;
}
```

レンダーされた `<article>` を検査すると、そのクラスは `card` ではなく生成された名前になっています。
2つのコンポーネントがそれぞれ `.card` ルールを持っても衝突しません。これが、コンポーネント単位のスタイルでこの手法がデフォルトになっている理由です。

### Tailwind

Tailwind は専用の Vite プラグインを通じて動作し、Solid 固有の設定は不要です。
`with-tailwindcss` テンプレートはそのプラグインと1つの import を追加します:

```ts
// vite.config.ts
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	plugins: [solid({ start: true }), fileRoutes(), tailwindcss()],
});
```

```css
/* src/App.css */
@import "tailwindcss";
```

### Sass とその他のプリプロセッサー

コンパイラをインストールして拡張子を変えます。
`with-sass` テンプレートは `App.css` を `App.scss` にリネームして import を更新します。`*.module.scss` ならプリプロセッサーと CSS モジュールを組み合わせられます。
プリプロセッサーはビルド時に実行され、ブラウザーには何も送られません。

## 条件付きクラスとインラインスタイル

どの手法でクラス名を用意しても、`class` prop はオブジェクトまたは配列を受け取れるため、コンポーネントは文字列を組み立てずにクラスを切り替えられます:

```tsx
// Avoid: a string is replaced as a whole on every change
<li class={`${styles.row} ${props.selected ? styles.selected : ""}`}>…</li>

// Prefer: an object toggles the affected tokens
<li class={{ [styles.row]: true, [styles.selected]: props.selected }}>…</li>
```

`Avoid` のバージョンでは、`props.selected` が変わるたびに `class` 属性全体が書き換えられます。
オブジェクト形式なら、Solid は `selected` トークンだけを追加・削除します。

文字列は完全な値として適用され、オブジェクトは値が truthy のキーをそれぞれ追加し、配列はこの2つを組み合わせます:

```tsx
<button class={["btn", { "btn-primary": props.primary }]}>Add to cart</button>
```

`style` は CSS 宣言のオブジェクトを受け取り、変化した宣言だけを更新します:

```tsx
<div style={{ width: `${progress()}%`, "background-color": color() }} />
```

どちらの props も、関数や追跡対象の値を渡すとリアクティブに読み取られます。
[`class`](/reference/solid-web/jsx-properties/class) と [`style`](/reference/solid-web/jsx-properties/style) のリファレンスページでは、ストアとの相互作用を含めてオブジェクト形式を詳しく説明しています。

## 画像とその他のファイル

コードがその URL を必要とするときは、ファイルを import します:

```tsx
import logo from "../logo.svg";

<img src={logo} alt="Store logo" />;
```

ビルドされたページでは、`src` は `/assets/logo-BKhbptE1.svg` のようなパスになります。
Vite はファイルをハッシュ化して `dist/client` に出力するため、ロゴが変わると新しい URL になり、古いものをキャッシュが配信することはありません。

:::tip[テンプレートでは小さな画像もファイルのままです]
テンプレートでは `build.assetsInlineLimit: 0` が設定されているため、アイコンや小さな画像は JavaScript に `data:` URL としてインライン化されず、ファイルのままになります。
アイコンをインライン化したい場合は、この設定を外してください。
:::

Vite が通常は処理するものを URL として import したい場合（注入ではなくリンクしたいスタイルシートなど）は `?url` を付けます:

```tsx
import themeHref from "./theme.css?url";

<link rel="stylesheet" href={themeHref} />;
```

固定のハッシュ化されないパスが必要なファイルは `public/` に置き、ルート相対 URL で参照します。
`basic` テンプレートは `favicon.ico` をそこに置き、`public/users.json` を `/users.json` として取得します:

```tsx
<link rel="icon" href="/favicon.ico" />
```

`public/` は、外部が名前で見つけるものに使います。`robots.txt`、well-known ファイル、メールから参照される画像などです。
それ以外はすべて import します。

遅延ルートモジュールが import したスタイルシートは、そのモジュールのチャンクと一緒に読み込まれます。
JavaScript が届く前にスタイルが当たっていなければならないページでは、常に読み込まれるモジュールから CSS を import するか、[head メタデータ](/building-apps/head-and-metadata)を通して `<link>` を追加します。

:::deep-dive[ストリーミング SSR でスタイルが行き着く先]
本番では、`App` と `Document` から到達可能な CSS がアセットファイルにビルドされ、生成されたハンドラーがドキュメントの head にそれらの `<link rel="stylesheet">` タグを書き込むため、ブラウザーが最初に受け取る HTML にはすでにスタイルへの参照が含まれています。
import したアセットの URL はハッシュ化された出力を指します。

開発時は、最初のペイントにスタイルが当たるように dev サーバーが到達可能な CSS をサーバーレンダーされたページにインライン化し、その後 Vite のクライアントがホット更新のために引き継いで、サーバーレンダー側のコピーは除去されます。
この引き継ぎの間、インスペクターに同じファイルの `<style>` 要素が一時的に2つ見えることがありますが、これは想定どおりです。
:::

## よくある問題

### CSS モジュールのクラスが `undefined` になる

ファイル名が `*.module.css` になっていないか、クラス名が有効な識別子ではありません。
`styles["product-card"]` は動作しますが、`styles.product-card` は動作しません。

### あるページのスタイルが別のページに漏れる

そのスタイルシートは、ルートモジュールから import されたグローバル CSS です。
CSS モジュールに切り替えるか、セレクターをページ単位のクラスの下にスコープしてください。

### import した画像が `data:` URL になる

インライン化できるほど小さい画像です。
テンプレートと同様に `build.assetsInlineLimit: 0` を設定するか、`public/` に移してください。

### `public/` のファイルが本番で 404 になる

ホストがそのパスに対して `dist/client` を配信していません。
[デプロイ](/building-apps/deployment#a-public-file-404s-in-production)で、各ホストが静的ファイルをどうマッピングするかを説明しています。

## まとめ

- スタイルシートと画像は import します。リンク元となる `index.html` はなく、本番では `src/` は配信されません。
- リセットとレイアウトにはグローバルスタイルシートを1つ、衝突しない名前にはコンポーネントごとの `*.module.css` を使います。
- `class` にはオブジェクトか配列を渡して名前を切り替えます。文字列は変更のたびに全体が置き換えられます。
- `style` には宣言のオブジェクトを渡します。変化した宣言だけが書き込まれます。
- import したファイルの URL はハッシュ化されるため、変更されたファイルがキャッシュから配信されることはありません。
- アプリ外の何かが固定名を必要とするときだけ、ファイルを `public/` に置きます。
- 遅延ルートが import したスタイルシートはそのルートと一緒に読み込まれます。先に必要な場合は常に読み込まれるモジュールから import します。

## 次のステップ

- [head とメタデータ](/building-apps/head-and-metadata): ページが自分で追加するスタイルシートリンクやその他の head タグ。
- [デプロイ](/building-apps/deployment): ビルドされたアセットの出力先と、各ホストが `dist/client` をどう配信するか。
- [`class`](/reference/solid-web/jsx-properties/class) と [`style`](/reference/solid-web/jsx-properties/style): オブジェクト・配列形式と、ストアとの相互作用。
