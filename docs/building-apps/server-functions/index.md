---
title: "サーバー関数"
version: "2.0"
description: '関数に "use server" を付けてデータベースクエリやシークレットをブラウザーから切り離し、その呼び出しが通信上でどう表現されるかを理解します。'
---

商品ページには商品レコードが必要です。
レコードはデータベースにあり、データベースクライアントには接続文字列が必要です。そしてクライアントも接続文字列もブラウザーに送ることはできません。
通常の解決策は独立した HTTP API です。ルートモジュール、fetch 呼び出し、レスポンスの型、そして整合を保つべき 2 か所が必要になります。

サーバー関数は、この 2 か所目をなくした同じ呼び出しです。
関数に `"use server"` を追加し、コンポーネントからはこれまでどおり呼び出すだけで、ビルドが本体をサーバーへ移し、ブラウザーには HTTP リクエストを代行する型付きスタブを残します。

```ts
// src/data/products.ts
import { database } from "./database";

export async function getProduct(id: string) {
	"use server";
	return database.products.find(id);
}
```

```tsx
// src/pages/Product.tsx
import { createMemo, Loading } from "solid-js";
import { getProduct } from "../data/products";

export function Product(props: { id: string }) {
	const product = createMemo(() => getProduct(props.id));

	return (
		<Loading fallback={<p>Loading…</p>}>
			<h1>{product().name}</h1>
			<p>{product().description}</p>
		</Loading>
	);
}
```

ブラウザーでページを読み込んでネットワークタブを開くと、その呼び出しは `/_server/data/<id>` への `POST` で、ボディには `["mug"]` が乗り、レスポンスには関数が返した商品がそのまま入っています。
クライアントバンドルを `database` で検索しても、見つかりません。
コンポーネントは変わりません。`getProduct` は両側で Promise を返すため、[非同期リアクティビティ](/docs/concepts/async-reactivity.md)のルールがそのまま適用されます。

サーバー関数はルーターなしでも動作します。
Solid Router の `query()` と `action()` はその上にキャッシュ、送信、再検証を追加するもので、そのレイヤーは[データ読み込みとミューテーション](/docs/routing/solid-router/data.md)で説明しています。

## サーバー関数を有効にする

start モードで `serverFunctions` オプションを使って変換を有効にします:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";

export default defineConfig({
	plugins: [
		solid({
			start: true,
			ssr: true,
			serverFunctions: true,
		}),
	],
});
```

`solid-v2/fullstack` テンプレートと `solid-v2/fullstack-tanstack` テンプレートにはこの設定が同梱されています。

## サーバー関数を宣言する

関数本体の最初の文として `"use server"` を追加します:

```ts
export async function getProduct(id: string) {
	"use server";
	return database.products.find(id);
}
```

サーバービルドは本体を保持し、安定した id で登録します。
クライアントビルドは本体を、引数をサーバー関数エンドポイントに送ってデコード済みの結果を返す参照に置き換えます。
データベースクライアントやバリデーションスキーマのように本体の中でだけ使われるインポートは、本体と一緒にクライアントビルドから取り除かれます。

本体はサーバー上でモジュールのトップレベルとして実行されるため、使えるのはモジュールスコープのバインディングだけで、その中間にあるものにはアクセスできません:

```tsx
// Avoid: the server function reads a variable from the component's scope
function AddToCart(props: { productId: string }) {
	const productId = props.productId;
	async function add() {
		"use server";
		await database.cart.add(productId);
	}
	return <button onClick={add}>Add to cart</button>;
}

// Prefer: pass the value as an argument
async function addToCart(productId: string) {
	"use server";
	await database.cart.add(productId);
}

function AddToCart(props: { productId: string }) {
	return (
		<button onClick={() => addToCart(props.productId)}>Add to cart</button>
	);
}
```

`Avoid` の例はビルドに失敗します。
コンパイラは ``server functions cannot capture non-top-level variables: `productId` is declared in an enclosing function`` というエラーをファイル名と行番号付きで報告します。抽出された本体が、実行される場所には存在しない変数を読もうとするためです。

:::caution[ディレクティブはメソッドではなく関数に付ける]
クラスのメソッド、ゲッター、セッターの中にある `"use server"` 文字列は抽出されず、コンパイラは `a "use server" directive has no effect on a method` で拒否します。
クラスから呼び出す必要がある場合は、プロパティに関数を代入するか、モジュールレベルで関数を宣言してください。
:::

## サーバーモジュールを宣言する

モジュールの先頭にディレクティブを置くと、すべてのエクスポートがサーバー関数になります:

```ts
// src/data/catalog.ts
"use server";

