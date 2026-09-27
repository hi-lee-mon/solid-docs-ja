---
title: "パフォーマンス"
version: "2.0"
description: "ブラウザのプロファイラーと Solid の属性付け（attribution）テーブルで遅いカタログページを計測し、各計測が指し示す原因を修正します: 高頻度の導出、広範な書き込み、作り直される行、ウォーターフォール、分割されていないコード、ブロックされたストリーミングシェル。"
---

カタログページは2,000件の商品をレンダリングします。
検索ボックスへの入力はキーストロークごとに一拍遅れ、ページの最初のペイントは商品リスト・カートバッジ・アカウントメニューのすべてが応答を返すまで待ちます。
「何でもメモ化すればいい」と提案する人もいれば、仮想リストを提案する人もいます。

どちらも正しいかもしれませんが、どの部分が遅いのかを計測が示すまで、どちらをやる価値もありません。
このガイドは、その計測を行い、それがどのつまみを指しているかを読み取る方法についてのものです。
速度に関する主張はしません。値が変化したときに Solid が何をし、何をしないのかを説明するので、プロファイルをそれと照らし合わせて読めます。

## 変更する前に計測する

ブラウザの Performance パネルから始めます。記録を開始し、検索ボックスに1文字入力して、停止します。
キーストローク後のロングタスクには時間を費やしたコールスタックが表示され、疑わしいコードの周囲に置いた `performance.mark()` 呼び出しが、フレームチャート上で探すべき名前付きスパンを与えます。
これでミリ秒がどこへ消えたかが分かります。次のツールは、そのコードがなぜ実行されたのかを教えてくれます。

属性付け（attribution）は、再実行されたすべてのスコープ、その原因となった変更、かかった時間を記録する、Solid の開発ビルドのレコーダーです:

```ts
import { attribution, costs, feedback } from "solid-js/attribution";

attribution.enable();

// type in the search box, then:
console.table(costs().scopes);
console.table(feedback().flights);
```

`costs().scopes` はスコープを `selfMs` で順位付けし、結果が変わらなかった実行に費やした時間を `wastedMs` として示します。`costs().writes` はルートの書き込みを、それぞれが引き起こした下流の再実行時間で順位付けます。
`feedback().flights` は非同期ソースごとに、開始されたリクエスト数と、着地する前に `abandoned` となった数を数えます。abandon 数が多いのは、キーストロークごとにリクエストが走っている兆候です。
`feedback().fallbacks` は、各 `Loading` バウンダリがフォールバックを表示した回数と、そのうち 150ms 未満の `flashes` だった数を数えます。

まずスコープに名前を付けてください: `createMemo(fn, { name: "visible" })`、`createStore(value, { name: "catalog" })`。
すべてのテーブルとすべての `why(visible)` チェーンはその名前でノードを参照し、名前のないメモは `computed` と表示されます。

