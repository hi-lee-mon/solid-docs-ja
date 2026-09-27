---
title: "リアクティビティ"
version: "2.0"
description: "シグナル・メモ・エフェクト。Solid が読み取りをどう追跡するか、コンポーネントがなぜ1回だけ実行されるのか、値がいつ更新されるのかをどう見分けるか。"
---

[クイックスタート](/getting-started/quick-start)では、同じカウンターの2つのバージョンを見ました。
1つは JSX の内側で `count()` を読み取り、クリックのたびに更新されました。
もう1つはコンポーネント本体で `count()` を読み取り、ボタンはゼロのまま固まり、コンソールはその読み取りが「更新されない」と警告しました。

このページのすべての内容は、その2行の違いから導かれます。
Solid はコンポーネントを再実行しません。
各コンポーネントを1回だけ実行し、各式がどのリアクティブな値を読み取ったかを記録し、読み取られた値が変わったときにその式だけを再実行します。
値をどこで読み取るかが、Solid がその読み取りを見られるかどうかを決めます。

例では小さなショッピングカートを使います。価格と数量を持つ明細、小計、配送料の見積もりです。

## シグナル

シグナルは1つの値を保持し、誰がそれを読み取ったかを知っています。
`createSignal` はゲッターとセッターを返します:

```tsx
import { createSignal } from "solid-js";

export function LineItem() {
	const [quantity, setQuantity] = createSignal(1);
	const price = 12;

	return (
		<div>
			<button type="button" onClick={() => setQuantity(quantity() - 1)}>
				−
			</button>
			<span>{quantity()}</span>
			<button type="button" onClick={() => setQuantity(quantity() + 1)}>
				+
			</button>
			<p>Subtotal: ${quantity() * price}</p>
		</div>
	);
}
```

`+` をクリックすると、ページ上の2つのものが変わります。数量と小計です。
他のものは一切触れられません。
`LineItem` は再実行されません。`quantity()` を読み取っている2つの JSX 式が再実行されます。

Solid が読み取りを記録するコードの領域は、追跡スコープと呼ばれます。
JSX 式は追跡スコープです。
このページの後半に出てくるメモとエフェクトの計算関数も同様です。
追跡スコープの内側での読み取りは、そのスコープをシグナルに購読させます。
それ以外の場所での読み取りは現在の値を返すだけで、何も購読しません。

コンポーネント本体は追跡スコープではありません。
これは意図的です。本体はコンポーネントをセットアップするために1回だけ実行され、Solid はそれを再実行してはなりません。再実行すれば、その内側のすべてのシグナルと子要素が作り直されてしまうからです。
つまり、このバージョンは数量を一度だけ読み取り、二度と読み取りません:

```tsx
const [quantity, setQuantity] = createSignal(1);
const subtotal = quantity() * price; // a number, computed once

return <p>Subtotal: ${subtotal}</p>;
```

開発時には Solid が警告を出します:

```text
[STRICT_READ_UNTRACKED] Reactive value read directly in <LineItem> will not update.
Move it into a tracking scope (JSX, a memo, or an effect's compute function).
```

修正は、値ではなく読み取りを移動することです。
計算を関数でラップし、その関数を JSX から呼び出します:

```tsx
const subtotal = () => quantity() * price;

return <p>Subtotal: ${subtotal()}</p>;
```

これで `quantity()` の読み取りは、JSX が `subtotal()` を呼び出すときに、追跡スコープの内側で行われ、小計は更新されます。

一度きりのスナップショットが欲しいこともあります。
その場合は [`untrack`](/reference/solid-js/reactivity/untrack) で明示します。これは購読せず、警告も出さずに読み取ります:

```tsx
const initialQuantity = untrack(quantity);
```

セッターは値または更新関数（updater）を受け取ります。
更新関数は最新の値を受け取ります。同じイベント内で先に設定され、まだ反映（land）していない値も含みます:

```tsx
setQuantity((current) => current + 1);
```

