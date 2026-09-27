---
title: "セッションと認証"
version: "2.0"
description: "リクエストイベント上に署名付き Cookie セッションを構築し、サーバー関数から顧客をサインイン・サインアウトさせ、すべてのサーバーエントリーポイントをそのセッションで認可します。"
---

ストアのアカウントエリアには注文ページがあります。
このページへのリクエストは `Cookie` ヘッダーを伴って届き、ページがレンダーされる前にもサーバー関数が 1 件の注文を返す前にも、サーバーは 2 つの問いに答えなければなりません: これは誰なのか、そしてこのレコードを見てもよいのか。

Solid が提供するのは、これらの回答の土台となる HTTP 交換です: 入力リクエスト、`locals` バッグ、出力レスポンスヘッダーであり、すべてリクエストイベント上にあります。
セッションストアや認証フレームワークは提供しません。
`fullstack` テンプレートは `@remix-run/cookie` の署名付き Cookie をこのイベントと組み合わせており、このページでも同じ形でアカウントエリアを構築します。

ほとんどのアプリで必要なのは真ん中の 2 つのセクションです: 署名付き Cookie セッションと、すべてのサーバー関数での認可チェックです。
その前の短い 2 つのセクションは、何が Solid の担当で何がライブラリの担当かを説明します。別のライブラリを選ぶ場合に参照してください。

このページは[サーバー関数](/building-apps/server-functions)を有効にした `fullstack` プロジェクトを前提とします。セッションはサーバー上で読み取られ、ほとんどの読み取りはサーバー関数または[ミドルウェア](/building-apps/middleware-and-api-routes)内で行われるためです。

## プラットフォームが提供するもの

start モードで動作するコードは、`@solidjs/web` の `getRequestEvent()` で現在のリクエストイベントを読み取ります。
イベントは以下を公開します:

- `request`。`Cookie`、`Authorization` その他のリクエストヘッダーを含みます。
- `locals`。ミドルウェアが認証済み顧客などのリクエストスコープの状態を置ける場所です。
- `response`。そのヘッダーは、レスポンスヘッドが確定する前に出力側の `Set-Cookie` 値を集めます。

`@solidjs/web` は署名なし Cookie エンコード用の `parseCookieHeader()` と `serializeCookie()` もエクスポートします。
これらの関数は署名・暗号化・ローテーション・永続化・失効のいずれも行いません。

## セッションライブラリが提供するもの

Cookie ライブラリやセッションライブラリはアプリケーションレベルのプロトコルを定義します: 署名または暗号化、シークレットローテーション、有効期限と更新、ストレージバックのセッション識別子、Cookie シリアライズオプションです。

`fullstack` テンプレートは `@remix-run/cookie` を使います。
そのセッション Cookie は署名済みで改ざん検知可能ですが、暗号化はされていないため、ペイロードはブラウザから読み取れます。

:::danger[署名付き Cookie はシークレットではない]
セッションペイロードに置かれたものはすべて、Cookie を持つ人に読み取れます。
`userId` のような識別子だけを保存し、残りはサーバーで引きます。パスワードハッシュ・API キー・他の顧客のデータは絶対に保存しないでください。
:::

## 署名付き Cookie セッション

次のモジュールはテンプレートの `src/server/session.ts` に倣っています:

