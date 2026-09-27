---
title: "プログレッシブエンハンスメント"
version: "2.0"
description: "「カートに追加」フォームを JavaScript が読み込まれる前からサーバー関数に POST できるようにし、そのやり取りのどの部分をコアが担い、どの部分をルーターが追加するかを理解します。"
---

低速な接続の買い物客が商品ページを開き、クライアントバンドルが届く前に「カートに追加」をクリックします。
ボタンの配線が `onClick` ハンドラーだけなら、何も起こらずクリックは失われます。
ボタンが `action` が URL であるフォームの内側にあれば、ブラウザはフォームを POST し、サーバーが関数を実行し、買い物客はカートにたどり着きます。

サーバー関数は URL を持つため、このクラスタのページ上のすべてのミューテーションで2番目の方式が使えます。
サーバー関数ランタイムはその URL へのブラウザのフォーム POST を認識し、ボディを1つの `FormData` 引数としてデコードし、スクリプトなしでブラウザが従える形で応答します。

アプリケーションコードはルーターを介してこれを利用します。
Solid Router の `action()` はサーバー関数を、その URL にシリアライズされる値でラップします。そのため同じ `<form action={...}>` がハイドレーション前にも動作し、ハイドレーション後はルーターに引き継がれます。
ほとんどのアプリケーションで必要なのは[ルーターアクション経由のフォーム POST](#post-a-form-through-a-router-action)の節だけです。残りはその下にあるトランスポートの説明で、ルーター外のフォームや、独自のフォームヘルパーを作るインテグレーション向けです。

## ルーターアクション経由でフォームを POST する

1つの `FormData` 引数を取るサーバー関数を宣言し、`@solidjs/router` の `action` でラップします:

```ts
// src/data/cart.ts
import { redirect, respond } from "@solidjs/web";

export async function addToCart(form: FormData) {
	"use server";

	const productId = String(form.get("productId") ?? "");
	const quantity = Number(form.get("quantity") ?? 1);
	if (!productId || !Number.isInteger(quantity) || quantity < 1) {
		throw respond({ error: "Enter a whole number" }, { status: 400 });
	}

	await database.cart.add(currentSessionId(), productId, quantity);
	return redirect("/cart", { revalidate: "cart" });
}
```

```tsx
// src/pages/Product.tsx
import { action } from "@solidjs/router";
import { addToCart } from "../data/cart";

const addToCartAction = action(addToCart);

<form method="post" action={addToCartAction}>
	<input type="hidden" name="productId" value={props.id} />
	<input type="number" name="quantity" value="1" min="1" />
	<button type="submit">Add to cart</button>
</form>;
```

JavaScript を無効にしてページを読み込み、送信します。
ブラウザはその関数の URL に POST し、サーバーが `addToCart` を実行し、応答するリダイレクトがブラウザを `/cart` に送ります。
JavaScript ありでは、ルーターが submit をインターセプトし、トランスポート越しに関数を呼び出し、ページロードなしで `/cart` に遷移します。

これを機能させる配線はハンドラーではなくフォームです:

```tsx
// Avoid: the mutation exists only in a click handler
<button onClick={() => addToCart(new FormData(formElement))}>Add to cart</button>

// Prefer: a form whose action is the function's URL
<form method="post" action={addToCartAction}>
	<button type="submit">Add to cart</button>
</form>
```

ハイドレーション前の `Avoid` 版にはハンドラーがアタッチされていないため、クリックしても何も起きません。`Prefer` 版は POST されます。

ハイドレーション後のページがサブミッションに対して行うことはすべて、その POST の上のレイヤーです。
ルーターが起動すると submit をインターセプトし、同じ関数をサーバー関数トランスポート越しに呼び出し、呼び出し中はフォームに `aria-busy` を設定し、結果を `useSubmissions` に記録し、呼び出しが送信される前に `.onSubmit` フックを実行します。[楽観的な書き込み](/routing/solid-router/data#before-the-server-confirms)はここに置きます。
これらは HTML やサーバー関数を一切変えません。バンドルがまだ届いていない買い物客には POST と新しいページが、バンドルが届いた買い物客にはサーバーの応答前に描画される同じ結果が得られます。

[フォームガイド](/guides/forms)はこの形の上にチェックアウトの住所フォームを構築し、バリデーションメッセージ、保留中の状態、サーバーが確認する前に更新される住所リストを実装しています。

## GET フォームを送信する

GET フォームは action URL のクエリ文字列をフォームのフィールドで置き換えます。
そのクエリがエンコードされた引数リストでないとき、ハンドラーはそれを1つの `URLSearchParams` 引数として関数に渡します。

`GET()` は型付きの `ServerFunction` 参照を返すため、その `url` は TypeScript から利用できます:

```ts
// src/data/search.ts
import { GET } from "@solidjs/web/server-functions";

export const searchProducts = GET(async (params: URLSearchParams) => {
	"use server";
	return database.products.search(String(params.get("q") ?? ""));
});
```

```tsx
<form method="get" action={searchProducts.url}>
	<input name="q" />
	<button type="submit">Search</button>
</form>
```

"mug" と入力して送信すると、ブラウザは `/_server/<id>?q=mug` に遷移し、関数は `params.get("q") === "mug"` を受け取ります。

:::caution[GET フォームはミューテーションではなく URL を表す]
`GET()` 関数は安全で冪等でなければなりません。`GET` リクエストはオリジン検証されず、キャッシュ・プリフェッチャー・リンクチェッカーによって再送されるためです。
ミューテーションは `method="post"` で POST してください。
:::

## 参照の URL

すべてのサーバー関数参照は実行時に `id` と `url` を持ちます。クライアントスタブでもサーバー側の呼び出し可能なものでも同様です。
`url` は関数のプレーン HTTP アドレス `<endpoint>/<id>` であり、ルーターがフォーム属性にシリアライズするものです。
クライアントランタイム自身の呼び出しは兄弟アドレス `<endpoint>/data/<id>` に向かうため、ある種類の呼び出し元の応答をキャッシュが別の種類に返すことはありません。

TypeScript が `url` を認識するかどうかは、関数の宣言方法によって決まります:

- `GET()` と `live()` が返す参照は `ServerFunction` 型で、`id` と `url` が宣言されています。
- 素の `"use server"` 関数は宣言された関数型のままです。
  `url` は実行時には存在しますが型には存在しないため、`addToCart.url` は型エラーです。

フォーム POST では URL ではなくルーターアクションを使ってください。
素の宣言からアドレスを読む必要があるインテグレーションは、`isServerFunction(fn)` で確認した後に `@solidjs/web/server-functions` の `ServerFunction` に絞り込みます。

## 先頭の引数をバインドする

関数 id は URL パスにあります。
インテグレーションは予約済みの `args` クエリパラメータで JSON 安全なバインド引数を追加でき、送信されたフォームは最後の `FormData` 引数のままです。
Solid Router の `action.with(...)` がアプリケーションコードのためにこれを行います。`removeFromCart(productId: string, form: FormData)` アクションでは、商品 id がバインドされ、フォームが残りを供給します:

```tsx
<form method="post" action={removeFromCart.with(line.productId)}>
	<button>Remove</button>
</form>
```

`serverFunctionUrl(id, boundArgs)` はルーター、フォームヘルパー、カスタムホストのためにその URL を構築します:

```ts
import { serverFunctionUrl } from "@solidjs/web/server-functions";

const address = serverFunctionUrl(removeFromCart.id, [line.productId]);
```

バインド引数は JSON 安全でなければなりません。JavaScript なしの規約にはコーデックがないためです。
`boundArgs` に `Date` や `Map` があると `Bound arguments in an action url must be JSON-safe` をスローします。

## チェックは関数の中に置く

JavaScript なしのサブミッションは、スクリプト経由のものと同じ実装に、同じ `FormData` で届きます。
関数内のバリデーションと認可は両方をカバーします。コンポーネント内のチェックはどちらもカバーしません。コンポーネントが実行されないためです。

:::deep-dive[コアが担うものとルーターが担うもの]
コアはトランスポートを担います。
リクエストがクライアントランタイムから来たかどうかをアドレスで判別し、URL とフォームの引数をデコードし、ブラウザのフォーム POST に対するデフォルトの `createNoJSHandler()` レスポンスを提供します。ページへの 303 と、`Response` でない結果を格納する一回限りのフラッシュ Cookie です。
`handleNoJS` を公開しているため、インテグレーションはそのポリシーを置き換えられます。また、すべての経路でレスポンスのステータス・ヘッダー・ボディ・リダイレクト・再検証メタデータを保持します。

ルーターはサブミッションの動作を担います。
次のサーバーレンダーでフラッシュ Cookie を読み取ってクリアし、デコードされた結果をサブミッション状態に変換し、再検証メタデータをクエリキャッシュに接続します。

コアのデフォルトは、カスタムホストが `handleServerFunctionRequest()` を介してディスパッチするときに適用されます。
ホストは `createNoJSHandler()` にベースパスを設定したり、別の `handleNoJS` を供給したりできます。[サーバー関数のプログレッシブエンハンスメント API](/reference/solid-web/server-functions/progressive-enhancement)にこれらのフックが列挙されています。
[サーバーレンダリングとハイドレーション](/routing/solid-router/server-rendering)でルーターのセットアップを説明しています。
:::

## よくある問題

### サーバー関数で `Property 'url' does not exist` になる

その関数は素の `"use server"` 宣言で、型はその関数自身のものです。
フォームにはルーターの `action()` に通してください。インテグレーションコードでは `isServerFunction(fn)` の後に `ServerFunction` に絞り込んでください。

### `Bound arguments in an action url must be JSON-safe` になる

`.with()` でバインドされた値、または `serverFunctionUrl()` に渡された値が `Date`、`Map`、`Set`、または JSON が運べない別の値でした。
文字列や数値をバインドして関数内で変換するか、フォームボディ経由で値を渡してください。

### フォームは送信されるが、その場に留まらずページがリロードされる

フォームの周りにルーターがマウントされていないため、submit をインターセプトするものがなく、ブラウザは `action` URL をフルページ遷移として辿ります。
関数は実行されリダイレクトにも従うため、結果は依然として正しいです。スクリプト経由の経路を得るには、`Router` の内側にフォームをマウントしてください。

### JavaScript なしの送信後に 400 が何も表示しない

結果はフラッシュ Cookie で戻ってきており、誰かがそれを読む必要があります。
Solid Router は次のサーバーレンダーで Cookie を読み取り、サブミッションを記録します。ルーターがない場合、カスタムホストは自身の `handleNoJS` を通じてそれを読み取ります。
[フォームガイドのパス3](/guides/forms#pass-3-inline-errors-and-pending-state)でルーターがそれを読む様子を示しています。

## まとめ

- すべてのミューテーションを `<form method="post" action={...}>` の後ろに置き、クライアントバンドルが動く前でもブラウザが送信できるようにします。
- サーバー関数はルーターの `action()` でラップします。これは関数のプレーン HTTP URL にシリアライズされ、ハイドレーション後に引き継ぎます。
- 保留中の状態、`useSubmissions`、`.onSubmit` の楽観的書き込みは、ハイドレーション後のページが追加するレイヤーです。HTML とサーバー関数は変わりません。
- ブラウザのフォーム POST は return されたリダイレクトに従います。その他の結果にはページへの 303 とフラッシュ Cookie で応答され、ルーターが次のレンダーでサブミッションに変換します。
- `method="get"` と `fn.url` は `GET()` の読み取りにのみ使います。関数はフィールドを `URLSearchParams` として受け取ります。
- `url` は実行時にはすべての参照にありますが、型では `GET()` と `live()` の参照にのみ存在します。
- バインド引数は `args` クエリパラメータで運ばれ、JSON 安全でなければなりません。
- バリデーションと認可は関数の中で行います。JavaScript なしのリクエストではコンポーネントが実行されないためです。

## 次のステップ

- [フォーム](/guides/forms): チェックアウトの住所フォーム。ハイドレーション前から動作し、ハイドレーション後はインラインメッセージと楽観的な住所リストを追加します。
- [データロードとミューテーション](/routing/solid-router/data): `.with()`、サブミッション、再検証を含め、`action()` がこのトランスポートの上に追加するもの。
- [セッションと認証](/building-apps/sessions-and-auth): サインインフォーム。ストアフロントで最も一般的な JavaScript なしのサブミッションです。