import { database } from "./database";

export async function listProducts() {
	return database.products.all();
}

export async function countProducts() {
	return database.products.count();
}
```

各エクスポートは関数として評価される必要があります。
名前付き関数、default エクスポート、エイリアス、ラッパーは問題ありません。関数でないエクスポートがあると、モジュールの読み込み中にそのエクスポート名を挙げて `is not a function` と告げるエラーでサーバーが停止します。

モジュール全体がサーバーで実行されるため、その中のクロージャーはそのまま保たれ、モジュールスコープで適用されたラッパーは登録される実装の一部になります:

```ts
// src/data/orders.ts
"use server";

import { getRequestEvent, redirect } from "@solidjs/web";
import { database } from "./database";

const withAccount =
	<A extends unknown[], R>(fn: (userId: string, ...args: A) => Promise<R>) =>
	async (...args: A) => {
		const userId = getRequestEvent()?.locals.userId;
		if (!userId) throw redirect("/sign-in");
		return fn(userId, ...args);
	};

export const listOrders = withAccount(async (userId) => {
	return database.orders.forUser(userId);
});
```

セッションなしで `listOrders()` を呼ぶと、その呼び出しが HTTP 経由でもサーバーレンダーからでも、リダイレクトが発火します。

:::note[2 種類のラッパー]
`withAccount` のようなモジュールレベルのラッパーはサーバー側実装の内部で実行されるため、すべての呼び出し経路に適用されます。
`GET()`、`live()`、`withMeta()` のような宣言ラッパーは、関数レベルの `"use server"` 参照を外側から包みます。これらは参照の呼び出され方を設定するもので、サーバーサイドのポリシーを実行することはありません。
この違いがバリデーションにとって何を意味するかは、[引数とセキュリティ](/docs/building-apps/server-functions/arguments-and-security.md#validate-caller-controlled-values)で説明しています。
:::

## 呼び出しは何になるか

ブラウザーでは、呼び出しはサーバー関数エンドポイント（デフォルトでは `/_server`）への HTTP リクエストになります。
クライアントランタイムは `/_server/data/<id>` に POST し、レスポンスを Solid のコーデックを通して読みます。
素のアドレス `/_server/<id>` は、クライアントランタイム以外のすべて、つまり HTML フォームの POST や、ターミナルに人が打ち込めるあらゆるものに、通常の HTTP で応答します。

```bash
curl -X POST 'https://shop.example/_server/<id>?args=%5B%22mug%22%5D' \
	-H 'Origin: https://shop.example'
