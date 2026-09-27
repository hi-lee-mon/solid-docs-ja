---
title: "ストア"
version: "2.0"
description: "カート、フォーム、あらゆるネストされたオブジェクトをストアに保持します。ドラフトでプロパティ1つを更新し、プロジェクションでフィルター済みのビューを導出し、サーバーデータを同じプロキシに読み込みます。"
---

[コンポーネントと JSX](/docs/concepts/components-and-jsx.md) のページのカートは、商品をシグナルに保持していました。
ユーザーが数量を編集するまでは、それで十分です。
数値を1つ変えるだけで、新しいオブジェクトを1つ含む新しい配列を組み立てなければならず、`For` は古い行があった場所に新しいオブジェクトを見ます。その行は破棄されて作り直され、その行の input に入力中だったなら、入力していた input は失われます。

ストアは、各プロパティを個別に追跡することでこれを解決します。
`items[1].quantity` を変えれば、それを読んでいるテキストノード1つだけが更新されます。
何もコピーされず、どの行も作り直されず、input はフォーカスを保ちます。

値が1つの単位として読み取られ置き換えられる場合はシグナルを使います。カウント、選択された id、文字列などです。
読み取り側がオブジェクトや配列の個別の部分を必要とする場合はストアを使います。アプリケーションの状態のほとんどはこちらに当てはまります。

## ネストされた状態を作る

[`createStore`](/docs/reference/solid-js/stores/create-store.md) はオブジェクトまたは配列を受け取り、読み取り専用のプロキシとセッターを返します:

```tsx
import { For, createStore } from "solid-js";

type CartItem = {
	id: string;
	name: string;
	price: number;
	quantity: number;
	savedForLater?: boolean;
};

export function Cart() {
	const [cart, setCart] = createStore({
		items: [
			{ id: "mug", name: "Mug", price: 12, quantity: 1 },
			{ id: "tee", name: "T-shirt", price: 20, quantity: 2 },
		] as CartItem[],
		coupon: "",
	});

	return (
		<>
			<ul>
				<For each={cart.items}>
					{(item) => (
						<li>
							{item.name}
							<input
								type="number"
								min="1"
								value={item.quantity}
								onInput={(event) =>
									setCart((draft) => {
										const target = draft.items.find((i) => i.id === item.id);
										if (target)
											target.quantity = event.currentTarget.valueAsNumber || 1;
									})
								}
							/>
						</li>
					)}
				</For>
			</ul>
			<p>{cart.items.length} lines</p>
		</>
	);
}
```

Tシャツの数量を3に変えてみてください。
その input 1つの `value` が更新され、ページ上の他のものには何も触れられません。マグカップの行、行数のカウント、input を囲む `<li>` はすべてそのままです。

追跡スコープ内で行われた各プロパティの読み取りは、そのスコープをそのプロパティに購読させます。ネストされたオブジェクトや配列インデックス経由の読み取りも含みます。
`item.quantity` は input を1つの数値に購読させ、`cart.items.length` は段落を配列の length に購読させました。
`cart.coupon` への書き込みはどちらも更新しません。

ストアのプロパティは値であり、アクセサーではありません。
`cart.coupon()` ではなく `cart.coupon` と読みます。
どこで読むかのルールはシグナルと同じです。読み取り側が更新すべきなら JSX・メモ・エフェクトの計算関数の内側で読み、コンポーネント本体での読み取りは1回限りのスナップショットです。

:::deep-dive[ストアがプロパティを1つずつ追跡する仕組み]
プロキシは事前にすべてのプロパティへシグナルを作るわけではありません。
追跡されたコンシューマーがプロパティを最初に読んだときに追跡ノードを作り、読まれたプロパティに対してのみ作ります。
ネストされたオブジェクトと配列は、最初に到達したときに独自のプロキシでラップされるため、1000行あるストアでも、何も読んでいない行にはコストがかかりません。
`cart.items[0].quantity` の読み取りと `cart.items.length` の読み取りが2つの独立した購読を生むのはこのためです。2つは別のノードです。
:::

