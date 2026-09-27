---
title: "ミドルウェアと API ルート"
version: "2.0"
description: "fetch スタイルのミドルウェアですべてのリクエストの手前でコードを実行し、リクエストイベントを介してページやサーバー関数と状態を共有し、ルートモジュールから HTTP リクエストに応答します。"
---

アプリの内部ではなく手前でやるべき仕事があります。すべてのサーバー関数ではなく一度だけセッションクッキーを読むこと、捕捉されなかったエラーを真っ白なページではなく 500 に変えること、ブラウザーではないパートナーのスクリプトからの `GET /api/products` に応答することです。
Start モードはリクエストハンドラーの前に fetch スタイルのミドルウェアのチェーンを実行し、`fullstack` プロジェクト構成はそのチェーンに API ルートのディスパッチャーを置きます。

ほとんどのアプリで必要なのは、下記の最初の形のミドルウェアを1、2個と、アプリ外からデータが必要な場合は API ルートです。
このページでは、まずテンプレートが同梱するチェーンを基に説明し、次に API ルートを扱います。

## テンプレートが同梱するチェーン

`vite.config.ts` でサーバー専用モジュールを指定します:

```ts
// vite.config.ts
solid({
	start: { middleware: "./src/middleware.ts" },
	ssr: true,
});
```

このモジュールはミドルウェア関数の配列をエクスポートします:

```ts
// src/middleware.ts
import { createAPIHandler } from "filesystem-routing/api";
import routes from "virtual:file-routes";

export default [createAPIHandler(routes)];
```

サーバーが処理するすべてのリクエスト（ページのレンダー、サーバー関数呼び出し、API ルート）は、ハンドラーに届く前にこの配列を順番に通ります。
`createAPIHandler` は、ルートモジュールのメソッドエクスポートに一致するリクエストに応答し、それ以外を次に渡します。

`virtual:file-routes` には2つのエクスポートがあります。
デフォルトエクスポートは全ルートファイルのフラットなマニフェストで、API ハンドラーが必要とするものです。
名前付き `pageRoutes` エクスポートは、グルーピングセグメントを除いたページツリーで、`src/router.ts` が Solid Router に渡すものです。

## ミドルウェアを追加する

ミドルウェアは、リクエストと `next` 継続を取る関数です:

```ts
type Middleware = (
	request: Request,
	next: (request?: Request) => Promise<Response>
) => Response | Promise<Response>;
```

3つの形でほとんどのニーズをカバーできます。

### 何かをしてから続行する

セッションを読み、以降のすべてのステップから見える場所に顧客を置きます:

```ts
import { getRequestEvent } from "@solidjs/web";
import { getSession } from "./server/session";

async function attachCustomer(
	_request: Request,
	next: () => Promise<Response>
) {
	const session = await getSession();
	getRequestEvent()!.locals.userId = session?.userId;
	return next();
}
```

`getRequestEvent()` はこのリクエストのイベントを返します。ページのレンダーはそれを直接参照し、サーバー関数は同じ `locals` を持つ派生コピーとして参照するため、ここで設定した `locals.userId` は受け渡しなしでサーバー関数から読めます。
[セッションと認証](/building-apps/sessions-and-auth)で作成する `getSession()` は、その同じイベントから署名済みクッキーを読み取ります。

### 続行してからレスポンスを変える

最も外側のミドルウェアが返るまでネットワークには何も書き込まれないため、`await next()` の後でも、ストリーミングされるボディでもヘッダーを設定できます:

```ts
// Avoid: headers on the request never reach the browser
async function securityHeaders(
	request: Request,
	next: () => Promise<Response>
) {
	request.headers.set("x-frame-options", "DENY");
	return next();
}

// Prefer: headers on the response that comes back
async function securityHeaders(
	_request: Request,
	next: () => Promise<Response>
) {
	const response = await next();
	response.headers.set("x-frame-options", "DENY");
	return response;
}
```

`Avoid` 版ではヘッダーはブラウザーに届きません。リクエストのヘッダーはブラウザーが送ったものを表すのであり、サーバーが返すものではありません。また、ランタイムによっては受信リクエストのヘッダーがイミュータブルで、書き込みが例外になります。
`Prefer` 版では、ページでも API でもすべてのレスポンスにヘッダーが付きます。

### チェーンを止める

`next()` を呼ばずに `Response` を返します:

```ts
function requireHttps(request: Request, next: () => Promise<Response>) {
	const url = new URL(request.url);
	if (url.protocol === "http:" && !url.hostname.endsWith("localhost")) {
		url.protocol = "https:";
		return Response.redirect(url, 308);
	}
	return next();
}
```

実行したい順序で配列に関数を追加します:

```ts
export default [
	requireHttps,
	securityHeaders,
	attachCustomer,
	createAPIHandler(routes),
];
```

リクエストは配列を下り、レスポンスはそれを上って戻ります。

