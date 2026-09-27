---
title: "非同期リアクティビティ"
version: "2.0"
description: "Promise を値のように読み取る: 非同期メモが更新を保持する仕組み、Loading がフォールバックを表示するタイミング、ミューテーションが確定する流れを説明します。"
---

いま UI がレンダリングしている値を1つ考えてみてください。商品、リスト、設定です。
それを定数ではなくサーバーから来るように変えます。
手作業で書くと、この変更は波及します。型は `Promise<Product>` になり、fetch と表示の間にあるすべてのコンポーネントが読み込み中を意識することになり、fetch する場所とスピナーを表示する場所は、望むかどうかにかかわらず同じ場所になります。

Solid では、この変更は1行です。
Promise を返す計算も依然として計算であり、それを読み取るすべてのものは値を読み続けます。

この1行は書き込みの振る舞いも変えます。
メモが非同期になると、それが依存する入力への書き込みは、メモが次の答えを得るまで保持され、同じ更新に含まれる他のすべても一緒に待ちます。
ページに古いデータと新しいデータが混在することはありません。
Solid 1 から来た場合や、各パネルが独自のスケジュールで fetch して独自のスピナーを表示するパターンから来た場合、ここが意外に感じる部分です。[処理中の処理](#settled-view-and-in-flight-work)のセクションで、その挙動とそこにある選択肢を示します。

このページでは、非同期の計算がもたらすものと、自分で決める必要があるものを説明します。
例は[リアクティビティ](/docs/concepts/reactivity.md)ページのショッピングカートの続きです。

## Promise を返すメモ

```tsx
import { Loading, createMemo } from "solid-js";

type Product = { id: string; name: string; price: number; description: string };

async function fetchProduct(id: string): Promise<Product> {
	const response = await fetch(`/api/products/${id}`);
	if (!response.ok) throw new Error(`Could not load product ${id}`);
	return response.json();
}

function ProductDetail(props: { id: string }) {
	const product = createMemo(() => fetchProduct(props.id));

	return (
		<Loading fallback={<p>Loading product…</p>}>
			<article>
				<h1>{product().name}</h1>
				<p>{product().description}</p>
			</article>
		</Loading>
	);
}
```

`product()` の型は `Product` です。`Product | undefined` でも `Promise<Product>` でもありません。
チェックするローディングフラグも、オプショナルチェイニングもありません。
式が実行されていれば、値はそこにあります。

最初の結果が届くまで、`product()` の読み取りは値がまだ準備できていないことを報告し、最も近い [`Loading`](/docs/reference/solid-js/components-jsx/loading.md) バウンダリがコンテンツの代わりにフォールバックをレンダリングします。
Promise が解決すると、コンテンツがレンダリングされます。

その後 `props.id` が変わっても、フォールバックは戻ってきません。
次の商品が読み込まれる間、現在の商品は画面に残ります。
初回の準備と後からの更新は異なる状況であり、Solid はデフォルトで両者を別々に扱います。後者については[処理中の処理](#settled-view-and-in-flight-work)のセクションで説明します。

## 渡すことは読み取りではない

コンポーネントは一度だけ実行されるため、中断して再実行されるコンポーネントは存在しません。
非同期の値を読み取る式だけがそれを待ちます。
値を prop として渡すことは読み取りには数えません。動的な prop は、子がそれを使う場所で評価されるゲッターにコンパイルされるからです:

```tsx
function ProductPage(props: { id: string }) {
	const product = createMemo(() => fetchProduct(props.id));
	return <ProductLayout product={product()} />;
}

function ProductLayout(props: { product: Product }) {
	return (
		<div class="layout">
			<CategoryNav />
			<main>
				<Loading fallback={<p>Loading product…</p>}>
					<ProductDetail product={props.product} />
				</Loading>
			</main>
		</div>
	);
}
```

`product={product()}` は、データが存在する前にアクセサーを呼んでいるように見えます。
実際は違います。この式は `ProductDetail` が `props.product.name` を読み取るときに評価されます。
そのため `ProductLayout` はすぐにレンダリングされ、`CategoryNav` もすぐにレンダリングされ、詳細ペインだけが待ちます。

派生値も同じように振る舞います:

```tsx
function ProductDetail(props: { product: Product }) {
	const priceLabel = createMemo(() => `$${props.product.price.toFixed(2)}`);
	return (
		<>
			<h1>{props.product.name}</h1>
			<p>{priceLabel()}</p>
		</>
	);
}
```

`priceLabel` は `product` が非同期だったことを知りません。
未準備の値を読み取るため、それ自身も未準備になり、その読み取り側も順番に待つことになります。
fetch と JSX の間のどこにも `await` も Promise 型も現れません。

## 高い位置で fetch し、低い位置でブロックする

値を渡すのにコストがかからないため、通常は相反する2つの決定が分離できます:

- 非同期の値をどこで作るかは、パフォーマンスの決定です。
  ツリーの高い位置ほどリクエストが早く始まり、他の処理と並行して実行できます。
- どこでブロックするかは、デザインの決定です。
  ツリーの低い位置ほど、フォールバックを表示する領域が小さくなります。

どちらの決定も、その間にあるコンポーネントには触れません。
fetch をアプリのトップまで持ち上げ、バウンダリはスケルトンを表示すべき1つのペインまで押し下げます:

```tsx
function App() {
	const [selectedId, setSelectedId] = createSignal("mug");
	const product = createMemo(() => fetchProduct(selectedId()));

	return <ProductPage product={product()} onSelect={setSelectedId} />;
}

function ProductPage(props: {
	product: Product;
	onSelect: (id: string) => void;
}) {
	return (
		<div class="layout">
			<ProductList onSelect={props.onSelect} />
			<main>
				<Loading fallback={<DetailSkeleton />}>
					<ProductDetail product={props.product} />
				</Loading>
			</main>
		</div>
	);
}
```

ハードコードされた商品オブジェクトで同じリファクタリングをしても、コードは同一です。
非同期版でかかるコストは、デザインがスケルトンを欲する場所に置く `Loading` 要素1つだけです。

## ネストはウォーターフォールではない

非同期の値を読み取る JSX の下にある子コンポーネントは、自分もその値を読まない限りそれを待ちません:

```tsx
function ProductDetail(props: { id: string }) {
	const product = createMemo(() => fetchProduct(props.id));

	return (
		<article>
			<h1>{product().name}</h1>
			<p>{product().description}</p>
			<Reviews productId={props.id} />
		</article>
	);
}

function Reviews(props: { productId: string }) {
	const reviews = createMemo(() => fetchReviews(props.productId));
	return (
		<For each={reviews()}>{(review) => <ReviewRow review={review} />}</For>
	);
}
```

JSX 上では `Reviews` は `product().name` の下にありますが、コンポーネントツリーは最初にマウントされ、`Reviews` が読む `props.productId` はすぐに利用できます。
2つのリクエストは同時に始まります。
リクエストの順序はデータの依存関係で決まり、コンポーネントがどこにあるかでは決まりません。

ウォーターフォールが起こるのは、2つ目のリクエストが1つ目のレスポンスに依存するときです:

```tsx
const product = createMemo(() => fetchProduct(props.id));
const brand = createMemo(() => fetchBrand(product().brandId));
```

`brand` は `product` が解決するまで始められません。id がレスポンスから来るからです。
これはデータが逐次的だから逐次的であり、その依存関係はコードに見えています。
開発ビルドでは、アトリビューションを有効にしていれば、このような長いチェーンを `ASYNC_WATERFALL` 診断で指摘できます。[リアクティビティのデバッグ](/docs/guides/debugging-reactivity.md)を参照してください。

## 確定済みビューと処理中の処理

値が確定した後は、入力を変えても画面は真っ白になりません。
Solid は、ユーザーに見えている答えと、次の答えを生み出す処理を分離します:

![最初のリクエスト中に Loading フォールバックが表示され、保持された更新の間も回答 A が表示され続け、次のリクエストが確定すると回答 B が現れるタイムライン](/docs/images/diagrams/async-update-timeline.svg)

最初の答えの前には表示するものがなく、`Loading` バウンダリが何をレンダリングするかを決めます。
答えの後は、次のものが準備される間、Solid はコミット済みのビューを保持します。
同じ更新に含まれる他の書き込みも一緒に待ち、保留中の処理が確定したときにすべてがまとめてコミットされるため、ページに新旧が混在することはありません。

この保持は自動です。
`Loading` バウンダリは不要で、オプトインする API もありません。更新をトランジションでラップしたことがあるなら、その動作がデフォルトになったものです。
バウンダリが制御するのは、確定済みの答えが存在しないときに何をレンダリングするかであり、保持を作り出すものではありません。

### 共有された入力に対して保持が意味すること

保持は、1つのメモと1つのビューについて考えるのは簡単です。
複数ある場合にどうなるかを見る価値があります。

ダッシュボードに期間セレクターと3つのパネルがあるとします。
各パネルは選択された期間から自分のデータを fetch し、その fetch にはそれぞれ 200 ミリ秒、1 秒、10 秒かかります:

```tsx
function Dashboard() {
	const [period, setPeriod] = createSignal("2026-Q2");

	return (
		<>
			<PeriodSelect value={period()} onChange={setPeriod} />
			<Loading fallback={<DashboardSkeleton />}>
				<SummaryPanel period={period()} />
				<TrendPanel period={period()} />
				<AuditPanel period={period()} />
			</Loading>
		</>
	);
}

function SummaryPanel(props: { period: string }) {
	const summary = createMemo(() => fetchSummary(props.period));
	return <p>{summary().total} orders</p>;
}
```

各パネルが自分のローディングフラグを管理していたら、期間を変えたときセレクターはすぐに切り替わり、各パネルは自分のリクエストが届いた時点でコンテンツを入れ替えるでしょう。サマリーは 200 ミリ秒で、監査ログは 10 秒後です。
その 10 秒間、ページには新しい期間のサマリーと、古い期間の監査ログが並んで表示されます。

Solid では `period` への書き込みが保持されます。
セレクターは古い期間を表示し続け、すべてのパネルは古いコンテンツを保持し、10 秒後にセレクターと3つのパネルすべてが一緒に変わります。
ページ上のどの要素も、表示している期間について食い違うことはありません。
代償として、速いパネルが遅いパネルを待ちます。そしてページ上の何もクリックに反応しなければ、ページは 10 秒間死んでいるように見えます。

どちらの振る舞いも、あらゆる画面で正しいわけではありません。
詳細ページ、フォーム、合計が一致しなければならない一連の集計値は、一緒に変わるべきです。
独立したウィジェットの集まりは、一緒に変わる必要はありません。
問うべきは個々のリクエストではなく更新についてであり、これはデザイナーが答えられる質問です:

**この更新が処理中の間、ユーザーには何が見えるべきですか？**

| ユーザーに見せるべきもの                                       | 使うもの                                                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| 入力に依存するすべてが準備できるまで何も変わらないこと         | デフォルト。[`isPending`](#another-answer-is-coming-ispending) を追加してクリックに応答する |
| 触れたコントロールは今すぐ入力を反映し、コンテンツは待つ       | コントロールに [`latest`](#show-the-input-now-latest)、コンテンツを暗くするのに `isPending` |
| 対象が変わったコンテンツの代わりにプレースホルダー             | そのコンテンツの周りに [`<Loading on={key}>`](#show-a-placeholder-again-loading-on)          |

最初の2行は同じ画面です。タブのハイライトはすぐに移り、コンテンツは残って暗くなり、準備できたらコンテンツが入れ替わります。
これが保持された更新の標準的なインタラクションであり、このセクションの残りでその部品を示します。
3行目は、対象が変わったときに画面に残すべきでないコンテンツ、例えば別のアカウントのパネル向けです。

保持が適用されるのは更新だけです。
各パネルの初回読み込みは依然として最も近い `Loading` バウンダリに届き、ネストされたバウンダリによって各パネルは自分の最初のデータが届き次第表示されます。

## 次の答えが来る途中: `isPending`

古い答えが表示されたままなので、UI には新しいものが途中であることを伝える手段が必要です。
[`isPending(fn)`](/docs/reference/solid-js/reactivity/is-pending.md)は、1つの式についてそれに答えます:

```tsx
import { For, createMemo, createSignal, isPending } from "solid-js";

function Search() {
	const [query, setQuery] = createSignal("");
	const results = createMemo(() => searchProducts(query()));

	return (
		<>
			<input onInput={(event) => setQuery(event.currentTarget.value)} />
			<ul class={{ stale: isPending(results) }}>
				<For each={results()}>{(product) => <li>{product.name}</li>}</For>
			</ul>
		</>
	);
}
```

タイピングで `query` が変わり、`results` が新しいリクエストを開始し、新しい結果が届くまで以前の結果が `stale` クラス付きで画面に残ります。

`isPending` は状態ではなく問い合わせです。
非同期のソースについて、そこから派生したメモについて、何段か下のコンポーネントの prop について、あるいはその書き込みが更新を開始したシグナルについて問い合わせられます:

```tsx
function App() {
	const [selectedId, setSelectedId] = createSignal("mug");

	return (
		<>
			<ProductList selectedId={selectedId()} onSelect={setSelectedId} />
			<main class={{ pending: isPending(selectedId) }}>
				<ProductPage id={selectedId()} />
			</main>
		</>
	);
}
```

ここでは fetch は `ProductPage` の中にあります。
`App` はそれについて何も知りませんが、`isPending(selectedId)` は書き込みが起きた瞬間から下流のすべてが確定するまで `true` です。保持されているのは書き込みだからです。

リストのハイライトもクリックでは動かないことに注目してください。
`selectedId()` も他のすべてと同様に古い値を保持するため、ハイライトされた行は常に画面上のコンテンツと一致します。
デザイン上ハイライトをすぐに動かしたい場合は、次に説明する [`latest`](#show-the-input-now-latest) で入力を読み取ります。

何も反応しない保持された更新は、リクエストにかかる時間の間、死んだクリックに見えます。
アトリビューションを有効にした開発ビルドは、そのケースを `SILENT_HOLD` として報告し、インタラクション、書き込み、待っていたソースを特定します。[リアクティビティのデバッグ](/docs/guides/debugging-reactivity.md#the-screen-looks-dead-after-a-click)で、そのレポートと修正方法（このページのプリミティブです）を説明しています。

式にまだ確定済みの答えがなければ、`isPending` の中の読み取りも周囲の `Loading` の流れに従います。`isPending` が報告するのは存在する値への更新であり、初回読み込みではありません。

## 入力を今すぐ表示する: `latest`

保持された更新は、入力の古い値を古いコンテンツと一緒に表示し続けます。
コンテンツについては、それが正しい選択です。
ユーザーが触れたコントロールについては、通常そうではありません。クリックしてもハイライトされないタブは、下のコンテンツが正しく待っていても、壊れて見えます。

[`latest(fn)`](/docs/reference/solid-js/reactivity/latest.md)は、更新がコミットした値ではなく、更新が向かっている値を読み取ります:

```tsx
<ProductList selectedId={latest(selectedId)} onSelect={setSelectedId} />
<main class={{ pending: isPending(selectedId) }}>
	<ProductPage id={selectedId()} />
</main>
```

新しい値が処理中なら、`latest(selectedId)` は保持された更新がそれをコミットする前にそれを返します。
そうでなければ、コミット済みの値を返します。
値がまだ存在しない場合は、読み取りは通常の `Loading` の流れに従います。

2つの側面を組み合わせて読みます。コントロールには `latest`、コンテンツには通常の読み取り、その間をつなぐ `isPending` でコンテンツを暗くします。
ハイライトはすぐに移り、古い商品は表示されたまま暗くなり、データが準備できたら新しい商品がそれと入れ替わります。
これは保持された更新の日常的な形であり、特別なケースではありません。

`latest` は入力に使うものです。
`latest` でデータを読むと、更新の残りがそれに同意する前に結果が表示されるため、セレクターがまだ古い期間を表示している間にパネルが新しい期間の数値を表示してしまいます。
コントロールを先行させたいときはコントロールに `latest` を使い、パネルにプレースホルダーを表示したいときは次のセクションを使います。

## プレースホルダーを再び表示する: `Loading on`

`Loading` バウンダリが一度コンテンツを表示すると、後の更新でフォールバックは戻りません。コンテンツは残り、更新は保持されます。
残すべきでないコンテンツもあります。
アカウント 2 の読み込み中にアカウント 1 を表示するアカウントパネルは、スケルトンより悪いです。データが更新されたのではなく対象が変わったコンテンツはすべて同じです。

`on` prop は、その変化によってバウンダリがフォールバックを再び表示できるようにすべき値を指定します:

```tsx
<Loading on={accountId()} fallback={<AccountSkeleton />}>
	<AccountPanel id={accountId()} />
</Loading>
```

`Loading` バウンダリは、そのコンテンツを待たずに更新を終える機会です。領域はフォールバックを表示して独自に待ちます。
通常、更新がこの機会を使うのは領域の初回読み込みだけです。
`on` はこの申し出を後の更新にも拡大します。`accountId()` が変わって新しいアカウントがまだ準備できていないとき、それによって更新が早く終われるなら、バウンダリはスケルトンに戻る用意があります。
待っているのがそのパネルだけなら、そうします。
バウンダリの外のコントロールはすぐに新しい id を見て、パネルはスケルトンを表示し、アカウントが届いたらコンテンツが届きます。
同じアカウントの再読み込みのような、他の値による保留中の処理は、いつもどおりコンテンツをそのままにします。

更新がフォールバックに戻るのは、それが更新を早く終わらせるときだけです。
更新は、それが変えたすべてが準備できたときにコミットされ、`on` はそれを変えません。ある領域が待つ理由でなくなることを許すだけです。
バウンダリの外にも新しいアカウントを待っているものがある場合、更新が早く終わることはないため、その領域は他のすべてと一緒に古いコンテンツのままになり、スケルトンは表示されません:

```tsx
// account is createMemo(() => fetchAccount(accountId()))

// Avoid: the heading reads the same account outside the boundary
<h1>{account().name}</h1>
<Loading on={accountId()} fallback={<AccountSkeleton />}>
	<AccountDetails account={account()} />
</Loading>

// Prefer: everything that reads the new account is inside the boundary
<Loading on={accountId()} fallback={<AccountSkeleton />}>
	<h1>{account().name}</h1>
	<AccountDetails account={account()} />
</Loading>
```

`Avoid` のバージョンでは、別のアカウントを選んでもアカウントが読み込まれるまで何も起きなかったように見え、その後見出しと詳細が一緒に変わります。見出しが更新を待たせ続けたため、`on` は目に見える効果を持ちませんでした。
つまり `on` のルールは、バウンダリの外で同じ変更を待っているものがあってはならないということです。
`on` 付きと `on` なしが混在する複数の `Loading` バウンダリがあるページは、どれも `on` を持っていないかのように振る舞います。`on` なしのバウンダリはすでにコンテンツを表示しているため更新を保持し、`on` 付きのバウンダリはそれを早く終わらせられません。

そこに選択肢が残ります。これはバウンダリをどこに置くかのルールではなく、デザインの選択です:

- 対象を読み取るすべてを囲む、`on` 付きのバウンダリが1つ。
  対象全体が1つのスケルトンを表示し、まとめて現れます。
- 各領域を囲む `on` 付きのバウンダリ。
  更新はクリック時にコミットされ、各領域は自分のスケルトンを表示し、それぞれ自分のデータが届き次第現れます。

どちらも合わないとき、例えばパンくずリスト、タイトル、兄弟パネルが同じ対象を表示していて残すべきときは、`on` を外して `isPending` と `latest` で待ち時間に応答します。

`on` はアクセサーではなく値です。
バウンダリは更新をまたいでそれを比較するため、`accountId` ではなく `accountId()` を渡します。

上のダッシュボードも同じ選択で決まります。
各パネルに `on={period()}` 付きの独自のバウンダリを与えると、期間への書き込みはすぐにコミットされます。セレクターは切り替わり、すべてのパネルがスケルトンを表示し、各パネルのコンテンツは自分のリクエストが届き次第現れます。
`on` を1つのパネルだけに与えると、共有入力を通常どおり読み取っている他の2つは依然として書き込みを保持します。ページは最も遅いリクエストを待ち、`on` 付きのパネルもスケルトンを表示しません。
[バウンダリ](/docs/concepts/boundaries.md)で、配置と `Reveal` が複数のバウンダリをどう順序付けるかを説明しています。

:::deep-dive[再取得のたびにスケルトンを表示: on={data()}]
`on` が指定するのは対象なので、同じ対象の再取得はコンテンツをそのままにします。
再取得のたびにスケルトンを表示すべき領域では、バウンダリのキーをデータそのものにします:

```tsx
<Loading on={account()} fallback={<AccountSkeleton />}>
	<AccountDetails account={account()} />
</Loading>
```

再取得が処理中の間、`account()` には確定済みの値がなく、バウンダリはこれを変更として数えます。そのため `refresh(account)` やアクション後の再検証は、同じ値が届くときでも、すぐにスケルトンを呼び戻します。
「すべての読み取り側」のルールは依然として適用されます。バウンダリの外に `account()` の別の読み取り側がいると更新は保持され、スケルトンは表示されません。
これは更新のたびにスケルトンが出る動作です。ほとんどの領域では、デフォルト（古いコンテンツに `isPending`）のほうが親切な扱いです。
:::

:::deep-dive[フォールバックの代わりにプレースホルダー値: loadingValue]
ほとんどの初回読み込みは `Loading` バウンダリに届くべきです。
プレースホルダーが空の結果リストのように実データと同じ UI でレンダリングされるとき、`loadingValue` オプションは最初の結果が届くまでソースの代わりに応答する値を宣言します:

```ts
const results = createMemo(() => searchProducts(query()), {
	loadingValue: [] as Product[],
});
```

`loadingValue` を持つソースは最初の処理中に `Loading` に届くことはなく、最初の計算値が届くまで `isPending` は `false` のままです。
後の更新は通常の保持の振る舞いに従います。
ストア版は `createStore(async () => ..., seed)` の `seedLoadingValue: true` で、シード値がプレースホルダーになります。
[`createMemo`](/docs/reference/solid-js/reactivity/create-memo.md)と [`createStore`](/docs/reference/solid-js/stores/create-store.md) のリファレンスにオプションの仕様があります。
:::

## 処理が reject する: `Errored`

非同期の処理が reject すると、エラーは値と同じようにリアクティブグラフを伝わります。
[`Errored` バウンダリ](/docs/reference/solid-js/components-jsx/errored.md)は、処理されなかったエラーをフォールバック UI に変えます:

```tsx
import { Errored, Loading } from "solid-js";

<Errored
	fallback={(error, reset) => (
		<section>
			<p>{String(error())}</p>
			<button onClick={reset}>Retry</button>
		</section>
	)}
>
	<Loading fallback={<p>Loading product…</p>}>
		<ProductDetail product={product()} />
	</Loading>
</Errored>;
```

`Loading` と `Errored` は別々の状態を扱います。
ローディングバウンダリはエラーを消費せず、エラーバウンダリはローディング UI を置き換えません。

エラーはグラフのその部分のステータスであり、終了状態ではありません。
入力シグナルが変わったり `refresh` が届いたりして元のデータが変わると、バウンダリは再試行し、コンテンツが戻ります。
`reset` は同じエラーを再び表示するのではなく、失敗したソースを再試行します。
[バウンダリ](/docs/concepts/boundaries.md)で配置と復帰を詳しく説明しています。

## 最初の `await` の前にすべての入力を読み取る

依存関係の追跡は同期的です。
非同期の計算は、最初の `await` の前に行ったリアクティブな読み取りを登録します。`await` の後の読み取りは追跡ウィンドウの外で行われるため、そのソースへの後の変更では計算を再実行できません。

```ts
// Avoid: permissions() is read after the await and is never tracked
const profile = createMemo(async () => {
	const user = await fetchUser(id());
	return { user, canEdit: permissions().includes("edit") };
});

// Prefer: read every input first, then await
const profile = createMemo(async () => {
	const userId = id();
	const canEdit = permissions().includes("edit");
	const user = await fetchUser(userId);
	return { user, canEdit };
});
```

`Avoid` のバージョンを実行して `permissions` を変えると、メモは再計算せず、ページは古い `canEdit` のままです。

:::pitfall[await の後に初めて読まれたソースは通知できない]
遅れた読み取り自体が非同期でまだ準備できていない場合、問題はさらに深刻です。
依存関係の辺が存在しないため、ソースが確定しても計算を起こせず、計算は再試行なしに保留中のままになります。
開発ビルドはその読み取りをエラーに変えて、ハングする代わりに `Errored` に届くようにします。本番ビルドにはこのチェックは含まれません。
すべてのリアクティブな入力を、関数の先頭で、最初の `await` の前に読み取ってください。
:::

## まとめ

- メモから Promise を返し、結果はプレーンな値として読み取ります。型は `Product` であり、`Promise<Product>` や `Product | undefined` ではありません。
- 非同期の値を読み取る式だけがそれを待ちます。prop として渡すのにコストはかかりません。
- リクエストを早く始めるために非同期の値はツリーの高い位置で作り、`Loading` は小さい領域がフォールバックを表示するように低い位置に置きます。
- リクエストの順序はコンポーネントのネストではなくデータの依存関係で決まります。ウォーターフォールが存在するのは、あるリクエストが別のリクエストのレスポンスを必要とするときだけです。
- 値が確定した後、その入力への変更は保持されます。現在の画面は表示されたままになり、新しい値が届いたらすべてがまとめてコミットされます。
- 保持された更新には、コンテンツに `isPending`、ユーザーが触れたコントロールに `latest` で応答します。
- 対象が変わり、古いコンテンツの代わりにプレースホルダーを表示すべき `Loading` バウンダリには `on={key}` を付けます。バウンダリの外で同じ変更を待っているものがない場合にのみ効果があります。
- すべてのリアクティブな入力を最初の `await` の前に読み取ります。

## 次のステップ

- [ミューテーション](/docs/concepts/mutations.md): 往復をまたぐ書き込み。`action`、`createOptimisticStore`、`refresh` を使い、クライアントのみのカートから組み立てます。
- [バウンダリ](/docs/concepts/boundaries.md): `Loading` と `Errored` をどこに置くか、`Reveal` が兄弟領域をどう順序付けるか、エラーになった領域がどう復帰するか。
- [データ取得パターン](/docs/guides/data-fetching-patterns.md): 入力中の検索、1ページの複数リクエスト、ページネーション、リクエストの共有、ポーリング、失敗。それぞれ動作するコードで示します。
- [Solid 1 からのデータ取得の移行](/docs/migration/data-fetching-from-solid-1.md): `createResource` やエフェクト＋フラグのパターンが非同期メモになると何が変わるか、必要な場所で旧来の感覚をどう維持するか。
- [サーバー関数](/docs/building-apps/server-functions/index.md): `"use server"` 関数は Promise を返すため、このページのすべてがそのまま適用されます。あちらのページではトランスポート、`GET` の読み取り、`live` ストリームを扱います。