```ts
// src/server/session.ts
import { createCookie } from "@remix-run/cookie";
import {
	getRequestEvent,
	type RequestEvent,
	type ResponseStub,
} from "@solidjs/web";
import { env } from "virtual:env/server";

interface SessionData {
	userId?: string;
}

const maxAge = 60 * 60 * 24 * 7;

const sessionCookie = createCookie("session", {
	secrets: env.SESSION_SECRET.split(","),
	httpOnly: true,
	secure: true,
	sameSite: "Lax",
	maxAge,
});

function event(): RequestEvent & { response: ResponseStub } {
	const event = getRequestEvent();
	if (!event) throw new Error("Missing request event");
	return event as RequestEvent & { response: ResponseStub };
}

export async function getSession(): Promise<SessionData | null> {
	const raw = await sessionCookie.parse(event().request.headers.get("cookie"));
	if (!raw) return null;

	try {
		const { data, exp } = JSON.parse(raw);
		return Date.now() < exp * 1000 ? data : null;
	} catch {
		return null;
	}
}

export async function setSession(data: SessionData): Promise<void> {
	const exp = Math.floor(Date.now() / 1000) + maxAge;
	event().response.headers.append(
		"set-cookie",
		await sessionCookie.serialize(JSON.stringify({ data, exp }))
	);
}

export async function clearSession(): Promise<void> {
	event().response.headers.append(
		"set-cookie",
		await sessionCookie.serialize("", { maxAge: 0 })
	);
}
```

サーバー関数内で `setSession({ userId })` を呼ぶと、送出されるレスポンスは `Set-Cookie` ヘッダーを運びます。
次のリクエストで `getSession()` を呼ぶと `{ userId }` が返ります。Cookie がない・改ざんされた・期限切れの場合は `null` を返します。

このファイルの 3 つの決定は意図的なものです。
Cookie の属性は明示的に設定されています。ライブラリのデフォルトがアプリケーションの要件に合わない可能性があるためです。
署名シークレットは `virtual:env/server` から取得します。これは[環境](/building-apps/environment)によりブラウザバンドルから締め出されています。リストの先頭のシークレットが新しい Cookie に署名し、リスト内のすべてのシークレットが既存の Cookie を検証するため、ローテーションは新しいシークレットを先頭に追加し、`maxAge` 経過後に古いものを落とすことです。
ペイロードは独自の `exp` を持ちます。ブラウザの `Max-Age` はブラウザへの要求にすぎず、クライアントは期限切れの古い Cookie を自由に再生できるためです。

:::caution[書き込みはこのリクエストが読んだものを変えない]
`getSession()` はリクエストとともに届いた `Cookie` ヘッダーを読みます。
`setSession()` は出力レスポンスに追記します。
同じリクエスト内で `setSession()` の後に `getSession()` を呼ぶと古いセッションが返ります。新しい Cookie はブラウザへ向かっている途中で、まだ戻ってきていないためです。
:::

## サインインとサインアウト

サインインは、資格情報を確認し、セッションを書き込み、リダイレクトするサーバー関数です:

```ts
// src/data/account.ts
import { markSafeError, redirect } from "@solidjs/web";
import { clearSession, setSession } from "../server/session";
import { verifyCredentials } from "../server/customers";

export async function signIn(form: FormData) {
	"use server";
	const customer = await verifyCredentials(
		String(form.get("email") ?? ""),
		String(form.get("password") ?? "")
	);
	if (!customer) {
		throw markSafeError(new Error("Email or password did not match"));
	}

	await setSession({ userId: customer.id });
	throw redirect("/account");
}

export async function signOut() {
	"use server";
	await clearSession();
	throw redirect("/");
}
```

サインインフォームを送信すると、レスポンスはセッション Cookie が添付された `/account` へのリダイレクトになります。
Cookie 書き込みとスローされた `redirect()` は同じレスポンスに乗ります。start モードはイベント由来の `Set-Cookie` 値を、ページレスポンス・ミドルウェアレスポンス・API レスポンス・サーバー関数レスポンスのすべてに畳み込みます。
資格情報失敗のエラーは `markSafeError` でラップされ、そのメッセージがフォームに届くようにします。素の `Error` をスローすると本番環境では `Internal Server Error` に置き換えられます。
[ミューテーションとレスポンス](/building-apps/server-functions/mutations-and-responses)では `redirect()`、`reload()`、そしてどのスローされたエラーがブラウザに届くかを説明します。

## サーバーで認可する