![4つのミドルウェアが並び、その後にページのレンダー。リクエストの矢印が左から右へ各ミドルウェアを通り、レスポンスの矢印がそれらを通って戻る。requireHttps は next を呼ばずに Response を返してチェーンを止められる。attachCustomer は入り方向で locals を設定し、以降のすべてのステップから見える。securityHeaders は戻り方向でレスポンスにヘッダーを設定する。](/images/diagrams/middleware-chain.svg)

`securityHeaders` は入り方向では `attachCustomer` より先に実行され、戻り方向ではそのレスポンスを受け取ります。
セッションを読むミドルウェアは `locals.userId` を必要とするものより前に置き、API ルートが顧客を必要とするなら API ハンドラーはその後に置きます。

`next(request)` に `Request` を渡すと、チェーンの残りで使われるリクエストを置き換えられます（例: URL を書き換えた後）。
1回の呼び出しで `next()` を2回呼ばないでください。

:::note[開発時、処理されなかったページ以外のリクエストは Vite にフォールスルーする]
`vite dev` では、HTML を受け付ける `GET` ではなく、どのミドルウェアも応答しなかったリクエストは、その URL のページをレンダーするのではなく Vite 自身のパイプラインに渡されます。
本番には Vite パイプラインがないため、チェーンの最後まで到達したリクエストはすべてレンダーされます。
:::

### エラーを捕捉する

`next()` を `try`/`catch` で囲むミドルウェアは、チェーンの残りがスローしたものをすべて捕捉できます:

```ts
async function catchErrors(_request: Request, next: () => Promise<Response>) {
	try {
		return await next();
	} catch (error) {
		console.error(error);
		return Response.json({ error: "Internal Server Error" }, { status: 500 });
	}
}
```

