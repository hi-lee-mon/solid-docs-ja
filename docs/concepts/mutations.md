---
title: "ミューテーション"
version: "2.0"
description: "カートの追加・削除・数量変更という書き込みを、UI を変えずにサーバーへ移します。アクション、楽観的ストア、refresh、そして失敗したリクエストがどのように元に戻るかを扱います。"
---

ユーザーが**カートに追加**をクリックします。
リクエストには 400 ミリ秒かかります。
その間もカートには新しい行を表示しておく必要があり、レスポンスが届いたらカートはサーバーと一致していなければなりません。サーバーが拒否した場合、その行は再び消えなければなりません。

読み取りには、こうしたことのためのラッパーは不要です。入力を変えればメモが再び問い合わせます。[非同期リアクティビティ](/docs/concepts/async-reactivity.md)のページで示したとおりです。
書き込みは形が異なります。書き込みは往復の前に起こり、往復のあとに突き合わせなければならないからです。
このページでは、[ストア](/docs/concepts/stores.md)のページのカートを題材に、その書き込みを一度に1つずつサーバーへ移していきます。

## クライアントのみのカート

まず、カートをストアと3つの名前付き書き込みとして始めます。
UI は `items` を読み取り、関数を呼び出します:

```ts
import { createStore } from "solid-js";

export type CartItem = { id: string; name: string; quantity: number };

export function createCart() {
	const [items, setItems] = createStore<CartItem[]>([]);

	const add = (item: CartItem) => {
		setItems((list) => {
			list.push(item);
		});
	};
	const remove = (id: string) => {
		setItems((list) => list.filter((item) => item.id !== id));
	};
	const setQuantity = (id: string, quantity: number) => {
		setItems((list) => {
			const item = list.find((item) => item.id === id);
			if (item) item.quantity = quantity;
		});
	};

	return [items, { add, remove, setQuantity }] as const;
}
```

**追加**をクリックすると行が表示されます。待つものは何もありません。

## カートをサーバーへ移す

今度は、リストは API から取得し、すべての書き込みは API を通ります。
UI はクリックに対して今までどおり反応する必要があります:

```ts
import { action, createOptimisticStore, refresh } from "solid-js";
import * as api from "./api";

export function createCart() {
	const [items, setItems] = createOptimisticStore<CartItem[]>(
		() => api.list(),
		[]
	);

	const add = action(function* (item: CartItem) {
		setItems((list) => {
			list.push(item);
		});
		yield api.add(item);
		refresh(items);
	});
	const remove = action(function* (id: string) {
		setItems((list) => list.filter((item) => item.id !== id));
		yield api.remove(id);
		refresh(items);
	});
	const setQuantity = action(function* (id: string, quantity: number) {
		setItems((list) => {
			const item = list.find((item) => item.id === id);
			if (item) item.quantity = quantity;
		});
		yield api.setQuantity(id, quantity);
		refresh(items);
	});

	return [items, { add, remove, setQuantity }] as const;
}
```

**追加**をクリックすると、以前と同様に行がすぐ表示されます。
`api.add` が解決すると、カートはサーバーから読み直され、その行はサーバーのコピーに置き換わります。両者が一致していれば、画面上は何も変わりません。
`api.add` が拒否された場合、その行は消えます。

2つのバージョンを比較してみましょう。
カートをレンダーするコンポーネントは変わっていません。
`setItems` の呼び出しも変わっていません。同期の書き込みはすでに期待される結果を表していたため、そのまま楽観的な予測になります。
追加されたのは3つです:

- [`createOptimisticStore(fn, seed)`](/docs/reference/solid-js/stores/create-optimistic-store.md) は永続的な値を `fn` から導出し、すぐに表示されるものの仮のものである書き込みを受け付けます。
- [`action`](/docs/reference/solid-js/lifecycle-actions/action.md) はジェネレーターを1つのトランザクションとして実行します。
  各 `yield` はその Promise を待ってからトランザクションを復元するため、`yield` の前の書き込みと後の refresh は同じ更新に属します。
