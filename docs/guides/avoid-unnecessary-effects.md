---
title: "不要なエフェクトを避ける"
version: "2.0"
description: "あるリアクティブな値を別の値へコピーするエフェクトを見抜き、直接・メモ化・非同期・書き込み可能な派生で置き換え、createEffect は命令的な境界のために残す。"
---

[ストア](/concepts/stores) ページのカートでは、明細行の下に小計が表示されます。
多くの人が最初に書くのは、小計を専用のシグナルに保持し、商品が変わるたびに再計算するエフェクトを追加するバージョンです。
これは動作しますが、気づきにくい形で誤っています。数量を変更すると、その行は 1 回のフラッシュで更新されるのに対し小計は次のフラッシュで更新されるため、1 フレームの間、ページには新しい数量と古い合計が並んで表示されてしまいます。
attribution を有効にすると、開発ビルドはこのパターンを `[EFFECT_RELAY_TEAR]` と名付けます。

シグナル・ストア・props・メモ・非同期の計算は、すでに派生値のグラフを形成しています。
エフェクトが属するのはそのグラフの終端です。確定した結果が Solid の外に出て、Solid が所有しないものを駆動しなければならない場所です。

![リアクティブな入力は派生値を通って宣言的なコンシューマーと終端のエフェクトへ流れます。ユーザー操作や外部からの観測はセッターを介して新しい入力になります。](/images/diagrams/derived-state-effects-sequence.svg)

このガイドでは、派生を使うべき場所にエフェクトが書かれがちな箇所を順に見て、それぞれが実行時に何をするかを示し、最後に `createEffect` が適切なツールとなる 2 つのケースを紹介します。
追跡・メモ・エフェクトのフェーズ・スケジューリング・オーナーシップについては [リアクティビティ](/concepts/reactivity) ページで説明しています。

## 値は読み取られるときに計算する

既存のリアクティブな状態から計算できる値には、専用のシグナルは不要です。

```tsx
import { createEffect, createSignal, createStore } from "solid-js";

const [cart, setCart] = createStore({ items: [] as CartItem[] });

// Avoid: subtotal duplicates data already in the store, one flush late
const [subtotal, setSubtotal] = createSignal(0);
createEffect(
	() => cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
	(total) => setSubtotal(total)
);

// Prefer: derive it where it is read
const subtotal = () =>
	cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
```

`Avoid` 側を実行して数量を変更してみてください。
数量の入力はキーストロークが引き起こしたフラッシュで更新されます。エフェクトはそのフラッシュの後に実行されて `subtotal` に書き込み、それが 2 回目のフラッシュで更新されるため、その間のフレームでは新しい数量と古い合計が表示されます。
attribution を有効にしていると、開発ビルドは 2 回目の実行時にこのコピーを報告します。

```text
[EFFECT_RELAY_TEAR] effect "effect" writes its compute output into "subtotal" on every run, and nothing else writes "subtotal" — it is derived state kept one flush late: everything reading it paints a frame behind everything reading the source. The written value is the effect's compute output — by contract a pure function of what it tracks: make "subtotal" a memo of that computation and delete the effect.
```