実際のエラーはログに記録し、汎用的なボディを返します。
例外メッセージはデータベース・ファイルシステム・トークンの詳細を含み得ます。レスポンスに入れてよいテキストを持つエラーは、アプリが安全とマークしたものだけです。サーバー関数については[ミューテーションとレスポンス](/building-apps/server-functions/mutations-and-responses#handle-thrown-errors)を参照してください。
本番ビルドでは生成されるページレンダーもデフォルトのエラーバウンダリで囲まれます。このミドルウェアがエラーを所有する場合は、[アプリ構造](/building-apps/app-structure#common-problems)にあるように `start.errorBoundary: false` を設定してください。

## API ルート

API ルートとは、デフォルトのコンポーネントの代わりに、あるいはそれと併せて、大文字の HTTP メソッドをエクスポートするルートモジュールです:

```ts
// src/routes/api/products.ts
import type { APIHandler } from "filesystem-routing/api";
import { listProducts, createProduct } from "../../server/db";

export const GET: APIHandler = () => Response.json(listProducts());

export const POST: APIHandler = async ({ request }) => {
	const body = await request.json();
	if (typeof body?.name !== "string" || body.name.length === 0) {
		return Response.json({ error: "name is required" }, { status: 400 });
	}
	const product = createProduct({ name: body.name });
	return Response.json(product, { status: 201 });
};
```

`curl http://localhost:3000/api/products` を実行すると JSON のリストが返り、ボディ付きの `POST` で作成できます。
`src/routes/api/products/[id].ts` は、ページをマッピングするのと同じ規約で、`params.id` とともに `/api/products/:id` に応答します。

プラグインでメソッド検出を有効にすると、テンプレートの `createAPIHandler` がこれらのエクスポートを拾います:

```ts
// vite.config.ts
fileRoutes({ httpMethods: true });
```

ルートモジュールとみなされる規則は、ページと API ルートで同じです。
`src/routes` 配下の `.js`、`.jsx`、`.ts`、`.tsx` ファイルは、デフォルトエクスポートを持つ（ページ）か、`httpMethods` がオンのときに大文字のメソッドエクスポートを持つ（API ルート）場合にルートになります。両方を持つモジュールは、ブラウザーには HTML を、`fetch` には JSON を提供します。
`.md` や `.mdx` ファイルは常にページです。
デフォルトエクスポートもメソッドエクスポートも持たないファイルはルートではなくマニフェストにも現れないため、`src/routes` 配下のヘルパーモジュールは提供されず無視されます。
それでもヘルパーやサーバー関数は `src/server` や `src/data` に置いてください。後からデフォルトエクスポートを追加して、誤ってページにしてしまうことを防ぐためです。

ハンドラーは、マッチした `params` を含むリクエストイベントを受け取るため、ミドルウェアが設定した `locals.userId` を読んだり、`event.response.headers` にクッキーを追加したりできます。
認可はハンドラーに置きます:

```ts
// Avoid: the folder name is the only protection
export const DELETE: APIHandler = async ({ params }) => {
	await deleteProduct(params!.id);
	return new Response(null, { status: 204 });
};

// Prefer: check the caller in the handler
export const DELETE: APIHandler = async ({ params }) => {
	if (!getRequestEvent()?.locals.userId) {
		return new Response(null, { status: 401 });
	}
	await deleteProduct(params!.id);
	return new Response(null, { status: 204 });
};
```

`Avoid` 版は、`DELETE /api/products/mug` を送るあらゆる HTTP クライアントに対して商品を削除します。ルートファイルはその場所によって保護されるわけではありません。
ハンドラーの前に必ず実行されるミドルウェアが、もう1つのチェック場所です。

### 戻り値

- `Response` はそのまま送信されます。ステータスとヘッダーを制御するのに使います。
- 文字列は `text/plain` レスポンスになります。
- その他の値は JSON レスポンスになります。
- ページコンポーネントも持つモジュールの `GET` が `undefined` を返すとページがレンダーされます。これが、1つのルートがブラウザーに HTML を、`fetch` に JSON を提供する仕組みです。
  API のみの `GET` では、`undefined` は `404` です。
  その他のメソッドでは `undefined` はスローします。ハンドラーが応答する想定だからです。

メソッドに対応するエクスポートがないリクエストは、チェーンの下へ続きます。
`HEAD` は `HEAD` エクスポートがあればそれを使い、なければ `GET` にフォールバックします。

アプリ自身のコンポーネントがサーバーと話す手段は API ルートではなくサーバー関数です。エンドツーエンドで型付きで、URL 設計も不要です。
API ルートはそれ以外のすべて、つまり Webhook、他のサービス、スクリプト、公開エンドポイントのためのものです。

:::deep-dive[Solid の部分とルーターの部分]
メソッドエクスポートの規約、ルートマッチング、`createAPIHandler` は `filesystem-routing` 由来です。これはページのために `src/routes` をスキャンするのと同じパッケージです。
Solid のサーバーランタイムが公開する契約は、fetch スタイルの `(request, next)` ミドルウェアの形と、その下で動くリクエストイベントです。その形に合うディスパッチャーはどれでもチェーンに置けるため、別のルーターや別のファイル規約を使うプロジェクトでは、チェーンではなくディスパッチャーを入れ替えます。
内部では、ディスパッチャーは radix 木でフラットなマニフェストと URL を照合し、マッチした params をリクエストイベントに書き込み、ハンドラーモジュールをオンデマンドでインポートします。そのため、ハンドラーのコードとそれがインポートするサーバー専用モジュールはクライアントバンドルに入りません。
:::

## よくある問題

### サーバー関数で `locals.userId` が `undefined` になる

それを設定するミドルウェアが配列内で API ハンドラーより後に実行されているか、配列に入っていません。
ミドルウェアの順序は配列の順序です。

### API ルートが HTML を返す

モジュールがデフォルトエクスポートを持ち、`GET` ハンドラーが `undefined` を返したため、ページがレンダーされました。
`Response` を返すか、コンポーネントを削除してください。

### `API handler for POST "..." did not return a response`

`GET` 以外のハンドラーが `undefined` を返しました。
辞退できるのは `GET` だけです。`Response`、文字列、または JSON 値を返してください。

### ミドルウェアで設定したヘッダーがストリーミングされたページにない

`await next()` の前にリクエストに設定されており、返されたレスポンスに設定されていません。
`next()` が解決した後の `Response` に設定してください。

### `Duplicate API routes for "/api/products"`

2つのルートファイルがメソッドエクスポートで同じパスにマッピングされています（例: `api/products.ts` と `api/products/index.ts`）。
1つだけ残してください。

## まとめ

- ミドルウェアは `(request, next) => Response` です。配列をエクスポートすると、リクエストはそれを下り、レスポンスは上って戻ります。
- `next()` の前にリクエストを読み `locals` に書き、その後はレスポンスでヘッダーを変更します。
- `next()` を呼ばずに返すとチェーンが止まります。`next()` を2回呼んではいけません。
- エラーは1つのミドルウェアで捕捉し、実際のエラーをログに記録して汎用的なボディを返します。
- `src/routes` 配下のファイルは、デフォルトエクスポートを持つか、`httpMethods` で大文字のメソッドエクスポートを持つ場合にルートになります。それ以外は無視されます。
- 呼び出し元のチェックは各 API ハンドラーの内部かその前のミドルウェアで行います。フォルダー名は何も守りません。
- アプリ自身のコンポーネントにはサーバー関数を、アプリ以外の呼び出し元には API ルートを使います。

## 次のステップ

- [セッションと認証](/building-apps/sessions-and-auth): 最も一般的なミドルウェアで、セッションクッキーを `event.locals` に読み込みます。
- [サーバー関数](/building-apps/server-functions): 同じリクエストイベントの下で実行されるため、ここで設定した状態が見えます。
- [保護されたルート](/guides/protected-routes#middleware-for-whole-sections): ミドルウェアからセクション全体へのサインインリダイレクトと、ミドルウェアに見えないものです。
- [デプロイ](/building-apps/deployment): このチェーンが前段となるリクエストハンドラーがどこで実行されるか、ホストが `dist/client` をどう提供するかです。