## ドラフトで更新する

セッターはドラフトを受け取ります。
通常のプロパティ代入や配列メソッドでそれを変更すると、コールバックが返ったときに Solid がストアへ変更を適用します:

```ts
setCart((draft) => {
	draft.coupon = "SAVE10";

	const mug = draft.items.find((item) => item.id === "mug");
	if (mug) mug.quantity += 1;

	draft.items.push({ id: "cap", name: "Cap", price: 15, quantity: 1 });
});
```

3つのプロパティが変わり、3つの購読に通知されます。クーポンの読み取り側、マグカップの数量 input、`length` の読み取り側です。
Tシャツの行には触れられません。

イミュータブルな状態の習慣ではコレクションを組み直します。
その習慣はストアが与えるものを台無しにします:

```ts
// Avoid: a new object for the changed item, so For rebuilds that row
setCart((draft) => {
	draft.items = draft.items.map((item) =>
		item.id === id ? { ...item, quantity } : item
	);
});

// Prefer: change the one property on the draft
setCart((draft) => {
	const item = draft.items.find((item) => item.id === id);
	if (item) item.quantity = quantity;
});
```

その行の input にカーソルがある状態で `Avoid` 版を実行すると、行が破棄されて新しいものが作られるため、input はフォーカスを失います。
`Prefer` 版は `value` バインディング1つだけを更新します。

:::pitfall[セッターの外でストアに書き込んでも何も起きない]
ストアのプロキシは読み取り専用です。
セッターの外での `cart.items[0].quantity = 2` のような代入は無視されます。エラーも投げず、警告も出ず、値も変わりません。
書き込みが消えたように見えるときは、`setCart` を経由していない書き込みを探してください。
イベントハンドラーやアクション内からの変更も含め、すべての変更はセッターのドラフトを通ります。
:::

コールバックは変更の代わりに置き換え値を返しても構いません。
配列の場合、Solid は返されたエントリーをインデックスで書き込み、長さを調整します。
オブジェクトの場合、Solid は存在するキーを書き込み、欠けているキーを削除します:

```ts
setCart((draft) => {
	draft.items = draft.items.filter((item) => item.quantity > 0);
});
```

