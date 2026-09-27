---
title: "読み取り、ストリーム、ライブデータ"
version: "2.0"
description: "HTTP キャッシュが保存できる商品の読み取りを宣言し、サーバー関数から注文イベントをストリームし、別の買い物客が変更しても在庫数の接続を維持します。"
---

[サーバー関数](/building-apps/server-functions)ページの商品ページは「残り 3 点」と表示しています。
別の買い物客が 1 点購入すると、誰かがリロードするまでこのページの数値は誤ったままです。
同じページは訪問のたびに商品レコードを取得していますが、サーバー関数呼び出しはデフォルトで `POST` であるため、ブラウザとサーバーの間にあるどのキャッシュもその回答を記憶できません。

どちらの問題も、読み取りがサーバーへどう届くかに関するものです。
`GET()` は、トランスポートがキャッシュ可能な `GET` リクエストとして送信してよい読み取りを宣言します。
`live()` は、時間経過とともに値を生成し、接続が切れたときに再接続する読み取りを宣言します。これにより在庫数は別の買い物客の購入に追従します。

ほとんどのアプリケーションで必要なのは [GET 読み取りの宣言](#declare-a-get-read) セクションだけで、それも読み取りが Solid Router の `query()` の外で呼ばれる場合に限られます。加えて、ユーザーの操作中に変化する値には [live ソース](#declare-a-live-source) が必要です。
ストリームと接続ステータスは、イベントを直接消費するアプリの部分向けです。

## GET 読み取りを宣言する

サーバー関数エントリから `GET` をインポートし、関数をラップします:

```ts
// src/data/products.ts
import { GET } from "@solidjs/web/server-functions";

export const getProduct = GET(async (id: string) => {
	"use server";
	return database.products.find(id);
});
```

商品ページを読み込んでネットワークタブを見ると、その呼び出しは `/_server/data/<id>?args=%5B%22mug%22%5D` への `GET` で、引数はリクエストボディではなく URL に含まれています。
エンコード後の URL がトランスポートの長さ制限を超える場合、クライアントは代わりに同じ呼び出しを `POST` として送信します。呼び出しは成功しますが、その回答はキャッシュエントリになりません。

`GET()` 宣言は `GET` と `HEAD` のディスパッチを許可し、デフォルトの `POST` パスも維持します。
`GET()` を宣言していない関数は、`GET` リクエストにステータス 405 で応答します。

Solid Router の `query()` は宣言を代行します: `query()` に渡した素の `"use server"` 関数はその時点で `GET()` でラップされ、すでに宣言済みの関数はそのまま素通りします。
読み取りを `query()` の外で呼び出す場合や、Solid Router 以外のルーターが宣言しない場合は、自分で `GET()` を書きます。

ラッパーが必要とするのはサーバー関数であり、素の非同期関数ではありません:

```ts
// Avoid: no directive, so GET receives an ordinary function
export const getProduct = GET(async (id: string) => {
	return database.products.find(id);
});

// Prefer: the directive inside, the declaration outside
export const getProduct = GET(async (id: string) => {
	"use server";
	return database.products.find(id);
});
```

`Avoid` 版はモジュールの読み込み時に `GET expects a server function reference` をスローし、本体を抽出対象としてマークするものがないため、データベースのインポートがクライアントビルドに残ります。

:::pitfall[GET 引数のシークレットは URL に残る]
`GET()` 読み取りの引数はクエリ文字列になり、クエリ文字列はブラウザ履歴・サーバーのアクセスログ・キャッシュキーに書き込まれます。

```ts
// Avoid: the session token travels in the URL
export const getOrders = GET(async (sessionToken: string) => {
	"use server";
	return database.orders.forSession(sessionToken);
});

// Prefer: read identity from the request event
export const getOrders = GET(async () => {
	"use server";
	const userId = getRequestEvent()?.locals.userId;
	if (!userId) throw redirect("/sign-in");
	return database.orders.forUser(userId);
});
```

`Avoid` 版では、リクエストを記録するすべてのログ行にトークンが残ります。
:::

サーバー関数のレスポンスは、関数が独自のポリシーを設定しない限り `Cache-Control: no-store` で送出されます。
`GET()` の宣言はキャッシュエントリを可能にし、ヘッダーがそれを実際に発生させます:

```ts
import { respond } from "@solidjs/web";
import { GET } from "@solidjs/web/server-functions";

export const getCatalog = GET(async () => {
	"use server";
	const products = await database.products.all();
	return respond(products, {
		headers: { "cache-control": "public, max-age=60" },
	});
});
```

1 分以内にカタログを 2 回訪れると、2 回目のリクエストはサーバーに届かずブラウザキャッシュから応答されます。
`GET` は `POST` 呼び出しを保護する同一オリジンチェックもスキップします。宣言された読み取りは契約上どのオリジンから実行しても安全だからです。詳細は[同一オリジン保護](/building-apps/server-functions/arguments-and-security#same-origin-protection)を参照してください。
`GET()` の宣言は、安全で冪等な読み取りに限ってください。

## ストリームを返す

サーバー関数は非同期イテラブルを返せます。トランスポートは生成された各 yield 値を、開いているレスポンス上をその都度送信します:

```ts
// src/data/orders.ts
export async function* orderEvents(orderId: string) {
	"use server";
	for await (const event of orderLog.subscribe(orderId)) {
		yield event;
	}
}
```

ブラウザで `for await` で消費すると、各イベントはサーバーが yield したタイミングで届きます。
ブラウザで `break` や `return` によりイテレーションを終了すると、リクエストが中断されサーバーの `request.signal` が発火するため、プロデューサーはクリーンアップできます。

ストリームされた呼び出しは 1 つの接続を占有します。
接続が切れるとイテレーションはエラーで終了し、再接続されることはありません。
注文のステータス履歴のように、消費者が蓄積するイベント列にはストリームを使い、各値が前の値を置き換える場合は `live()` を使います。

## live ソースを宣言する

live ソースは値の形をしています: 各 yield は 1 つの問いへの現在の回答であり、リストに追加するイベントではありません。
商品の在庫数はそのような問いの 1 つです。

```ts
// src/data/inventory.ts
import { GET, live } from "@solidjs/web/server-functions";

export const stockLevel = live(
	GET(async function* (productId: string) {
		"use server";
		yield await inventory.count(productId);
		for await (const change of inventory.subscribe(productId)) {
			yield change.count;
		}
	})
);
```

`live()` は `GET()` の外側に置きます。
`GET()` は読み取りのトランスポートを選択し、`live()` はその呼び出し動作を包むため、最も外側の宣言である必要があります。
`live()` は `GET()` を意味しません。これなしの live ソースは `POST` 経由でストリームしますが、キャッシュ可能な URL が不要ならそれで問題ありません。

このソースは呼び出されるたびに、まず現在のカウントを yield します。
これが再接続が依存する契約です: 接続が切れてクライアントが再度呼び出したとき、最初の yield が古い回答を置き換えるため、空白を埋めるクライアント側キャッシュは不要です。

## live ソースをリアクティブに読み取る

返された非同期イテラブルを非同期計算に渡します:

```tsx
// src/pages/Product.tsx
import { createMemo, Loading } from "solid-js";
import { stockLevel } from "../data/inventory";

function Stock(props: { productId: string }) {
	const source = stockLevel(props.productId);
	const count = createMemo(() => source);

	return (
		<Loading fallback={<span>Checking stock…</span>}>
			<output>{count()} left in stock</output>
		</Loading>
	);
}
```

商品を 2 つのブラウザウィンドウで開き、最初のウィンドウで 1 点購入します。
2 番目のウィンドウのカウントはリロードなしで変化します。

最初の値は計算をサスペンドさせる可能性があるため、読み取りの上にある `Loading` バウンダリが、値が届くまで何を表示するかを決めます。
サーバーサイドレンダリングでは、Solid は最初の値をレンダーし、以降の処理をブラウザに引き渡します。

1 つのイテレーションは 1 つの接続です。
ツリーの複数箇所が同じ在庫数を表示する場合は、メモをホイストして値を下に渡します:

```tsx
// Avoid: each component opens its own connection to the same source
function Stock(props: { productId: string }) {
	const count = createMemo(() => stockLevel(props.productId));
	// ...
}
function AddToCartButton(props: { productId: string }) {
	const count = createMemo(() => stockLevel(props.productId));
	// ...
}

// Prefer: one memo, one connection, the value passed down
function Stock(props: { count: number }) {
	return <span>{props.count} in stock</span>;
}
function AddToCartButton(props: { disabled: boolean }) {
	return <button disabled={props.disabled}>Add to cart</button>;
}
function Product(props: { productId: string }) {
	const count = createMemo(() => stockLevel(props.productId));
	return (
		<>
			<Stock count={count()} />
			<AddToCartButton disabled={count() === 0} />
		</>
	);
}
```

`Avoid` 版は 1 つの商品に対して 2 つの開いたストリームを保持し、ネットワークが瞬断したときにそれぞれが個別に再接続します。

## 接続ステータスを監視する

返されるイテラブルには、再接続ループが値ストリームから取り除く情報を受け取る任意の `onstatus` コールバックがあります:

```tsx
import { createMemo, createSignal } from "solid-js";
import type { LiveSourceStatus } from "@solidjs/web/server-functions";

const source = stockLevel("mug");
const [status, setStatus] = createSignal<LiveSourceStatus>();

source.onstatus = (next) => setStatus(next);
const count = createMemo(() => source);
```

コールバックが受け取る値:

- `"connected"`: 接続が成功するたび。
- `"reconnecting"`: 接続済みのストリームが失敗し、クライアントがリトライを開始したとき。
- `"closed"`: ソースが完了したとき、消費者がイテレーションを終了したとき、または確定的な拒否でソースが閉じたとき。

数値が遅れている可能性をユーザーに知らせたいときは、カウントの横に「再接続中」を表示します。
数値がどれくらい古いかを UI が示す必要がある場合は、タイムスタンプなどのデータの鮮度を yield 値自体に入れます。接続ステータスはトランスポート上の事実であり、データについては何も語りません。

:::deep-dive[リトライするものとしないもの]
最初の接続前の失敗は通常のサーバー関数呼び出しと同様に reject されるため、誤った id やセッション欠如は呼び出し箇所で表面化します。
接続が一度成功した後の失敗は指数バックオフでリトライされ、正常な値がバックオフをリセットします。
4xx レスポンスは確定的な拒否です: サーバーはリクエストを理解した上で拒否したため、リトライしても意味がなく、ソースはエラーとともに `"closed"` を発火して消費者を reject します。
例外はリトライを求めるステータス 408・425・429 と、`Retry-After` を伴うすべてのレスポンスです。これらは指定された待機時間の後に 5xx と同様に再接続します。
live ソースは開いているストリーム経由で更新されるため、ルーターの再検証やシングルフライトのミューテーションデータには参加しません。
:::

## よくある問題

### サーバーログに `Method not allowed for server function`、ステータス 405

`GET()` で宣言されていない関数に `GET` または `HEAD` リクエストが送られました。
リンクチェッカーやプリフェッチャーは、見つけたすべての URL に対してこれを行います。
安全な読み取りなら関数を `GET()` で宣言し、そうでなければ 405 のままにします。

### 読み取りがキャッシュから配信されない

3 つの条件が揃う必要があります: 関数が `GET()` で宣言されている、レスポンスがデフォルトの `no-store` 以外の `Cache-Control` ヘッダーを設定している、そしてエンコード後の URL がトランスポートの長さ制限に収まっている。
長いフィルターオブジェクトのような大きな引数を持つ読み取りは `POST` にフォールバックし、エラーなしでキャッシュを外します。

### ネットワークタブに 1 つの商品で 2 つの開いたストリームが表示される

2 つのコンポーネントがそれぞれ `stockLevel(id)` を呼んでいます。live ソースを呼び出すすべての呼び出し箇所は、独自の接続を保持して個別に再接続します。
[live ソースをリアクティブに読み取る](#read-a-live-source-reactively)と同様に、メモを最も近い共通の親にホイストして値を下に渡してください。

### live ソースがネットワークエラー後に停止して戻らない

その失敗はクライアントが確定的な拒否として扱う 4xx だったか、最初の接続が一度も成功する前に起きたものです。
サーバーログでステータスを確認してください: クライアントがリトライするのは接続成功後の一時的な失敗だけであり、拒否されたリクエストには待機ではなくリクエスト側の修正が必要です。

## まとめ

- 安全で冪等で、かつ Solid Router の `query()` の外で呼ばれる読み取りには `GET()` で宣言します。`query()` は宣言を代行します。
- `GET()` 読み取りは引数を URL に入れます。シークレットは引数に入れず、リクエストイベントから識別情報を読み取ります。
- レスポンスは `Cache-Control: no-store` で送出されます。`respond(value, { headers })` を返して読み取りをキャッシュ対象にします。
- 非同期イテラブルを返すとイベントを 1 つの接続でストリームできます。ブラウザでイテレーションを終了するとサーバーのプロデューサーも終了します。
- 時間とともに変化する値は `live(GET(fn))` で宣言します。`live()` を最外側にし、呼び出しのたびに最初に現在値を yield します。
- live ソースは 1 つのメモを通して読み、値を下に渡します。ソースを呼び出す各呼び出し箇所は独自の接続を開きます。
- 再接続の表示には `onstatus` を使い、データの鮮度は yield 値に入れます。

## 次のステップ

- [引数とセキュリティ](/building-apps/server-functions/arguments-and-security): 呼び出し元が読み取りの引数に何を入れられるか、そしてなぜ読み取りがそれらを検証しなければならないか。
- [非同期リアクティビティ](/concepts/async-reactivity): `GET()` 読み取りや live ソースがまだ回答していない間に商品ページが何を表示するか。
- [データ取得パターン](/guides/data-fetching-patterns): これらの読み取りを土台にした、入力中検索・ページネーション・データの鮮度維持。
- [データロードとミューテーション](/routing/solid-router/data): Solid Router でのキャッシュとルートプリロードのために読み取りを `query()` でラップする。
