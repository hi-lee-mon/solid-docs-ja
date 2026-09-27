---
title: "メタデータとトランスポート"
version: "2.0"
description: "ネットワークタブでサーバー関数のリクエストを読み、すべての呼び出しにヘッダーを付け、エンドポイントを移動し、実行中の呼び出しを 1 つキャンセルします。"
---

ネットワークタブを開いて「カートに追加」をクリックします。
リクエストは `/_server/data/<id>` への `POST` で、クライアントランタイムが付けた `X-Server-Function-Instance` と `X-Server-Function-Format` ヘッダーを持ち、ボディは引数の配列、レスポンスは `Cache-Control: no-store` で返ります。
商品ページ側がこれらを要求したわけではありません。トランスポートにはデフォルトがあり、ほとんどのアプリケーションはそれを変えません。

このページは、デフォルトでは足りない 3 つのケースを扱います。ベアラートークンのようなセッション中に変わるヘッダーを毎回のリクエストに付けたい場合、エンドポイントを `/_server` 以外の場所に置きたい場合、実行中の呼び出しをキャンセルしたい場合です。
ほとんどのアプリケーションに必要なのは[すべてのクライアントリクエストを準備する](#prepare-every-client-request)と[呼び出し単位で設定する](#configure-one-call)の節です。
宣言メタデータと呼び出しの識別情報は、インテグレーションとデータレイヤー向けです。

## 宣言にメタデータを付ける

`withMeta()` はサーバー関数参照に静的なメタデータを付けます:

```ts
// src/data/checkout.ts
import { withMeta } from "@solidjs/web/server-functions";

export const placeOrder = withMeta(
	async (cartId: string) => {
		"use server";
		return orders.place(cartId);
	},
	{ requiresAuth: true }
);
```

この時点では通信上はまだ何も変わりません。
メタデータは `prepareRequest` フックやデータレイヤーが読めるように関数を記述するもので、それ自体は何のポリシーも実行しません:

```ts
// Avoid: metadata alone, expected to enforce something
export const placeOrder = withMeta(
	async (cartId: string) => {
		"use server";
		return orders.place(cartId);
	},
	{ requiresAuth: true }
);

// Prefer: the check in the body, metadata as the hint the client reads
export const placeOrder = withMeta(
	async (cartId: string) => {
		"use server";
		if (!getRequestEvent()?.locals.userId) throw redirect("/sign-in");
		return orders.place(cartId);
	},
	{ requiresAuth: true }
);
```

`Avoid` の例では、どの呼び出し元の注文もそのまま通ります。`requiresAuth` は参照上の値であり、サーバーはそれを読みません。

後の `withMeta()` 呼び出しは、先のメタデータに浅くマージされます。
`GET()` は HTTP メソッドのために同じチャネルを使い、両者はどちらの順序でも合成できます。
`live()` は呼び出しの振る舞いを包むため、両方の外側に来ます:

```ts
export const stockLevels = live(
	withMeta(
		GET(async function* () {
			"use server";
			yield* inventory.levels();
		}),
		{ channel: "inventory" }
	)
);
```

インテグレーションコードは `getServerFunctionMetadata(fn)` で宣言を読み、`isServerFunction(fn)` で未知の呼び出し可能オブジェクトが参照かどうかを確認します。
すべての参照は、安定した `id` と現在の `url` を公開します。

## すべてのクライアントリクエストを準備する

`configureServerFunctionsClient()` はブラウザーのトランスポートを設定し、その `prepareRequest` フックは各 fetch の前に実行されます:

```ts
// src/entry-client.tsx
import { configureServerFunctionsClient } from "@solidjs/web/server-functions";

configureServerFunctionsClient({
	prepareRequest(init, { meta }) {
		if (!meta?.requiresAuth) return init;

		const headers = new Headers(init.headers);
		headers.set("authorization", `Bearer ${session.token()}`);
		return { ...init, headers };
	},
});
```

再度「カートに追加」をクリックすると、`placeOrder` へのリクエストは `authorization` ヘッダーを持ちます。`requiresAuth` メタデータのない `getProduct` の呼び出しには付きません。
フックは、トランスポートがまさに送ろうとしている最終的な `RequestInit`、関数 id、宣言メタデータを受け取ります。

ブラウザーセッション中に変わるポリシー、たとえば OAuth トークン、トレーシングヘッダー、テナント id には `prepareRequest` を使います。
設定が受け付けるフックは 1 つなので、複数のポリシーは 1 つの関数の中で合成してください。

:::caution[最初のサーバー関数が実行される前に呼ぶ]
`configureServerFunctionsClient()` が設定するのは、まだ開始されていない呼び出しのトランスポートです。
クライアントエントリーで `hydrate()` の隣に 1 回だけ呼び、サーバー関数を呼ぶコンポーネントがレンダーされる前に済ませてください。
:::

## カスタムエンドポイントを設定する

デフォルトのエンドポイントは `/_server` です。
start モードでは、`vite.config.ts` の `serverFunctions.endpoint` オプションでエンドポイントを移動でき、プラグインがクライアントとサーバーを一致するよう設定します。

クライアントエントリーとホストの両方を所有している場合にだけ、ランタイムを直接設定してください:

```ts
configureServerFunctionsClient({
	endpoint: "/app/_server",
});
```

クライアントのエンドポイントは、サーバーが `handleServerFunctionRequest()` をマウントしているパス（ベースパスを含む）でなければなりません。
不一致があると、他に何も問題がないのにすべての呼び出しが 404 になります。

## 呼び出し単位で設定する

`invoke()` は、1 回の呼び出しに属するオプションを付けてサーバー関数参照を呼び出します:

```ts
// src/pages/checkout/Address.tsx
import { invoke } from "@solidjs/web/server-functions";
import { saveAddress } from "../../data/checkout";

const controller = new AbortController();

const result = invoke(
	saveAddress,
	{ signal: controller.signal, priority: "high" },
	{ name: "Ada", street: "1 Loop Road", postalCode: "12345" }
);

controller.abort();
await result;
```

`await` は中断理由で reject され、ブラウザーはリクエストをキャンセルします。

`invoke()` は 3 つのオプションを受け付けます:

- `signal` は呼び出し元と HTTP リクエストをキャンセルします。
- `keepalive` は小さなリクエストがページのアンロード中も継続することを許します。
- `priority` は Fetch の優先度ヒントです。

締め切りや複合キャンセルは `AbortSignal.timeout()` と `AbortSignal.any()` で組み立てます。

1 回の呼び出しより長い寿命を持つものは拒否されます:

```ts
// Avoid: a header on one call
invoke(saveAddress, { headers: { authorization: token } }, address);

// Prefer: session policy in prepareRequest, static shape on the declaration
configureServerFunctionsClient({
	prepareRequest(init) {
		const headers = new Headers(init.headers);
		headers.set("authorization", token);
		return { ...init, headers };
	},
});
invoke(saveAddress, { signal }, address);
```

`Avoid` の例は `` `headers` is not an invocation option `` を、そのオプションが属する場所へのポインターとともに投げます。
ヘッダーは `prepareRequest` で設定し、読み取りは `GET()` で宣言し、静的な値は `withMeta()` で付け、リトライや重複排除は呼び出しを所有するデータレイヤーで実装してください。

:::note[サーバーレンダリング中の中断]
サーバー上のプロセス内呼び出しでは、中断シグナルは呼び出し元を reject しますが、関数が独自のシグナルを監視しない限り、背後の処理は完了まで実行されます。
`keepalive` と `priority` はそこでは効果がありません。直接呼び出しにはネットワークリクエストがないためです。
:::

参照を包むラッパーは、`invoke()` が届くように呼び出しチャネルを転送しなければなりません。
アプリケーションコードは通常、参照を直接、あるいはこの合成をすでに処理しているデータレイヤー経由で使います。

:::advanced[現在の呼び出しを読む]
`getServerFunctionInvocation()` は、実行中のサーバー関数の識別情報を返します。ログや呼び出しごとのキャッシュキーに使えます:

```ts
import { getServerFunctionInvocation } from "@solidjs/web/server-functions";

export async function loadAccount() {
	"use server";

	const invocation = getServerFunctionInvocation();
	logger.info({ serverFunctionId: invocation?.id });
	return database.accounts.current();
}
```

呼び出しの識別情報は現在の呼び出しを記述し、`getServerFunctionMetadata(fn)` は宣言を記述します。
前者はログに、後者はトランスポートポリシーに使ってください。
:::

## よくある問題

### エンドポイント移動後にすべての呼び出しが 404 を返す

クライアントのエンドポイントとサーバーのマウントポイントが異なっています。
`vite.config.ts` で `serverFunctions.endpoint` を設定してプラグインに両方を設定させるか、`configureServerFunctionsClient({ endpoint })` が `handleServerFunctionRequest()` のマウント先と完全に一致するパス（ベースパス込み）を指しているか確認してください。

### `invoke()` が「そのオプションは呼び出しオプションではない」と投げる

オプションの袋に `signal`、`keepalive`、`priority` 以外、たとえば `headers` や `method` が入っていました。
ヘッダーは `prepareRequest` へ、メソッドは `GET()` へ、静的な値は `withMeta()` へ移してください。

### `invoke()` が「ラッパーが呼び出しチャネルを転送しない」と投げる

`invoke()` に渡された参照が、キャッシュやチャネルのような、呼び出し元間で呼び出しを共有しており、オプトインしていないラッパーです。
基になる参照を直接呼び出すか、ラッパー自身の呼び出し単位オプションを使ってください。

### `authorization` ヘッダーが一部の呼び出しで付かない

その呼び出しで `prepareRequest` が `init` をそのまま返したか、`configureServerFunctionsClient()` がそれらの呼び出しの後に実行されました。
フック内の条件を参照上のメタデータと照らし合わせ、設定をクライアントエントリー（最初の呼び出しの前）に移してください。

## まとめ

- デフォルトは、引数配列をボディとする `/_server/data/<id>` への `POST` と、レスポンスの `Cache-Control: no-store` です。このページにある理由のためだけに変更してください。
- 静的な情報は `withMeta()` で宣言に付けます。サーバーはそれを読まないので、ポリシーは本体で強制してください。
- `withMeta()` と `GET()` はどちらの順序でも合成でき、`live()` は両方の外側に置きます。
- セッション依存のヘッダーは 1 つの `prepareRequest` フックで追加し、クライアントエントリーで最初の呼び出しの前に 1 回設定します。
- エンドポイントはプラグインの `serverFunctions.endpoint` オプションで移動し、クライアントとサーバーの一致を保ちます。
- `signal`、`keepalive`、`priority` は `invoke()` で 1 回の呼び出しに渡します。より長命なものは、あるべき場所へのポインター付きで拒否されます。
- サーバー上では、中断は呼び出し元を reject し、処理は止まりません。

## 次のステップ

- [プログレッシブエンハンスメント](/docs/building-apps/server-functions/progressive-enhancement.md): 各サーバー関数が公開する URL と、JavaScript の読み込み前にフォームがそこへ POST する仕組み。
- [Vite プラグインのサーバー関数オプション](/docs/reference/vite-plugin-solid/server-functions.md): このページのクライアント設定と対になるホスト側の設定。
- [デプロイ](/docs/building-apps/deployment.md): アプリがプロバイダーの後ろで動くとき、カスタムエンドポイントをどこにルーティングしなければならないか。
