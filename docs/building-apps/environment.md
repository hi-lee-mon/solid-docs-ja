---
title: "環境"
version: "2.0"
description: "環境変数を一度だけ宣言し、型付きモジュールを通してサーバーではシークレットを、ブラウザーでは公開値を読み取り、シークレットが漏れそうなときはビルドを失敗させます。"
---

[セッションと認証](/building-apps/sessions-and-auth)のセッションクッキーは `SESSION_SECRET` で署名され、ストアのヘッダーにはステージングと本番のデプロイで変わる名前が表示されます。
前者は決してブラウザーに届けてはならず、後者は配布しても問題なく、型が付いていると便利です。
Vite の `import.meta.env` は後者を扱います。
Start モードは、1つのスキーマと2つのインポートパス、そして両者の境界を越えさせないビルドによって、両方を扱うレイヤーを追加します。

このページでは、`fullstack` プロジェクト構成が宣言する2つの変数を使います。
このレイヤーは Start モードに属するもので、`ssr: true` だけでは有効になりません。

ほとんどのアプリで必要なのは、最初のセクションとその次の失敗例のリストです。
表や `.env` のルール、スキーマの配置場所は細部を確認するためのもので、最後のモジュールマーカーは同じ境界を自分のファイルにも適用するものです。

## 宣言してからインポートする

