---
title: "ナビゲーションと型付きパス"
version: "2.0"
description: "素の anchor でページ間をリンクし、コンパイラがチェックする URL を構築し、コードからナビゲートし、ロケーションと検索パラメータを読み取り、アクティブ・保留中のリンクを表示し、ページからの離脱をガードします。"
---

新しいルーターで最初に探すのは `<Link>` コンポーネントですが、Solid Router にはそれがありません。
リンクは `<a>` であり、ルーターは自身の内側にある同一オリジンの anchor へのクリックをクライアントサイドのナビゲーションに変えます。
この選択がこのページ全体を形づくっています。URL が API であり、ルーターの役割は、正しい URL を構築し、ユーザーがいる URL に反応するのを助けることです。

例は[概要](/docs/routing/solid-router/index.md)のストアを引き続き使います。

## リンクは anchor

```tsx
<nav>
	<a href={paths()}>Store</a>
	<a href={paths.products("mug")}>Featured</a>
	<a href="https://github.com/solidjs/solid">Source</a>
</nav>
```

**Featured** をクリックすると商品ページがドキュメントのリロードなしでレンダーされます。**Source** をクリックすると、ブラウザは他の anchor と同様に GitHub へ移動します。
ルーターが処理するのは最初の2つで、3つ目は別オリジンのためそのままにします。
`target`、`rel="external"`、`download` 属性、HTTP 以外のスキームを持つ anchor も同様にそのままにします。
ブラウザが「このページを離れる」と扱うものは、従来どおりページを離れます。

anchor であるため、リンクは JavaScript がロードされる前でも、リーダーモードでも、新しいタブで開いた場合でも機能し、すべてのアクセシビリティツールがすでにそれを理解しています。

いくつかの属性で、ルーターがリンクをどう扱うかを調整できます:

- `replace` は履歴エントリーを push する代わりに、現在のエントリーを置き換えます。
- `noScroll` はナビゲーション後もスクロール位置を維持します。
- `state` は遷移先の `location.state` に渡す JSON 値を指定します。
- `preload="false"` はこのリンクのホバー時のルートデータプリロードをスキップします。コードチャンクの事前ロードは継続されます。
- `link` は `explicitLinks: true` が設定されている場合に、ほとんどの anchor をフルページロードのままにしたいアプリで、その anchor をルーター向けにマークします。

## `paths` で URL を構築する

リンクを書くときに手が伸びがちなのは、アドレスバーに見える文字列です:

```tsx
// Avoid: a string the type checker cannot connect to a route
<a href={"/products/" + product.id}>{product.name}</a>

// Prefer: a node from the route tree
<a href={paths.products(product.id)}>{product.name}</a>
```

今は両者とも同じ `href` をレンダーします。
ルートを `/catalog/:id` にリネームすると、`Avoid` 版は何も報告されないまま `*404` ページへのリンクになり、`Prefer` 版はすべての呼び出し箇所が更新されるまでコンパイルが通りません。

`paths` はルートツリーから推論されるプロキシです:

```tsx
paths(); // "/"
paths.products("mug"); // "/products/mug"
paths.account.orders(42); // "/account/orders/42"
paths.search({ q: "mug", page: 2 }, "results"); // "/search?q=mug&page=2#results"
```

プロパティアクセスは静的セグメントを追加し、呼び出しはそのセグメントのパラメータを束縛します。
パラメータの後には、URL の構造をなぞらえて、省略可能な検索オブジェクトと省略可能なハッシュ文字列が続きます。

すべてのノードは `href`、`navigate()`、`redirect()` に渡されると文字列に変換されるため、静的ルートは `paths.account()` ではなく `paths.account` と書きます。
引数なしでノードを呼び出すのは、API がプレーンな `string` を要求する場合のみです。

型はルート定義に従います:

- `matchFilters: { id: int }` は `paths.products(id)` が数値を受け付けるようにします。
  コンポーネントは引き続き `params.id` を文字列として受け取ります。URL が保持するのは文字列だからです。
