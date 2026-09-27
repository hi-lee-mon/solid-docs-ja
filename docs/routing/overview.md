---
title: "ルーティング概要"
version: "2.0"
description: "Solid アプリで Solid Router と TanStack Router のどちらかを選び、App にルーターをマウントし、ルートを配列で与えるか src/routes 配下のファイルから与えるかを決めます。"
---

[クイックスタート](/getting-started/quick-start)のストアにはページが1つしかありません。
商品 id を URL に持つ商品ページ、`/cart` のカート、その下のページが切り替わっても画面上に残るヘッダーが必要です。そして、それらのページ間のクリックでドキュメントが再読み込みされてはいけません。

Solid はルーターを同梱しません。
ルーティングは統合です: ルーターが URL マッチング、ナビゲーション、マッチしたページのレンダーを担い、アプリケーションは他のコンポーネントと同じように、コンポーネントツリーの一部としてそれをレンダーします。
サポート対象のルーターは2つで、どちらも同じ方法でマウントします。
このページではどちらを選ぶかを決め、最小のルーティング済みアプリを示します。そこから先は各ルーターのページが引き継ぎます。

:::note[この2つ以外のルーターを組み込む場合]
別のルーターを start モードに統合する場合は、[ルーターを統合する](/routing/integrate-a-router)がリクエストパイプラインとシングルフライトの拡張ポイントを説明しています。
このページの内容はそのために必読ではありません。
:::

## ルーターを選ぶ

他のものを使う理由がなければ、Solid Router を使います。
Solid のリアクティビティモデルのために作られています: ルートパラメータとロケーションはリアクティブな値で、`query()` と `action()` はサーバー関数の薄いラッパーで、フォームは JavaScript がロードされる前に送信でき、シングルフライトミューテーションはデフォルトで動きます。
CLI テンプレートが使うファイルシステムアダプターも同梱しているため、ルートは `src/routes` 配下のファイルになります。
`basic` と `fullstack` のプロジェクト形状がこれをインストールします。

すでに TanStack Query の上に構築している場合、その型付き検索パラメータスキーマとローダーモデルが必要な場合、あるいは別フレームワークの TanStack アプリとルーティング規約を共有する場合は、TanStack Router を使います。
その代わり、他の Solid テンプレートと共有されるファイルシステム規約は捨てることになり、サーバーとクライアント間のデータキャッシュの受け渡しは自分で管理します。これは [TanStack Router](/routing/tanstack) のページで説明しています。
`fullstack-tanstack` のプロジェクト形状がこれをインストールします。

`bare` の形状にはルーターがありません。単一ページのツールや、後からルーターを追加するプロジェクト向けです。

## 最小のルーティング済みアプリ

これはコメントを取り除いた `basic` テンプレートです。
ルーターはモジュールスコープで1回だけ作成されます:

```ts
// src/router.ts
import { pageRoutes } from "virtual:file-routes";
import { createRouter } from "@solidjs/router";
import { fileRoutes } from "@solidjs/router/fs";

export const Router = createRouter({ routes: fileRoutes(pageRoutes) });

export const { paths } = Router;
```

そして `App` にマウントされ、マッチしたページは `props.children` を通してレンダーされます:

```tsx
// src/App.tsx
import { Loading } from "solid-js";
import { paths, Router } from "./router";

export default function App() {
	return (
		<Router>
			{(props) => (
				<>
					<nav>
						<a href={paths()}>Home</a>
						<a href={paths.users(1)}>Users</a>
					</nav>
					<Loading fallback={<main>Loading…</main>}>{props.children}</Loading>
				</>
			)}
		</Router>
	);
}
```

実行して **Users** をクリックしてください。
URL が `/users/1` に変わり、`<nav>` の下のページが切り替わりますが、`<nav>` 自体はそのままです。ドキュメントは再読み込みされていません。

`src/routes` 配下でデフォルトエクスポートを持つ各ファイルが1つのページです。
`paths` はルートツリーから URL を構築するため、`paths.users(1)` は型チェッカーで検査され、存在しないルートへのリンクはコンパイルに失敗します。
`props.children` を囲む `Loading` バウンダリは初回ロードにフォールバックを与えます。次のページのデータが届くまで更新が保留されるため、以降のナビゲーションではフォールバックなしに現在のページが画面に残ります。
[Solid Router のセットアップページ](/routing/solid-router/setup)では、ファイルシステムアダプターの代わりにインメモリのルートツリーを使う同じアプリを示しています。

## `App` にルーターをマウントする

