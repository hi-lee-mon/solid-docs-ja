---
title: "引数とセキュリティ"
version: "2.0"
description: "サーバー関数がデコードできる引数を送り、ターミナルから送られてきた可能性があるものとして、すべての呼び出しをバリデーション・認可します。"
---

アカウントページでは、買い物客が自分のアカウントの名前を変更できます。
コンポーネントは `updateAccountName(name)` を呼び、TypeScript は `name` が文字列であることをチェックし、関数はそれをデータベースに書き込みます。

すべてのサーバー関数は HTTP エンドポイントであり、コンポーネントは多くの呼び出し元の 1 つにすぎません:

```bash
curl -X POST 'https://shop.example/_server/<id>?args=%5B%7B%22admin%22%3Atrue%7D%5D' \
	-H 'Origin: https://shop.example'
```

このリクエストは、文字列が期待される場所に `{ admin: true }` を渡して同じ関数を実行します。
TypeScript の型はランタイムには存在せず、ブラウザーの `required` 属性も関与していません。リクエストがショップから来たと名乗ったため、同一オリジンチェックも通過してしまいます。
関数本体はすべてのリクエストを見る唯一の場所です。だからこそ、バリデーションと認可はそこに置きます。

ほとんどのアプリケーションに必要なのは[バリデーション](#validate-caller-controlled-values)と[リクエストコンテキスト](#read-trusted-request-context)の節です。
引数が文字列、数値、プレーンオブジェクト、`FormData` のいずれでもない場合は、エンコーディングの節が関係します。

## デフォルトの引数エンコーディング

クライアントは通常の引数リストを JSON として送ります。
文字列、数値、真偽値、配列、プレーンオブジェクト、`null` は設定不要です。

次のいずれかの型の単一引数は、JSON に包まれるのではなく、その型の自然な HTTP エンコーディングでそのまま送られます:

- `string`
- `URLSearchParams`
- `FormData`
- `Blob`
- `File`
- `ArrayBuffer`
- `Uint8Array`

この仕組みがあるおかげで、サーバー関数は追加コードなしでフォームの送信先にもアップロードの宛先にもなれます:

```ts
// src/data/account.ts
export async function uploadAvatar(form: FormData) {
	"use server";

	const file = form.get("avatar");
	if (!(file instanceof File)) {
		throw respond({ error: "Select an image file" }, { status: 400 });
	}

	await avatarStore.save(file);
}
```

`<input type="file" name="avatar">` を持つフォームを送信すると、関数はブラウザーが組み立てた `FormData` をファイルごと受け取ります。

## リッチな引数を有効にする

JSON は `Date`、`Map`、`Set`、型付き配列、自分自身を参照するオブジェクトを運べません。
それらを引数リストに渡すと、クライアントはリクエストを送る前に例外を投げます:

```ts
// Avoid: a Date in the argument list, with the default JSON encoding
await listOrders({ since: new Date("2026-01-01") });

// Prefer: a JSON-safe value, or enable the codec once at startup
await listOrders({ since: "2026-01-01" });
```

`Avoid` の例は `Server function arguments are sent as JSON by default and these arguments are not JSON-serializable. Call enableRichArguments() (from "@solidjs/web/server-functions/rich-args") once at startup to send Dates, Maps, Sets, typed arrays, etc. through the codec — or pass a single Blob/FormData/File argument, which has a native HTTP encoding.` を投げます。

アプリケーションがこうした値を実際に送る場合は、クライアントエントリーでヘルパーを 1 回呼び出します:

```ts
// src/entry-client.tsx
import { enableRichArguments } from "@solidjs/web/server-functions/rich-args";

enableRichArguments();
```

リッチな引数はサーバー関数コーデックを使います。
戻り値は必要な場合すでにコーデックを使っているため、このオプトインが影響するのは引数だけです。

:::deep-dive[カスタムコーデックプラグイン]
コーデックは、知らない型のために `@solidjs/web/serialization` の `createPlugin` で作るプラグインを受け付けます。
クライアントとサーバーは一致するプラグインで設定する必要があります。そうしないと片側が相手の読めないフレームを生成します。
組み込みのリッチな型だけを送るアプリケーションにプラグインは不要です。
:::

## 呼び出し元が制御する値をバリデーションする

`FormData` のような具体的な Web 型になっていない境界では `unknown` を受け取り、値を使う前にパースします:

::::tab-group[validation-library]

:::tab[Valibot]

```ts
// src/data/account.ts
import { getRequestEvent, respond } from "@solidjs/web";
import * as v from "valibot";

const NameInput = v.object({
	name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
});

export async function updateAccountName(input: unknown) {
	"use server";

	const parsed = v.safeParse(NameInput, input);
	if (!parsed.success) {
		throw respond(
			{ name: "ValidationError", issues: parsed.issues },
			{ status: 400 }
		);
	}

	const userId = getRequestEvent()?.locals.userId;
	if (!userId) {
		throw respond({ error: "Unauthorized" }, { status: 401 });
	}

	await database.users.update(userId, parsed.output);
}
```

:::

:::tab[Zod]

```ts
// src/data/account.ts
import { getRequestEvent, respond } from "@solidjs/web";
import { z } from "zod";

const NameInput = z.object({
	name: z.string().trim().min(1).max(100),
});

export async function updateAccountName(input: unknown) {
	"use server";

	const parsed = NameInput.safeParse(input);
	if (!parsed.success) {
		throw respond(
			{ name: "ValidationError", issues: parsed.error.issues },
			{ status: 400 }
		);
	}

	const userId = getRequestEvent()?.locals.userId;
	if (!userId) {
		throw respond({ error: "Unauthorized" }, { status: 401 });
	}

	await database.users.update(userId, parsed.data);
}
```

:::

::::

このページ冒頭の `curl` リクエストをこの関数に送ると、issues を JSON ボディに載せた 400 が返り、データベースには触れられません。
スキーマとバリデーションライブラリは `"use server"` 本体の中だけで参照されるため、クライアントビルドから取り除かれます。

バリデーションを置くべき場所は本体であり、宣言を包むラッパーではありません:

```ts
// Avoid: a wrapper around the reference, so HTTP dispatch skips it
export const updateAccountName = validated(NameInput, async (input) => {
	"use server";
	await database.users.update(getRequestEvent()?.locals.userId, input);
});

// Prefer: the check inside the body, where every call path runs
export async function updateAccountName(input: unknown) {
	"use server";
	const parsed = v.safeParse(NameInput, input);
	if (!parsed.success)
		throw respond({ issues: parsed.issues }, { status: 400 });
	await database.users.update(getRequestEvent()?.locals.userId, parsed.output);
}
```

`Avoid` の例では、登録されるサーバー関数は内側のアロー関数であり、HTTP ディスパッチは id でそれを呼び出します。
`validated` が実行されるのは、ブラウザー内やレンダー中など、エクスポートされた参照を持つコード経由の呼び出しだけです。そのため `curl` リクエストはチェックされないままデータベースへ届きます。
モジュールレベルの `"use server"` モジュール内のラッパーは事情が異なります。そこではラッパーの戻り値が登録されるためです。その形は[サーバー関数](/building-apps/server-functions#declare-a-server-module)のページで説明しています。

## 信頼できるリクエストコンテキストを読む

`@solidjs/web` の `getRequestEvent()` は、現在のリクエストと、ミドルウェアが `event.locals` に置いた値を返します:

```ts
import { getRequestEvent } from "@solidjs/web";

export async function currentUserId() {
	"use server";

	const event = getRequestEvent();
	if (!event) throw new Error("Missing request event");

	return event.locals.userId;
}
```

署名付き Cookie を読み、どのサーバー関数が実行されるよりも先に `event.locals.userId` を設定するミドルウェアは、[セッションと認証](/building-apps/sessions-and-auth)で説明しています。

アイデンティティはこうした値の 1 つであり、決して引数にはしません:

```ts
// Avoid: the caller names the account to change
export async function updateAccountName(userId: string, name: string) {
	"use server";
	await database.users.update(userId, { name });
}

// Prefer: the request event names the account
export async function updateAccountName(name: string) {
	"use server";
	const userId = getRequestEvent()?.locals.userId;
	if (!userId) throw respond({ error: "Unauthorized" }, { status: 401 });
	await database.users.update(userId, { name });
}
```

`Avoid` の例では、どの呼び出し元も第 1 引数に任意のアカウント id を入れられ、関数はそのアカウントの名前を変更してしまいます。

:::danger[引数のロールや id は事実ではなく申告]
`userId`、`isAdmin` フラグ、価格など、呼び出し元が送るものはすべて、呼び出し元自身についての申告にすぎません。
アイデンティティと権限はリクエストイベントから読み、価格と在庫はサーバーで調べてください。
データを変更するすべての関数で、要求された操作をそのコンテキストに照らして認可してください。
:::

リクエストはトレース情報も運んでいます。
ホストで分散トレーシングを動かしている場合、入ってきた `traceparent` ヘッダーはこのリクエストが属するトレースを示します。別のサービスを呼ぶサーバー関数はそれを引き継ぐべきです。そうすればトレーシングツールで、その呼び出しを発生させたページやアクションの下にその呼び出しが表示されます:

```ts
import { getTraceContext } from "@solidjs/web";

export async function fetchInventory(sku: string) {
	"use server";
	return fetch(`https://inventory.internal/${sku}`, {
		headers: { ...getTraceContext()?.entries },
	});
}
```

[`getTraceContext()`](/reference/solid-web/request-response/get-trace-context) はリクエスト内のどの読み取りでも同じオブジェクトを返すため、外向きリクエストを組み立てる場所で呼んでください。
`traceparent` が入ってこなかった場合、ランタイムが独自のトレースを開始するため、ヘッダーは常に正しい形式になります。トレーシングしていない下流のサービスはそれを無視します。
クライアント上やリクエストの外では、この関数は `undefined` を返し、スプレッドは何も追加しません。

## 同一オリジン保護

サーバー関数ハンドラーは、状態を変更するリクエストを実行する前に、その送信元をチェックします。
`Sec-Fetch-Site`、次に `Origin`、次に `Referer` を読み、それらが同一オリジンを示せばリクエストを受け付けます。クロスオリジンのメタデータを持つリクエストはステータス 403 で拒否され、3 つのヘッダーがすべてないリクエストも同様に拒否されます。

このゲートは、別サイトのページが訪問者の Cookie を使ってサーバー関数に送信するのを止めます。いわゆるクロスサイトリクエストフォージェリ（CSRF）のケースです。
自分で `Origin` ヘッダーを設定するスクリプトは止められません。ページ冒頭の `curl` リクエストが通ったのはそのためであり、このゲートがバリデーションや認可の代わりにならない理由でもあります。

`GET()` で宣言された読み取りへの `GET`・`HEAD` リクエストはこのチェックをスキップします。宣言された読み取りは契約上どのオリジンから実行しても安全であり、チェックが付ける `Vary` ヘッダーは、宣言が実現しようとする共有キャッシュを分断してしまうためです。
`GET()` は安全で冪等な読み取りにだけ宣言してください。

:::caution[ホストに既存の CSRF ポリシーがない限りデフォルトを維持する]
カスタムホストは、期待する公開オリジンを指定したり、オリジンメタデータのないリクエストを受け付けたり、チェックを信頼できる外側のレイヤーのものに置き換えたりできます。
どれも、関数に到達するものを広げます。
同等のチェックがハンドラーの前段ですでに動いている場所でのみ、デフォルトをオフにしてください。
:::

## よくある問題

### リクエストを送る前に呼び出しが `not JSON-serializable` を投げる

引数に `Date`、`Map`、`Set`、型付き配列、循環オブジェクトが含まれており、リッチな引数が有効になっていません。
値を JSON 安全な形に変換するか、クライアントエントリーで `enableRichArguments()` を 1 回呼んでください。

### `curl` やスクリプトのリクエストが 403 を返される

リクエストに `Sec-Fetch-Site`、`Origin`、`Referer` ヘッダーがなかったか、別のオリジンを指すものが含まれていました。
正規のスクリプトはサイトに一致する `Origin` ヘッダーを送ります。
それができないサーバー間連携は、独自のチェックと `allowRequestsWithoutOriginCheck` を設定したホストの後ろで動かします。[ホスト構成](/reference/solid-web/server-functions/host-configuration)を参照してください。

### 開発中はバリデーションが動くのに素のリクエストがすり抜ける

チェックが本体ではなく、関数レベルの宣言を包むラッパーの中にあります。
HTTP ディスパッチは登録された関数を直接呼び出します。
チェックを `"use server"` 本体に移すか、ラッパーをモジュールレベルの `"use server"` モジュール内に置いてください。

### `getRequestEvent()` が `undefined` を返す

スコープにリクエストがない状態で関数が実行されました。モジュール読み込み時、タイマーから、イベントを提供しなかったテスト内などです。
レンダー、ミドルウェア、HTTP リクエストから呼ばれたサーバー関数には必ずイベントがあります。テストでは [`provideRequestEvent`](/reference/solid-web/request-response/provide-request-event) で提供してください。

## まとめ

- 文字列、数値、真偽値、配列、プレーンオブジェクト、`null` は JSON で送られます。`FormData`、`File`、`Blob`、`URLSearchParams`、バイナリの単一引数はそのままの姿で送られます。
- 引数の `Date`、`Map`、`Set`、型付き配列は、クライアントエントリーで `enableRichArguments()` を 1 回実行するまで例外を投げます。
- 引数は `unknown` 型で受け、`"use server"` 本体の中でスキーマでパースしてください。宣言を包むラッパーは HTTP ディスパッチにスキップされます。
- アイデンティティと権限は `getRequestEvent().locals` から読み、引数からは決して読まないでください。
- 同一オリジンチェックはクロスサイトのブラウザーリクエストを拒否しますが、自分で `Origin` ヘッダーを設定するスクリプトは拒否しません。
- `GET()` はどのオリジンからでも安全な読み取りにだけ宣言してください。宣言された読み取りはオリジンチェックをスキップするためです。

## 次のステップ

- [ミューテーションとレスポンス](/building-apps/server-functions/mutations-and-responses): バリデーション済みの書き込みの後に何を返すか、そして上の 400 がどう呼び出し元に届くか。
- [セッションと認証](/building-apps/sessions-and-auth): 署名付き Cookie から `userId` を `event.locals` に置くミドルウェア。
- [フォーム](/guides/forms): チェックアウトの住所フォーム。ブラウザーとサーバー関数の両方でバリデーションします。