属性付けが有効な間、Solid は次の場合に自分でも警告を出します: スコープが1秒間に120回以上再実行されたとき（`HOT_SCOPE_RERUNS`）、1秒間に8ms以上の計算を費やしたとき（`HOT_SCOPE_TIME`）、30個以上のソースを追跡したとき（`WIDE_SCOPE_DEPS`）、1回の書き込みが250個以上の購読者に届いたとき（`WIDE_WRITE`）。
常時有効な警告が開発時に2つあります: `HUGE_FAN_OUT` と `HUGE_FAN_IN` で、2,000個の購読者またはソースから発火します。
各レポートの読み方は[リアクティビティのデバッグ](/docs/guides/debugging-reactivity.md#something-updates-too-often)で説明しています。

:::note[開発ビルドのみ]
属性付けとこのページの診断は開発ビルドに存在します。
本番ビルドでは取り除かれるため、本番バンドルはブラウザのプロファイラーで、開発バンドルは属性付けで計測してください。後者は絶対的には遅くなると想定してください。
:::

## 再実行されないもの

コンポーネント関数は一度だけ実行されます。
返される JSX は、それぞれが読み取ったものを追跡する式にコンパイルされるため、シグナルへの書き込みはそのシグナルを読んだ式だけを再実行し、それ以外は実行しません。
したがって「コンポーネントが頻繁に実行される」は探すべき失敗モードではなく、コンポーネント関数がスタックの上位に現れるプロファイルは、その最初で唯一の実行を示しています。

実際に存在する失敗モードはより限定的で、それぞれコンソールに名前が出ます:

| プロファイルが示すもの | コード | 修正方法 |
| ------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| 1つの導出がキーストロークごとに、すべての読み手で実行される | `HOT_SCOPE_RERUNS`, `HOT_SCOPE_TIME`                  | [高価な導出](#expensive-derivations)                |
| 1回の書き込みが数千の小さなスコープを再実行する             | `HUGE_FAN_OUT`, `WIDE_WRITE`                          | [大規模なストア](#stores-at-scale)                            |
| 読み手が変更ごとに1フラッシュずれて2回更新される        | `EFFECT_RELAY_TEAR`                                   | [不要なエフェクトを避ける](/docs/guides/avoid-unnecessary-effects.md) |
| 同じレコードに対して行が破棄・再作成される    | `UNSTABLE_LIST_IDENTITY`, `IMMUTABLE_UPDATE_IN_STORE` | [リスト](#lists)                                                |
| 何も変わっていないのにメモが読み手に通知する        | `UNSTABLE_MEMO_OUTPUT`                                | [高価な導出](#expensive-derivations)                |
| リクエストが次々に開始される                        | `ASYNC_WATERFALL`                                     | [ウォーターフォール](#waterfalls)                                      |

## 高価な導出

カタログは2,000件の商品をクエリでフィルターします。
そのフィルターがどこに置かれるかで、実行回数が決まります:

```tsx
import { For, createMemo, createSignal, createStore } from "solid-js";

const [products] = createStore(initialCatalog, { name: "catalog" });
const [query, setQuery] = createSignal("");

// Avoid: a plain function runs in every scope that reads it
const visible = () =>
	products.filter((product) => product.name.includes(query().trim()));

// Prefer: a memo runs once per change and hands the result to every reader
const visible = createMemo(
	() => products.filter((product) => product.name.includes(query().trim())),
	{ name: "visible" }
);

<p>{visible().length} results</p>;
<For each={visible()}>{(product) => <ProductCard product={product} />}</For>;
```

`Avoid` 版を実行して1文字入力すると、フィルターは2回実行されます。件数のためとリストのためです。プレーンな関数はそれを呼び出す追跡スコープごとに再評価されるからです。
`costs()` では `visible` は一切現れません。プレーンな関数はスコープではないため、その時間は呼び出したスコープに計上されます。
`Prefer` 版ではメモは1回だけ実行され、両方の読み手が保存された配列を受け取り、`costs()` には `visible` の行が1つ表示されます。

メモはグラフのノードと実行ごとの比較をコストとして要します。読み手が1つだけの安い式なら、関数のほうが小さく済みます。
結果を複数の読み手が共有するとき、計算が高価なとき、結果がしばしば変わらないときにメモを使ってください。
最後のケースが等価性ゲートです: メモは新しい値を前の値と比較し、2つが等しければ読み手に通知しないため、下流では何も実行されません。

このゲートは参照で比較するため、フィルターはこれをすり抜けます: 実行のたびに新しい配列が生成されるからです。
等価性の境界を、値がプリミティブになる場所に移動させてください:

```tsx
// Prefer: the trimmed query settles first, so " mug" and "mug" filter once
const needle = createMemo(() => query().trim().toLowerCase(), {
	name: "needle",
});
const visible = createMemo(
	() =>
		products.filter((product) => product.name.toLowerCase().includes(needle())),
	{ name: "visible" }
);
```

末尾にスペースを入力すると `needle` は再計算しますが、同じ文字列を生成してそこで止まります。`visible` と2,000行のリストは実行されません。
メモが内容上しばしば等しいオブジェクトや配列を返さなければならない場合は、内容で比較する `equals` オプションを渡してください。これがないと、新しいが等価な結果が4回連続した後に属性付けが `[UNSTABLE_MEMO_OUTPUT]` を報告します。すべての購読者が無駄に再実行されたからです。

## リスト

リストは、1つのミスが行ごとに支払われる場所です。
`For` は同じオブジェクトが戻ってきたときは行を保持し、新しいオブジェクトが現れたときは作り直します。したがって、リストの高価な版は、同じレコードに対して `For` に新しいオブジェクトを渡すものです:

```tsx
// Avoid: a new object per product on every change, so every row is rebuilt
<For
	each={visible().map((product) => ({
		...product,
		inCart: cartIds().has(product.id),
	}))}
>
	{(product) => <ProductCard product={product} inCart={product.inCart} />}
</For>;

// Prefer: pass the store's objects and read the derived flag in the row
<For each={visible()}>
	{(product) => <ProductCard product={product} inCart={inCart[product.id]} />}
</For>;
```

`Avoid` 版を実行してカートに1点追加すると、2,000行すべてが破棄・再作成され、属性付けは `[UNSTABLE_LIST_IDENTITY]` を報告します。
`Prefer` 版では `inCart` は商品 id をキーにしたストアで、[大規模なストア](#stores-at-scale)で作られるため、アイテムを追加するとキーが切り替わった1行だけが更新されます。

残りは[リスト](/docs/guides/lists.md)ガイドが扱います: [再取得をまたいで行の同一性を保つ](/docs/guides/lists.md#keep-row-identity-across-updates)、[すべての行に触れずに選択する](/docs/guides/lists.md#select-a-row)、2,000行すべてを DOM に置くべきでないときに `Repeat` で[ウィンドウをレンダリングする](/docs/guides/lists.md#render-a-window-over-a-large-list)方法。

## ウォーターフォール

最初のペイントが3つのリクエストを待つのは、それぞれが前のリクエストの着地を待って開始されるからです。商品は何も必要とせず、ブランドの読み取りは商品を待ち、ブランドのカタログはブランドを待ちます。
すでに持っている入力から各リクエストを導出して、互いに依存しないものは同時に開始させ、依存するものはサーバーで結合してください。
属性付けが有効な場合、50ms以上のシーケンシャルなフライトが3つ以上続くと `[ASYNC_WATERFALL]` がシリアル化された時間とともに表示されます。2フライトのチェーンは `info` でのみ記録されます。
[依存するリクエスト](/docs/guides/data-fetching-patterns.md#dependent-requests)に `Avoid` 版と `Prefer` 版が示されており、ルートの [`preload`](/docs/routing/solid-router/data.md#start-work-before-the-component-runs) はコンポーネントが実行される前から読み取りを開始します。

## コード分割

アカウント領域はバンドルの3分の1を占めますが、ほとんどの訪問者はそれを開きません。
[`lazy`](/docs/reference/solid-js/components-context/lazy.md)は import を、初回レンダー時にチャンクを読み込むコンポーネントに変えます:

```tsx
import { Loading, lazy } from "solid-js";

const Account = lazy(() => import("./account/Account"));

<Loading fallback={<AccountSkeleton />}>
	<Account />
</Loading>;
```

`<Account />` を初めてレンダーすると dynamic import が開始されます。インポートが飛行中の間、コンポーネントは最も近い `Loading` バウンダリを通じてサスペンドし、バウンダリはスケルトンを表示します。
`Account.preload()` を呼ぶとインポートを早めに開始できます。たとえばリンクの `onMouseEnter` から呼びます。

Solid Router では分割は通常ルートで行います。
`component` が `lazy` コンポーネントであるルートは、ユーザーがそのルートへのリンクにホバー・フォーカス・タッチしたときにチャンクが読み込まれ、`children: () => import("./account/routes")` という thunk はルートテーブル全体を同様に遅延させます。
[ルートサブツリーを遅延ロードする](/docs/routing/solid-router/route-definitions.md#load-a-route-subtree-lazily)と[リンクからのプリロード](/docs/routing/solid-router/data.md#preloading-from-links)がその両方をカバーしています。

:::caution[チャンクは1回の往復]
最初のページが必要とするコンポーネントを分割すると、そのページがペイントする前にリクエストが1つ増えます。
最初のページが表示するものと表示しないものの境界で分割し、ヘッダー・商品グリッド・カートバッジはメインバンドルに残してください。
:::

## サーバーレンダリングとストリーミング

`ssr: true` では、`renderToStream` はまず同期のシェルを送り、次に各 `Loading` バウンダリのコンテンツが確定するたびにフラグメントを送ります。
上にバウンダリのない非同期読み取りはシェルを保留するため、その読み取りが着地するまで訪問者には何も見えません:

```tsx
// Avoid: the shell waits for the catalog
<main>
	<Header />
	<ProductGrid products={products} />
</main>;

// Prefer: the shell carries the header and a fallback; the grid streams in
<main>
	<Header />
	<Loading fallback={<GridSkeleton />}>
		<ProductGrid products={products} />
	</Loading>
</main>;
```

`Avoid` 版でページを読み込むと、カタログクエリが解決するまで何も送信されません。
`Prefer` 版ではヘッダーとスケルトンが一度に届き、データが着地するとグリッドがスケルトンに置き換わります。

クローラーやリンクプレビューのために、ある読み取りが最初の HTML に含まれなければならない場合、そのメモに `deferStream: true` を渡してください。シェルはバウンダリのフォールバックを送る代わりにその読み取りを待ちます。
[ストリーミングレンダリング](/docs/concepts/rendering-and-ssr.md#streaming-rendering)は出力形式をカバーし、[レンダリングモードを選ぶ](/docs/guides/choose-a-rendering-mode.md)はストリーミングと静的シェル・プリレンダリングを比較検討します。

## 大規模なストア

2,000件の商品を保持するストアは、2,000組の追跡ノードを作りません。
プロキシは、追跡スコープが初めてプロパティを読んだときにそのプロパティのノードを作るため、画面上の行だけがノードのコストを持ち、残りはビューにスクロールインするまでコストゼロです。
データが変化してもそれを安く保つストアの機能が2つあります:

```tsx
import { createProjection, createStore } from "solid-js";

// Server refreshes reconcile by id, so unchanged rows notify no one
const [products] = createStore(async () => getProducts(), [] as Product[], {
	name: "catalog",
});

// A derived per-key view: each row reads its own key
const inCart = createProjection<Record<string, boolean>>(
	(draft) => {
		for (const key of Object.keys(draft)) delete draft[key];
		for (const item of cart.items) draft[item.id] = true;
	},
	{},
	{ name: "inCart" }
);
```

価格変更後にカタログを再取得するとテキストノードが1つ更新されます。残りの1,999行は値が変わらなかったプロパティを読んでいるため、通知されません。
カートにアイテムを追加すると `inCart` にキーが1つ増えるため、1行の `inCart` 読み取りが実行されます。

代替案である、すべての行が `cart.items.some((item) => item.id === product.id)` を読む方法は、2,000のスコープを `cart.items` に購読させ、アイテム追加ですべてが再実行されます。
開発ビルドはその書き込みを `[HUGE_FAN_OUT]` として報告し、属性付けが有効なら低いしきい値の `[WIDE_WRITE]` が250購読者からシグナル名を示します。
[プロジェクション](/docs/concepts/stores.md#derive-a-store-with-a-projection)または id をキーにしたマップとして使うストアが、両方のメッセージが示唆する修復です。

フィールド単位で編集されるのではなく丸ごと置き換えられる行を持つレコードマップには、`createStore(value, { shallow: true })` がルートキーを追跡し、各値を参照で保持するため、フィールドごとに読まれることのない行にフィールド単位のノードは作られません。

## よくある問題

### 検索ボックスへの入力が遅れる

原因は3つあり、属性付けがそれらを切り分けます。
`costs().scopes` の上位にフィルターやソートがある場合、それはすべての読み手で実行されています。メモにして、[高価な導出](#expensive-derivations)のように正規化したクエリに等価性の境界を置いてください。
`feedback().flights` でほとんどのリクエストが abandoned になっている場合、キーストロークごとにリクエストが開始されています。[入力しながら検索](/docs/guides/data-fetching-patterns.md#search-as-you-type)が示すように、input ハンドラーでデバウンスしてください。
input 自体が前の文字を表示する場合、`query()` にバインドされており、保留中の更新が結果を待っています。代わりに `latest(query)` にバインドしてください。

### 1つの商品を選択するとすべての行が更新される

各行が選択中の id を読んでいるため、選択の変更で2,000のスコープが再実行され、開発ビルドは `[HUGE_FAN_OUT]` を出力します。
選択を id をキーにしたストアに保持し、行で `selected[product.id]` を読んでください。[行を選択する](/docs/guides/lists.md#select-a-row)に2つの版が示されています。

### リフレッシュのたびにリストが作り直される

再取得が同じレコードに対して新しいオブジェクトを生成したため、`For` がすべての行を破棄し、属性付けは `[UNSTABLE_LIST_IDENTITY]` を報告します。
リストを関数から作成したストアに読み込むか、`keyed={(item) => item.id}` を渡してください。[更新をまたいで行の同一性を保つ](/docs/guides/lists.md#keep-row-identity-across-updates)を参照してください。

### 最初のペイントがすべてのデータを待つ

非同期読み取りがすべての `Loading` バウンダリの上に位置しているためストリーミングシェルがそれを待つか、3つの読み取りが順次実行されていてページがその合計を待っています。
読み取りに依存する領域をバウンダリで囲み、`[ASYNC_WATERFALL]` をコンソールで確認してチェーンを見つけてください。

### 開発ビルドは遅いが本番ビルドは問題ない

属性付け・診断・`[why-run]` コンソールグループは開発時のみ実行されます。
タイミングは本番ビルドで計測し、開発ビルドはどのスコープがなぜ実行されたかを調べるために使ってください。

## まとめ

- まずプロファイルを記録し、次に `attribution` を有効にして `costs()` と `feedback()` を読み、どのスコープが何を原因に実行されたかを確認する。
- コンポーネントは一度だけ実行されます。再レンダリングするコンポーネントではなく、高頻度の導出・広範な書き込み・中継するエフェクト・作り直されるリストを探してください。
- 共有されるまたは高価な導出はメモに置き、同じ値に確定する変更がそこで止まるよう、プリミティブに等価性の境界を置く。
- `For` にはストアのオブジェクトを渡してください。新しいオブジェクトを生成する `map` はすべての行を作り直します。
- 独立したリクエストはすでに持っている入力から導出し、同時に開始させる。
- `lazy` で最初のページとそれ以外の境界でコードを分割し、ルーターにホバーでチャンクをプリロードさせる。
- ストリーミングされる各領域を `Loading` バウンダリで囲み、シェルがそのデータを待たないようにする。
- 行ごとのフラグは id をキーにしたストアかプロジェクションに保持し、変更がキーの切り替わった行だけに触れるようにする。

## 次のステップ

- [リスト](/docs/guides/lists.md): カタログに対する行の同一性・選択・ウィンドウ表示と、行が作り直されたときに発火する診断。
- [データ取得パターン](/docs/guides/data-fetching-patterns.md): 並列読み取り、`preload`、コンポーネント間での1つのリクエストの共有、`[ASYNC_WATERFALL]` レポートの全体。
- [リアクティビティのデバッグ](/docs/guides/debugging-reactivity.md): このページで名前が出たすべての診断と、その背後の `why` チェーンの読み方。
- [レンダリングと SSR](/docs/concepts/rendering-and-ssr.md): `renderToStream`、ハイドレーション、このページのバウンダリが HTML のどこに来るか。