認証は呼び出し元を特定します。
認可は、その呼び出し元が操作を実行してよいかを決めます。
どちらの決定もサーバーコードに属し、呼び出し元の識別情報は引数ではなく常にセッションから取得します:

```ts
// Avoid: the browser names the customer
export async function getOrders(customerId: string) {
	"use server";
	return database.orders.forCustomer(customerId);
}

// Prefer: the session names the customer
export async function getOrders() {
	"use server";
	const session = await getSession();
	if (!session?.userId) throw redirect("/sign-in");
	return database.orders.forCustomer(session.userId);
}
```

サーバー関数は HTTP エンドポイントであるため、`Avoid` 版はリクエストボディに顧客 id を入れた任意の呼び出し元に、その顧客の注文を返してしまいます。
[引数とセキュリティ](/building-apps/server-functions/arguments-and-security)では、呼び出し元が制御できるものとリクエストイベントが保証するものを説明します。

呼び出し元が制御する引数も同様に検証し、その後で特定レコードへのアクセスを認可します:

::::tab-group[validation-library]

:::tab[Valibot]

```ts
import { redirect } from "@solidjs/web";
import * as v from "valibot";

const AccountName = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(1),
	v.maxLength(100)
);

export async function renameAccount(form: FormData) {
	"use server";
	const session = await getSession();
	if (!session?.userId) throw redirect("/sign-in");

	const name = v.parse(AccountName, form.get("name"));
	await database.customers.rename(session.userId, name);
}
```

:::

:::tab[Zod]

```ts
import { redirect } from "@solidjs/web";
import { z } from "zod";

const AccountName = z.string().trim().min(1).max(100);

export async function renameAccount(form: FormData) {
	"use server";
	const session = await getSession();
	if (!session?.userId) throw redirect("/sign-in");

	const name = AccountName.parse(form.get("name"));
	await database.customers.rename(session.userId, name);
}
```

:::

::::

サインアウト済みの訪問者から名前変更フォームを隠しても `renameAccount` は守られません。関数内部のチェックがゲートです。
保護されたすべてのサーバーエントリーポイントでこれを繰り返します: サーバー関数、API ルートハンドラー、ページレンダーです。

### ミドルウェアで一度だけ認証する

