---
title: "データフェッチのパターン"
version: "2.0"
description: "検索・詳細ページ・ページネーション・共有状態・ダッシュボードのために、ローディングフラグ・リクエストカウンター・AbortController なしでデータを読み込み、各リクエストと各バウンダリをどこに置くかを決めます。"
---

[非同期リアクティビティ](/docs/concepts/async-reactivity.md)のページにある商品ページは、1 つのメモで 1 つの商品を読み込んでいました。
ストアフロントではそれ以上のリクエストが発生します。キー入力のたびに発火する検索ボックス、レビューと関連商品も必要な商品ページ、ページをまたぐ注文履歴、複数のコンポーネントが読み取るカートバッジ、リロードなしで最新の状態を保つべきダッシュボードです。
これらは通常、ローディングフラグ・リクエストカウンター・`AbortController` で書かれます。Solid ではそれぞれが 1 つの計算です。Promise を返す計算は値だからです。

このガイドではこれらのリクエストを 1 つずつ見ていき、それぞれに対応する Solid らしい形と、判断が必要な選択肢を示します。
各 `api.*` 呼び出しは Promise を返す関数です。`"use server"` 関数・`fetch` ラッパー・クライアント SDK のいずれも同じように動作します。

## 1 つだけ読み込む

ほかのすべての土台になる基本形です:

```tsx
import { Loading, createMemo } from "solid-js";

function ProductPage(props: { id: string }) {
	const product = createMemo(() => api.product(props.id));

	return (
		<Loading fallback={<ProductSkeleton />}>
			<h1>{product().name}</h1>
			<p>{product().description}</p>
		</Loading>
	);
}
```

`product()` は `Product` です。
`props.id` が変わるとリクエストが再開され、現在の商品は画面に残ったまま、新しい商品が届き次第置き換わります。
別の商品ではスケルトンを再表示したい場合は、バウンダリに `on={props.id}` を追加します。

データが、更新をまたいでアイテムの同一性が必要なリストやツリーの場合は、代わりにストアへ読み込みます:

```tsx
const [orders] = createStore(
	async () => api.orders(customerId()),
	[] as Order[]
);
```