プロジェクトルートに `env.ts` を置きます。
このファイルはバリデーターの `server` マップと `client` マップをデフォルトエクスポートします。[Standard Schema](https://standardschema.dev/) ライブラリーならどれでも使え、キーごとに混在させても構いません。

::::tab-group[validation-library]

:::tab[Valibot]

```ts
// env.ts
import * as v from "valibot";

export default {
	server: {
		SESSION_SECRET: v.pipe(v.string(), v.minLength(32)),
	},
	client: {
		VITE_APP_NAME: v.optional(
			v.pipe(v.string(), v.minLength(1)),
			"Solid Store"
		),
	},
};
```

:::

:::tab[Zod]

```ts
// env.ts
import { z } from "zod";

export default {
	server: {
		SESSION_SECRET: z.string().min(32),
	},
	client: {
		VITE_APP_NAME: z.string().min(1).default("Solid Store"),
	},
};
```

:::

::::

それぞれの側は専用のモジュールから読み取ります:

```ts
// src/server/session.ts
import { env } from "virtual:env/server";

const secret = env.SESSION_SECRET; // string, at least 32 characters
```

```tsx
// src/App.tsx
import { env } from "virtual:env/client";

<Title>{env.VITE_APP_NAME}</Title>; // string, "Solid Store" when unset
```

エディターで `env.SESSION_SECRET` にホバーすると、その型はバリデーターの出力から推論された `string` です。スキーマにないキーは型エラーになります。
プラグインは、dev やビルドの開始時にスキーマの隣に `solid-env.d.ts` を書き出します。
このファイルは TypeScript プロジェクトに含めたままにし、編集しないでください。

読み取りが行われる場所が、どのモジュールをインポートできるかを決めます:

```tsx
// Avoid: a server value read from a component module
import { env } from "virtual:env/server";

export function Footer() {
	return <p>Signed with a {env.SESSION_SECRET.length} character secret</p>;
}

// Prefer: the read lives in a module only server code reaches
import { env } from "virtual:env/server";

export const secrets = env.SESSION_SECRET.split(",");
```

`src/components/Footer.tsx` に置いた `Avoid` 版はビルドに失敗します。
エラーは `virtual:env/server is server-only and was imported from the client module graph (by src/components/Footer.tsx)` です。コンポーネントモジュールは、サーバーでもレンダーされる場合でもブラウザーバンドルの一部であるためです。
`Prefer` 版は `src/server/session.ts` に置き、ブラウザーも読み込むモジュール内の `"use server"` 関数からインポートできます（テンプレートのデータレイヤーがそうしているように）。コンパイラーは関数本体とそのインポートをブラウザーバンドルから除外するためです。

## 間違えたときに起きること

このレイヤーは、失敗例から理解するのが最も簡単です。

### `virtual:env/server` をコンポーネントからインポートした

ビルドが失敗し、上記のようにインポート元のファイル名が示されます。
読み取りは[サーバー関数](/building-apps/server-functions)、ミドルウェア、あるいはそれらからのみ到達されるモジュールに移してください。

### シークレットが `client` マップにある

ビルドは成功し、シークレットはすべての訪問者に配布されます。
ブラウザーバンドルに入った値はもはや守れません。`client` マップは、その値が公開であるという宣言です。
クライアントのキーには Vite の公開プレフィックス（デフォルトは `VITE_`）が必要で、意図が名前から分かるようになっています。プラグインはプレフィックスのない `client` キーを設定時に拒否します。

:::danger[client マップは設定ではなく公開です]
`client` のすべての値は、ブラウザーがダウンロードする JavaScript に平文の JSON としてシリアライズされます。
ビルドエラーを消すために `server` から `client` へキーを移すと、その値が公開されます。
:::

### 本番で `SESSION_SECRET` がない

ビルドは警告付きで通り、サーバーは起動時に `server env validation failed at boot` で失敗し、キー名とバリデーターのメッセージが示されます。
サーバーの値はビルド時に焼き込まれるのではなく、サーバー起動時に `process.env` から読み取られます。そのため、シークレットのないビルドマシンでもアーティファクトを生成でき、ホストはリビルドなしでシークレットをローテーションできます。

### `VITE_APP_NAME` が無効

ビルドが失敗します。
クライアントの値は、バンドルにシリアライズされるタイミングであるビルド時にバリデーションされます。
バリデーターライブラリーはブラウザーには配布されず、バリデーション済みの値だけが配布されます。

### サーバーの文字列がクライアントバンドルに現れた

本番のクライアントビルドは、ベンダー以外のチャンクをスキャンし、8文字以上のバリデーション済みサーバー文字列が引用符付きでそのまま含まれていないか調べ、見つかれば `server env values leaked into client chunks` で失敗します。
これはコピー&ペーストミスに対する最後の砦であり、セキュリティ境界ではありません。実際の制御は上記のモジュール分割です。

## ルールの一覧

|                        | `server` マップ                                             | `client` マップ           |
| ---------------------- | -------------------------------------------------------- | ------------------------ |
| インポート元            | `virtual:env/server`                                     | `virtual:env/client`     |
| 使用できる場所          | サーバー専用モジュール                                      | どこでも                 |
| 読み取り元              | サーバー起動時の `process.env`                             | ビルド時の環境            |
| バリデーション          | 起動時（dev でも。dev サーバーがサーバーだから）              | ビルド時                 |
| キーのプレフィックス     | 任意                                                      | `VITE_`（または `envPrefix`） |
| リビルドなしでローテーション | 可                                                     | 不可                     |

`virtual:env/server` はクライアントの値も公開するため、サーバーコードでインポートを2つ書く必要はありません。

## `.env` ファイル

このレイヤーは Vite の環境ディレクトリーから `.env`、`.env.local`、`.env.[mode]`、`.env.[mode].local` を読み込み、dev とビルドで `process.env` に取り込みます。
プロセスにすでにある値はファイルの値より優先されます。これは、実際のシークレットを注入するホストで望ましい動作です。
値は `process.env` に入るため、`process.env` を自分で読むデータベースクライアントやセッションライブラリーからも見えます。`vite.config.ts` で `loadEnv` する必要はありません。

:::tip[サンプルファイルから始める]
`fullstack` 構成には、宣言済みの全キーとそれぞれのコメントを含む `.env.example` が付属しています。
`.env` にコピーして `SESSION_SECRET` を入力してください。`openssl rand -base64 32` で生成できます。
`.env` は `.gitignore` に含まれており、テンプレートの `start` スクリプトは `--env-file-if-exists` でそれを読み込みます。
:::

## スキーマの配置場所

Start モードは Vite ルートの `env.ts` または `env.js` を探します。
`start.env` で変更できます:

```ts
solid({
	start: {
		env: "./config/env.ts", // another path inside the Vite root
		// env: true   → error if no schema exists
		// env: false  → turn the layer off even if a schema exists
	},
});
```

## モジュールをサーバー専用・クライアント専用にマークする

env モジュールは自身の境界を強制します。
自分のモジュールには、`server-only` と `client-only` マーカーが同じ役割を果たします。Start モードやサーバー関数がオフでも機能します:

```ts
// src/server/db.ts
import "server-only";

export function listOrders(customerId: string) {
	// Database access.
}
```

どれかのパスがこのモジュールをクライアントバンドルに引き込むと、ビルドは `Attempt to import 'server-only' in a client module` で失敗し、インポート元が示されます。
サーバーグラフでは、マーカーは空のモジュールに解決されます。

```ts
import "client-only";

export function readPreference() {
	return localStorage.getItem("preference");
}
```

`client-only` はその対称版です。モジュールがサーバーグラフに入るとビルドが失敗します。

マーカーは、モジュールがどこにバンドルされてよいかを表明します。
モジュールを2つに分割したり、ランタイムチェックを追加したり、すでにクライアントコードにコピーされた値の漏洩をなかったことにしたりはしません。
マーカーは、それをインポートするモジュールではなく、機密コードを持つモジュールに置いてください。

TypeScript がこれらのモジュール名をまだ知らない場合は、プラグインの宣言を追加します:

```ts
/// <reference types="@solidjs/vite-plugin/boundary-modules" />
```

## よくある問題

### `env.SESSION_SECRET` が `unknown` 型になるかキーがない

`solid-env.d.ts` が再生成されていません。dev またはビルドを一度実行してください。
再生成されてもまだ違う場合、型はバリデーターの出力型なのでスキーマを確認してください。

### dev サーバーがサーバー変数のバリデーションエラーを報告する

dev サーバーがそのままサーバーなので、起動時バリデーションはそこで実行されます。
`.env` またはシェルに値を追加してください。

### `server-only` モジュールがコールドな `dev` 起動でビルドを失敗させる

Vite の依存関係スキャナーは、`"use server"` 変換が実行される前にインポートをたどり、マーカーに当たることがあります。
そのパスのプリバンドルはスキップされ dev は続行されます。ビルド時のガードには影響しません。

### ホストで変更したクライアントの値が古いまま

クライアントの値は `vite build` でシリアライズされます。
ビルドを実行するマシンで設定してリビルドしてください。起動時に読まれるのは `server` の値だけです。

## まとめ

- すべての変数は `env.ts` で一度だけ、`server` マップか `client` マップに宣言します。
- `virtual:env/server` のインポートは、サーバーコードだけが到達するモジュールに限定します。コンポーネントからのインポートはビルドを失敗させ、ファイル名が示されます。
- `client` マップは公開として扱います。その値はブラウザーバンドル内の JSON であり、キーにはそれを示す `VITE_` プレフィックスが付きます。
- サーバーの値は起動時に `process.env` から読み取られバリデーションされるため、リビルドなしでシークレットをローテーションできます。クライアントの値はビルド時に固定されます。
- ローカルの値は `.env` に置きます。プロセスにすでにある値がファイルより優先されます。
- 機密モジュールには `import "server-only"` を付けて、クライアントからのインポートがランタイムではなくビルド時に失敗するようにします。
- `solid-env.d.ts` はプロジェクトに含め、プラグインによる再生成に任せます。

## 次のステップ

- [セッションと認証](/building-apps/sessions-and-auth): このレイヤーの `SESSION_SECRET` でクッキーに署名します。
- [サーバー関数](/building-apps/server-functions): サーバーの値を読み取る一般的な場所です。
- [デプロイ](/building-apps/deployment): 各ホストが起動時にサーバー変数を供給する方法と、クライアントの値がビルド時に固定される理由です。