多くのエントリーポイントが同じ回答を必要とするとき、[ミドルウェア](/building-apps/middleware-and-api-routes#add-a-middleware)でセッションを一度だけ読み、結果を `event.locals` に置けます:

```ts
// src/middleware.ts
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

そのリクエストのサーバー関数・API ハンドラー・ページレンダーは同じリクエストイベントを読むため、ここで設定した `locals.userId` はすべてから見えます。レンダー中に呼ばれたサーバー関数は `locals` のコピーを持つ派生イベントを受け取るため、そこへの書き込みはその呼び出しに留まります。
それらのフィールドに正確な型が欲しい場合は、`@solidjs/web` の `RequestEventLocals` を拡張します:

```ts
declare module "@solidjs/web" {
	interface RequestEventLocals {
		userId?: string;
	}
}
```

## レスポンスの動作

セッション書き込みはイベントのレスポンススタブに `Set-Cookie` を追記し、start モードはそれらのヘッダーを、スローされた `redirect()` を含む送出されるあらゆるレスポンスに畳み込みます。

Cookie の書き込みはレスポンスヘッドが確定する前に行います。
ストリーミングサーバーレンダリングでは、シェルがフラッシュされたときにヘッドが確定します。サーバー関数呼び出しや API ルートでは、関数が戻った後にハンドラーがイベントを出力レスポンスに畳み込んだ時点で確定します。
それ以降のヘッダー書き込みは、開発時にはスローされ、本番環境ではエラーが報告されてレスポンスは変更されないままになります。

:::note[Cookie バックかストレージバックか]
Cookie バックのセッションはペイロードをブラウザに保持し、Cookie サイズに制限されます。
ストレージバックのセッションは不透明な識別子を Cookie に入れ、失効可能なデータをデータベースやキーバリューストアに保持します。サインアウトで他のデバイスも無効化しなければならない場合に必要なものです。
Solid はどちらの場合も同じリクエスト・レスポンスの継ぎ目を提供します。
:::

## よくある問題

### `setSession()` の直後に `getSession()` が `null` を返す

両方の呼び出しが同じリクエスト内で実行されました。
読み取りは到着した `Cookie` ヘッダーを見ます。書き込みは出力レスポンス上にあります。
`signIn` のように書き込み後にリダイレクトすれば、次のリクエストは新しい Cookie を運びます。

### Cookie は設定されるが返ってこない

レスポンスの `Set-Cookie` 属性を、その後のリクエストと比較してください。
`secure` Cookie は素の `http://` では送信されず、エンドポイントをカバーしない `path` には送信されず、ホストに一致しない `domain` は破棄されます。
ライブラリのデフォルトに頼らず、属性を明示的に設定してください。

### `/sign-in` と `/account` が互いに無限にリダイレクトする

サインインチェックがサインインページでも実行されているか、セッション Cookie が返ってこないため（上記参照）、保護されたすべてのリクエストが再びリダイレクトしています。
セッションが必要なルートだけをガードし、`/account` へのリクエストに Cookie が届いているかを確認してください。

### `Response header write dropped: headers.append("set-cookie") ran after the response head was sent`

`setSession()` または `clearSession()` がシェルのフラッシュ後に実行されました。例えば `Loading` バウンダリの背後でレンダーされたコンポーネントからです。
書き込みをサーバー関数かミドルウェアに移すか、最初のフラッシュより前に実行してください。

### `Missing request event`

`getRequestEvent()` が `undefined` を返しました。
これはサーバー上のリクエスト内でのみ定義されます。ブラウザ内・モジュールスコープ・イベントを提供していないテストでは定義されません。
セッションヘルパーはサーバー関数・ミドルウェア・ページレンダーから呼んでください。

## まとめ

- `getRequestEvent()` を通してリクエストを読み `Set-Cookie` を書きます。セッションプロトコルは Cookie ライブラリから得ます。
- `virtual:env/server` のシークレットで Cookie に署名し、`httpOnly`・`secure`・`sameSite` を明示的に設定し、ペイロードに有効期限を持たせます。
- 署名付き Cookie はブラウザから読み取れます。データではなく id を保存します。
- `getSession()` はリクエストを読み、`setSession()` はレスポンスに書きます。両者は 1 つのリクエストでは出会いません。
- 顧客の識別情報は引数ではなく必ずセッションから取得し、すべてのサーバー関数と API ハンドラーでチェックします。
- 多くのエントリーポイントが必要とするときは、ミドルウェアでセッションを一度だけ読み、結果を `event.locals` に置きます。
- Cookie の書き込みはシェルのフラッシュまたは関数のリターンの前に行います。それ以降の書き込みは破棄され報告されます。

## 次のステップ

- [引数とセキュリティ](/building-apps/server-functions/arguments-and-security): なぜ識別情報がリクエストイベントから来なければならず、サーバー関数の引数からは絶対に取ってはいけないのか。
- [ミューテーションとレスポンス](/building-apps/server-functions/mutations-and-responses): サインイン・サインアウト後の `redirect()` と `reload()`、そしてどのエラーがブラウザに届くか。
- [ミドルウェアと API ルート](/building-apps/middleware-and-api-routes): すべてのリクエストが `event.locals.userId` を見られるように、セッション読み取りをどこに置くか。
- [環境](/building-apps/environment): ブラウザに同梱される場合にビルドが失敗するよう `SESSION_SECRET` を宣言する。
- [保護されたルート](/guides/protected-routes): このページのサーバー関数チェックの前段に置くルートガードとミドルウェア。