表示される名前は `name` オプションから来ます。名前のないシグナルは `signal` と表示されます。
このレポートとそのバリエーションについては [リアクティビティのデバッグ](/guides/debugging-reactivity#an-effect-writes-a-signal-that-another-scope-derives-from) で扱っています。

`Prefer` 側は単なる関数です。
これは読み取った追跡スコープ内で実行されるため、入力とは独立に古くなることはなく、2 回目の書き込みもスケジュールされません。
呼び出しは JSX や他の追跡スコープの内側に置いてください。コンポーネント本体は追跡されずに実行されるため、コンポーネントのトップレベルにある `subtotal()` は一度だけ評価される値になります。

複数の読み取り側が結果を共有する場合や、結果が変わらないときに伝播を止めたい場合は [`createMemo`](/reference/solid-js/reactivity/create-memo) を使います。
メモにはノードと比較のコストがかかります。読み取り側が 1 つだけの安価な式なら、関数のほうが小さく済みます。
メモの計算には副作用を含めないでください。

:::deep-dive[コピーが 1 フラッシュ遅れる理由]
Solid は書き込みをバッチで適用します。
1 つのバッチの中では、変更された値に依存するすべての追跡対象の計算関数を実行し、その後で初めて入力が変わったエフェクト関数を実行します。
エフェクト関数内で行われた書き込みは、終了しようとしているパスに乗ることができず、同じフラッシュ内で 2 回目のパスを開始します。
そのため、コピーされたシグナルの読み取り側はソースの読み取り側より 1 パス遅れて更新され、1 回目のパスにあるすべてのエフェクトと DOM 書き込みは古いコピーを見ることになります。
メモは計算関数なので入力と同じパスに乗り、両者が食い違う瞬間はありません。
:::

## 非同期の処理は派生に置く

エフェクト内で開始したリクエストには、結果用の 2 つ目のシグナルとローディング状態用の 3 つ目のシグナルが必要になり、エフェクトはこの 3 つすべての同期を保たなければなりません。

```tsx
import {
	Errored,
	For,
	Loading,
	createEffect,
	createMemo,
	createSignal,
} from "solid-js";

const [query, setQuery] = createSignal("");

// Avoid: the request, its result, and its status are three values the effect keeps in step
const [results, setResults] = createSignal<Product[]>([]);
const [loading, setLoading] = createSignal(false);
createEffect(
	() => query().trim(),
	(text) => {
		if (!text) {
			setResults([]);
			return;
		}
		setLoading(true);
		api.search(text).then((found) => {
			setResults(found);
			setLoading(false);
		});
	}
);

// Prefer: the request is the value
const results = createMemo(async () => {
	const text = query().trim();
	if (!text) return [];
	return api.search(text);
});
```

`Avoid` 側を実行して `mug` と素早く入力してみてください。
3 つのリクエストが開始され、エフェクトには `m` と `mu` への回答を破棄する仕組みがありません。最後に到着したレスポンスがリストに表示され、`loading` は最初のレスポンスの後にオフになります。
Solid の計算は Promise を返せるため、`Prefer` 側ではリクエストとその結果が 1 つの派生値になります。
`query()` を変更するとメモに新しい答えが求められます。Solid は新しいリクエストの間も確定済みの結果を表示し続け、破棄された実行への回答は捨てます。

最初の読み込みと失敗時の表示先を確保するため、メモはバウンダリの内側で読み取ります。

```tsx
return (
	<>
		<input
			type="search"
			value={query()}
			onInput={(event) => setQuery(event.currentTarget.value)}
		/>
		<Errored fallback={(error) => <p>{String(error())}</p>}>
			<Loading fallback={<p>Searching...</p>}>
				<ul>
					<For each={results()}>{(product) => <li>{product.name}</li>}</For>
				</ul>
			</Loading>
		</Errored>
	</>
);
```

保留中のインジケーター、`latest`、リフレッシュについては [非同期リアクティビティ](/concepts/async-reactivity) で扱っています。
レスポンスがリストやツリーで、再取得をまたいで各アイテムの同一性を保ちたい場合は、[`createStore`](/reference/solid-js/stores/create-store) の関数形式を使います。

## ローカルな上書きには書き込み可能な派生を使う

編集可能なフィールドは、多くの場合リアクティブなソースから始まり、一時的なローカルの値を必要とします。
ソースをシグナルにコピーし、ソースが変わったときにコピーをリセットするエフェクトを追加するのが慣例になっています。

```tsx
import { createEffect, createSignal } from "solid-js";

function NameField(props: { value: string }) {
	// Avoid: a copy plus an effect to keep it in step with the prop
	const [draft, setDraft] = createSignal(props.value);
	createEffect(
		() => props.value,
		(value) => {
			setDraft(value);
		}
	);

	// Prefer: a writable derivation, which resets itself
	const [draft, setDraft] = createSignal(() => props.value);

	return (
		<input
			value={draft()}
			onInput={(event) => setDraft(event.currentTarget.value)}
		/>
	);
}
```

`Avoid` 側を実行して親から `props.value` を変更してみてください。
入力はページの他の部分より 1 フラッシュ遅れて新しい値を表示し、attribution はこれに対して同じ `[EFFECT_RELAY_TEAR]` の検出を記録します。

`Prefer` 側では派生が `props.value` を供給します。
`setDraft` を呼ぶとその結果の上にローカルな上書きが置かれ、派生の依存関係が変わって派生が新しい値を生成するまで上書きが維持されます。
2 回目のフラッシュはなく、後で削除すべきエフェクトもありません。

同じ形はネストされたフォームでも使えます。
`createStore` に関数と初期値を渡すと、書き込み可能な派生ストアが得られます。

```tsx
import { createMemo, createStore } from "solid-js";

type Address = {
	name: string;
	street: string;
	postalCode: string;
};

function AddressForm(props: { address: Address }) {
	const [draft, setDraft] = createStore(() => props.address, {
		name: "",
		street: "",
		postalCode: "",
	});
	const postalCodeError = createMemo(() =>
		/^[0-9]{5}$/.test(draft.postalCode)
			? undefined
			: "Enter a five-digit postal code."
	);

	return (
		<form>
			<input
				value={draft.name}
				onInput={(event) =>
					setDraft((current) => {
						current.name = event.currentTarget.value;
					})
				}
			/>
			<input
				value={draft.postalCode}
				aria-invalid={postalCodeError() ? "true" : undefined}
				onInput={(event) =>
					setDraft((current) => {
						current.postalCode = event.currentTarget.value;
					})
				}
			/>
			<p aria-live="polite">{postalCodeError()}</p>
		</form>
	);
}
```

郵便番号フィールドに入力すると、キーストロークごとにメッセージが表示・消去されます。
`props.address` が変わると（たとえば保存と再取得の後）、派生が再実行され、新しいソースをストアに反映してローカルの編集を置き換えます。
バリデーションは現在のドラフトの派生のままです。

新しいソースの値でローカルの編集を置き換えるべき場合にこのパターンを使います。
ローカルの値が独立したライフタイムを持つ場合は、通常のシグナルやストアを使います。
仮の値がローカルの編集セッションではなく進行中のミューテーションに属する場合は楽観的状態を使います。そのケースは [ミューテーション](/concepts/mutations) で扱っています。

## インタラクションは起きた場所で処理する

イベントハンドラーは、どのインタラクションが起きたかを知っており、現在の値も手元にあります。
エフェクトに反応させるためにインタラクションをシグナル経由で回すと、処理がその原因から切り離されてしまいます。

```tsx
import { action, createEffect, createSignal, snapshot } from "solid-js";

// Avoid: a flag the effect watches
const [submitted, setSubmitted] = createSignal(false);
createEffect(
	() => submitted(),
	(flag) => {
		if (flag) api.saveAddress(snapshot(draft));
	}
);
<button type="button" onClick={() => setSubmitted(true)}>
	Save
</button>;

// Prefer: the handler does the work, through an action
const save = action(function* () {
	yield api.saveAddress(snapshot(draft));
});
<button type="button" onClick={() => void save()}>
	Save
</button>;
```

`Avoid` 側を実行して **Save** を 2 回クリックしてみてください。
1 回目のクリックはクリックの 1 フラッシュ後に保存します。2 回目は何も起きません。すでに `true` を保持しているシグナルに `true` を書き込んでも誰にも通知されず、ボタンが再び機能するにはどこかでフラグをリセットする必要があります。
`Prefer` 側では、クリックごとに [`action`](/reference/solid-js/lifecycle-actions/action) が実行され、リクエストが 1 つのトランザクションとして実行されます。内部で行われた通常の書き込みは確定まで保留され、楽観的な値はすぐに表示されて確定時に破棄されます。

## 命令的な境界ではエフェクトを使う

確定したリアクティブな値が、Solid が所有しないシステム（サードパーティのウィジェット、購読、テレメトリ、宣言的な JSX 表現を持たないブラウザ API など）を駆動しなければならないときにエフェクトを使います。
2 フェーズの [`createEffect`](/reference/solid-js/reactivity/create-effect) は、その境界を明示的に保ちます。
1 つ目の関数は追跡して値を返し、2 つ目の関数はその値を受け取って命令的な処理を行い、クリーンアップを返すことができます。
[Solid 以外のコードの統合](/guides/integrate-non-solid-code#create-the-instance-once-update-it-in-an-effect) では、この形をチャートライブラリに適用しています。

守るべきルールは、追跡されるのは 1 つ目の関数だけだということです。

```ts
import { createEffect } from "solid-js";

// Avoid: currency() is read in the untracked phase, so a currency change does not re-run the effect
createEffect(
	() => subtotal(),
	(amount) => {
		const widget = payments.mount(element, { amount, currency: currency() });
		return () => widget.unmount();
	}
);

// Prefer: read every input in the compute phase and hand the values across
createEffect(
	() => ({ amount: subtotal(), currency: currency() }),
	({ amount, currency }) => {
		const widget = payments.mount(element, { amount, currency });
		return () => widget.unmount();
	}
);
```

`Avoid` 側を実行して通貨を切り替えてみてください。
計算フェーズが `currency()` を読んでいないため、小計も変わるまでは何も起きません。
`Prefer` 側では、どちらかが変われば計算関数が再実行され、クリーンアップが古いウィジェットをアンマウントし、エフェクト関数が両方の値で新しいウィジェットをマウントします。

Solid は更新に対して、どのエフェクト関数よりも先に追跡対象の計算関数を実行します。
計算関数が保留中の非同期処理に到達した場合、そのエフェクト関数は処理が確定するまで待つため、ウィジェットが適用途中の更新から値を受け取ることはありません。

:::caution[エフェクト関数はリアクティブな状態を書き込む場所ではない]
エフェクト関数はバッチが適用された後に実行されます。
そこでセッターを呼ぶと 2 回目のパスが始まります。これはこのガイドの冒頭で扱ったコピーのパターンです。
書き込みが必要なら、その値をメモにできないかを検討してください。ブラウザが生成したものを記録する場合は次の節を参照してください。
:::

## 外部からの観測を新しい入力にする

レンダー処理の後にしか存在しない情報があります。要素のサイズ、スクロール位置、可視かどうかなどです。
それを報告するコールバックはシグナルに書き込んでかまいません。観測は上流の値のコピーではなく、グラフへの新しい入力だからです。

```tsx
import { createSignal, onSettled } from "solid-js";

function measure(setWidth: (width: number) => void) {
	let element: HTMLElement | undefined;

	// Avoid: one measurement, taken when the ref is assigned
	return (next: HTMLElement) => {
		element = next;
		setWidth(next.offsetWidth);
	};

	// Prefer: observe, and let each observation become a new input
	onSettled(() => {
		if (!element) return;

		const observer = new ResizeObserver(([entry]) => {
			setWidth(entry.contentRect.width);
		});
		observer.observe(element);

		return () => observer.disconnect();
	});

	return (next: HTMLElement) => {
		element = next;
	};
}

function ProductGallery() {
	const [width, setWidth] = createSignal(0);
	return (
		<section ref={measure(setWidth)}>
			Thumbnails per row: {Math.floor(width() / 120)}
		</section>
	);
}
```

`Avoid` 側を実行してウィンドウをリサイズしてみてください。
再計測するものがないため、カウントは変わりません。
`Prefer` 側では、サイズ変更のたびにオブザーバーが発火し、その書き込みはブラウザが報告したものを記録します。リアクティブな値をグラフにコピーし直すわけではありません。

`onSettled` は周囲のレンダーが確定した後にコールバックを一度だけ実行し、返されたクリーンアップはオーナーが破棄されるときに実行されるため、オブザーバーはコンポーネントとともに切断されます。
このコードが前提とする、オーナーに紐づく DOM のセットアップについては [ref とディレクティブ](/concepts/components-and-jsx#refs-and-directives) で扱っています。

## エフェクトを追加する前のチェック

`createEffect` を呼ぶ前に、次を確認してください。

1. その値は JSX や派生関数の中で直接計算できますか？
2. その結果は再利用や等価性の境界のためにメモが必要ですか？
3. それは非同期メモや関数から作るストアに置くべき非同期データですか？
4. それは書き込み可能な派生シグナルやストアに置くべき一時的なローカルの上書きですか？
5. その処理はユーザーのインタラクションが引き起こしたものですか？
   ならばイベントハンドラーかアクションに置いてください。
6. その処理はオーナーに紐づく一度きりのセットアップですか？
   ならば `onSettled` か ref ディレクティブを使います。
7. 確定したリアクティブな結果を Solid の外に出して命令的なシステムを駆動する必要がありますか？
   ならばエフェクトを使います。

最後の質問への答えが「いいえ」なら、そのコードはリアクティブなシーケンスのもっと前の段階に置くべきです。

## よくある問題

### コピーされた値がソースより 1 歩遅れる

エフェクトが、派生で生成できるはずのシグナルに書き込んでいます。
コピーの読み取り側はソースの読み取り側より 1 フラッシュ遅れて更新され、attribution は `[EFFECT_RELAY_TEAR]` を報告します。
そのシグナルとエフェクトを削除し、値は読み取られる場所で派生してください。レポートの読み方は [リアクティビティのデバッグ](/guides/debugging-reactivity#an-effect-writes-a-signal-that-another-scope-derives-from) で順を追って説明しています。

### 変更ごとにエフェクトが 2 回実行される

エフェクトが、直接またはメモ経由で自分が読んでいるものへフィードバックされるシグナルやストアのプロパティに書き込んでいます。
attribution は `[EFFECT_WRITES_OWN_SOURCE]` を報告します。書き込まれる値はエフェクトの入力の関数なのでメモに置くべきか、その正規化はソースが書き込まれる場所で行うべきです。
詳しくは [リアクティビティのデバッグ](/guides/debugging-reactivity#an-effect-re-runs-because-of-its-own-write) で扱っています。

### シグナルが変わってもエフェクトが再実行されない

そのシグナルが、追跡されないエフェクト関数の中で読み取られています。
その読み取りを計算関数に移し、他の値と一緒に返してください。
その形は [リアクティビティのデバッグ](/guides/debugging-reactivity#is-the-effect-reading-in-the-wrong-phase) で示しています。

## まとめ

- 値は読み取られる場所で派生します。シグナルとそれを埋めるエフェクトの組み合わせは、1 フラッシュ遅れの派生状態です。
- `createMemo` は複数の読み取り側が結果を共有するときやチェーンに等価性の境界が必要なときに使うもので、デフォルトではありません。
- エフェクトでリクエストを開始して結果をコピーし出す代わりに、メモや `createStore` の関数から Promise を返します。
- ソースが変わったときにリセットされる編集可能なコピーには、`createSignal` や `createStore` に関数を渡します。
- インタラクションの処理は、フラグを監視するエフェクトではなく、イベントハンドラーや `action` で行います。
- エフェクトの入力はすべて計算関数で読み取ります。エフェクト関数は追跡されません。
- エフェクトからシグナルに書き込むのは、計測値のようなグラフ外で生成されたものを記録するときだけです。

## 次のステップ

- [リアクティビティのデバッグ](/guides/debugging-reactivity)：エフェクトが状態を中継したときに発火する診断、`[EFFECT_RELAY_TEAR]` と `[EFFECT_WRITES_OWN_SOURCE]`、およびその読み方。
- [非同期リアクティビティ](/concepts/async-reactivity)：非同期メモが Promise の保留中に何をするか。エフェクトとフラグのパターンが手作業で実装していた部分です。
- [データ取得パターン](/guides/data-fetching-patterns)：このページの派生の形を、リクエスト・ページネーション・リフレッシュに適用したもの。
- [Thinking in Solid](/guides/thinking-in-solid)：React や Vue から来た読者向けに、1 つの機能を端から端まで作る中で同じルールを適用する。