レスポンスは `id` に基づいて同じプロキシへ突き合わせられるため、変化のなかった行はその DOM を保持します。
どんなときにそれが重要になるかは [ストア](/docs/concepts/stores.md#fetch-into-a-store) で説明しています。

## 入力しながら検索する

入力欄がシグナルに書き込み、メモがそのシグナルを検索結果に変えます:

```tsx
import { For, createMemo, createSignal, isPending, latest } from "solid-js";

function ProductSearch() {
	const [query, setQuery] = createSignal("");
	const results = createMemo(() => {
		const text = query().trim();
		if (!text) return [];
		return api.search(text);
	});

	return (
		<>
			<input
				type="search"
				value={latest(query)}
				onInput={(event) => setQuery(event.currentTarget.value)}
			/>
			<ul class={{ stale: isPending(results) }}>
				<For each={results()}>{(product) => <li>{product.name}</li>}</For>
			</ul>
		</>
	);
}
```

`mug` と入力するとキーストロークごとに 3 つのリクエストが始まりますが、リストには `mug` の結果だけが表示されます。
このコードが行わないことが 3 つあります。Solid が行うからです:

- 古いレスポンスを手動で破棄しません。
  現在の問いへの回答だけが使われ、`mug` のレスポンスより後に `mu` のレスポンスが届いても捨てられます。
  リクエストカウンターも `AbortController` もありません。
- キーストロークの合間にリストを空にしません。
  新しい結果が届くまで、前の結果は `stale` クラス付きで表示されたままです。
- 空のクエリにスピナーを表示しません。
  `[]` を同期的に返すことは確定済みの回答なので、メモはそのために保留中になりません。

この入力欄は `value={query()}` ではなく `value={latest(query)}` をバインドしています。
結果の読み込み中は `query` への書き込みが保留されます。`latest` は更新が向かっている先の値を読み取るため、制御された入力でもユーザーが打ち込んだ内容が反映されます。
`value` バインドのない制御されない入力なら何も不要です。

:::tip[デバウンスはグラフではなくイベントで]
ハンドラー側の 1 行でグラフはそのまま保てます。[カスタムプリミティブ](/docs/guides/custom-primitives.md)では同じ考え方を `createDebouncedSignal` としてパッケージ化しています:

```tsx
onInput={debounce((event) => setQuery(event.currentTarget.value), 150)}
```

遅延後にシグナルを別のシグナルへコピーするエフェクトとして書くデバウンスは、[不要なエフェクトを避ける](/docs/guides/avoid-unnecessary-effects.md#calculate-values-when-they-are-read)でコストを示しているリレーパターンです。
:::

## 1 ページ分の複数のものを読み込む

商品ページには商品・そのレビュー・関連商品が必要です。
ページが作られる場所で 3 つすべてを作成すれば、同時に開始されます:

```tsx
function ProductPage(props: { id: string }) {
	const product = createMemo(() => api.product(props.id));
	const reviews = createMemo(() => api.reviews(props.id));
	const related = createMemo(() => api.related(props.id));

	return (
		<article>
			<Loading fallback={<ProductSkeleton />}>
				<ProductHeader product={product()} />
			</Loading>
			<Loading fallback={<ReviewsSkeleton />}>
				<ReviewList reviews={reviews()} />
			</Loading>
			<Loading fallback={<RelatedSkeleton />}>
				<RelatedGrid products={related()} />
			</Loading>
		</article>
	);
}
```

各バウンダリは自分のデータがそろった時点で開くため、ヘッダーをレビューより先に表示できます。
順不同で表示したくない場合は、バウンダリを [`Reveal`](/docs/reference/solid-js/components-jsx/reveal.md) で囲みます。`order="sequential"` は上から順に表示し、`order="together"` は 3 つすべてがそろうまで待ちます。

`props.id` が変わると 3 つのリクエストすべてが再開され、3 つすべてが回答するまで更新は保留されます。その後ページは一体として切り替わります。
ヘッダーとレビューが同じ商品を説明しなければならない詳細ページでは、通常それが望ましい動作です。
対象の切り替え時に遅いセクションがほかを遅らせないようにしたい場合は、そのセクションに `on={props.id}` を付けます。更新の保留が外れるため、ほかの 2 つが回答した時点でページは切り替わり、遅いセクションはその切り替え時点から自分のデータが届くまでスケルトンを表示します。
3 つすべてに `on` を付けると、クリックした瞬間にページが切り替わり、各セクションはそれぞれのデータが届くまでスケルトンを表示します。
`on` が役立つのはバウンダリの外で同じ変更を待っているものがないときだけだという理由は、[非同期リアクティビティ](/docs/concepts/async-reactivity.md#show-a-placeholder-again-loading-on)のページで説明しています。

## 依存するリクエスト

別のレスポンスの値を必要とするリクエストは、それを待たなければなりません:

```tsx
const product = createMemo(() => api.product(props.id));
const brand = createMemo(() => api.brand(product().brandId));
```

`brand` は `product().brandId` を読み取るため、`product` が解決するまで開始できません。
依存関係がコード上に見える形になっており、データが本質的に逐次である場合はこれが正しい形です。

落とし穴は、データが必要としない連鎖を作ってしまうことです。
ブランドのほかの商品も表示する商品ページは、3 段階の連鎖としても、独立した 2 つのリクエストとしても書けます:

```tsx
// Avoid: each request waits for the one before it, and only the first dependency is real
const product = createMemo(() => api.product(props.id));
const brand = createMemo(() => api.brand(product().brandId));
const catalog = createMemo(() => api.brandProducts(brand().id));

// Prefer: derive from the input you already have, so the requests start together
const product = createMemo(() => api.product(props.id));
const brand = createMemo(() => api.brand(product().brandId));
const catalog = createMemo(() => api.brandProducts(product().brandId));
```

`Avoid` の版を実行すると、`brandId` は商品が届いた時点で分かっているのに、カタログのリクエストはブランドが届くまで開始されません。
ページは、商品リクエストと残り 2 つのうち長い方の合計ではなく、3 つのリクエストの合計時間を待つことになります。
アトリビューションを有効にし、メモに `name` オプションで名前を付けておくと、開発環境では 3 つ以上の連続したリクエストの連鎖が報告されます:

```text
[ASYNC_WATERFALL] 3 sequential async flights — "product" (120ms) → "brand" (80ms) → "catalog" (95ms) — 295ms serialized: each began only after the previous resolved (as far as this graph can see). If a later request doesn't need the earlier response, derive both from the same inputs so they start together; if the dependency is intrinsic, preload the dependent data or join the requests server-side.
```

2 段の連鎖は `info` の重要度で記録されコンソールには出ません。2 段は実際のデータ依存の可能性があるからです。3 つ以上は警告になります。
50ms 未満のリクエストは 1 段として数えられません。
アトリビューションの有効化とレポートの読み方は [更新が多すぎる場合](/docs/guides/debugging-reactivity.md#something-updates-too-often) で説明しています。

依存関係が本物である場合は、回避策を講じるのではなくクライアントから取り除きます:

- すでに持っている入力を渡します。
  ルートが `brandId` を知っているなら `props` から読み取れば、両方のリクエストが同時に開始されます。
- サーバーで結合します。
  商品とそのブランドをまとめて返す 1 つのサーバー関数が、2 回の往復を 1 回に置き換えます。

## ページネーションする

ページ番号もほかと同じ入力です:

```tsx
function OrderHistory() {
	const [page, setPage] = createSignal(1);
	const [orders] = createStore(
		async () => api.orders({ page: page() }),
		[] as Order[]
	);

	return (
		<Loading fallback={<TableSkeleton />}>
			<table class={{ stale: isPending(() => orders.length) }}>
				<For each={orders}>{(order) => <OrderRow order={order} />}</For>
			</table>
			<Pager page={latest(page)} onChange={setPage} />
		</Loading>
	);
}
```

ページ 2 をクリックすると、ページ 2 が届くまでページ 1 が薄く表示されたまま残り、`latest(page)` を読むページャーは即座にページ 2 を選択済みとして表示します。
両方のページに現れる行は DOM を保持します。

新しいページごとにスケルトンを表示したい場合は、その選択をバウンダリに移します: `<Loading on={page()} fallback={<TableSkeleton />}>`。

### 無限スクロール

メモの前回の値を使ってページを累積させます:

```tsx
const [page, setPage] = createSignal(1);
const orders = createMemo(async (previous: Order[] = []) => {
	const next = await api.orders({ page: page() });
	return [...previous, ...next];
});
```

各実行は最後に確定したリストを受け取り、より長いリストを返します。
フィルター変更時にリストをリセットするには、メモの内側でフィルターを読み取り、前回実行時のフィルターと異なる場合にやり直すか、フィルターをキーにしたストアに累積リストを保持します。
最も簡単な方法は多くの場合、リスト全体をフィルターをキーにした `Show` で囲むことです。フィルターが変わると `page` が 1 に戻った状態で再マウントされます。

## 1 つのリクエストをコンポーネント間で共有する

同じメモを作成する 2 つのコンポーネントは、2 つのリクエストを発行します。
リクエストは 1 回だけ作成して値を下へ渡すか、コンテキスト経由で利用可能にします:

```tsx
function StorefrontLayout(props: ParentProps) {
	const cart = createMemo(() => api.cart());
	return <CartContext value={cart}>{props.children}</CartContext>;
}

function CartBadge() {
	const cart = useContext(CartContext);
	return <span>{cart().items.length}</span>;
}
```

`CartBadge` をヘッダーに、2 つ目の読み取り側をカートドロワーにレンダーしても、ネットワークタブにはカートのリクエストが 1 つだけ表示されます。
コンテキスト経由でアクセサーを渡すと読み取りは遅延のままです。コンポーネントが `cart()` を読むまで何もカートを待たず、そのコンポーネントのバウンダリだけが関係します。

:::note[ルート間での共有]
ルートをまたいで共有するリクエストや、引数による重複排除とキャッシュには、Solid Router の [`query`](/docs/routing/solid-router/data.md#cache-reads-with-query) を使います。
同じ引数を持つすべての呼び出し元に同じ実行中の Promise を返し、最後の読み取り側が離れた後も数分間結果を保持し、アクションがそのキーを[再検証](/docs/routing/solid-router/data.md#revalidate)すると再取得します。
:::

## データを最新に保つ

メモは問いに一度だけ答え、入力が変わるまでその答えを保持します。
入力が変わらないまま外部が変化したときは、もう一度問い合わせます:

```tsx
import { onSettled, refresh } from "solid-js";

const stats = createMemo(() => api.dashboardStats());

onSettled(() => {
	const interval = setInterval(() => refresh(stats), 30_000);
	return () => clearInterval(interval);
});
```

30 秒ごとに数値がその場で更新されます。何も薄くならず、スケルトンも表示されません。
[`refresh(source)`](/docs/reference/solid-js/lifecycle-actions/refresh.md) は同じ入力で計算を再実行し、確定した結果の Promise を返します。
単体の `refresh` は静かです。現在の答えはまだ問いに合っているため、`isPending` は `false` のまま、保留中のフェーズなしで新しい値が古い値に置き換わります。
再読み込みを見せたいときは宣言します。`refresh` の前にアクション内で [`affects(stats)`](/docs/reference/solid-js/lifecycle-actions/affects.md) を呼ぶと、それが届くまで読み取り側が保留中を報告します。

:::deep-dive[refresh が静かで、入力の変更は静かでない理由]
`isPending` は「変更された入力に対して別の答えが来ている途中か？」という問いに答えます。
`page` が 1 から 2 に変わると、確定済みの値はもう聞かれていない問いへの答えになるため、保留された更新を読む側は保留中を報告します。
`refresh` は同じ問いをもう一度尋ねます。確定済みの値はまだその問いへの有効な答えなので、何も保留中にならず、新しい値は通常の更新として届きます。
`affects(source)` は、囲んでいるアクションが実行中のあいだソースを保留中としてマークします。アクション内の再取得を可視化する仕組みです。
:::

ポーリングは、サーバーがプッシュできない場合のフォールバックです。
プッシュできる場合、[`live()` サーバー関数](/docs/building-apps/server-functions/reads-and-live-data.md#declare-a-live-source)は非同期イテラブルを返し、メモはほかの非同期ソースと同じようにそれを消費して、yield された各値が次の答えになります。

## ミューテーションしてから再取得する

書き込みは [`action`](/docs/reference/solid-js/lifecycle-actions/action.md) を通します。リクエストと再取得が 1 つの更新に属するようになるためです:

```tsx
const addReview = action(function* (productId: string, text: string) {
	yield api.addReview(productId, text);
	refresh(reviews);
});
```

レビューリストはちらつきません。再取得はアクション内で実行され、新しいデータが届いたときにリストは一度だけ更新されます。
サーバーの確認前に新しいレビューを表示するには、リストを `createOptimisticStore` に保持して `yield` の前に書き込みます。その版は [ミューテーション](/docs/concepts/mutations.md) で説明しています。

Solid Router では `@solidjs/router` の `action` がサブミッションと `query` 読み取りの自動再検証を追加します。[フォームのガイド](/docs/guides/forms.md)で使っています。

## 失敗を扱う

拒否された Promise は値と同じようにグラフを伝わり、最も近い [`Errored`](/docs/reference/solid-js/components-jsx/errored.md) バウンダリで止まります。
失敗を閉じ込めたい場所にバウンダリを配置します:

```tsx
<article>
	<Loading fallback={<ProductSkeleton />}>
		<ProductHeader product={product()} />
	</Loading>
	<Errored
		fallback={(error, reset) => <RetryPanel error={error()} onRetry={reset} />}
	>
		<Loading fallback={<ReviewsSkeleton />}>
			<ReviewList reviews={reviews()} />
		</Loading>
	</Errored>
</article>
```

レビューのリクエストが失敗するとリトライパネルが表示され、ヘッダーには影響しません。
`reset` はバウンダリが収集したソースを再試行します。入力が変わったときや `refresh` が届いたときにも、バウンダリは自力で回復します。

レスポンスが使えない場合は、`{ success: false }` オブジェクトを返して読み取りのたびに確認するのではなく、リクエストからスローします。
サーバーでは [`markSafeError`](/docs/reference/solid-web/request-response/safe-errors.md) がクライアントへ送る意図のあるメッセージをマークします。マークのないエラーは本番環境では汎用メッセージに置き換えられます。

## よくある問題

### 検索ボックスが入力内容に遅れてしまう

入力が `value={query()}` でバインドされており、結果の読み込み中は `query` への書き込みが保留されるため、リクエストが届くまで入力欄には前の値が表示されます。
`value={latest(query)}` をバインドするか、入力を制御しないままにします。

### 別の商品を開いても前の商品が表示され続ける

最初の回答の後はそれがデフォルトです。新しい商品が読み込まれるあいだ、現在の商品が画面に残ります。
対象が変わったときにスケルトンを再表示したい場合は `Loading` バウンダリに `on={props.id}` を追加し、アクセサーではなく値を渡します。

### 2 つのコンポーネントが同じリクエストを発行する

各コンポーネントが自分のメモを作成しており、各メモがそれぞれ独自のリクエストです。
共通の祖先で一度だけメモを作成してアクセサーを下へ渡すかコンテキスト経由にするか、呼び出し元が別のルートにある場合は Solid Router の `query` を使います。

### `refresh` は実行されるがローディング表示にならない

単体の `refresh` は同じ問いをもう一度尋ねるだけなので、`isPending` は `false` のまま、新しい値は静かに届きます。
再読み込みを保留中として表示したい場合は、`refresh` の前にアクション内で `affects(source)` を呼びます。

### あるリクエストが必要のない別のリクエストを待ってしまう

props やルートから取得できる同じ値を、メモが別のメモのレスポンスから読み取っている状態です。
入力を直接読み取れば両方のリクエストが同時に開始されます。アトリビューションを有効にしていれば、3 つ以上の連鎖は `[ASYNC_WATERFALL]` として報告されます。

## まとめ

- 各リクエストは、データが必要な場所で作成したメモまたはストアにします。より早く開始すべきなら上位で作成します。
- 互いに依存しないリクエストは同じスコープで作成して並列に実行します。別のレスポンスではなく、すでに持っている入力から派生させます。
- 各 `Loading` フォールバックが置き換えるべき最小の領域を囲み、対象が変わったときにフォールバックを再表示すべき場所に `on` を設定します。
- 書き込みがリクエストにつながるコントロールでは `latest` を読み、待機中のコンテンツは `isPending` でマークします。
- 古いレスポンス・ローディングフラグ・アボートコントローラーは Solid に任せます。同期的な値を返すことは確定済みの回答です。
- `refresh` で再読み込みし、再読み込みを保留中として表示したいときはアクション内で `affects` を加えます。
- 失敗したリクエストからはスローし、個別に失敗すべき各領域を `Errored` で覆います。

## 次のステップ

- [非同期リアクティビティ](/docs/concepts/async-reactivity.md): これらのパターンの土台となるモデル。保留される更新と楽観的書き込みを含みます。
- [サーバー関数](/docs/building-apps/server-functions/index.md): `GET` の読み取り、`live` ソース、`"use server"` 関数がワイヤー上で行うこと。
- [データの読み込みとミューテーション](/docs/routing/solid-router/data.md): `query`、`preload`、ルーターのアクション。
- [パフォーマンス](/docs/guides/performance.md#waterfalls): ファーストペイントが逐次リクエストを待つページの計測。
- [Solid 1 からのデータフェッチ](/docs/migration/data-fetching-from-solid-1.md): 同じパターンを反対方向から見たもの。既存コード向け。