- [`refresh(items)`](/docs/reference/solid-js/lifecycle-actions/refresh.md) は導出を再実行し、ストアをサーバーが持つ内容と突き合わせます。

楽観的な書き込みは、永続的なストアの上に乗るオーバーレイであり、状態の2つ目のコピーではありません。
Solid はアクションが確定したときにオーバーレイを破棄します。アクションが成功しても失敗しても同じです。
`api.add` が throw した場合、オーバーレイは捨てられ、リストは元の状態に戻ります。ロールバックのコードを書く必要はありません。
サーバーが予測と一致した場合、突き合わせでは差分が見つからず、何も更新されません。

アクションは読み取りと同じホールド（保留）に乗るため、リストがミューテーションの途中状態を見せることはなく、素早い連続クリックが交互に混ざって壊れたリストになることもありません。

:::pitfall[アクション内の await はトランザクションから外れる]
JavaScript には、素の `await` をまたいでアクションのコンテキストを保持する方法がありません。本体がジェネレーターになっているのはそのためです。

```ts
// Avoid: the write after the await is outside the transaction
const add = action(async function* (item: CartItem) {
	await api.add(item);
	setItems((list) => {
		list.push(item);
	});
});

// Prefer: yield the promise so the transaction resumes with the result
const add = action(function* (item: CartItem) {
	setItems((list) => {
		list.push(item);
	});
	yield api.add(item);
	refresh(items);
});
```

`Avoid` 版では、書き込みは所属すべきトランザクションがない状態で実行されるため、その更新の終わりに楽観的オーバーレイは破棄されます。行は一瞬表示されて消えるか、最初から表示されません。
中断点には `yield promise` を使ってください。
どうしても `await` しなければならない場合は、次の書き込みの前に裸の `yield` を置いて、トランザクションを復元してください。
:::

## 保存中の行を表示する

即時の更新はカートの正しいデフォルトですが、サーバーがまだ確認していない行をユーザーが知りたい場合もあります。
その手がかりはデータの中に入れます:

```ts
export type CartItem = {
	id: string;
	name: string;
	quantity: number;
	pending?: boolean;
};

const add = action(function* (item: CartItem) {
	setItems((list) => {
		list.push({ ...item, pending: true });
	});
	yield api.add(item);
	refresh(items);
});
```

楽観的な行は `pending: true` を持ち、行はそこからスピナーや控えめなスタイルをレンダーできます。
アクションが確定するとオーバーレイは消え、サーバーからの更新済みの行にはフラグがありません。
`pending` を読み取った行だけが更新されます。

## データに変化中の印を付ける: `affects`

`pending` フラグは行についての情報です。
ときには、データ全体についての問いであることもあります。「この商品の数量はまさに変わろうとしているか？」
[`affects(target, key?)`](/docs/reference/solid-js/lifecycle-actions/affects.md) は、それを囲むアクションの実行中に、ソース・ストア・ストアの1つのプロパティを保留中としてマークします。これにより、そのデータの読み取り側は `isPending` を通じてそれを報告できます:

```ts
const setQuantity = action(function* (id: string, quantity: number) {
	const item = items.find((item) => item.id === id);
	if (item) affects(item, "quantity");
	yield api.setQuantity(id, quantity);
	refresh(items);
});
```

ここでは楽観的な書き込みは行われていません。古い数量は表示されたままで、`isPending(() => item.quantity)` は refresh が届くまで `true` です。
2つの仕組みは独立しています。楽観的な書き込みは期待される値を提供し、`affects` は保留中の状態を提供します。ミューテーションはどちらか一方、あるいは両方を使えます。

裸の `refresh(source)` は入力を変えずに同じ問いを再度発行するだけなので、それだけでは保留中は報告されません。
リロード自体を保留中として表示したい場合は、`affects(source)` を `refresh(source)` と組み合わせてください。

