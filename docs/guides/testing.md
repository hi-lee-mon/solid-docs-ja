---
title: "テスト"
version: "2.0"
description: "ボタンをクリックしてラベルを検証するコンポーネントテストを書き、jsdom または実ブラウザーで実行し、フルスタックのサーバーコードは別の Node プロジェクトでテストします。"
---

Solid コンポーネントに対して多くの人が最初に書くテストは、クイックスタートのカウンターをクリックしてラベルを検証するものです。
クリックは発火し、次の行で検証が実行されるのに、DOM はまだ `Clicks: 0` と言っています。
何も壊れていません。Solid は現在のコードが終わった後でバッチとして書き込みを適用するため、テストはバッチが適用される前に検証しただけです。
1回の呼び出しで直ります。これがコンポーネントテストで唯一の Solid 固有の部分です。

その呼び出しを除けば、Solid アプリのテストは、テスト対象の振る舞いを実行できる最小の環境を選ぶ問題です:

1. コンポーネントテストは jsdom から始めます。
   `basic` テンプレートはコンポーネントの DOM テストにこの構成を使います。
2. テストがブラウザーのレイアウト、CSS、フォーカス、選択、ブラウザー API に依存するときは [Vitest ブラウザーモード](https://vitest.dev/guide/browser/) を使います。
   ブラウザーモードのテンプレートは同じコンポーネントテストを Chromium で実行します。
3. フルスタックアプリのサーバーコードには別の Node プロジェクトを追加します。
   `fullstack` テンプレートは DOM コンポーネントテストとリクエストスコープのサーバーテストを別々の Vitest プロジェクトに分けています。

:::tip[ユーザーに見えるものを検証する]
アクセシブルなロールでクエリし、見えるテキストや状態を検証してください。
公開される振る舞いが同じ証拠を与えるなら、シグナルの値、エフェクトの実行回数、コンパイル後の出力を調べないでください。
これは [Testing Library の指針](https://testing-library.com/docs/guiding-principles/) に従うものです。
:::

## jsdom でコンポーネントをテストする

`basic` テンプレートには Vitest、jsdom、Solid Testing Library、jest-dom マッチャーが同梱されています。
既存の Solid プロジェクトにも同じ開発依存関係を追加します:

```sh
pnpm add -D vitest jsdom @solidjs/testing-library @testing-library/jest-dom
```

テンプレートの `package.json` が、一緒に動作することが確認されているバージョンの記録です。

`package.json` に test スクリプトを追加します:

```json
{
	"scripts": {
		"test": "vitest"
	}
}
```

Vite の設定では `defineConfig` を `vitest/config` からインポートします。
既存の Solid プラグインを残したまま `test` ブロックを追加します:

```ts
import { defineConfig } from "vitest/config";
import solid from "@solidjs/vite-plugin";

export default defineConfig({
	plugins: [solid()],
	test: {
		environment: "jsdom",
		globals: false,
		setupFiles: ["./vitest-setup.ts"],
		// Remove this option when tests need module isolation.
		isolate: false,
	},
});
```

`vitest-setup.ts` で jest-dom マッチャーを登録します:

```ts
import "@testing-library/jest-dom/vitest";
```

:::caution[isolate: false はファイル間でモジュールの状態を共有します]
テンプレートは小規模なスイート向けのパフォーマンス設定として `isolate: false` を設定しています。
この設定では、モジュールの状態があるテストファイルから次のファイルへ残ることがあります。
テストがモジュールレベルの状態を変更する場合はこの設定を外すか、各テスト後にその状態をリセットしてください。
:::

### ユーザーに見える操作をテストする

このコンポーネントはボタンのラベルを通して状態を公開しています:

```tsx
import { createSignal } from "solid-js";

export default function Counter() {
	const [count, setCount] = createSignal(0);

	return (
		<button type="button" onClick={() => setCount(count() + 1)}>
			Clicks: {count()}
		</button>
	);
}
```

`render` には関数を渡します。Solid Testing Library がリアクティブなオーナーの下でコンポーネントを作成するためです。
ボタンをロールでクエリし、操作して、ユーザーに見えるラベルを検証します:

```tsx
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { flush } from "solid-js";
import { afterEach, describe, expect, test } from "vitest";

import Counter from "./Counter";

afterEach(cleanup);

describe("<Counter />", () => {
	test("increments on click", () => {
		const { getByRole } = render(() => <Counter />);
		const button = getByRole("button");

		expect(button).toHaveTextContent("Clicks: 0");
		fireEvent.click(button);
		flush();
		expect(button).toHaveTextContent("Clicks: 1");
	});
});
```

実行するとテストはパスします。
`flush()` の行を外すと、ラベルが `Clicks: 0` のまま最後の検証で失敗します:

```tsx
// Avoid: asserting before the staged write has landed
fireEvent.click(button);
expect(button).toHaveTextContent("Clicks: 1");

// Prefer: apply staged writes and run effects, then assert
fireEvent.click(button);
flush();
expect(button).toHaveTextContent("Clicks: 1");
```

クリックイベントはシグナルの更新をステージし、通常の読み取りはバッチが適用されるまで最後にコミットされた値を返し続けます。
[`flush()`](/reference/solid-js/reactivity/flush) はステージされた値をコミットしてキューにある処理をすべて流し切るため、検証の実行時に DOM は最新の状態になります。
非同期処理は待ちません。非同期メモのように契約上非同期の振る舞いには、`flush()` ではなく非同期クエリか [`resolve(fn)`](/reference/solid-js/advanced/interop-async/resolve) を使ってください。

Solid Testing Library はマウント済みコンテナを追跡し、`cleanup` をエクスポートしています。
テストランナーがグローバルな `afterEach` を公開している場合、cleanup を自動で登録できます。
上の設定では `globals: false` なので、明示的な `afterEach(cleanup)` によって破棄処理をテストランナーのグローバルに依存しない形にしています。

## 実ブラウザーでコンポーネントをテストする

jsdom がテストに必要な振る舞いを提供できないときはブラウザーモードを選んでください。
メンテナンスされているブラウザーモードのテンプレートは、ヘッドレス Chromium を使う Playwright プロバイダーを採用しています。

:::note[ブラウザーモードでも jsdom のインストールが必要]
`test.environment` が未設定のとき、`@solidjs/vite-plugin` は jsdom 環境を供給し、Vitest はブラウザープールを起動する前にその依存関係を解決します。
jsdom がないと、Chromium のテストがパスしても Vitest コマンドが依存関係不足のエラーで終了することがあります。
:::

新しくテスト環境を用意する場合は、依存関係を一式インストールします:

```sh
pnpm add -D vitest jsdom @solidjs/testing-library @testing-library/jest-dom @vitest/browser-playwright playwright
pnpm exec playwright install chromium
```

`test` ブロックの jsdom 環境を置き換えます:

```ts
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import solid from "@solidjs/vite-plugin";

export default defineConfig({
	plugins: [solid()],
	test: {
		globals: false,
		setupFiles: ["./vitest-setup.ts"],
		browser: {
			enabled: true,
			provider: playwright(),
			headless: true,
			instances: [{ browser: "chromium" }],
		},
	},
});
```

上記の `Counter` テストはこの構成でもそのまま実行できます。
コンポーネントは引き続き Solid Testing Library を通してレンダーされ、`flush()` はクリック後にステージされた DOM 更新を流し切ります。
違いはホスト環境です。Vitest は模擬の jsdom ドキュメントではなく、Chromium のページでテストを実行します。
ブラウザーのスイートを1回だけ実行して終了するには:

```sh
pnpm test --run
```

これらのテンプレートが示すのはコンポーネントテストであり、ブラウザー全体のエンドツーエンドの流れではありません。
コンポーネントテストでブラウザーのロケーター、インタラクション、ブラウザーモードの制限に関する API が必要な場合は [Vitest ブラウザーモードのガイド](https://vitest.dev/guide/browser/) を参照してください。

## Node プロジェクトでサーバーコードをテストする

フルスタックアプリにはクライアントとサーバーで別々のテスト環境が必要です。
[Vitest プロジェクト](https://vitest.dev/guide/projects.html) を使い、`*.test.tsx` のコンポーネントファイルは jsdom に、`src/server/**/*.test.ts` のファイルは Node に分けます。

`fullstack` テンプレートは次のプロジェクト構成を使います:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import solid from "@solidjs/vite-plugin";

export default defineConfig({
	plugins: [solid({ start: true, ssr: true })],
	test: {
		globals: false,
		setupFiles: ["./vitest-setup.ts"],
		projects: [
			{
				extends: true,
				test: {
					name: "client",
					environment: "jsdom",
					include: ["src/**/*.test.tsx"],
				},
			},
			{
				extends: true,
				test: {
					name: "server",
					environment: "node",
					include: ["src/server/**/*.test.ts"],
					server: { deps: { inline: [/@solidjs[+/]web/] } },
					alias: [
						{
							find: /^@solidjs\/web$/,
							replacement: fileURLToPath(
								new URL(
									"./node_modules/@solidjs/web/dist/server.js",
									import.meta.url
								)
							),
						},
						{
							find: /^@solidjs\/web\/storage$/,
							replacement: fileURLToPath(
								new URL(
									"./node_modules/@solidjs/web/storage/dist/storage.js",
									import.meta.url
								)
							),
						},
						{
							find: "virtual:env/server",
							replacement: fileURLToPath(
								new URL("./vitest-env-server-stub.ts", import.meta.url)
							),
						},
					],
				},
			},
		],
	},
});
```

Node プロジェクトはサーバーコードをコンパイルし、サーバーランタイムを解決します。
`fullstack` テンプレートは `@solidjs/web` のエントリーをインライン化しエイリアスも張るため、リクエストヘルパーとリクエストイベントのストレージが同じサーバービルドのインスタンスを使います。
サーバーの include パターンはクライアントのパターンと分けて、サーバーテストが jsdom 下で実行されないようにしてください。

### サーバー環境モジュールをスタブする

`fullstack` テンプレートはセッションのシークレットを `virtual:env/server` からインポートします。
Vitest は start モードのサーバーの外でセッションテストを実行するため、テンプレートはその仮想モジュールを次のテスト用スタブにエイリアスしています:

```ts
export const env: Record<string, unknown> = new Proxy(
	{},
	{
		get: (_, key) => {
			if (typeof key !== "string") return undefined;
			const value = process.env[key];
			if (key === "SESSION_SECRET") {
				return value?.split(",").map((secret) => secret.trim());
			}
			return value;
		},
	}
);
```

このプロキシはコードがプロパティにアクセスしたとき `process.env` を読み、署名キーリストについてスキーマのパース済み出力を再現します。
この動作により、テストはセッションモジュールをインポートする前に `process.env.SESSION_SECRET` を設定できます。
このスタブはテンプレートのテストが必要とするモジュール契約だけを提供します。
キー長の検証や start モードサーバーの起動処理は実行しないため、本番スキーマを満たす現実的なテストキーを使ってください。

### リクエストをまたいでセッションを動かす

リクエストイベントを素のオブジェクトに置き換えるのではなく、リクエストスコープのヘルパーはサーバーランタイムを通してテストしてください。
以下は `fullstack` テンプレートのパターンを簡潔にしたものです。イベントを作成してハンドラーに提供し、送信レスポンスをコミットし、レスポンスのクッキーを次のリクエストへ持ち越します:

```ts
import { commitEventResponse, createRequestEvent } from "@solidjs/web";
import { provideRequestEvent } from "@solidjs/web/storage";
import { afterEach, expect, test, vi } from "vitest";

type SessionModule = typeof import("./session");

async function loadSession(secret: string): Promise<SessionModule> {
	process.env.SESSION_SECRET = secret;
	vi.resetModules();
	return import("./session");
}

async function runRequest<T>(
	request: Request,
	handler: () => Promise<T>
): Promise<{ result: T; response: Response }> {
	const event = createRequestEvent(request);

	return provideRequestEvent(event, async () => {
		const result = await handler();
		const response = commitEventResponse(new Response("ok"), event);
		return { result, response };
	});
}

afterEach(() => {
	delete process.env.SESSION_SECRET;
});

test("reads a session on the next request", async () => {
	const session = await loadSession(
		"test-session-key-with-at-least-32-characters"
	);
	const login = await runRequest(new Request("http://localhost/login"), () =>
		session.setSession({ userId: "user_1" })
	);
	const cookie = login.response.headers
		.getSetCookie()
		.find((value) => value.startsWith("session="))
		?.split(";")[0];

	expect(cookie).toBeDefined();

	const current = await runRequest(
		new Request("http://localhost/me", {
			headers: { cookie: cookie! },
		}),
		() => session.getSession()
	);

	expect(current.result).toEqual({ userId: "user_1" });
});
```

実行すると、2回目のリクエストは1回目が設定したクッキーから `{ userId: "user_1" }` を返します。
このテストは公開されたリクエストからレスポンスまでの契約を検証しています。1つのリクエストがクッキーを書き込み、次のリクエストがセッションを読み取ります。
モジュール初期化時に環境変数を捕捉するコードをインポートする前に、モジュールをリセットしてください。
`afterEach` でフェイクタイマーとモックを復元し、変更した環境変数を削除し、その他のプロセス全体の状態も破棄してください。

## よくある問題

### `fireEvent` 後の検証が古い DOM を見る

書き込みはステージされており、次の行の実行時点でバッチがまだ適用されていません。
イベントの後、検証の前に `flush()` を呼んでください。
非同期のソースには `flush()` は役に立ちません。`resolve(() => value())` を await するか非同期クエリを使ってください。

### Chromium のテストはパスするのに Vitest が依存関係不足のエラーで終了する

jsdom がインストールされていません。
`test.environment` が未設定のとき `@solidjs/vite-plugin` は jsdom 環境を供給し、Vitest はブラウザープールの起動前にその依存関係を解決します。
ブラウザープロバイダーと一緒に `jsdom` も開発依存関係に入れておいてください。

### サーバーテストが jsdom 下で実行される

サーバーのファイルがクライアントプロジェクトの `include` パターンに一致しています。
`src/server/**/*.test.ts` と `src/**/*.test.tsx` を別々のパターンに保ち、各ファイルが1つのプロジェクトにだけ入るようにしてください。

### セッションモジュールがテストで設定した `SESSION_SECRET` を無視する

モジュールがインポート時に、テストが変数を設定する前に環境を捕捉しています。
上の `loadSession` のように、`process.env.SESSION_SECRET` を設定し、`vi.resetModules()` を呼んで、その両方の後でモジュールをインポートしてください。

### 状態があるテストファイルから次へ漏れる

`isolate: false` だとモジュールの状態がファイル間で残ります。
設定を外すか、`afterEach` でモジュールレベルの状態をリセットしてください。

## まとめ

- 対象の振る舞いを実行できる最小の環境でテストしてください。コンポーネントの DOM は jsdom、レイアウトとブラウザー API はブラウザーモード、サーバーコードは Node プロジェクトです。
- `render` には関数を渡してコンポーネントにリアクティブなオーナーを持たせ、ロールでクエリしてください。
- `fireEvent` の後・検証の前に `flush()` を呼んでください。ステージされた書き込みを適用しますが、非同期処理は待ちません。
- `globals` がオフのときは `afterEach(cleanup)` を登録してください。
- ブラウザーモードでも jsdom をインストールしたままにしてください。プラグインがブラウザープールの起動前にそれを解決します。
- クライアントとサーバーのテストには、別々の Vitest プロジェクトで別々の `include` パターンを与えてください。
- インポート時に環境変数を読むコードは、環境変数の設定とモジュールのリセットを済ませてからインポートし、両方とも `afterEach` で元に戻してください。

## 次のステップ

- [リアクティビティのデバッグ](/guides/debugging-reactivity#the-test-sees-the-old-dom): `flush()` の全体像、非同期値の `resolve`、そして `flush()` が許されない唯一の場所。
- [セッションと認証](/building-apps/sessions-and-auth): 上のサーバーテストが動かしたセッションモジュール。
- [環境](/building-apps/environment): `virtual:env/server` を読むサーバーコードに、前の節で説明したモジュールリセットが必要な理由。
