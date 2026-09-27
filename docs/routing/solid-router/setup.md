---
title: "セットアップ"
version: "2.0"
description: "Solid Router のないプロジェクトに追加し、アプリケーションルートにルーターを1つマウントして、ベースパス・ハッシュ履歴・プリロードのオプションを設定します。"
---

`bare` シェイプから作成したプロジェクトは、ヘッダーに `<a href="/products/mug">` を持ち、クリックするとドキュメント全体がリロードされます。カートのシグナルはリセットされ、スクロール位置は失われ、ページが一瞬白くなります。
そのクリックを、アプリを維持したままのクライアントサイドナビゲーションに変えるのがルーターです。

`npm create solid` の `basic`・`fullstack` テンプレートは Solid Router のインストールとマウントが済んでいます。そのため、これらから始めた場合は、オプションを変更したくなったら [ルーターを設定する](#configure-the-router) に進んでください。
このページの残りでは、`bare` シェイプや既存の Vite アプリのように、ルーターのないプロジェクトにルーターを追加します。

## インストールしてルーターを作成する

パッケージをインストールします。

```sh
pnpm add @solidjs/router@next
```

ルートツリーを定義し、モジュールスコープでルーターを作成します。
これは [イントロダクション](/routing/solid-router#one-app-three-pages) と同じ `src/router.ts` です。

```tsx
// src/router.ts
import { lazy } from "solid-js";
import { createRouter } from "@solidjs/router";

export const Router = createRouter({
	routes: [
		{ path: "/", component: lazy(() => import("./pages/Home")) },
		{ path: "/products/:id", component: lazy(() => import("./pages/Product")) },
		{ path: "*404", component: lazy(() => import("./pages/NotFound")) },
	],
});

export const { paths } = Router;
```

[`createRouter`](/reference/solid-router/router-factory#createrouter) はプロバイダーコンポーネントと、アプリケーション全体で共有される静的なルーティングインスタンスの両方を返します。
インスタンスのメンバーである `routes`・`config`・`paths`・`match()` は、個々の訪問者の現在位置ではなくルートツリーを表します。
セッション固有の状態は、プロバイダー内のルーティングプリミティブから取得します。

## アプリケーションルートにマウントする

```tsx
// src/App.tsx
import { Loading } from "solid-js";
import { paths, Router } from "./router";

export default function App() {
	return (
		<Router>
			{(props) => (
				<>
					<header>
						<a href={paths()}>Store</a>
						<a href={paths.products("mug")}>Featured</a>
					</header>
					<Loading fallback={<main>Loading…</main>}>
						<main>{props.children}</main>
					</Loading>
				</>
			)}
		</Router>
	);
}
```

ここで **Featured** をクリックすると、リロードなしで URL が変わります。ヘッダーは自身の DOM と保持している状態を維持します。

関数 children はアプリのシェルです。
ルートマッチには一切含まれないため、アプリの存続中はずっとマウントされたままになり、マッチしたルートコンポーネントは `props.children` を通してレンダリングされます。
`Loading` バウンダリは、遅延ページやそのデータが保留中の間、最初のページロードにフォールバックを表示します。後続のナビゲーションでは、フォールバックを挟まず現在のページが画面に残ります。
ルーター設定にトップレベルの `preload` がある場合、その戻り値は `props.data` として利用できます。
start モードでは、生成されるクライアント・サーバーのエントリーが `src/App.tsx` をレンダリングするため、これでマウントは完了です。

:::pitfall[最初のルーターの中にもう1つのルーター]
独自のルートを持ちたいセクションに、独自の `<Router>` が置かれることがあります。

```tsx
// Avoid: a nested router fights the outer one for the URL
<Router>
	{(props) => <AdminRouter>{(admin) => admin.children}</AdminRouter>}
</Router>;

// Prefer: one route tree, with the section as a child route or a lazy subtree
export const Router = createRouter({
	routes: [
		{ path: "/", component: Home },
		{
			path: "/admin",
			component: AdminLayout,
			children: () => import("./admin/routes"),
		},
	],
});
```

`Avoid` 版を実行すると、開発環境は `Mounting a router inside another router is not supported. Compose route trees in one createRouter config instead.` と警告します。2つのルーターがそれぞれナビゲーションを支配しようとするため、リンククリックで古いコンテンツが表示されることがあります。
[遅延ルートサブツリー](/routing/solid-router/route-definitions#load-a-route-subtree-lazily) が、セクションが独自のルートファイルを持つための方法です。
:::

### start モードなしでマウントする

トランスフォームのみの Vite アプリケーションでは、クライアントエントリーから同じアプリケーションコンポーネントをレンダリングします。

```tsx
// src/index.tsx
import { render } from "@solidjs/web";
import App from "./App";

render(() => <App />, document.getElementById("app")!);
```

## ルーターを設定する

ほとんどのアプリは `routes` だけを渡します。
残りのオプションは、それぞれ特定の状況のために用意されています。

| オプション           | 使う場面                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base`              | アプリが `/app` のようなプレフィックス配下で配信される場合。マッチングと `paths` の両方がこれを含みます。                                             |
| `history`           | アプリが通常のページでない場合。Electron シェルや `file://` には `hashHistory()`、テストには `memoryHistory()` が必要です。                             |
| `preload`           | ルートレイアウトが独自のデータを必要とする場合。マウント時またはサーバーリクエストごとに1回実行され、関数 children に `props.data` として届きます。        |
| `preloadLinks`      | ホバー・フォーカスによるプリロードが得られるものよりコストがかかる場合。`false` に設定し、リンクごとの `preload="false"` でより細かく制御します。          |
| `explicitLinks`     | ルーター内の一部のアンカーをフルページロードのままにしたい場合。`link` 属性を持つアンカーだけがルーターに処理されます。                                  |
| `scrollRestoration` | アプリがスクロールを自前で管理する場合。`false` にすると、戻る・進むでルーターが位置を復元しなくなります（デフォルトはオン）。                              |
| `transformUrl`      | マッチングの前に入力パス名を書き換える必要がある場合。例えばロケールプレフィックスを取り除くときです。                                                  |
| `singleFlight`      | ルーターのサーバー関数データコンシューマーをオフにする場合。デフォルトは `true` です。                                                                |
| `actionBase`        | サーバーアクションがデフォルトの `/_server` 以外のプレフィックスから配信される場合。                                                                  |

ルーターはクライアントではデフォルトでブラウザー履歴を使い、サーバーでは現在のリクエスト URL を使うため、Web アプリで `history` が設定されることはほとんどありません。

```tsx
import { createRouter, hashHistory } from "@solidjs/router";

export const Router = createRouter({
	routes,
	history: hashHistory(),
	base: "/app",
});
```

:::advanced[サーバーと対になるオプション]
`singleFlight` と `actionBase` が意味を持つのは `fullstack` プロジェクトだけです。
前者はミューテーションレスポンスから `query` キャッシュへ値をシードするコンシューマーをオフにし、後者はサーバー関数エンドポイントが `/_server` から移された場合にそれと一致させる必要があります。
両方とも [サーバーレンダリングとハイドレーション](/routing/solid-router/server-rendering#one-round-trip-for-a-mutation) で説明しています。
:::

## よくある問題

### `'use' router primitives can be only used inside a Route`

`useNavigate`・`useLocation` などのルータープリミティブを呼ぶコンポーネントが `<Router>` の外側でレンダリングされています。例えば `App` 内のルーターの隣や、`Document.tsx` の中です。
すべてのルータープリミティブが使える関数 children の中にコンポーネントを移すか、必要な値を prop として渡してください。

### リンクをクリックしてもページがリロードされる

そのアンカーは `<Router>` の外側にあるか、`target` や `rel="external"` を持つか、別のオリジンを指しています。
`explicitLinks: true` の場合は、`link` 属性が欠けています。
ルーターがアンカーをそのまま素通りさせる属性の一覧は [ナビゲーションと型付きパス](/routing/solid-router/navigation#links-are-anchors) にあります。

## まとめ

- ルーターはモジュールスコープで一度だけ作成し、`Router` と `paths` を `src/router.ts` からエクスポートします。
- `<Router>` はアプリケーションルートに一度だけマウントします。関数 children がルートレイアウトです。
- `props.children` を `Loading` バウンダリで囲み、最初のロードにフォールバックを用意します。
- `<Router>` を別の `<Router>` の中にネストしないでください。1つのルートツリーにまとめ、セクションには遅延サブツリーを使います。
- `base`・`history`・プリロード系オプションに具体的な理由がない限り、`routes` だけを渡します。
- サーバー関数エンドポイントが `/_server` から移ったら、`actionBase` を合わせます。

## 次のステップ

- [ルート定義](/routing/solid-router/route-definitions): 渡した `routes` 配列のパスパターン・パラメーターフィルター・メタデータ・遅延サブツリー。
- [ネストルートとレイアウト](/routing/solid-router/nested-routes): 内側のページが変わってもマウントされたままになるレイアウト。
- [ナビゲーションと型付きパス](/routing/solid-router/navigation): リンク、型付き `paths`、検索パラメーター。