- ルートの `search` スキーマは、パスの末端が受け付ける検索オブジェクトの型を決めます。[後述](#type-search-parameters)で説明します。

## コードからナビゲートする

ナビゲーションがインターフェース上のリンクであるなら anchor を使います。
フォームの保存やタイムアウトなど、他の何かの結果であるなら `useNavigate` を使います:

```tsx
import { useNavigate } from "@solidjs/router";
import { paths } from "../router";

function CheckoutButton() {
	const navigate = useNavigate();

	return (
		<button onClick={() => navigate(paths.checkout, { replace: true })}>
			Check out
		</button>
	);
}
```

ボタンをクリックすると URL は `/checkout` になり、カートページの履歴エントリーが置き換えられるため、**戻る**はカートではなくカートの前のページに戻ります。

オプションはリンク属性と同じです。`replace`、`scroll`、`state` に加えて、相対文字列の解釈方法を決める `resolve` があります。
`/` で始まる文字列はルーターの `base` の下で解決されます。それ以外の文字列は相対 URL のように現在のロケーションに対して解決されます。
数値は履歴を移動します。`navigate(-1)` は戻るです。

:::tip[行き先はサーバーに決めさせる]
ナビゲーションで終わるミューテーションに `useNavigate` は不要です。
サーバー関数やアクションから `redirect(paths.account.orders(id))` を返すと、レスポンスが届いたときに、再検証と同じ更新内でルーターがナビゲートします。その経路は[データ](/docs/routing/solid-router/data.md#what-revalidates-after-a-mutation)ページで説明しています。
:::

## ロケーションを読み取る

`useLocation()` はユーザーがどこにいるかを表すリアクティブなオブジェクトを返します:

```tsx
const location = useLocation();

location.pathname; // "/products/mug"
location.search; // "?ref=home"
location.query; // { ref: "home" }
location.hash;
location.state;
location.key; // changes on every navigation
```

各フィールドは個別にリアクティブです。
`location.pathname` を読むメモは、ハッシュだけが変わっても再実行されません。

`useParams()` は現在のマッチのマージ済みパラメータを返し、型付きパスを渡すとキーが絞り込まれます:

```tsx
const params = useParams(Router.paths.products);
params.id; // string
```

ルートコンポーネント内では、`props.params` は同じオブジェクトで、コンポーネントが `RouteProps` で宣言されていればすでに型付きです。

## 検索パラメータに型を付ける

検索パラメータは、リフレッシュを生き残り共有可能であるべき状態（フィルター、ソート順、ページ番号）の置き場所として適しています。
`useSearchParams` で読み書きします:

```tsx
const [search, setSearch] = useSearchParams();

<button onClick={() => setSearch({ page: Number(search.page || 1) + 1 })}>
	Next page
</button>;
```

**Next page** をクリックすると URL に `?page=2` が付き、ページはスクロールせず、リフレッシュでも同じページの結果に着地します。
`setSearch` は現在のクエリ文字列にマージして、スクロールなしでナビゲートします。
キーに `""`、`undefined`、`null` を設定すると、そのキーは削除されます。

スキーマがなければすべての値は文字列か文字列の配列で、`Number(search.page || 1)` は自分で行います。
ルートに `search` スキーマ（任意の同期的な Standard Schema バリデーター）を与え、パスノードを渡すと、パース済みの型付き値が得られます:

```tsx
// src/router.ts
import * as v from "valibot";

{
	path: "/search",
	search: v.object({
		q: v.optional(v.string(), ""),
		page: v.optional(v.pipe(v.unknown(), v.transform(Number)), 1),
	}),
	component: Search,
}
```

クエリ文字列は文字列しか保持できないため、スキーマが `"2"` を `2` に変換する場所です。素の `v.number()` ではすべての値が拒否されてしまいます。

```tsx
// src/pages/Search.tsx
const [search, setSearch] = useSearchParams(Router.paths.search);

search.page; // number
setSearch({ page: search.page + 1 });
```

ルーターは現在のマッチに含まれるすべてのルートのスキーマをルートから葉へ実行し、パース結果を生の値にマージします。
issues を報告したスキーマはその読み取りではスキップされるため、ページがスローする代わりに生の文字列が残ります。

:::caution[スキーマは同期的に実行される]
非同期スキーマは `Async Standard Schema validation is not supported for search params` をスローします。
検索スキーマは同期的なパースと型変換に留めてください。検証にサーバーへの往復が必要な値は、検索パラメータではなくクエリです。
:::

## アクティブ・保留中のリンクを表示する

データの準備に少し時間がかかるページへのリンクをクリックしたときを考えます。
現在のページは画面に残り、クリックされたリンクは遷移先の準備ができるまで `data-pending` 属性を持ちます。
これは[非同期リアクティビティ](/docs/concepts/async-reactivity.md#settled-view-and-in-flight-work)で説明している保留された更新の、目に見える側面です。ローディングスピナーが一切ないアプリでもレスポンシブに感じられるのはそのためです。リンク自体が何かが起きていることを示します。

ルーターは処理する anchor に3つの属性を設定します:

- `aria-current="page"` — 完全一致の場合。
- `data-active` — 完全一致または子孫一致の場合。`/account/orders/42` では Account リンクがアクティブになります。
- `data-pending` — 進行中のナビゲーションの対象。

コンポーネントコードなしで CSS でスタイルを設定できます:

```css
nav a[aria-current="page"] {
	font-weight: 600;
}

nav a[data-active] {
	color: var(--accent);
}

a[data-pending] {
	opacity: 0.6;
	cursor: progress;
}
```

ルートパス `/` は完全一致のときだけアクティブです。さもなければすべての場所でアクティブになってしまいます。

anchor でないコンポーネント、あるいは JSX 内で状態が必要な anchor には、`useLinkState` が同じ3つをアクセサーとして返します:

```tsx
import { useLinkState } from "@solidjs/router";

function Tab(props: { href: string; children: JSX.Element }) {
	const state = useLinkState(() => props.href, { end: true });

	return (
		<a href={props.href} data-selected={state.current() || undefined}>
			{props.children}
		</a>
	);
}
```

`end: true` は完全一致、`data-active` のルールではなく `aria-current` のルールを要求します。

## ナビゲーションを監視・ガードする

`useIsRouting()` はナビゲーションがルートの処理を待っている間 true です。
ページ上部のプログレスバーに使います。単一のリンクには `data-pending` がすでにあります。

`useMatch(() => pattern)` は対応するルートがなくても現在のパス名に対してパターンをテストします。`useRouteMatches()` はマッチしたルート定義を `info` とともに返し、パンくずリストがルートのメタデータを読む手段です。

未保存の変更があるページからユーザーが離れるのを止めるには、離脱ガードを登録します:

```tsx
import { useBeforeLeave } from "@solidjs/router";

useBeforeLeave((event) => {
	if (!dirty()) return;
	event.preventDefault();
	if (window.confirm("Discard unsaved changes?")) {
		event.retry(true);
	}
});
```

チェックアウトの住所を編集してヘッダーの **Store** をクリックすると確認ダイアログが表示されます。キャンセルすると URL は変わっていません。
ガードはルーターのナビゲーションと、ルーターが横取りできるブラウザ履歴の移動に対して実行されます。
`retry(true)` はナビゲーションを再発行してガードをスキップするため、確認は2回表示されません。
タブを閉じることは止められません。それが重要なら `beforeunload` リスナーと併用してください。

## よくある問題

### リンクをクリックするとページ全体がリロードされる

anchor が `<Router>` の外側にある、`target` を持つ、または別のオリジンを指しています。
`explicitLinks: true` の場合は `link` 属性がありません。

### `paths.products` が型エラーになる

そのルートは `/products/:id` なので、ノードにはパラメータを束縛する呼び出しが必要です: `paths.products(id)`。
静的ルートは裸のノード `paths.account` で、文字列に自動変換されるため、API が `string` を要求するときだけ呼び出しが必要です。

### すべてのリンクにアクティブスタイルが付く

そのスタイルは `/` リンクの `data-active` を対象にしていますが、`/` はすべての親です。
ホームリンクには `aria-current="page"` を使うか、`useLinkState` に `end: true` を渡します。

### `search.page` が文字列になる

ルートに `search` スキーマがないか、`useSearchParams` にパスノードが渡されていません。
`Number` への変換を持つスキーマを追加し、`useSearchParams(Router.paths.search)` で読み取ります。

## まとめ

- リンクは `<a href={...}>` と書きます。ルーターはその内側の同一オリジン anchor を処理し、残りはブラウザに任せます。
- すべての URL を `paths` から構築します。ルートが移動したとき、404 ページへのリンクになる代わりにコンパイルが失敗します。
- 他の何かの結果であるナビゲーションには `useNavigate` を使います。サーバーが行き先を知っている場合はミューテーションから `redirect()` を返します。
- `useLocation()` のフィールドは個別に読みます。それぞれが独立してリアクティブです。
- 共有可能な状態は検索パラメータに置き、ルートに同期的な `search` スキーマを与えて型付き・パース済みの値を得ます。
- `aria-current="page"`、`data-active`、`data-pending` を CSS でスタイルします。ルーターが処理する anchor にこれらを設定します。
- 未保存の変更は `useBeforeLeave` でガードし、ユーザーが確認したら `retry(true)` を呼びます。

## 次のステップ

- [ネストされたルートとレイアウト](/docs/routing/solid-router/nested-routes.md): セクションナビゲーションがどこに置かれ、リンク間で何がマウントされ続けるか。
- [データロードとミューテーション](/docs/routing/solid-router/data.md): ルーターがホバーでプリロードするものと、アクションからの `redirect()`。
- [状態管理](/docs/guides/state-management.md#state-in-the-url): どのページ状態が URL に属するべきか。
- [ナビゲーション API リファレンス](/docs/reference/solid-router/navigation.md): このページのすべてのプリミティブのシグネチャ。