`@solidjs/vite-plugin` の start モードは、生成されるエントリーのルートコンポーネントとして `src/App.tsx` を使います。
サーバーサイドレンダリング（SSR）が有効な場合、生成されるサーバーエントリーとクライアントエントリーの両方が `src/Document.tsx` 内で `App` をレンダーします。
両方のエントリーが同じルータールートを使うよう、ルーターまたはそのプロバイダーを `App` にマウントします。

サイト全体のプロバイダーはルーターを包めます。
共有レイアウトはルーターの内側、ルーターの関数としての children かレイアウトルートに置きます。そうするとロケーションを読めます:

```tsx
// Avoid: the header is outside the router, so it cannot read the location or mark the active link
<>
	<Header />
	<Router>{(props) => props.children}</Router>
</>

// Prefer: the header is in the router's function child, where router primitives work
<Router>
	{(props) => (
		<>
			<Header />
			{props.children}
		</>
	)}
</Router>
```

`Avoid` 版を `Header` 内で `useLocation()` を呼ぶ状態で実行すると、`<A> and 'use' router primitives can be only used inside a Route.` とスローされます。
`Prefer` 版はアプリの存続期間中 `Header` をマウントしたままにし、すべてのルータープリミティブへのアクセスを与えます。

:::caution[アプリにつきルーターは1つ]
Solid Router は `<Router>` の内側に別の `<Router>` を置くことをサポートしていません。開発時には `Mounting a router inside another router is not supported.` と警告されます。
代わりに1つのルートツリーを構成し、必要に応じてロードすべき大きなセクションは[遅延サブツリー](/routing/solid-router/route-definitions#load-a-route-subtree-lazily)に分割します。
:::

## ルートの定義方法を選ぶ

プラットフォームはルート定義やファイル命名を規定しません。
ルーターは、手書きのルート配列、自身が生成したルートツリー、あるいはファイルシステムルーティングプラグインのマニフェストを消費できます。

Solid Router では、どちらの形式も同じルートオブジェクトを生成するため、判断基準はルートツリーをどこで読みたいかです:

- `src/router.ts` の手書き配列はすべてのパスを1つのファイルに収め、プラグインも不要です。
  フィールドは[ルート定義](/routing/solid-router/route-definitions)で説明しています。
- `filesystem-routing` Vite プラグインは `virtual:file-routes` を通じてマニフェストを公開し、`@solidjs/router/fs` の `fileRoutes` がその `pageRoutes` エクスポートをルート定義へ変換します。
  パスはファイル名に表れるため、ページの追加はファイルの追加です。
  テンプレートはこの方法を使っています。

TanStack Router は `@tanstack/router-plugin` を使って `src/routes` から独自の型付きルートツリーを生成します。
`fullstack-tanstack` テンプレートが `src/api` に対して行うように、アプリケーションは別ディレクトリの HTTP ハンドラーに `virtual:file-routes` を使うこともできます。

## まとめ

- TanStack Query の上に構築しているか、TanStack アプリとルーティングを共有するのでなければ、Solid Router を使います。
- ルーターはモジュールスコープで1回だけ作成し、`Router` と `paths` を `src/router.ts` からエクスポートします。
- 生成されるクライアントエントリーとサーバーエントリーが同じツリーをレンダーするよう、`src/App.tsx` にルーターをマウントします。
- 共有レイアウトはルーターを囲むのではなく、ルーターの関数としての children の内側に置き、ルータープリミティブを使えるようにします。
- `props.children` を `Loading` バウンダリで囲み、初回ロードにフォールバックを持たせ、以降のナビゲーションで現在のページを維持します。
- URL は文字列リテラルではなく `paths` で構築し、移動したルートを型チェッカーが検出できるようにします。
- ファイルシステムアダプターか `src/router.ts` の手書き配列かを選びます。それ以外はどちらでも変わりません。

## 次のステップ

- [Solid Router](/routing/solid-router): 小さなストアをページごとに作り上げた後、ルート、レイアウト、ナビゲーション、データロードを掘り下げます。
- [TanStack Router](/routing/tanstack): `fullstack-tanstack` テンプレートがサーバーとクライアント間で TanStack Query キャッシュを受け渡す方法。
- [アプリ構造](/building-apps/app-structure): 生成されるエントリーが `App` と `Document` に何をするか、いつそれらを変更するか。
- [ルーターを統合する](/routing/integrate-a-router): Solid が同梱しないルーターのための、リクエストパイプラインとシングルフライトフック。
