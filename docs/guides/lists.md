---
title: "リスト"
version: "2.0"
description: "行を作り直さずに、リストのレンダリング・編集・フィルター・ソート・選択・ウィンドウ表示を行い、作り直しが起きているときに教えてくれる診断の読み方も学びます。"
---

[ストア](/concepts/stores)ページのカートは、すべての行に数量 input があります。
数量を1つ変えても、入力中の行はそのまま残らなければなりません。input はフォーカスを保ち、行のアニメーションは再生を続け、スクロール位置も維持されます。
多くの人が最初に書くリストは、変更のたびにすべての行を作り直し、1キー打つと input がフォーカスを失うという症状が出ます。

同じ問題は検索結果、注文履歴テーブル、チャットスレッドでも起きます。
リストは小さなミスが最も大きな代償になる場所です。更新ではなく作り直された行は、その DOM・フォーカス・スクロール位置・アニメーションを失い、しかも行ごとにそれが起きるのです。

このガイドは、リストに対して何をしたいかで構成されています。
[コンポーネントと JSX](/concepts/components-and-jsx#rendering-lists)のページでは `For` と `Repeat` を紹介しています。このページはそれらを上手に使うためのものです。
例にはカートの明細アイテムを使います:

```ts
type CartItem = {
	id: string;
	name: string;
	price: number;
	quantity: number;
	savedForLater: boolean;
};
```

## 配列から行をレンダリングする

[`For`](/reference/solid-js/components-jsx/for)は配列を行にマッピングし、アイテムが戻ってきたときに行を再利用します:

```tsx
import { For } from "solid-js";

function CartLines(props: { items: CartItem[] }) {
	return (
		<ul>
			<For each={props.items} fallback={<li>Your cart is empty</li>}>
				{(item, index) => (
					<li>
						{index() + 1}. {item.name} × {item.quantity}
					</li>
				)}
			</For>
		</ul>
	);
}
```

アイテムを3つ渡せば1から3まで番号付きの3行がレンダリングされ、空配列を渡せばフォールバックの行が表示されます。
コールバックは `For` が見たことのないアイテムごとに一度だけ実行され、その JSX も一度だけ作られます。
`item` はアイテムそのものです。
`index` はアクセサーです。同じアイテムが再作成されずに別の位置へ動きうるからです。位置を表示する場所で `index()` を読んでください。

「見たことがある」とはオブジェクトの同一性を意味します。
次の更新で配列に同じオブジェクトが含まれていれば、その行は保持され、必要なら移動します。新しいオブジェクトが含まれていれば、行は破棄されて新しい行が作られます。
このページの他のすべては、このルールから導かれます。

:::deep-dive[作り直された行が失うもの]
行とは DOM ノードの集まりに、それを埋めるリアクティブスコープを足したものです。
行を破棄するとノードが消えるため、フォーカス・テキスト選択・再生中の CSS アニメーションも一緒に消えます。スコープも破棄されるため、行コンポーネントが作ったシグナルはすべて新しい行でやり直しになります。
リスト自身は、同じレコードのために行が作り直されたことを知りません。`[UNSTABLE_LIST_IDENTITY]` が存在するのは、属性付け（attribution）が破棄されたアイテムと作成されたアイテムをフィールドごとに比較し、一致したときに報告するためです。
:::

## 更新をまたいで行の同一性を保つ

同一性ルールが問題になるのは、データがサーバーから来るときです。
再フェッチは同じレコードに対して新しいオブジェクトを返すため、同一性でキー付けされたリストはすべての行を作り直します:

```tsx
const items = createMemo(() => api.cartItems()); // new objects on every refetch

<For each={items()}>{(item) => <CartLine item={item} />}</For>;
```

数量を変えた後に再フェッチすると、ユーザーが入力中の行を含め、すべての行が作り直されます。
属性付けが有効な開発ビルドでは、これは `[UNSTABLE_LIST_IDENTITY]` として報告されます。置き換えられたアイテムとフィールド単位で一致するアイテムに対して、行が破棄・再作成されたという意味です。
修正方法は2つあり、通常は2つ目がよりよい方法です。

フィールドでキー付けする。
キー関数を渡せば、`For` は同一性ではなくキーでアイテムを照合します:

```tsx
<For each={items()} keyed={(item) => item.id}>
	{(item) => <CartLine item={item()} />}
</For>
```

このモードでは、コールバックはアイテムとインデックスの両方をアクセサーとして受け取ります。
同じ `id` を持つアイテムが現れたら行は保持され、`item()` はその id の最新のオブジェクトを返すため、行の JSX は再作成されずに新しいフィールドへ更新されます。

ストアに読み込む。
ストアは各レスポンスを `id` で同じプロキシにリコンサイルするため、オブジェクト自体が同一性を保ちます:

```tsx
const [items] = createStore(async () => api.cartItems(), [] as CartItem[]);

<For each={items}>{(item) => <CartLine item={item} />}</For>;
```

こうすると `item` はストアプロキシになり、`item.quantity` は細粒度の読み取りになります。レコード1つのフィールド1つを変える再フェッチは、テキストノード1つだけを更新します。
`For` の側は何も変わっていません。データが新しいオブジェクトを生まなくなっただけです。
編集や再フェッチがあるリスト、つまりほとんどのリストで選ぶべき形はこれです。

## 行を編集する

リストをストアに入れれば、編集はパスへの書き込みになります。
イミュータブルな状態ライブラリで身についた「アイテム1つを変えるために配列を置き換える」という習慣は捨てるべきものです:

```tsx
const [items, setItems] = createStore<CartItem[]>([]);

// Avoid: a new object for the edited item, so its row is rebuilt
function saveForLater(id: string) {
	setItems((draft) =>
		draft.map((item) =>
			item.id === id ? { ...item, savedForLater: true } : item
		)
	);
}

// Prefer: change the one property on the draft
function saveForLater(id: string) {
	setItems((draft) => {
		const item = draft.find((item) => item.id === id);
		if (item) item.savedForLater = true;
	});
}
```

`Avoid` 版を、その行の数量 input にカーソルがある状態で実行すると、input はフォーカスを失います。行が解体され新しい行が作られたからです。古いアイテムオブジェクトを読んでいるものもすべて実行されます。
パスが、リーフのほとんどが変わっていないコンテナで置き換えられると、開発ビルドは `[IMMUTABLE_UPDATE_IN_STORE]` としてフラグを立てます。
`Prefer` 版では、そのアイテムの `savedForLater` プロパティを読んでいるものだけが実行されます。行は再作成されず、リストは差分比較されず、他の行には触れられません。

追加と削除も同じルールです:

```tsx
setItems((draft) => {
	draft.push({ id, name, price, quantity: 1, savedForLater: false });
});

setItems((draft) => draft.filter((item) => item.id !== id));
```

削除でセッターから新しい配列を返すのは問題ありません。残ったアイテムは同じプロキシなので、その行は保持されます。
リスト全体がサーバーから新しく届いて差分で取り込むべき場合は [`reconcile`](/reference/solid-js/stores/reconcile)を使います。

## フィルターとソート

表示するリストは導出します。ストアには入れません:

```tsx
const [filter, setFilter] = createSignal<"all" | "active" | "saved">("all");
const [sortBy, setSortBy] = createSignal<"added" | "name" | "price">("added");

const visible = createMemo(() => {
	const list = items.filter((item) =>
		filter() === "all"
			? true
			: filter() === "saved"
				? item.savedForLater
				: !item.savedForLater
	);
	return list.sort((a, b) =>
		sortBy() === "name"
			? a.name.localeCompare(b.name)
			: sortBy() === "price"
				? a.price - b.price
				: 0
	);
});

<For each={visible()}>{(item) => <CartLine item={item} />}</For>;
```

ソートを価格に切り替えると行は新しい順序に移動します。どの行も再作成されません。
`visible()` は変更のたびに新しい配列になりますが、それで問題ありません。
中のアイテムは以前と同じプロキシなので、`For` はすべての行を保持し、並べ替えや非表示だけを行います。

:::note[導出された配列はリストの作り直しではない]
導出された配列のコストは差分です。新しいオブジェクト群のコストは作り直しです。
この2つは別物で、問題になるのは後者だけです。
:::

導出リストが大きく複数の読み手から読まれる場合は、[`createProjection`](/reference/solid-js/stores/create-projection)が配列の代わりにストア型の結果を生成するため、個別の行を読む側はリスト全体を購読しなくて済みます。その形は[ストア](/concepts/stores#derive-a-store-with-a-projection)で示しています。

## 行を選択する

注文履歴テーブルで選択中の行をハイライトするのは、古典的なパフォーマンスの落とし穴です。素直に書くと、選択が変わるたびにすべての行が再評価されます。

```tsx
const [selectedId, setSelectedId] = createSignal<string>();

// Avoid: every row reads selectedId(), so every row re-evaluates on each change
<tr class={{ selected: selectedId() === order.id }}>...</tr>;

// Prefer: a store keyed by id, so each row reads only its own key
const [selected, setSelected] = createStore<Record<string, boolean>>({});

function select(id: string) {
	setSelected((draft) => {
		for (const key of Object.keys(draft)) delete draft[key];
		draft[id] = true;
	});
}

<tr class={{ selected: selected[order.id] }} onClick={() => select(order.id)}>
	...
</tr>;
```

`Avoid` 版は数十行なら何も問題ありません。数千行では、クリックのたびに全行の `class` バインディングが再評価されます。
`Prefer` 版では、選択がある行から別の行へ移るときに更新されるのはちょうど2行です。キーを失った行と、キーを得た行です。
同じストアがそのまま複数選択にも対応します。他のキーを消さずに残せばよいだけです。

選択された id がルートパラメータなど別の場所にすでにある場合は、手書きする代わりに [`createProjection`](/reference/solid-js/stores/create-projection)でそこからストアを導出します:

```tsx
const isSelected = createProjection<Record<string, boolean>>((draft) => {
	for (const key of Object.keys(draft)) delete draft[key];
	draft[params.id] = true;
}, {});
```

## 大きなリストにウィンドウをレンダリングする

`For` はアイテムごとに行を作ります。
アカウントの全注文履歴のように、長すぎて問題になるリストでは、画面に見えている行だけをレンダリングします。

[`Repeat`](/reference/solid-js/components-jsx/repeat)は、配列を切り出さずに、ストア上の位置の範囲をレンダリングします:

```tsx
import { Repeat, createSignal, createStore } from "solid-js";

function OrderHistory(props: { orders: Store<Order[]> }) {
	const [from, setFrom] = createSignal(0);
	const size = 50;

	return (
		<ul
			onScroll={(event) =>
				setFrom(Math.floor(event.currentTarget.scrollTop / ROW_HEIGHT))
			}
		>
			<Repeat
				from={from()}
				count={Math.min(size, props.orders.length - from())}
			>
				{(index) => <li>{props.orders[index].number}</li>}
			</Repeat>
		</ul>
	);
}
```

スクロールしても、DOM に存在するのは表示中の50行だけです。
各行はストアから `props.orders[index]` を直接読むため、注文1件の変更は1行だけを更新します。
`from` が動くと、インデックスが範囲内に残る行は保持され、範囲を外れた行は破棄され、新しいインデックスの行が作られます。

:::caution[Repeat は位置ベース]
`Repeat` の行はそのインデックスにあるものを何でも表示します。そのためログ・テーブル・グリッドなどのストアデータに適しています。
リストの並び替えで行がアイテムについて回る必要がある場合は向きません。そういうものには `For` を使います。
:::

可変の高さを持つ本格的なバーチャライザーが必要ならライブラリを使います。上のパターンは、そうしたライブラリの土台になっているものです。

## ローディングと空の状態を表示する

この2つは別の状態で、使う道具も違います。
`For` の `fallback` は空の状態、つまりアイテムのない確定済みリストです。
`Loading` バウンダリは「まだ来ていない」状態です:

```tsx
<Loading fallback={<ListSkeleton />}>
	<ul>
		<For each={items} fallback={<li>Your cart is empty</li>}>
			{(item) => <CartLine item={item} />}
		</For>
	</ul>
</Loading>
```

最初のレスポンスが来るまではスケルトンが表示され、そのレスポンスが空なら "Your cart is empty" の行が表示されます。
再フェッチでスケルトンは戻りません。行はそのまま残り、待機中に行を薄くしたければ `isPending(() => items.length)` が待機を報告します。

## よくある問題

### リストが変わると行がフォーカスやアニメーションを失う

更新のたびにアイテムが新しいオブジェクトになっています。
フィールドでキー付けするか、ストアに読み込んでください。[更新をまたいで行の同一性を保つ](#keep-row-identity-across-updates)を参照してください。

### 並び替え後に行が間違ったインデックスを表示する

コールバックが `index()` を一度だけキャプチャし、JSX の中で読んでいません。
リアクティブであり続けるよう JSX 式の中で `index()` を読むか、行をアイテムではなく位置に結び付けるべき場合は `keyed={false}` を使います。

### アイテム1つの編集でリスト全体が作り直される

リストがシグナル内のプレーンなオブジェクトの配列で、編集時に配列やオブジェクトが置き換えられています。
リストをストアに移し、ドラフトを変更してください。

### `items.push(item)` が何もしない

ストアプロキシはセッターの外からの書き込みを捨てます。
`setItems((draft) => { draft.push(item); })` を通して書き込んでください。

## まとめ

- `For` は同じオブジェクトが戻れば行を保持し、新しいオブジェクトが現れれば作り直します。他のすべてのルールはここから導かれます。
- サーバーのリストは `createStore(async () => ..., [])` でストアに読み込むか、`keyed={(item) => item.id}` を渡して、再フェッチで行が作り直されないようにします。
- 編集はセッターのドラフト上のプロパティ1つに対して行います。スプレッドを使った `map` は新しいオブジェクトと新しい行を生みます。
- フィルターやソート済みのビューはメモで導出します。同じプロキシからなる新しい配列は差分であり、作り直しではありません。
- 選択状態は id でキー付けしたストアに入れれば、変更は全行ではなく2行だけに及びます。
- 大きな位置ベースのリストへのウィンドウには `Repeat` を、行がアイテムについて回る必要がある場合は `For` を使います。
- 空の状態には `For` の `fallback` を、「まだ来ていない」状態には `Loading` バウンダリを使います。

## 次のステップ

- [コンポーネントと JSX](/concepts/components-and-jsx#rendering-lists): `For` と `Repeat` のコールバックの形。
- [ストア](/concepts/stores): ドラフトセッター、プロジェクション、リコンサイル。
- [データフェッチのパターン](/guides/data-fetching-patterns): サーバーからのリスト読み込み、ページネーション、無限スクロール。
- [リアクティビティのデバッグ](/guides/debugging-reactivity#a-list-rebuilds-rows-for-the-same-records): `UNSTABLE_LIST_IDENTITY` と `IMMUTABLE_UPDATE_IN_STORE` レポートの詳細。
- [パフォーマンス](/guides/performance#lists): 行1つが変わったときに何が再実行されるかの測り方。
