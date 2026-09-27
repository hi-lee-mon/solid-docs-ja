---
title: "ミューテーションとレスポンス"
version: "2.0"
description: "カートやアカウントのミューテーションから値・リダイレクト・リロード・400 を返し、スローされたエラーが本番環境で何を開示するかを制御します。"
---

商品ページの「カートに追加」フォームは `addToCart` に POST されます。
書き込みが成功したら、ブラウザは新しい明細が入ったカートに着地する必要があります。
数量が整数でないときは、呼び出し元は 400 と、フィールドの横に表示できるメッセージを受け取る必要があります。
データベースが落ちているときは、呼び出し元はエラーを受け取る必要があり、そのエラーには失敗したクエリを含めてはいけません。

戻り値はカート明細を運べます。
しかしステータスや `Location`、カートを再読み込みする指示は運べないため、それらは `@solidjs/web` のレスポンスヘルパーを介して行います。
ほとんどのアプリケーションで必要なのは [`redirect()`](#redirect-the-caller)、[`reload()`](#request-revalidation)、そして[スローされたエラーの処理](#handle-thrown-errors)にある `throw respond(...)` です。エンベロープの内部はインテグレーター向けです。

ミューテーションはデフォルトの `POST` トランスポートを使い続け、これはオリジンが検証されます。
`GET()` を宣言するのは読み取りだけにしてください。

## レスポンスメタデータ付きで値を返す

`respond()` は値とステータス・ヘッダーを組み合わせます:

```ts
// src/data/admin.ts
import { getRequestEvent, respond } from "@solidjs/web";

export async function createProduct(input: CreateProductInput) {
	"use server";

	const userId = getRequestEvent()?.locals.userId;
	if (!userId || !(await database.users.isAdmin(userId))) {
		throw respond({ error: "Forbidden" }, { status: 403 });
	}

	const product = await database.products.create(input);
	return respond(product, {
		status: 201,
		headers: { "x-created-product": product.id },
	});
}
```

管理ページから `createProduct(input)` を呼び出すと、Promise はエンベロープではなく `product` に解決されます。
トランスポートは 201 とヘッダーを HTTP レスポンスに適用し、`curl` のような素の HTTP 呼び出し元は同じ product が入った JSON ボディを受け取ります。

:::deep-dive[ワイヤー上のエンベロープ]
`respond()` は `ResponseEnvelope` を返します。これはメタデータを運ぶ `Response` と、呼び出し元が受け取るべき `value` を保持するオブジェクトです。
サーバー関数ハンドラーはそのレスポンスのステータスとヘッダーを引き継ぎ、値をボディとしてエンコードします。
再検証を適用するルーターのようにエンベロープを認識する必要があるインテグレーションコードは、[`isResponseEnvelope()`](/docs/reference/solid-web/request-response/respond.md) を使います。このチェックは登録済みシンボルなので、バンドルにランタイムのコピーが2つ含まれていても機能します。
アプリケーションコードがエンベロープに直接触れることはありません。
:::

## 呼び出し元をリダイレクトする

`redirect()` は `Location` ヘッダー付きの `Response` を返します:

```ts
// src/data/account.ts
import { getRequestEvent, redirect } from "@solidjs/web";

export async function deleteAccount() {
	"use server";

	const event = getRequestEvent();
	const userId = event?.locals.userId;
	if (!userId) throw redirect("/sign-in");

	await database.users.remove(userId);
	return redirect("/goodbye", { revalidate: "session" });
}
```

リダイレクトが成功結果であるときは return し、上記のサインイン確認のように早期終了であるときは throw します。
どちらも同じように呼び出し元に届きます。

その後ブラウザが何をするかは、誰が呼び出したかによって決まります。
Solid Router の `action()` はページロードなしで `/goodbye` に遷移します。
JavaScript なしの HTML フォーム POST にはリダイレクトそのもの（デフォルトでは 302）が返され、ブラウザはそれに従います。
`deleteAccount()` を直接呼び出した素のコードは、解決値として `Response` オブジェクトを受け取ります。トランスポートは遷移メタデータをそのまま呼び出し元に返し、呼び出し元に適用させるためです。

ターゲットは文字列、またはルーターの型付きパスヘルパーが生成する `Href` を指定できます。ブランド付きの `Href` はその論理パスへリダイレクトします。
それ以外のオブジェクトは `redirect() expects a string URL or an Href-branded value` をスローします。

## 再検証を要求する

`reload()` は、どのキャッシュされた読み取りが古くなったかをインテグレーションに伝えるレスポンスを返します:

```ts
// src/data/cart.ts
import { reload } from "@solidjs/web";

export async function addToCart(productId: string, quantity: number) {
	"use server";

	await database.cart.add(currentSessionId(), productId, quantity);
	return reload({ revalidate: "cart" });
}
```

ルーターアクション経由で `addToCart("mug", 1)` を呼び出すと、呼び出しが確定したときにカートクエリが再取得されます。ページ上の他のものは一切触れられません。
`revalidate` を省略すると、すべてのキャッシュされた読み取りの再取得を要求します。

コアはキーを `X-Revalidate` ヘッダーで運び、キャッシュ自体は定義しません。
Solid Router はこのヘッダーを読み取って自身のクエリキャッシュと照合します。マッチングの仕組みは[ミューテーション後に何が再検証されるか](/docs/routing/solid-router/data.md#what-revalidates-after-a-mutation)で説明しています。
`respond()` と `redirect()` も同じ `revalidate` オプションを受け付けます。値も返すミューテーションや、遷移も行うミューテーション向けです。

## スローされたエラーを処理する

return または throw された `Response` やエンベロープは制御フローであり、ハンドラーはそのステータス・ヘッダー・値を保持します。
プレーンな throw 値は事故として扱われます:

```ts
// Avoid: a plain Error carries whatever message the failure had
export async function addToCart(productId: string, quantity: number) {
	"use server";
	if (!Number.isInteger(quantity) || quantity < 1) {
		throw new Error("Quantity must be a whole number");
	}
	await database.cart.add(currentSessionId(), productId, quantity);
	return reload({ revalidate: "cart" });
}

// Prefer: a response envelope for a failure the caller should see
export async function addToCart(productId: string, quantity: number) {
	"use server";
	if (!Number.isInteger(quantity) || quantity < 1) {
		throw respond(
			{ field: "quantity", message: "Quantity must be a whole number" },
			{ status: 400 }
		);
	}
	await database.cart.add(currentSessionId(), productId, quantity);
	return reload({ revalidate: "cart" });
}
```

開発環境では `Avoid` 版は書かれたメッセージのまま reject します。
本番環境では同じ呼び出しが `Error("Internal Server Error")` で reject します。ハンドラーはシリアライズする前にブランドのない throw 値をすべて置き換えるため、データベースドライバーの失敗したクエリや接続文字列はブラウザに届かず、数量メッセージも一緒に失われます。
`Prefer` 版はすべての環境で `{ field, message }` とステータス 400 で reject します。

2つの動作の境界を決めるのは `NODE_ENV` ではなくビルドです。
`@solidjs/web` は `development` エクスポート条件の背後にサーバー関数ハンドラーの開発用コピーを同梱しており、これは Vite の dev サーバーが解決します。本番ビルドや素の Node プロセスを含むその他の解決では、すべてサニタイズされます。

失敗が、ユーザーに見せることを意図したメッセージを持つ `Error` であるときは、ラップする代わりにブランドを付けます:

```ts
import { markSafeError } from "@solidjs/web";

throw markSafeError(new Error("This coupon has expired"));
```

ブランドによって、メッセージと自身のプロパティが本番環境で境界を越えられるようになります。
自分で作成していないエラーにブランドを付けてはいけません。ドライバーやサードパーティクライアント由来のエラーは、プロパティに何が入っているかわかりません。
インテグレーションコードは [`isSafeError()`](/docs/reference/solid-web/request-response/safe-errors.md) でブランドを検査できます。

:::pitfall[400 を return すると呼び出しが成功になる]
呼び出し元を reject させるのは throw された結果だけです。

```ts
// Avoid: returned, so the caller's promise resolves with the issues
return respond({ issues }, { status: 400 });

// Prefer: thrown, so the caller's promise rejects with the issues
throw respond({ issues }, { status: 400 });
```

`Avoid` 版では HTTP レスポンスは 400 ですが、ブラウザ内の Promise は書き込みが成功したかのように解決します。ルーターアクションはこれを `{ issues }` を結果とする成功サブミッションとして記録します。
return されたエンベロープのステータスは HTTP 呼び出し元向けです。呼び出し元に失敗を伝えるのは throw の役目です。
:::

## ルーターのサブミッションを追加する

Solid Router の `action()` はサーバー関数を、フォームが POST できてルーターが追跡できるものに変えます:

```ts
// src/data/cart.ts
import { action } from "@solidjs/router";
import { reload } from "@solidjs/web";

export async function addToCart(form: FormData) {
	"use server";

	const productId = String(form.get("productId") ?? "");
	const quantity = Number(form.get("quantity") ?? 1);
	if (!Number.isInteger(quantity) || quantity < 1) {
		throw respond(
			{ field: "quantity", message: "Enter a whole number" },
			{ status: 400 }
		);
	}

	await database.cart.add(currentSessionId(), productId, quantity);
	return reload({ revalidate: "cart" });
}

export const addToCartAction = action(addToCart);
```

`<form method="post" action={addToCartAction}>` をレンダーすると、フォームは JavaScript が読み込まれる前からその関数の URL に POST されます。ハイドレーション後はルーターが submit をインターセプトし、トランスポート越しに関数を呼び出して `reload` を適用します。
ルーターは実行中のフォームに `aria-busy` を付け、確定するとサブミッションを記録します。その `error` は throw されたエンベロープの値であり、[フォームガイド](/docs/guides/forms.md)がこれを読み取ってフィールドの横にメッセージを表示します。

上記のようにサーバー関数は名前付きエクスポートのままにして別途ラップしてください。そうすれば、テストや API ルートがフォームなしで `addToCart` を呼び出せます。
フォーム専用の関数であれば、本体をインラインで `action(async (form: FormData) => { "use server"; ... })` と書けます。[データロードとミューテーション](/docs/routing/solid-router/data.md#mutate-with-actions)ページではこの形を一貫して使っており、どちらも同じように動作します。

:::note[どちらの action か]
ここでの `action` は `@solidjs/router` のものです。
`solid-js` にも [`action`](/docs/reference/solid-js/lifecycle-actions/action.md) があり、こちらはジェネレーターをリアクティブなトランザクションとして実行するもので URL を持ちません。[ミューテーション](/docs/concepts/mutations.md)で説明しています。
フォームに必要なのはルーターのほうです。
:::

ルーターがシングルフライトのインテグレーションを登録しているとき、ミューテーションレスポンスは結果と一緒に再取得したルートデータを運べます。サーバー関数ランタイムはそのペイロードを不透明なものとして扱います。

## よくある問題

### 開発環境ではメッセージが正しいのに本番では `Internal Server Error` になる

関数がプレーンな `Error`、文字列、またはオブジェクトを throw しています。
本番環境ではブランドのない throw 値はすべてサニタイズされます。
構造化された失敗には `respond(value, { status })` を throw し、ユーザーに見せるメッセージには `markSafeError(new Error(message))` を使ってください。

### 400 が成功結果として届く

エンベロープが throw ではなく return されています。
return されたエンベロープはステータスに関係なく呼び出し元をその値で解決します。reject させるのは `throw respond(...)` です。

### リダイレクトが `Response` オブジェクトとして返ってくる

関数がルーターアクション経由ではなく直接呼び出されており、トランスポートは `Location` や `X-Revalidate` ヘッダーを持つレスポンスをそのまま呼び出し元に返します。
`action()` 経由で関数を呼び出すか、値を返して呼び出し元側で遷移してください。

### `redirect()` が Href ブランド値についての `TypeError` をスローする

第1引数が文字列でもルーターの `Href` でもないオブジェクトでした。
文字列のパス、またはルーターの型付きパスヘルパーが返す値を渡してください。

## まとめ

- 呼び出し元がデータだけを必要とするときはプレーンな値を返します。ステータスやヘッダーを付けるには `respond()` を使います。
- `redirect(path)` は return でも throw でも構いません。ルーターアクションなら遷移し、フォーム POST ならリダイレクトに従い、直接のコードは `Response` を受け取ります。
- 書き込み後に `reload({ revalidate })` を返すと、ルーターが指定した読み取りを再取得します。
- 呼び出し元に見せる失敗には `respond(value, { status })` を throw します。return されたエンベロープはステータスに関係なく呼び出し元を解決します。
- プレーンな throw 値は本番環境で `Internal Server Error` になります。`markSafeError()` で1つの `Error` だけをそれから除外できます。
- 開発用ビルドが選ばれるのは `NODE_ENV` ではなく `development` エクスポート条件です。
- フォームとサブミッション向けには、名前付きサーバー関数をルーターの `action()` でラップします。他から呼ばれない場合だけインラインで書きます。

## 次のステップ

- [プログレッシブエンハンスメント](/docs/building-apps/server-functions/progressive-enhancement.md): JavaScript が読み込まれる前に送信される同じ「カートに追加」フォームと、ランタイムが 303 に対して行うこと。
- [フォーム](/docs/guides/forms.md): チェックアウトの住所フォーム。throw された 400 をインラインのフィールドメッセージとして表示します。
- [メタデータとトランスポート](/docs/building-apps/server-functions/metadata-and-transport.md): すべての呼び出しにヘッダーを付ける方法と、実行中の呼び出しをキャンセルする方法。
- [ミューテーション](/docs/concepts/mutations.md): ミューテーションのクライアント側。楽観的な状態と `solid-js` のリアクティブな `action` を扱います。