```

このリクエストは `getProduct("mug")` を実行し、商品を JSON ボディとして返します。
すべてのサーバー関数がこの方法で到達可能です。だからこそ[引数とセキュリティ](/docs/building-apps/server-functions/arguments-and-security.md)ではすべての引数を信頼できないものとして扱います。

サーバーサイドレンダリング中は、同じ `getProduct(props.id)` 呼び出しでも HTTP リクエストは発生しません。
実装は現在のサーバープロセス内で、ページリクエストから派生した `serverOnly: true` のリクエストイベントのもと、呼び出しごとの `locals` のコピーとともに実行されます。
サインイン済みユーザーなど、ミドルウェアが `locals` に置いた値は、どちらの経路でも見えます。

:::deep-dive[アドレスが 2 つある理由]
共有キャッシュは URL ごとに 1 つの応答を保存します。
スクリプト経由の応答と通常の応答が同じアドレスを共有していると、キャッシュされたコーデックエンコード済みボディがフォーム POST に再生されたり、通常の JSON ボディがクライアントランタイムに返されたりする可能性があります。
呼び出し元の種類を URL に載せること、すなわち `/data/<id>` と `/<id>` の区別で、2 つの応答形態が 2 つのキャッシュエントリに分かれます。
クライアントランタイムが送る `X-Server-Function-Instance` ヘッダーは、ログ記録と JavaScript なし環境の規約のために呼び出しを識別するもので、応答の形態を決めるものではありません。
:::

## よくある問題

### 呼び出しがデータではなく `Response` オブジェクトに解決される

関数が `redirect()` または `reload()` を返し、呼び出し元がルーターのアクションではなく素のコードだった場合です。
クライアントのトランスポートは、ナビゲーションや再検証のメタデータを持つレスポンスをそのまま呼び出し元に返します。ナビゲーションを所有するインテグレーションがそれを適用できるようにするためです。
Solid Router の `action()` 経由で関数を呼び出すか、値を返して呼び出し元に行き先を決めさせてください。両方の方法を[ミューテーションとレスポンス](/docs/building-apps/server-functions/mutations-and-responses.md#redirect-the-caller)で説明しています。

### ビルドが `server functions cannot capture non-top-level variables` で失敗する

関数本体が、モジュールスコープと関数の間、たとえばコンポーネントの prop やループ変数の位置で宣言された変数を読んでいます。
値を引数として渡すか、関数をモジュールスコープへ移してください。

### データベースのインポートがブラウザーバンドルに含まれている

ビルドがインポートを取り除くのは、`"use server"` 本体の外でそれを参照するものが何もない場合だけです。
型のインポートは問題になりませんが、バッジに使う `database.products.count` のようなコンポーネント内の値参照があると、モジュール全体がクライアントビルドに残ります。
その読み取りをサーバー関数に移すか、インポートを `"use server"` モジュールに置いてクライアントコードから到達できないようにしてください。

### 関数本体がブラウザーで実行される

`serverFunctions` オプションがオフになっています。
変換がなければ、`"use server"` はエンジンが評価して無視する文字列式にすぎず、本体は呼び出された場所でそのまま実行されます。
`vite.config.ts` を[サーバー関数を有効にする](#enable-server-functions)の節と照らし合わせて確認してください。

### サーバーで `Cannot call server function outside of a request` が出る

リクエストイベントがスコープにない状態でサーバーコードが関数を呼びました。モジュールレベルの呼び出し、スケジュールされたジョブ、イベントを提供しなかったテストなどです。
プロセス内呼び出しは現在のリクエストからイベントを派生させるため、リクエストが必要です。
レンダー、ミドルウェア、別のサーバー関数から呼び出すか、テストでは [`provideRequestEvent`](/docs/reference/solid-web/request-response/provide-request-event.md) でイベントを提供してください。

## まとめ

- 関数の最初の文として `"use server"` を追加するか、モジュールの先頭に置いてすべてのエクスポートを対象にします。
- サーバー関数が読めるのは、そのパラメーター、モジュールスコープのバインディング、グローバルだけです。コンポーネントスコープの値は引数として渡してください。
- 本体の中だけで参照されるインポートはクライアントビルドに含まれません。本体の外での参照があると残ります。
- ブラウザーでの呼び出しは `POST /_server/data/<id>` です。素の `/_server/<id>` はフォームやスクリプトからの通常の HTTP に応答します。
- サーバーレンダー中の同じ呼び出しは、`serverOnly` リクエストイベントのもとプロセス内で実行され、HTTP は関与しません。
- モジュールレベルのラッパーはすべての呼び出し経路で実行されます。`GET()`、`live()`、`withMeta()` は参照を設定するだけで、サーバーサイドのポリシーは実行しません。
- 誰でもサーバー関数にリクエストを送れるため、バリデーションと認可は本体の中で行ってください。

## 次のステップ

- [読み取り・ストリーム・ライブデータ](/docs/building-apps/server-functions/reads-and-live-data.md): HTTP キャッシュが保存できる読み取りを宣言し、他の買い物客が変更したときも在庫レベルとの接続を保ちます。
- [引数とセキュリティ](/docs/building-apps/server-functions/arguments-and-security.md): 呼び出し元が何を送れるか、トランスポートが何をエンコードできるか、そしてすべてのリクエストをバリデーション・認可する方法。
- [ミューテーションとレスポンス](/docs/building-apps/server-functions/mutations-and-responses.md): カートのミューテーションからリダイレクト・リロード・400 を返し、スローされたエラーが何を明かすかを制御します。
- [データ読み込みとミューテーション](/docs/routing/solid-router/data.md): 同じ関数を `query()` と `action()` で包んで、キャッシュ・送信・再検証を利用します。