新しい値が古い値に依存するときは、更新関数を使ってください。
`setQuantity(quantity() + 1)` はコミット済みの値を読み取るため、同じターン内で他の何かがすでに書き込みを予約（stage）していた場合、2つの書き込みが衝突します。
「反映（landed）」の意味は[更新のスケジューリング](#when-updates-land)の節で説明しています。

セッターの形式と等価性オプションについては、[`createSignal` リファレンス](/reference/solid-js/reactivity/create-signal)を参照してください。

:::deep-dive[10行のシグナル]
実際の実装にはバッチ・等価性チェック・オーナーシップ・非同期が加わりますが、追跡ルールを説明する形はスケッチに収まります:

```ts
let currentScope: Scope | null = null; // set by Solid while a tracking scope runs

function createSignal<T>(value: T) {
	const subscribers = new Set<Scope>();
	const read = () => {
		if (currentScope) subscribers.add(currentScope);
		return value;
	};
	const write = (next: T) => {
		value = next;
		for (const scope of subscribers) scope.rerun();
	};
	return [read, write] as const;
}
```

`read` は、呼ばれた瞬間に追跡スコープが実行中でなければ、購読者を記録できません。
コンポーネント本体での読み取りは `currentScope` が空のときに実行されるため、値を返すだけで何も記録しません。どこで読み取るかが重要な理由は、これがすべてです。
:::

## 派生値

上の `subtotal` は素の関数です。
自身の状態は持たず、呼び出されたときに、それを呼び出した追跡スコープの中で `quantity()` を読み取ります。
これが派生値の正しいデフォルトであり、Solid アプリの派生値のほとんどはこのような関数です。

関数は、読み取り側が呼び出すたびに再計算されます。
同じ導出が複数の読み取り側を賄うとき、計算が高価なとき、あるいは結果が変わったときだけ下流の読み取り側を更新したいときは、メモを使います:

```tsx
import { createMemo, createSignal } from "solid-js";

const [quantity, setQuantity] = createSignal(1);
const [discountCode, setDiscountCode] = createSignal("");
const price = 12;

const subtotal = createMemo(() => quantity() * price);
const discount = createMemo(() => (discountCode() === "SAVE10" ? 0.1 : 0));
const total = createMemo(() => subtotal() * (1 - discount()));
```

`createMemo` はその関数を追跡スコープ内で実行し、結果をキャッシュして、キャッシュされた値を読み取り側に渡します。
`quantity` が変わると、`subtotal` は再計算されます。
`total` は `subtotal()` を読み取っているため再計算されます。
ユーザーが `SAVE10` と入力する途中で `SAVE1` と打ったとき、`discount` は再計算され、再び `0` を生成します。結果が前回と等しいため、`total` には通知されません。
この等価性チェックが、メモを派生の連鎖における有用な境界にしています。

メモの関数はシグナルやストアに書き込んではいけません。
メモは更新の途中に実行されるため、その内側での書き込みは開発時に `[REACTIVE_WRITE_IN_OWNED_SCOPE]` を throw します。
メモから書き込みたくなったときは、書こうとしていた値自体が派生値です。代わりにそれを返してください。

メモの関数は非同期でも構いません。
Promise を返すと、メモの読み取り側は結果を待ち、その間に最も近い [`Loading`](/concepts/boundaries) バウンダリがフォールバックを表示します。
[非同期リアクティビティ](/concepts/async-reactivity)のページで詳しく扱っています。

## 更新が反映されるタイミング

シグナルを設定しても、読み取り側はすぐには更新されません。
書き込みは予約（stage）され、Solid は現在のコードが終わったあと、マイクロタスクですべての予約済み書き込みをまとめて適用します。
1つのイベントハンドラーの中で複数のシグナルを設定でき、すべての読み取り側は個々の中間状態ではなく最終状態を一度だけ目にします。

これはまた、書き込みの直後の読み取りが古い値を返すことも意味します:

```ts
const [quantity, setQuantity] = createSignal(1);

setQuantity(3);
console.log(quantity()); // 1

await Promise.resolve();
console.log(quantity()); // 3
```

アプリケーションコードがこれに気づくことはめったにありません。
イベントハンドラーは値を設定して戻り、JSX とメモは追跡スコープ内で値を読み取り、バッチが反映されたときに更新されます。
この遅延が姿を見せるのは2箇所です。イベント直後に検証するテストと、書き込み直後にシグナルを読み取る命令的なコードです。
[`flush()`](/reference/solid-js/reactivity/flush) は予約済みの書き込みを同期的に適用します:

```ts
setQuantity(3);
flush();
console.log(quantity()); // 3
```

`basic` テンプレートのテストが `fireEvent.click` のあとに `flush()` を呼ぶのはこのためです。

## エフェクト

シグナル・関数・メモはデータを JSX へ向かって運びます。
エフェクトはデータを Solid の外へ、Solid が所有しないものへ運びます。ブラウザのストレージ、ドキュメントのタイトル、チャートライブラリ、WebSocket などです。

[`createEffect`](/reference/solid-js/reactivity/create-effect) は2つの関数を受け取ります。
1つ目は計算関数（compute function）で、追跡スコープ内で実行され、値を返します。
2つ目はエフェクト関数（effect function）で、その値を受け取り、命令的な処理を行います。
これは追跡されず、更新が反映されて DOM がそれを表したあとに実行されます:

```tsx
import { createEffect, createSignal } from "solid-js";

const [quantity, setQuantity] = createSignal(1);

createEffect(
	() => quantity(),
	(value, previous) => {
		localStorage.setItem("cart:quantity", String(value));
		console.log({ previous, value });
	}
);
```

エフェクトを再実行させたい読み取りは、すべて計算関数に入れてください。
エフェクト関数内で読み取られたシグナルは追跡されないため、それを変更してもエフェクトは再実行されません。
2つのフェーズを分けることで依存関係のリストが可視化されます。計算関数がそのリストです。

エフェクト関数はクリーンアップを返せます。
Solid は次のエフェクト実行の前と、所有するコンポーネントが破棄されるときにクリーンアップを実行します:

```tsx
createEffect(
	() => productId(),
	(id) => {
		const source = new EventSource(`/stock/${id}`);
		source.onmessage = (event) => setStock(Number(event.data));
		return () => source.close();
	}
);
```

エフェクト関数が受け付ける戻り値は、クリーンアップ関数と `undefined` だけです。
セッターは設定した値を返すため、`(value) => setDraft(value)` ではなく `(value) => { setDraft(value); }` とブレース付きで書いてください。開発用ビルドはそれ以外の戻り値に対して throw します。

エフェクトを書く前に、その値が代わりに派生関数やメモにできないか確認してください。
あるシグナルを別のシグナルへコピーするエフェクトは、同じ状態の2つ目のコピーを作ることになり、更新のたびに2つのコピーが一瞬ずれます。
ガイドの[不要なエフェクトを避ける](/guides/avoid-unnecessary-effects)では、よくあるケースを順に扱っています。派生値、非同期データ、props の編集可能なコピー、イベント駆動の処理です。

## オーナーシップ

すべてのメモ・エフェクト・クリーンアップはオーナーに属します。
コンポーネントはオーナーです。
Solid がコンポーネントをページから取り除くとき、そのコンポーネントが作ったすべてのものを破棄します。購読は解除され、クリーンアップが実行され、メモとエフェクトは停止します。
だからこそ、コンポーネントはエフェクトを作成して、それを片付けることを考えずにいられます。

オーナーとは、プリミティブが作成されたときに実行中だったものです。

:::pitfall[イベントハンドラー内で作られたエフェクトは破棄されない]
イベントハンドラーはオーナーなしで後から実行されるため、そこで作られたものを片付ける存在がいません。

```tsx
// Avoid: a new, unowned effect on every click
<button onClick={() => createEffect(() => quantity(), (q) => trackQuantity(q))}>

// Prefer: create it once in the component body, which owns and disposes it
createEffect(
	() => quantity(),
	(q) => trackQuantity(q)
);
```

`Avoid` 版ではクリックのたびに、ページの存続期間中ずっと動く新しいエフェクトが追加され、開発時には警告が出ます:

```text
[NO_OWNER_EFFECT] Effects created outside a reactive context will never be disposed
```

イベントをきっかけにエフェクトを始めたい場合は、本体で作成し、ハンドラーが設定するシグナルでゲートしてください。
:::

### コンポーネント間で状態を共有する

複数のコンポーネントが同じ状態を必要とするときは、ツリー内でそれらすべてを覆うのに十分高い位置のコンポーネントで一度だけ作成し、[コンテキスト](/concepts/components-and-jsx#context)を通じて下へ渡します:

```tsx
import {
	createContext,
	createSignal,
	useContext,
	type ParentProps,
} from "solid-js";

type CartItem = { id: string; name: string; price: number };
type CartContextValue = ReturnType<typeof createCart>;

function createCart() {
	const [items, setItems] = createSignal<CartItem[]>([]);
	const add = (item: CartItem) => setItems((list) => [...list, item]);
	return { items, add };
}

const CartContext = createContext<CartContextValue>();

export function CartProvider(props: ParentProps) {
	return <CartContext value={createCart()}>{props.children}</CartContext>;
}

export function useCart() {
	return useContext(CartContext);
}
```

`createCart()` は `CartProvider` の内側で実行されるため、プロバイダーがその状態を所有し、プロバイダーがページを離れるときに破棄します。
任意の子孫が `useCart()` を呼び出せます。途中のコンポーネントに props を通す必要はありません。
コンテキストにデフォルト値はないため、`CartProvider` の外で `useCart()` を呼ぶと `ContextNotFoundError` を throw します。null チェックを書く必要はありません。

これはモジュールスコープでシグナルを作るよりも好ましい方法です。
モジュールスコープの状態にはオーナーがないため破棄するものがなく、サーバーレンダリング中は1つのモジュールインスタンスがすべてのリクエストで共有され、あるユーザーの状態が別のユーザーのレスポンスへ漏れます。
コンテキスト値はアプリごとに、サーバーではリクエストごとに作られます。
[状態管理](/guides/state-management#module-level-state-and-the-server)では、サーバーがモジュールスコープのストアに何をするのか、代わりにどこへ作るべきかを説明しています。

### ルート

[`createRoot`](/reference/solid-js/advanced/owner-introspection/create-root) は手動でオーナーを作成し、その disposer（破棄関数）を渡します。
これは、どのコンポーネントの外側でも実行されるコード向けの高度なプリミティブです。テストや、Solid のリアクティビティを別のフレームワークや非 UI プロセスに埋め込むインテグレーションなどです。

```ts
import { createEffect, createRoot, createSignal } from "solid-js";

const dispose = createRoot((dispose) => {
	const [quantity, setQuantity] = createSignal(1);
	createEffect(
		() => quantity(),
		(value) => console.log(value)
	);
	return dispose;
});

// later
dispose();
```

アプリケーションコードでこれが必要になることはないはずです。状態共有のために `createRoot` に手を伸ばしたくなったら、代わりにコンテキストを使ってください。

## 試してみよう: 配送料の見積もり

このページの冒頭の `LineItem` コンポーネントを拡張してください。
小計が 50 以上なら配送料は無料、それ以外は 5 かかります。
配送料、合計、そして「Free shipping」または「Add $N more for free shipping」と読める行を表示してください。N は無料までまだ足りない金額です。

解答を見る前に、各値が素の関数であるべきかメモであるべきか、そして各読み取りがどこで起きる必要があるかを決めてください。

:::solution[配送料の見積もり]

```tsx
import { createMemo, createSignal } from "solid-js";

export function LineItem() {
	const [quantity, setQuantity] = createSignal(1);
	const price = 12;

	const subtotal = createMemo(() => quantity() * price);
	const shipping = createMemo(() => (subtotal() >= 50 ? 0 : 5));
	const total = () => subtotal() + shipping();
	const toFreeShipping = () => 50 - subtotal();

	return (
		<div>
			<button
				type="button"
				onClick={() => setQuantity((q) => Math.max(1, q - 1))}
			>
				−
			</button>
			<span>{quantity()}</span>
			<button type="button" onClick={() => setQuantity((q) => q + 1)}>
				+
			</button>
			<p>Subtotal: ${subtotal()}</p>
			<p>Shipping: ${shipping()}</p>
			<p>Total: ${total()}</p>
			<p>
				{shipping() === 0
					? "Free shipping"
					: `Add $${toFreeShipping()} more for free shipping.`}
			</p>
		</div>
	);
}
```

`subtotal` がメモなのは、4つの読み取り側がそれを共有しているからです。
`shipping` がメモなのは等価性チェックのためです。数量が 2 から 3 になっても再計算され、再び 5 が生成され、誰にも通知されません。つまり `subtotal` の読み取り側だけが更新されます。
`total` と `toFreeShipping` はそれぞれ読み取り側が1つの素の関数です。メモにしてもノードが増えるだけで利益がありません。
すべての読み取りは JSX の内側かメモの関数の内側で起きるため、すべての行がクリックで更新されます。
:::

## よくある問題

### ページに値ではなく `function` や `() =>` と表示される

Solid が見る前にシグナルが文字列化されました:

```tsx
<p>{"Quantity: " + quantity}</p>
<p>{`Quantity: ${quantity}`}</p>
```

`quantity` は関数です。
呼び出してください: `quantity()`。
JSX では常にアクセサーを呼び出します。`{quantity}` ではなく `{quantity()}` です。
関数は DOM 要素の有効な子ではなく、TypeScript は呼び出していない形を型エラーとして報告します。

### 値が一度だけレンダーされて更新されない

読み取りが追跡スコープの外、たいていはコンポーネント本体で起きました。
開発時はコンポーネント名とともに `[STRICT_READ_UNTRACKED]` が出力されます。
読み取りを JSX の中へ移すか、JSX が呼び出す関数でラップしてください。

props の分割代入は、形を変えた同じ問題です:

```tsx
function LineItem({ price, quantity }: LineItemProps) {
	// price and quantity were read once, here
	return <p>${price * quantity}</p>;
}
```

props オブジェクトのまま保持し、JSX の内側で `props.price` を読み取ってください。
[Props](/concepts/components-and-jsx#props) を参照してください。

### シグナルを設定した直後に読み取ると古い値が返る

書き込みは、現在のコードが終わったあとのバッチで反映されます。
次の行が新しい値に依存するなら、計算が予約済みの値に対して実行されるように更新関数の形式を使うか、依存するコードを追跡スコープへ移して更新の反映時に実行されるようにしてください。
テストでは、イベントのあとに `flush()` を呼んでください。
[更新が反映されるタイミング](#when-updates-land)を参照してください。

### エフェクトがある値を別の値へコピーし、コピーが遅れる

```tsx
const [subtotal, setSubtotal] = createSignal(0);
createEffect(
	() => quantity() * price,
	(value) => setSubtotal(value)
);
```

`subtotal` は派生値です。
関数またはメモにして、エフェクトと2つ目のシグナルを削除してください。
[不要なエフェクトを避ける](/guides/avoid-unnecessary-effects)では、コピーをローカルで編集したい場合を含め、バリエーションを扱っています。

### `createEffect` が `[MISSING_EFFECT_FN]` を throw する

`createEffect` は2つの関数を受け取ります。読み取りを行う計算関数と、結果に作用するエフェクト関数です。
読み取りと作用を両方する1つの関数は、2つに分割する必要があります。
その1つの関数が値を計算するだけだったなら、必要だったのは `createMemo` です。
以前の Solid 向けに書かれたコードはまずここにぶつかります。他に変わったパターンは[マイグレーションガイド](/migration/from-solid-1)に一覧があります。

## まとめ

- リアクティブな値は追跡スコープの内側で読み取ります。JSX、メモの関数、エフェクトの計算関数のいずれかです。コンポーネント本体での読み取りは一度きりのスナップショットです。
- アクセサーを呼び出します。`quantity` ではなく `quantity()` です。
- デフォルトでは素の関数で導出します。複数の読み取り側が結果を共有するとき、計算が高価なとき、その等価性チェックで連鎖を止めたいときは `createMemo` を使います。
- 新しい値が古い値に依存するときは、更新関数の形式 `setQuantity((q) => q + 1)` を使います。
- 書き込みは現在のコードが終わったあとのバッチで反映されます。次の行での読み取りは古い値を見ます。テストでは `flush()` を呼びます。
- エフェクトはデータを Solid の外へ運ぶためだけに使います。メモの関数は書き込みを行いません。
- メモとエフェクトはコンポーネント本体で作成し、コンポーネントが所有・破棄できるようにします。状態はモジュールスコープではなくコンテキストを通じて共有します。

## 次のステップ

- [コンポーネントと JSX](/concepts/components-and-jsx)では、これらのルールを props・イベント・ref・リスト・条件付きコンテンツに適用します。
- [ストア](/concepts/stores)では、シグナルをネストしたオブジェクトと配列へ拡張し、プロパティごとの追跡を行います。
- [非同期リアクティビティ](/concepts/async-reactivity)では、メモが Promise を返すときに何が起きるか、そして次の画面が読み込まれる間 Solid がどうやって現在の画面を表示し続けるかを説明しています。
- [不要なエフェクトを避ける](/guides/avoid-unnecessary-effects)は、アプリで最初の `createEffect` を書く前に読むガイドです。
- [カスタムプリミティブ](/guides/custom-primitives)では、オーナーに属するセットアップ・エフェクト・クリーンアップを、複数のコンポーネントが呼び出せる `createX` 関数にパッケージ化します。