## サーバーが書き込みをエコーするのを待つ: `until`

トランスポートによっては結果を返しません。リクエストは投げっぱなし（fire-and-forget）で、確認は後からライブソース上に届きます。
[`until(fn)`](/docs/reference/solid-js/lifecycle-actions/until.md) は、確定済みデータに対する述語が真になるまでアクションを開いたままにします:

```ts
const send = action(function* (text: string) {
	const clientId = crypto.randomUUID();
	setMessages((list) => {
		list.push({ clientId, text, pending: true });
	});
	yield socket.send({ clientId, text });
	yield until(() => messages.some((message) => message.clientId === clientId), {
		timeout: 10_000,
	});
});
```

述語は正本の状態を読み取るため、上でプッシュした楽観的な行ではそれを満たせません。満たせるのはライブソースからのエコーだけです。
タイムアウトまたは中断は reject となり、アクションは確定してオーバーレイは破棄されます。

## ライフタイムで状態を重ねる

本番の機能では、ライフタイムの異なる状態を組み合わせることがよくあります。サーバーからの永続的なデータ、回復可能なエラーのような行ごとの UI 状態、そして楽観的オーバーレイです。
その順に適用し、合成された結果を読み取ります。
ここでは、カートの各行にギフト包装のトグルがあり、その失敗は行が自力で回復できます:

```tsx
import {
	Errored,
	For,
	Loading,
	Show,
	action,
	createOptimisticStore,
	refresh,
} from "solid-js";
import { api } from "./api";

type ServerItem = {
	id: string;
	name: string;
	giftWrap: boolean;
};

type ItemError = {
	giftWrap: boolean;
};

type CartItem = ServerItem & {
	pending?: boolean;
	error?: ItemError;
};

function createCart() {
	const errors = new Map<string, ItemError>();
	const [items, setItems] = createOptimisticStore<CartItem[]>(async () => {
		const current: ServerItem[] = await api.list();
		return current.map((item) => {
			const error = errors.get(item.id);
			return error ? { ...item, error } : item;
		});
	}, []);

	const setGiftWrap = action(function* (id: string, giftWrap: boolean) {
		setItems((draft) => {
			const item = draft.find((item) => item.id === id);
			if (!item) return;
			item.giftWrap = giftWrap;
			item.pending = true;
		});

		try {
			yield api.setGiftWrap(id, giftWrap);
			errors.delete(id);
		} catch {
			errors.set(id, { giftWrap });
		} finally {
			refresh(items);
		}
	});

	return [items, { setGiftWrap }] as const;
}

function CartLines() {
	const [items, { setGiftWrap }] = createCart();

	return (
		<Errored fallback={(error) => <p>{String(error())}</p>}>
			<Loading fallback={<p>Loading cart...</p>}>
				<ul>
					<For each={items}>
						{(item) => (
							<li
								class={{
									pending: !!item.pending,
									errored: !!item.error,
								}}
							>
								<label>
									<input
										type="checkbox"
										checked={item.giftWrap}
										onInput={(event) =>
											void setGiftWrap(item.id, event.currentTarget.checked)
										}
									/>
									Gift wrap {item.name}
								</label>
								<Show when={item.error}>
									{(error) => (
										<button
											type="button"
											onClick={() =>
												void setGiftWrap(item.id, error().giftWrap)
											}
										>
											Retry
										</button>
									)}
								</Show>
							</li>
						)}
					</For>
				</ul>
			</Loading>
		</Errored>
	);
}
```

行のギフト包装を切り替えると、チェックボックスは `pending` スタイルとともにすぐに動きます。
リクエストが失敗した場合、チェックボックスはサーバーの値に戻り、その行に**再試行**ボタンが表示されます。カートの残りの部分は触れられません。

