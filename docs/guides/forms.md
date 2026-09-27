---
title: "フォーム"
version: "2.0"
description: "サーバー関数と Solid Router のアクションでフォームを作ります: JavaScript の読み込み前から動作し、サーバーでバリデーションし、ハイドレーション後は保留中の状態・インラインエラー・サーバーが確認する前の保存結果を表示します。"
---

チェックアウトには配送先住所が必要です。
このフォームは、ユーザーが **Continue** をクリックしたときに住所を保存し、`curl` で直接投稿された場合でも 5 桁でない郵便番号を拒否し、どのフィールドが間違っていたかをユーザーに示さなければなりません。
低速な接続では、その最初の処理を JavaScript が読み込まれる前に実行しなければなりません。

このガイドでは、そのフォームを 4 つのパスで作り上げます。
1 つ目は、ブラウザーに JavaScript が一切なくても、Solid Router のアクションを通じてサーバー関数に投稿するフォームです。
2 つ目は、ユーザーが回避できないバリデーションを追加します。
3 つ目は、HTML を変えずに、バリデーションメッセージをインラインで表示し、フォームを保留中として示します。
4 つ目は、フォームをアドレス帳のエントリーに変え、サーバーが確認する前に一覧に表示されるようにします。
各パスはそれだけで動作するフォームです。アプリが必要とする段階で止めてください。

このガイドは、[サーバー関数](/building-apps/server-functions)を有効にし、[Solid Router](/routing/solid-router)をマウントした `fullstack` プロジェクトを前提とします。

:::pitfall[`action` という名前の関数が 2 つある]
このガイドでは `@solidjs/router` の `action` を使います。
これは関数をラップして、フォームがそこへサブミットでき、ルーターがそのサブミッションを追跡できるようにするものです。

`solid-js` も [`action`](/reference/solid-js/lifecycle-actions/action) をエクスポートしています。そちらはジェネレーターをリアクティブなトランザクションとして実行するもので、[ミューテーション](/concepts/mutations)で説明しています。
エディターの自動インポートは両方を提示しますが、`<form action={coreAction}>` はコアの `action` が URL を生成しないため型レベルで失敗します。
ルーターの `action` は内部でコアのものを使っています。
このページのコードに出てくる `action` はすべてルーターのものです。
:::

## パス 1: サーバー関数に投稿するフォーム

サーバー側から始めます。
`FormData` 引数を 1 つ取るサーバー関数は、HTML フォームのサブミッションをそのまま受け取れます:

```ts
// src/data/address.ts
import { redirect } from "@solidjs/web";

export async function saveAddress(form: FormData) {
	"use server";

	await database.addresses.save({
		name: String(form.get("name") ?? ""),
		street: String(form.get("street") ?? ""),
		postalCode: String(form.get("postalCode") ?? ""),
	});

	return redirect("/checkout/shipping");
}
```

これをルーターの `action` でラップし、そのアクションをフォームに渡します:

```tsx
// src/routes/checkout/address.tsx
import { action } from "@solidjs/router";
import { saveAddress } from "../../data/address";

const submitAddress = action(saveAddress);

export default function AddressPage() {
	return (
		<form method="post" action={submitAddress}>
			<label>
				Name
				<input name="name" required />
			</label>
			<label>
				Street
				<input name="street" required />
			</label>
			<label>
				Postal code
				<input name="postalCode" required pattern="[0-9]{5}" />
			</label>
			<button type="submit">Continue to shipping</button>
		</form>
	);
}
```

ページを読み込み、ブラウザーの開発者ツールで JavaScript を無効にしてください。
3 つのフィールドを入力して **Continue to shipping** をクリックします: ブラウザーはフォームを投稿し、サーバーは住所を保存し、配送ページが読み込まれます。