返された、あるいは代入されたコレクションは配列をインデックスで置き換え、生き残ったアイテムは同じオブジェクトなので、それらのプロキシと行は維持されます。
新しい配列が新しいオブジェクトを保持している場合（新鮮なサーバーレスポンスなど）、古いものと対応付けるものはありません。[プロジェクション](#derive-a-store-with-a-projection) の中でキーでリコンサイルするか、`reconcile` を使ってください。

ストアへの書き込みはステージングされ、シグナルへの書き込みと同じバッチで適用されるため、次の行での読み取りはバッチが適用されるまで前の値を見ます。
[更新が適用されるタイミング](/docs/concepts/reactivity.md#when-updates-land) で、バッチと `flush()` を呼ぶタイミングを説明しています。

:::note[Solid 1 のパスセッター]
[`storePath`](/docs/reference/solid-js/advanced/store-advanced/store-path.md) は、Solid 1 が使っていたパスと値の形式 `setCart(storePath("coupon", "SAVE10"))` を受け付けます。まだ移行していないコード向けです。
新しいコードはドラフトを使います。
:::

## プロジェクションでストアを導出する

プロジェクションは、値が他のリアクティブな値から計算されるストアです。
メモが値を1つ導出するのに対し、プロジェクションはプロパティが個別に追跡されるオブジェクトや配列を導出し、そのアイテムは計算をまたいで同一性を保ちます。

[`createProjection`](/docs/reference/solid-js/stores/create-projection.md) は関数とシードを受け取ります。
関数はシードのドラフトを受け取り、それを変更するか置き換え値を返せます。返された配列は `id` でストアにリコンサイルされます:

```tsx
import { For, createProjection, createSignal, createStore } from "solid-js";

function Cart() {
	const [cart] = createStore({ items: [] as CartItem[] });
	const [showSaved, setShowSaved] = createSignal(false);

	const visible = createProjection(
		() => cart.items.filter((item) => showSaved() || !item.savedForLater),
		[] as CartItem[]
	);

	return (
		<>
			<label>
				<input
					type="checkbox"
					checked={showSaved()}
					onInput={(event) => setShowSaved(event.currentTarget.checked)}
				/>
				Show saved for later
			</label>
			<ul>
				<For each={visible}>{(item) => <li>{item.name}</li>}</For>
			</ul>
		</>
	);
}
```

チェックボックスをオンにすると、保存済みのアイテムが現れます。
すでに表示されていた行は、以前と同じ DOM ノードです。プロジェクションがそれらを `id` で一致させたため、`For` はプロキシを維持し、作り直しませんでした。

データが別の同一性フィールドを使う場合はキー名を渡し、位置で一致させるなら `null` を渡します。
シードは結果がリコンサイルされる先の裏側のオブジェクトなので、ルートプロキシも再計算をまたいで同一性を保ちます。

導出されたコレクションやオブジェクトにはプロジェクションを使います。
カート合計のような導出された数値や文字列には、メモを使います:

```ts
const total = createMemo(() =>
	cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
);
```

### ストアへフェッチする

プロジェクションの関数は Promise を返しても構いません。
`createStore` の関数形式はセッター付きのプロジェクションであり、サーバーデータをストアに読み込む通常の方法です:

```ts
const [cart, setCart] = createStore(async () => api.cart(), {
	items: [] as CartItem[],
});
```

リクエストはストアが作られたときに開始され、関数が読んだリアクティブな値が変わるたびに再度開始されます。
各レスポンスは `id` で同じプロキシにリコンサイルされるため、サーバーが変えなかったアイテムは同一性と DOM を保ちます。
[`Loading`](/docs/concepts/boundaries.md) バウンダリは最初のレスポンスの前にフォールバックを表示し、[`isPending(() => cart.items)`](/docs/reference/solid-js/reactivity/is-pending.md) は再フェッチを報告し、[`refresh(cart)`](/docs/reference/solid-js/lifecycle-actions/refresh.md) はサーバーへ再度問い合わせます。

非同期関数では、シードはデフォルトでは最初の答えとして表示されません。読み取り側は非同期メモと同じように最初のレスポンスを待ちます。
[非同期リアクティビティ](/docs/concepts/async-reactivity.md) でその待機と、シードを受け入れ可能な最初の答えにする `seedLoadingValue` オプションを説明しています。

同じレスポンスを別の形で使う2人目の読み取り側がいる場合にのみ、リクエストを独自のメモに分けてください:

```ts
const response = createMemo(() => api.cart());
const [cart] = createStore(() => response(), { items: [] as CartItem[] });
const itemCount = createMemo(() => response().items.length);
```

その2人目の読み取り側がいなければ、1行の形式が正しい形です。

## 楽観的ストア

[`createOptimisticStore`](/docs/reference/solid-js/stores/create-optimistic-store.md) は同じドラフトセッターを持ち、1つだけ違いがあります。[`action`](/docs/reference/solid-js/lifecycle-actions/action.md) の内側で行われた書き込みは仮のものです。
すぐに表示され、アクションが確定すると Solid はそれを取り除き、ストアがソースから導出する値を表示します:

```ts
import { action, createOptimisticStore, refresh } from "solid-js";

const [cart, setCart] = createOptimisticStore(async () => api.cart(), {
	items: [] as CartItem[],
});

const setQuantity = action(function* (id: string, quantity: number) {
	setCart((draft) => {
		const item = draft.items.find((item) => item.id === id);
		if (item) item.quantity = quantity;
	});
	yield api.setQuantity(id, quantity);
	refresh(cart);
});
```

`setQuantity("mug", 3)` を呼ぶと、input は即座に3を表示します。
リクエストが完了すると、サーバーから再取得されたカートが仮の値を置き換えます。サーバーが同意したなら見た目は何も変わらず、リクエストが失敗したなら数量はサーバーが持つ値に戻ります。

[ミューテーション](/docs/concepts/mutations.md) のページでは、上記のクライアントのみのカートから、一度に1つの変更ずつこれを組み立てていきます。

## よくある問題

### ストアへの書き込みが何もしなかった

書き込みがセッターのドラフトではなくプロキシに向かいました。`setCart((draft) => { draft.coupon = "SAVE10"; })` ではなく `cart.coupon = "SAVE10"` と書いた場合です。
セッターの外の書き込みはエラーなく無視されます。

### アイテム1つを変えるとすべての行が作り直される

セッターがアイテムオブジェクトを置き換えました。多くの場合 `map` とスプレッドで。
`For` は行をオブジェクトの同一性でキー付けするため、新しいオブジェクトは新しい行です。
代わりにドラフト上のプロパティを変えてください。データがサーバーから新鮮な配列として届くなら、アイテムが `id` で一致させられるよう [プロジェクション](#derive-a-store-with-a-projection) を通して読み込んでください。

### `cart.items.length` が一度レンダリングされて二度と更新されない

その読み取りはコンポーネント本体で、追跡スコープの外で起きました。
ストアの読み取りはシグナルの読み取りと同じルールに従います。読み取りは JSX・メモ・エフェクトの計算関数の中に置いてください。
開発環境ではコンポーネント名付きで `[STRICT_READ_UNTRACKED]` が出力されます。

### ストア内の `Map`・`Date`・クラスインスタンスが追跡されない

プレーンなオブジェクト・配列・クラスインスタンスはプロキシでラップされますが、`Map`・`Set`・`Date` のようなプラットフォームオブジェクトはそのまま格納されます。
セッターを通してプロパティに新しいインスタンスを再代入して読み取り側に通知するか、データをプレーンなオブジェクトと配列で保持してください。

## まとめ

- 部分が個別に読まれるオブジェクトや配列にはストアを、単位として置き換えられる値にはシグナルを使います。
- ストアのプロパティは追跡スコープの内側で `cart.coupon` のように値として読みます。
- 状態はセッターのドラフトで変更します。プロキシ自体への書き込みは無視されます。
- コレクションを組み直すのではなく変わったプロパティ1つを代入して、行が同一性を保つようにします。
- `createProjection` でコレクションを導出します。これは結果を `id` でリコンサイルします。スカラーは `createMemo` で導出します。
- `createStore(async () => ..., seed)` でサーバーデータを読み込みます。各レスポンスは同じプロキシにリコンサイルされます。
- `createOptimisticStore` の `action` 内で楽観的な書き込みを行い、リクエストが確定したらソースを `refresh` します。

## 次のステップ

- [非同期リアクティビティ](/docs/concepts/async-reactivity.md): `createStore(async () => ...)` が待機している間に読み取り側が見るもの、そして再フェッチ中に現在のカートが画面に残る理由。
- [ミューテーション](/docs/concepts/mutations.md): サーバーに対するアクションとしてのカートの `add`・`remove`・`setQuantity`。楽観的オーバーレイと再取得付き。
- [リスト](/docs/guides/lists.md): 編集、フィルタリング、選択、そしてサーバー再フェッチをまたいだ行の同一性の維持。このページのストアパターンを使います。
- [不要なエフェクトを避ける](/docs/guides/avoid-unnecessary-effects.md): 派生ストアを、別のストアへコピーするエフェクトではなくプロジェクションにすべき場合。
- [パフォーマンス](/docs/guides/performance.md#stores-at-scale): 数千行のストアに対するキー付きリコンサイルとプロジェクション。