`createCart()` は3つのレイヤーすべてをコンポーネントのオーナーの下に作成し、アクションとともに合成済みの1つのストアを返します。これにより、リアクティブな状態はモジュールスコープにも共有のサーバーメモリにも置かれません。
プロジェクションは永続的な商品を読み取り、`errors` マップを折り込みます。
マップ自体はリアクティブではありません。`refresh(items)` が各ミューテーションのあとにプロジェクションを再実行し、その時点のエントリを可視化します。

アクションが想定内の失敗を捕捉するのは、その行がローカルで回復できるからです。
アクションが捕捉しないエラー、あるいはプロジェクションやレンダーが throw したエラーは、依然として `Errored` に届きます。

## よくある問題

### リクエスト成功後に行が古い値へ戻る

アクションは確定し Solid は楽観的オーバーレイを取り除きましたが、何もサーバーを読み直していないため、ストアはミューテーション前の値を持ったままです。
`yield` のあとに `refresh(items)` を呼んで、ストアをサーバーが現在持つ内容と突き合わせてください。

### 楽観的な値が一瞬表示されて消える、または表示されない

書き込みがトランザクションなしで実行されました。どのアクションの外側か、アクション内で素の `await` のあとかのどちらかです。
待つべきトランザクションのない楽観的オーバーレイは、現在の更新の終わりに破棄されます。
仮の書き込みはリクエストを送る `action` の内側で行い、`await` ではなく `yield promise` で中断してください。

### アクション失敗後も仮の書き込みが残る

そのストアは素の `createStore` であり、その書き込みはアクション内でも永続的です。
リクエスト確定時に元に戻るべき状態には `createOptimisticStore` を使ってください。

### アクション内の `flush()` が `[FLUSH_IN_ACTION]` を throw する

アクションの書き込みはアクションが確定するまでそのトランザクション内に保持されるため、`flush()` が表示できるものはありません。
その呼び出しを取り除き、アクションの Promise が解決したあとに検証してください。
[リアクティビティのデバッグ](/docs/guides/debugging-reactivity.md#the-test-sees-the-old-dom)にこの診断の説明があります。

## まとめ

- 同期のストア書き込みはそのままにします。`createOptimisticStore` 上の `action` の内側では、それが楽観的な予測になります。
- 本体はジェネレーターとして書き、各 Promise を `yield` してください。これにより、その前後の書き込みが1つのトランザクションを共有します。
- リクエストのあとに `refresh(source)` を呼んで、ストアをサーバーと突き合わせてください。
- オーバーレイはアクションの確定時に破棄されます。成功時も失敗時も同じで、ロールバックのコードはありません。
- UI が未確認のものを表示すべきときは、楽観的な行に `pending` フラグを入れてください。
- 値を予測せずにデータの保留中を報告するには `affects(target, key)` を使ってください。
- 確認がレスポンスではなくライブソース経由で届くときは `until(predicate)` を使ってください。
- 永続的なデータ、行ごとの UI 状態、楽観的オーバーレイを1つのオーナーの下に作成し、合成済みの1つのストアを返してください。

## 次のステップ

- [フォーム](/docs/guides/forms.md): `<form>` の背後にある同じアクション。プログレッシブエンハンスメント、バリデーション、サーバーから返されるエラーを扱います。
- [ミューテーションとレスポンス](/docs/building-apps/server-functions/mutations-and-responses.md): `api.add` を `"use server"` 関数として書き、リダイレクト・ステータス・安全なエラーを返します。
- [バウンダリ](/docs/concepts/boundaries.md): `Errored` がアクションが捕捉しないエラーを捕捉する場所と、エラーが起きた領域の回復方法。
- [データの読み込みとミューテーション](/docs/routing/solid-router/data.md): Solid Router の `action` と `query` がこれらのプリミティブの上にサブミッション・キャッシュ・再検証を追加します。
- [状態管理](/docs/guides/state-management.md): カート・ユーザー・フィルターがどこに置かれるか、そして `createCart()` がプロバイダーの内側で実行される理由。