:::note[サーバー関数のファイルの置き場所]
サーバー関数はページの隣ではなく `src/data/` に置きます。
メソッド検出がオンの場合、`src/routes` 配下のファイルは大文字の HTTP メソッドをエクスポートした時点で [APIルート](/building-apps/middleware-and-api-routes#api-routes)になります。サーバー関数を `src/data` に置いておけば、後からのエクスポートが誤ってそれをルートに変えてしまうことはありません。
:::

`action(saveAddress)` はサーバー関数の URL にシリアライズされる値を返すため、`action={submitAddress}` は HTML では通常の `action="..."` 属性としてレンダーされます。
ブラウザーはその URL に投稿し、サーバー関数ランタイムはリクエストが Solid クライアントではなく HTML フォームから来たことを認識し、ボディを `FormData` としてデコードして `saveAddress` を実行し、リダイレクトに従います。

JavaScript がオンの場合、代わりにルーターがサブミットをインターセプトします。
ルーターはサーバー関数クライアントを通じて `saveAddress` を呼び出し、関数がリダイレクトを返すとページ読み込みなしで遷移します。
どちらの経路も同じ `FormData` で同じ関数を実行します。

[ルーターのサブミッションを追加する](/building-apps/server-functions/mutations-and-responses#add-router-submissions)では、インラインの書き方とその使いどきを説明しています。

ここでは 2 つの細部が機能しています。
input は非制御（uncontrolled）です: Solid はユーザーが入力している間その値を読み取らず、ブラウザーがサブミット時に `FormData` を組み立てます。
`required` と `pattern` はブラウザー自身のバリデーションであり、ブラウザーはそれらを通過するまでサブミットしません。

これは完全な、デプロイ可能なフォームです。
欠けているのは、ユーザーが回避できないバリデーションと、リダイレクト以外のフィードバックです。

## パス 2: サーバーでバリデーションする

ブラウザーのバリデーションはユーザーのための利便性です。
誰でも `curl` でサーバー関数の URL に投稿できるため、関数はデータベースに触れる前にデータを自分でチェックしなければなりません。
`FormData` をスキーマでパースします:

```ts
// src/data/address.ts
import { redirect, respond } from "@solidjs/web";
import * as v from "valibot";

const Address = v.object({
	name: v.pipe(v.string(), v.trim(), v.minLength(1, "Enter a name")),
	street: v.pipe(v.string(), v.trim(), v.minLength(1, "Enter a street")),
	postalCode: v.pipe(
		v.string(),
		v.regex(/^[0-9]{5}$/, "Enter a five-digit postal code")
	),
});

export type AddressIssues = Partial<
	Record<keyof v.InferOutput<typeof Address>, string>
>;

export async function saveAddress(form: FormData) {
	"use server";

	const parsed = v.safeParse(Address, Object.fromEntries(form));
	if (!parsed.success) {
		const issues: AddressIssues = {};
		for (const issue of parsed.issues) {
			const field = issue.path?.[0]?.key as keyof AddressIssues | undefined;
			if (field && !issues[field]) issues[field] = issue.message;
		}
		throw respond({ issues }, { status: 400 });
	}

	await database.addresses.save(parsed.output);
	return redirect("/checkout/shipping");
}
```

`Object.fromEntries(form)` は `FormData` をスキーマ用のプレーンなオブジェクトに変換します。
`curl` で不正な郵便番号を投稿すると、レスポンスはフィールドメッセージをボディに載せた `400` になり、データベースは一切触れられません。

この失敗はスローされた `respond()` エンベロープとして関数を抜けます。プレーンなエラーではなく `respond()` を選ぶことが、メッセージをクライアントへ届かせる鍵です:

```ts
// Avoid: a plain Error, which production replaces with a generic message
if (!parsed.success) {
	throw new Error("Enter a five-digit postal code");
}

// Prefer: an envelope, which keeps its status and value in every build
if (!parsed.success) {
	throw respond({ issues }, { status: 400 });
}
```

本番ビルドで `Avoid` の版を実行すると、クライアントが受け取るのはフィールドメッセージのない `Internal Server Error` です。ランタイムは、スタックトレースやデータベースエラーが漏れないよう、印のないスローされた `Error` を汎用メッセージに置き換えるためです。
エンベロープをスローするのは意図的な制御フローです: ランタイムは開発でも本番でも `400` と値を保持します。
スローする値が意図的に `Error` であるケース向けの `markSafeError` は、[スローされたエラーを処理する](/building-apps/server-functions/mutations-and-responses#handle-thrown-errors)で説明しています。

スキーマと `valibot` は `"use server"` の本文内でのみ使われるため、クライアントバンドルには入りません。
`AddressIssues` 型は、次のパスでクライアントが使うためにエクスポートされています。

パス 1 のコンポーネントは変更不要です。
JavaScript がオンの場合、失敗したサブミッションはルーターに記録されますが、まだ何も表示されません。
JavaScript がない場合、ランタイムはフォームへリダイレクトで戻し、ルーターは次のサーバーレンダーで同じサブミッションを記録します。
パス 2 単体ではデータベースは守られますが、ユーザーには何も起きなかったように見えるフォームが見えます。
ほとんどのユーザーがサーバー側の失敗に到達しないよう、パス 1 のブラウザー属性は残してください。

## パス 3: インラインエラーと保留中状態

`useSubmissions` で記録されたサブミッションを読み取り、フィールドの横にメッセージを表示します:

```tsx
// src/routes/checkout/address.tsx
import { Show } from "solid-js";
import { action, useSubmissions } from "@solidjs/router";
import { saveAddress, type AddressIssues } from "../../data/address";

const submitAddress = action(saveAddress);

export default function AddressPage() {
	const submissions = useSubmissions(submitAddress);
	const issues = () => {
		const error = submissions.at(-1)?.error as
			{ issues?: AddressIssues } | undefined;
		return error?.issues ?? {};
	};

	return (
		<form method="post" action={submitAddress}>
			<label>
				Name
				<input
					name="name"
					required
					aria-invalid={issues().name ? "true" : undefined}
				/>
			</label>
			<Show when={issues().name}>
				{(message) => <p role="alert">{message()}</p>}
			</Show>

			<label>
				Street
				<input
					name="street"
					required
					aria-invalid={issues().street ? "true" : undefined}
				/>
			</label>
			<Show when={issues().street}>
				{(message) => <p role="alert">{message()}</p>}
			</Show>

			<label>
				Postal code
				<input
					name="postalCode"
					required
					pattern="[0-9]{5}"
					aria-invalid={issues().postalCode ? "true" : undefined}
				/>
			</label>
			<Show when={issues().postalCode}>
				{(message) => <p role="alert">{message()}</p>}
			</Show>

			<button type="submit">Continue to shipping</button>
		</form>
	);
}
```

名前を空のままフォームを送信すると、JavaScript のオン・オフにかかわらず、名前フィールドの下にメッセージが表示されます。
`<form>` 要素とその input はパス 1 と同じです。追加されたのはメッセージ要素だけです。

`useSubmissions(submitAddress)` は、このアクションの確定済みサブミッションのリアクティブな配列を返します。各要素は送信された `input` と、`result` または `error` のどちらかを持ちます。
`saveAddress` が `respond()` エンベロープをスローすると、運ばれた値が `submission.error` になり、`issues()` はここからフィールドメッセージを読み取ります。
リダイレクトを返したサブミッションは一覧に残りません。
`issues()` は JSX から読み取られるプレーンな派生関数で、[リアクティビティ](/concepts/reactivity)ページのルールに従っています。

:::deep-dive[JavaScript なしでエラーがページへ届く仕組み]
クライアントなしでフォームが投稿されると、サーバー関数ランタイムは `400` をスクリプトへ渡せません。
そこでスローされた値を一回限りの Cookie に保存し、フォームの URL へリダイレクトで戻します。
ルーターは次のサーバーレンダーでその Cookie を読み取り、スクリプト経由の呼び出しで記録するのと同じサブミッションを記録します。Cookie は読み取られると消去されます。
`useSubmissions` はどちらの経路でも 1 件のエントリーを見るため、そのページ読み込みでインラインエラーがレンダーされます。
:::

スクリプト経由のサブミッションが実行中の間、ルーターはフォームに `aria-busy="true"` を設定し、呼び出しと再検証がすべて確定するとそれを外します。
コンポーネントのコードなしで、保留中状態を CSS でスタイルします:

```css
form[aria-busy] button[type="submit"] {
	opacity: 0.6;
	pointer-events: none;
}
```

## パス 4: サーバーが確認する前に保存済み住所を表示する

リピーターの顧客はアドレス帳を持っており、フォームは配送へ進むのではなくアドレス帳に追加します。
一覧は、ユーザーが **Save** をクリックした瞬間に新しい住所を表示し、サーバーが受け取るまでは未確認として印を付けるべきです。

サーバー側には、一覧用のキャッシュされた読み取りと、リダイレクトせずに保存する 2 つ目の関数を追加します:

```ts
// src/data/address.ts
import { action, query } from "@solidjs/router";
import { reload } from "@solidjs/web";

export type SavedAddress = v.InferOutput<typeof Address> & {
	id: string;
	pending?: boolean;
};

export const getAddresses = query(async () => {
	"use server";
	return database.addresses.forCustomer(currentCustomerId());
}, "addresses");

export async function addAddress(form: FormData) {
	"use server";

	const parsed = v.safeParse(Address, Object.fromEntries(form));
	if (!parsed.success) {
		throw respond({ issues: toIssues(parsed.issues) }, { status: 400 });
	}

	await database.addresses.add(currentCustomerId(), parsed.output);
	return reload({ revalidate: getAddresses.key });
}
```

`toIssues` はパス 2 のループをヘルパーに移したもので、`currentCustomerId()` は[セッションと認証](/building-apps/sessions-and-auth)のセッション読み取りを表しています。
`reload({ revalidate: getAddresses.key })` は、アクション完了時にどのクエリを再フェッチするかをルーターに伝えます。

ページは楽観的ストアを通じて一覧を読み取り、アクションの `.onSubmit` フックから送信されたフィールドをそこへプッシュします:

```tsx
// src/routes/checkout/address.tsx
import { For, createOptimisticStore } from "solid-js";
import { action } from "@solidjs/router";
import {
	addAddress,
	getAddresses,
	type SavedAddress,
} from "../../data/address";

const submitAddress = action(addAddress);

export default function AddressPage() {
	const [addresses, setAddresses] = createOptimisticStore(
		() => getAddresses(),
		[] as SavedAddress[]
	);

	submitAddress.onSubmit((form) => {
		setAddresses((draft) => {
			draft.push({
				id: "unsaved",
				name: String(form.get("name")),
				street: String(form.get("street")),
				postalCode: String(form.get("postalCode")),
				pending: true,
			});
		});
	});

	return (
		<>
			<ul>
				<For each={addresses}>
					{(address) => (
						<li class={{ pending: !!address.pending }}>
							{address.name}, {address.street} {address.postalCode}
						</li>
					)}
				</For>
			</ul>
			<form method="post" action={submitAddress}>
				{/* the fields and messages from pass 3 */}
				<button type="submit">Save address</button>
			</form>
		</>
	);
}
```

**Save address** をクリックすると、リクエストが完了する前に、`pending` クラスを付けた新しい行が一覧の末尾に現れます。
`addAddress` が戻ると、ルーターは `getAddresses` を再検証し、ストアはサーバーの一覧と突き合わせ、未保存の行は本物の `id` を持つ保存済みの行に置き換わります。
不正な郵便番号を投稿すると、`400` が届いた時点でその行は消えます。楽観的書き込みはオーバーレイであり、成功・失敗のどちらでもアクションが確定した時点で Solid が破棄するためです。理由はパス 3 のインラインメッセージが説明します。

`.onSubmit` はアクションの引数（ここでは `FormData`）を受け取り、アクションのトランザクションの最初のステップとして実行されるため、この書き込みは単独でコミットされるのではなくミューテーションと一緒に保持されます。
[サーバーが確認する前](/routing/solid-router/data#before-the-server-confirms)でこのフックを説明し、[ミューテーション](/concepts/mutations)ではなぜオーバーレイにロールバックコードが不要なのかを説明しています。

JavaScript を無効にして同じフォームを送信してください。
ブラウザーは投稿し、`addAddress` が実行され、`reload` がブラウザーをページへ戻し、サーバーは新しい住所が入った一覧をレンダーします。
その経路では `createOptimisticStore` と `.onSubmit` フックは何もしていません。フォームをそこへフォールバックさせるために書くものも何もありませんでした。
このガイドの各パスは、同じ `<form method="post" action={submitAddress}>` にレイヤーを 1 つずつ重ねてきました: パス 1 は動くようにし、パス 2 は安全にし、パス 3 は説明できるようにし、パス 4 は即座に感じられるようにしました。まだバンドルが届いていない買い物客にも、パス 1 は届いています。

## 入力中のライブバリデーション

これまでのパスはサブミット時にバリデーションしていました。
ユーザーが入力しているときにフィールドが報告すべき場合は、その input を制御されたものにします: 値をシグナルに保持し、メッセージを値から派生させます。

```tsx
import { createMemo, createSignal } from "solid-js";

function PostalCodeField() {
	const [postalCode, setPostalCode] = createSignal("");
	const message = createMemo(() =>
		postalCode() === "" || /^[0-9]{5}$/.test(postalCode())
			? undefined
			: "Enter a five-digit postal code"
	);

	return (
		<label>
			Postal code
			<input
				name="postalCode"
				value={postalCode()}
				onInput={(event) => setPostalCode(event.currentTarget.value)}
				aria-invalid={message() ? "true" : undefined}
			/>
			<p aria-live="polite">{message()}</p>
		</label>
	);
}
```

`123` と打てばメッセージが現れ、あと 2 桁打てば消えます。
`value={postalCode()}` がシグナルを input へ書き込み、`onInput` が input をシグナルへ書き戻します。
メッセージはエフェクトから設定される 2 つ目のシグナルではなく、値のメモです。エフェクト版が実行時に何をするかは[不要なエフェクトを避ける](/guides/avoid-unnecessary-effects#calculate-values-when-they-are-read)で説明しています。
input は `name` を維持しているため、同じ `FormData` がサーバー関数へ届き、サーバー側のスキーマも引き続き実行されます。

:::tip[ライブフィードバックが必要なフィールドだけを制御対象にする]
制御された input はキーストロークごとにテキストを更新します。非制御のものはサブミットまで何もコストがかかりません。
上の 4 つのパスのように、サブミット時にバリデーションするフィールドは非制御のままにしてください。
:::

## 既存レコードの編集

フォームがサーバーから来た値を編集する場合、input にはソースに追従しつつローカルで編集できる初期値が必要です。
`createSignal` または `createStore` に関数を渡して、書き込み可能な派生を作ります:

```tsx
import { createStore } from "solid-js";

function AddressForm(props: { address: Address }) {
	const [draft, setDraft] = createStore(() => props.address, {
		name: "",
		street: "",
		postalCode: "",
	});
	// ...
}
```

第 2 引数は、最初の派生が届く前にストアが開始するシードです。
編集は `draft` へ書き込まれます。
`props.address` が変わると（例えば保存と再検証のあと）、ドラフトは新しいソースへリセットされます。
フィールドごとのバリデーションを含む完全なパターンと、それが置き換えるエフェクトベースのコピーは[ローカルな上書きには書き込み可能な派生を使う](/guides/avoid-unnecessary-effects#use-a-writable-derivation-for-a-local-override)で説明しています。

## よくある問題

### サーバー関数が空のオブジェクトを受け取る

input に `name` 属性がないか、フォームが `method="get"` を使っています。
サーバーへ届けるべきすべてのフィールドに `name` が必要で、ミューテーションは POST しなければなりません。

### フォームは送信されるが、その場に留まらずページがリロードされる

フォームの周囲にルーターがマウントされていないため、サブミットをインターセプトするものがなく、ブラウザーは `action` の URL をフルページ遷移としてたどります。
ページが `Router` の内側でレンダーされているか確認してください。

### `action` が関数でない、またはフォーム属性がソースコードとしてレンダーされる

`action` が `@solidjs/router` ではなく `solid-js` から来ています。
コアの `action` はジェネレーター関数をリアクティブトランザクションのためにラップするもので、シリアライズする URL を持ちません。
フォームには `@solidjs/router` から `action` をインポートしてください。

### エラーが一瞬表示されて消える

何かがサブミッションを消去しています。
`submission.clear()` はエントリーを一覧から取り除きます。レンダーのたびに実行されるエフェクトからではなく、ユーザーがエラーを閉じたり再送信したりしたときに呼び出してください。

### `respond()` が `Internal Server Error` としてクライアントに届く

値が `respond()` や `markSafeError()` を通さず、プレーンなオブジェクトや `Error` としてスローされています。
本番ビルドはブランドのないスローされたエラーを汎用メッセージに置き換えます。
構造化された失敗には `throw respond(value, { status })` を使ってください。

## まとめ

- `FormData` 引数をルーターの `action` を通じてサーバー関数へ投稿すれば、フォームは JavaScript の読み込み前から動作します。
- サーバー関数は `src/routes` の外に置きます。大文字のメソッドエクスポートがファイルを APIルートにしてしまうためです。
- フォームには `@solidjs/router` から `action` をインポートします。コアの `action` には URL がありません。
- 入力中のフィードバックが必要なフィールド以外は input を非制御のままにします。ブラウザーがサブミット時に `FormData` を組み立てます。
- サーバーでスキーマによるバリデーションを行います。ブラウザー属性は `curl` で誰でも回避できる利便性にすぎません。
- バリデーション失敗には `respond(value, { status: 400 })` をスローします。プレーンな `Error` は本番のクライアントには `Internal Server Error` として届きます。
- 失敗は `useSubmissions(action)` から読み取ります。エンベロープの値は `submission.error` です。
- 保留中状態は `form[aria-busy]` からスタイルします。属性の設定と解除はルーターが行います。
- アクションの `.onSubmit` フックから送信フィールドを `createOptimisticStore` へプッシュすると、結果を即座に表示できます。オーバーレイはアクションが確定すると破棄され、再検証された一覧がそれに置き換わります。
- パス 1 以降のすべてのレイヤーはハイドレートされたページ上にのみ存在します。JavaScript がなくても同じフォームは投稿され、サーバーがページを再度レンダーします。

## 次のステップ

- [データの読み込みとミューテーション](/routing/solid-router/data): バインド引数向けの `.with()`、ミューテーション後に何が再検証されるか、そしてパス 4 の楽観的パターンのカート版。
- [プログレッシブエンハンスメント](/building-apps/server-functions/progressive-enhancement): サーバー関数ランタイムがスクリプトなしのリクエストに対して何をするか。ルーターの外にあるフォーム向け。
- [引数とセキュリティ](/building-apps/server-functions/arguments-and-security): その他の引数エンコーディングと、POST を守る同一オリジンチェック。
- [セッションと認証](/building-apps/sessions-and-auth): 同じフォームの形をサインインとサインアウトに適用。
