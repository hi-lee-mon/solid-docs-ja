---
title: "SolidStart からの移行"
version: "2.0"
description: "SolidStart 1 またはリリース済み SolidStart 2 のアプリケーションを、@solidjs/vite-plugin の start モードを通じて Solid 2 へ移します。"
source_repo: "solidjs/solid-vite-plugin"
source_ref: "next"
source_path: "src/ssr/index.ts"
---

:::caution[これは SolidStart のアップグレードではありません]
リリース済みの SolidStart 2 は Solid 1 上で動作しており、Solid 2 をサポートしていません。
既存の SolidStart アプリケーションに Solid 2 をインストールしないでください。

`@solidjs/vite-plugin` 3 の start モードを使う独立した Solid 2 アプリケーションを作成し、そのターゲットへアプリケーションコードを移してください。
start モードは Vite プラグインのサーブモードです。
SolidStart ではなく、SolidStart のランタイムも提供しません。
:::

このガイドでは、[SolidStart 1](#start-from-solidstart-1) と[リリース済み SolidStart 2](#start-from-released-solidstart-2) で別々の抽出手順を説明します。
どちらの経路も、その後は同じ [Solid 2 ターゲットモデル](#build-the-solid-2-target)を使います。

## プラットフォーム依存関係を先に移行する

コードを独立した Solid 2 ターゲットへ移す際に、プラットフォームの移行を適用します:

1. [Solid 1 からの移行](/migration/from-solid-1)で、コアのリアクティビティ、ライフサイクル、バウンダリ、レンダリングを移行します。
2. ソースが Solid Router を使っている場合は、[Solid Router からの移行](/migration/from-solid-router)でルート定義とルーター API を移行します。
3. ソースが Solid Meta を使っている場合は、[Solid Meta 0.x からの移行](/migration/from-solid-meta)で head 管理を移行します。
4. このページの SolidStart 抽出手順を、エントリ、サーバー関数、ミドルウェア、セッション、デプロイに適用します。

変更されたランタイム API を確認するまでは、Solid 1 のコンポーネントコードをターゲットへコピーしないでください。

移行中は旧アプリケーションを実行可能な状態に保ちます。
一度に 1 つのルートまたはサーバー機能を移し、両方のアプリケーションで動作を比較してから次へ進みます。

## コピーする対象を選ぶ

インポートを確認したうえで、次のファイルをコピーします:

- `public/` 内の静的ファイル。
- CSS、画像、フォント、その他のブラウザーアセット。
- インポートが Solid 2 と互換性のあるコンポーネント。
- SolidStart、Vinxi、Nitro、H3 をインポートしないドメインコード。
- ルーターを選択しルートのエクスポートを適合させた後の、ルートコンポーネントの本体。
- 新しいサーバーバウンダリで認可とバリデーションを復元した後の、サーバー関数の本体。
- シークレットではない環境変数名と `.env.example` の値。

次の統合ファイルは書き直します:

- `app.config.ts` または SolidStart の `vite.config.ts`。
- `src/entry-client.*` と `src/entry-server.*`。
- ドキュメントシェルとアプリケーションルート。
- ルーターのブートストラップと SolidStart の `FileRoutes` の使用箇所。
- `@solidjs/start/*`、`vinxi/*`、`nitropack/*`、Nitro や H3 のランタイムモジュールからのインポート。
- ミドルウェア、セッションヘルパー、API ハンドラーの型、デプロイアダプター、プロバイダー設定。

ビルド出力ディレクトリやロックファイルはターゲットへコピーしないでください。
先にターゲットの依存関係をインストールし、呼び出し元の移動に合わせてアプリケーションの依存関係を追加します。

## SolidStart 1 から始める

[SolidStart 1](https://docs.solidjs.com/solid-start) は Vinxi、Nitro、`app.config.ts`、フレームワークが所有するエントリを使います。
ファイルを変更する前に、ソースの動作を記録します:

1. `app.config.ts` の `ssr` の値、`appRoot`、ルートディレクトリ、ミドルウェアパス、ルートのプリレンダリング、`server` 配下のすべてのオプションを記録します。
2. `~/` で始まるインポートを含む、フレームワークが提供するエイリアスを記録します。
3. `entry-client.*`、`entry-server.*`、`app.*` のカスタムコードを一覧化します。
4. `@solidjs/start`、`vinxi`、`nitropack`、および Nitro や H3 の直接のエントリポイントからのインポートをすべて一覧化します。
5. API ルート、サーバー関数、セッション操作、ミドルウェアフック、デプロイプリセットを一覧化します。
6. 旧開発サーバーと本番デプロイのテストを実行し、動作のベースラインとします。

中間段階としてアプリケーションをリリース済み SolidStart 2 へ移行しないでください。
SolidStart 1 のソースから独立した Solid 2 ターゲットへ直接移します。

次のソース固有のルールを適用します:

- `app.config.ts` はチェックリストとしてのみ扱います。
  その設定オブジェクトはコピーしません。
- SolidStart の `app.*` ファイルを、ターゲットの `src/App.tsx` アプリケーションツリーと `src/Document.tsx` HTML シェルに分割します。
- 旧 `StartClient`、`StartServer`、`mount`、`createHandler` のエントリコードを削除します。
  生成される start モードのエントリがこれを置き換えます。
- 選択したファイルシステム規約が同じパスを生成する場合にのみ、ルートのファイル名を維持します。
  `FileRoutes` 統合とルートレベルの型は書き直します。
- `"use server"` 関数内のコードは、SolidStart のランタイムインポートを取り除き、リクエスト、レスポンス、リダイレクト、シリアライズの動作を確認した後にのみ維持します。
- `onRequest` と `onBeforeResponse` のミドルウェアを fetch スタイルのミドルウェアとして書き直します。
- `vinxi/http` のセッションと cookie の呼び出しを、Solid のリクエストイベント上のセッションライブラリに置き換えます。
- Nitro のプリセット、ストレージ、タスク、WebSocket、プリレンダリングオプションを、新しいデプロイ向けに選択したホストまたは Vite の統合に置き換えます。

## リリース済み SolidStart 2 から始める

[リリース済み SolidStart 2](https://docs.solidjs.com/solid-start/v2) は Solid 1、`solidStart()`、Vite 環境ビルド、Nitro のようなデプロイプラグインを使います。
その Vite 設定はターゲットに似ていますが、アプリケーションとサーバーの契約は異なります。

ファイルを変更する前に、ソースの動作を記録します:

1. `middleware`、`serialization`、`devOverlay`、ルートの場所、レンダリングモードを含む、すべての `solidStart()` オプションを記録します。
2. Nitro、Netlify、Cloudflare、その他のデプロイプラグインの設定を記録します。
3. `src/app.*`、`src/entry-client.*`、`src/entry-server.*` のカスタム動作を一覧化します。
4. `@solidjs/start/config`、`@solidjs/start/client`、`@solidjs/start/server`、`@solidjs/start/http`、`@solidjs/start/middleware` からのインポートを一覧化します。
5. API ルート、H3 ミドルウェア、セッションヘルパー、リクエストイベントの locals、サーバー関数を一覧化します。
6. 開発、ビルド、プレビュー、デプロイのテストを実行し、動作のベースラインとします。

既存アプリケーションで `solidStart()` を `solid()` に置き換えて、結果が同じランタイムになると想定しないでください。
独立したターゲットを作成し、次のソース固有のルールを適用します:

- `@solidjs/start`、`solidStart()`、SolidStart 環境の型参照を取り除きます。
- start モードのビルドが `vite preview` で動作するまで、デプロイプラグインを取り除きます。
  Web 標準のハンドラーが動作してから、ホスト統合を追加します。
- H3 ミドルウェアと `@solidjs/start/http` の呼び出しを、`Request`、`Response`、Solid のリクエストイベントに対して書き直します。
- `StartClient`、`StartServer`、`createHandler`、`FileRoutes` を置き換えます。
- `serialization`、`devOverlay`、アイランド、ルートプリレンダリング、Nitro 設定は再設計が必要な機能として扱います。
  start モードにはこれらに対応するアプリケーションオプションがありません。
- ルーターコードをすべて再確認します。
  リリース済み SolidStart のルーターバージョンと Solid 2 のルーターバージョンは同じ契約ではありません。

## Solid 2 ターゲットを構築する

現在のソースのベースラインは [`519da14d` の `@solidjs/vite-plugin`](https://github.com/solidjs/solid-vite-plugin/tree/519da14d20a51dd0a856eb9acfdae784a567bf10) と [`cbbd8ba2` の `solid-v2` テンプレート](https://github.com/solidjs/templates/tree/cbbd8ba26ed7f909455abe142de74e204b039974/solid-v2)です。
最も近いテンプレートをターゲットとして使うか、同じ依存関係とスクリプト構成を持つ空の Vite プロジェクトを作成します。

アプリケーションファイルを移す前にターゲットを選択します:

- サーバー関数のないクライアントレンダーアプリケーションには [`solid-v2/bare`](https://github.com/solidjs/templates/tree/cbbd8ba26ed7f909455abe142de74e204b039974/solid-v2/bare) を使います。
- Solid Router とファイルシステムページには [`solid-v2/basic`](https://github.com/solidjs/templates/tree/cbbd8ba26ed7f909455abe142de74e204b039974/solid-v2/basic) を使います。
- ストリーミングサーバーサイドレンダリング（SSR）、サーバー関数、セッション、ミドルウェア、API ルートには [`solid-v2/fullstack`](https://github.com/solidjs/templates/tree/cbbd8ba26ed7f909455abe142de74e204b039974/solid-v2/fullstack) を使います。
- TanStack Router がルーティングを、TanStack Query がデータキャッシュを担当する場合は [`solid-v2/fullstack-tanstack`](https://github.com/solidjs/templates/tree/cbbd8ba26ed7f909455abe142de74e204b039974/solid-v2/fullstack-tanstack) を使います。

以下のチェックリストは Solid Router を使う SSR アプリケーションを想定しています。
ソースアプリケーションがクライアントレンダーの場合のみ `ssr: true` を省略します。
アプリケーションにサーバー動作がない場合は `serverFunctions` とミドルウェアを省略します。

### パッケージ境界を作る

選択した Solid 2 テンプレートの `package.json` から始めます。
テンプレートが持つ Solid 2、`@solidjs/web`、Vite、`@solidjs/vite-plugin` の互換バージョンを維持します。
`@solidjs/start`、Vinxi、Nitro、古い Solid Router リリースをターゲットへ持ち込まないでください。

Vite スクリプトを使います:

```json title="package.json"
{
	"scripts": {
		"dev": "vite",
		"build": "vite build",
		"serve": "vite preview"
	}
}
```

各パッケージが Solid 2 をサポートすることを確認してから、アプリケーションの依存関係をコピーします。
Solid 1 の内部実装をインポートしている、または SolidStart のランタイムモジュールを必要とするパッケージは置き換えます。

### start モードを設定する

`vite.config.ts` に `@solidjs/vite-plugin` の start モードを追加します。
`start` オプションは、エントリ、開発サーブ、プレビューサーブ、本番ビルドの配線を所有します。
独立した `ssr` ブーリアンがストリーミング SSR を選択します。

```ts title="vite.config.ts"
import { fileRoutes } from "filesystem-routing/vite";
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";

export default defineConfig({
	plugins: [
		solid({
			start: {
				middleware: "./src/middleware.ts",
			},
			ssr: true,
			serverFunctions: true,
			extensions: [".jsx", ".tsx"],
		}),
		fileRoutes({ httpMethods: true }),
	],
});
```

`start: true` と `start: {}` は同じモードを有効にします。
アプリケーションが `app`、`entryServer`、`entryClient`、`document`、`middleware`、`setup`、`env`、`external` を必要とする場合のみオブジェクト形式を使います。
`extensions` エントリは、`filesystem-routing` がクエリ接尾辞付きで生成するルートモジュール ID を Solid の transform が受け付けるようにします。

旧設定は意図的にマッピングします:

- ソースの SSR はトップレベルの `ssr` ブーリアンにマッピングします。
- アプリルートは、ターゲットが `src/App.*` 規約を使わない場合のみ `start.app` にマッピングします。
- ルートディレクトリは `start` ではなく `fileRoutes({ dir })` にマッピングします。
- ミドルウェアは `start.middleware` にマッピングします。
- Vite エイリアスは `resolve.alias` 配下に追加します。start モードは SolidStart の `~` エイリアスを追加しません。
- ホストのビルドとサーブの所有権はデプロイ境界の後ろに移します。
  Nitro のオプションを `start` に置かないでください。

完全なオプション契約は [`StartOptions` リファレンス](/reference/vite-plugin-solid/start)を参照してください。

### プラグインにエントリを生成させる

最初のターゲットビルドの前に、SolidStart の `src/entry-client.*` と `src/entry-server.*` ファイルを削除するか移動します。
これらの規約ファイルが残っていると、start モードはエントリを生成せずそれらを選択します。
SolidStart のエントリモジュールはインポートとエクスポートの契約が異なるため、start モードのエントリとして使えません。

生成される SSR エントリは:

- サーバーで `<Document><App /></Document>` をレンダーします。
- ブラウザーで同じツリーをハイドレートします。
- ビルド済みのクライアントエントリとスタイルを注入します。

start モードのハンドラーは、ミドルウェア、ページレンダリング、サーバー関数が使うリクエストイベントを作成します。

旧エントリに `App`、`Document`、ミドルウェア、`start.setup`、サーバー関数へ移せない動作が含まれない限り、生成されたエントリをそのまま使います。
自作のエントリが必要な場合は、両方のファイルをペアとして書き直します。
サーバーエントリは `render(request?, context?)` をエクスポートし、クライアントエントリは同じドキュメントツリーをハイドレートしなければなりません。

### `App.tsx` と `Document.tsx` に分割する

デフォルトエクスポートするアプリケーションルートとして `src/App.tsx` を作成します。
ルーター、プロバイダー、レイアウト、アプリケーション UI をここへ移します。
`App` に `<html>`、`<head>`、`<body>` は置きません。

```tsx title="src/App.tsx"
import { Router } from "./router";

export default function App() {
	return <Router>{(props) => props.children}</Router>;
}
```

デフォルトエクスポートする HTML シェルとして `src/Document.tsx` を作成します。
言語、meta、アイコン、ドキュメントレベルのタグをここへ移します。
body 内で `props.children` をレンダーし、SSR では `<HydrationScript />` を含めます。

```tsx title="src/Document.tsx"
import type { ParentProps } from "solid-js";
import { HydrationScript } from "@solidjs/web";

export default function Document(props: ParentProps) {
	return (
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<HydrationScript />
			</head>
			<body>{props.children}</body>
		</html>
	);
}
```

生成されるエントリはクライアントスクリプトをドキュメントの head に注入します。
SolidStart の `props.assets`、`props.scripts`、`#app` マウントラッパーをこのコンポーネントへコピーしないでください。

### ルーターを選択してマウントする

start モードはルーターを選択せず、ページを検出もしません。
ルートファイルをコピーする前にルーターを選択します。

Solid Router の場合:

1. ファイルベースのルートが必要な場合、`filesystem-routing` とその Vite プラグインを追加します。
2. `@solidjs/router/fs` の `fileRoutes()` で `pageRoutes` を変換します。
3. ルーターを 1 つ作成し、`App` の配下でレンダーします。
4. 旧 `FileRoutes` のインポートとルート設定の型を書き直します。

```ts title="src/router.ts"
import { pageRoutes } from "virtual:file-routes";
import { createRouter } from "@solidjs/router";
import { fileRoutes } from "@solidjs/router/fs";

export const Router = createRouter({
	routes: fileRoutes(pageRoutes),
});
```

デフォルトのネストファイル規約は、次のような一般的なパスを維持します:

- `routes/index.tsx` は `/` に。
- `routes/blog/index.tsx` は `/blog/` に。
- `routes/users/[id].tsx` は `/users/:id` に。
- `routes/docs/[...path].tsx` は `/docs/*path` に。

`routes/users.tsx` と `routes/users/` を組み合わせると、レイアウトとネストされたページが作られます。
ルートグループも利用できますが、次のルートを移す前に生成されたすべてのパスを比較してください。
[ファイルシステムルートの規約](/reference/filesystem-routing/conventions)と [Solid Router のルート変換](/routing/solid-router/route-definitions#convert-a-file-system-manifest)を参照してください。

TanStack Router の場合は、ピン留めされた `fullstack-tanstack` テンプレートから始めます。
そのルータープラグインは `src/routes` を所有し、`routeTree.gen.ts` を生成します。
SSR では、`start.setup` が生成されたエントリのレンダー前にリクエスト固有のルーターを作成して読み込みます。
SolidStart のルーターサーバーやクライアントエントリのプロトコルは再利用しません。
[TanStack Router 統合](/routing/tanstack)を参照してください。

### ルートモジュールを段階的に移す

一度に 1 つのレイアウトとその子ルートを移します。
各ルートについて:

1. 生成されるパスを確認します。
2. コンポーネント本体をコピーします。
3. ルーターのインポート、ルート props、プリロード関数、search バリデーション、リダイレクトを書き直します。
4. SolidStart のメタデータやデータ API を、選択したルーターと `@solidjs/meta` の API に置き換えます。
5. 直接の SSR、クライアントナビゲーション、リフレッシュ、パラメーター、保留中 UI、エラー、`404` ステータスをテストします。

`FileRoutes` をコピーしたり、SolidStart のルートエクスポートが Solid Router 2 や TanStack Solid Router 1 で同じ型になると想定したりしないでください。
ルートコンポーネントは通常再利用できます。
ルートの登録とデータバウンダリは通常変更が必要です。

SolidStart 1 のルートコードが最も変わるのはデータバウンダリです。
`createAsync(() => getUser(params.id))` は `createMemo(() => getUser(params.id))` になり、データを返していたルートの `load` は `void` でクエリを開始しコンポーネントに読み取らせる `preload` になり、`useSubmission(action).pending` はフォームの `aria-busy`、楽観的ストア、エラー用の `useSubmissions` に分かれます。
[Solid Router 1 からの移行](/migration/from-solid-router#migrate-data-loading-and-caching)にそれぞれの変更前後が示され、[データ読み込みとミューテーション](/routing/solid-router/data)で結果の形を学べます。

### サーバー関数を移す

`"use server"` 関数を移す前に `serverFunctions: true` を有効にします。
デフォルトのエンドポイントは `/_server` のままです。

関数レベルとモジュールレベルのディレクティブがサポートされています:

```ts title="src/lib/users.ts"
export async function findUser(id: string) {
	"use server";
	return database.users.find(id);
}
```

次のチェックを適用してから実装をコピーします:

- データベースと認証情報のインポートはサーバー専用モジュールに保持します。
- SolidStart の HTTP ヘルパーを、Web の `Request`、`Response`、そして `@solidjs/web` の `getRequestEvent()` に置き換えます。
- 呼び出し可能なすべての関数内で引数と認可をバリデートします。
- SolidStart のシリアライズに依存していた値を再テストします。
- 旧 `query` と `action` ラッパーを、選択したルーターの Solid 2 API に置き換えます。
- レスポンスヘルパーを現在の `@solidjs/web` またはルーターの契約に置き換えます。

次のサーバー関数 API の置き換えを適用します:

- `GET` は `@solidjs/start` ではなく `@solidjs/web/server-functions` からインポートします。
- `.GET` プロキシプロパティを `GET(fn)` に置き換えます。
- `.withOptions(init)` のセッションポリシーを `configureServerFunctionsClient({ prepareRequest })` に置き換えます。
- カスタムコーデックプラグインを `@solidjs/web/serialization` の `createPlugin` で構築し、一致する `codec` オプションをクライアントとサーバーのランタイムに渡します。
- 手動で付けたシングルフライトヘッダーを取り除きます。
  ルーターはフライトデータのコンシューマーを登録することでオプトインします。

サーバー関数はプラグイン内のトランスポートプリミティブです。
ルーターのキャッシュ、サブミッション、再検証、シングルフライトの動作には、対応するルーター統合が必要です。
[サーバー関数](/building-apps/server-functions)を参照してください。

### 環境の扱いを再構築する

設定された `VITE_` 接頭辞を使う Vite の公開変数は、`import.meta.env` を通じて引き続き利用できます。
シークレットはサーバー専用モジュールに保持します。

start モードは、プロジェクトルートの `env.ts` または `env.js` に置く型付き Standard Schema ファイルもサポートします:

::::tab-group[validation-library]

:::tab[Valibot]

```ts title="env.ts"
import * as v from "valibot";

const signingKeys = v.pipe(
	v.unknown(),
	v.transform((value) =>
		typeof value === "string"
			? value.split(",").map((key) => key.trim())
			: value
	),
	v.array(v.pipe(v.string(), v.minLength(32))),
	v.minLength(1)
);

export default {
	server: {
		SESSION_SECRET: signingKeys,
	},
	client: {
		VITE_APP_NAME: v.pipe(v.string(), v.minLength(1)),
	},
};
```

:::

:::tab[Zod]

```ts title="env.ts"
import { z } from "zod";

const signingKeys = z.preprocess(
	(value) =>
		typeof value === "string"
			? value.split(",").map((key) => key.trim())
			: value,
	z.array(z.string().min(32)).min(1)
);

export default {
	server: {
		SESSION_SECRET: signingKeys,
	},
	client: {
		VITE_APP_NAME: z.string().min(1),
	},
};
```

:::

::::

検証済みの値は、サーバー専用モジュールでは `virtual:env/server` から、共有コードやクライアントコードでは `virtual:env/client` からインポートします。
プラグインはスキーマの隣に `solid-env.d.ts` を生成します。
SolidStart の `@solidjs/start/env` 型参照はコピーしないでください。

サーバーモジュールは、サーバー起動時に `process.env` からサーバーの値を読み取り検証します。
クライアントの値は検証され、ブラウザーバンドルに埋め込まれます。
`.env.example` はコピーしますが、ローカルのシークレットをソース管理へコミットしないでください。
[環境](/building-apps/environment)を参照してください。

### セッションと認証を書き直す

start モードは、リクエストイベント、Web ヘッダー上の cookie、レスポンスメタデータを提供します。
SolidStart のセッションヘルパーや認証システムは提供しません。

`useSession`、`getSession`、`setCookie`、関連する SolidStart、Vinxi、H3 のヘルパーへの呼び出しを書き直します。
公式の fullstack テンプレートは `@remix-run/cookie` を次のものと組み合わせています:

- `@solidjs/web` の `getRequestEvent()`。
- 受信した `event.request.headers`。
- `event.response.headers` に追加する送信側の `Set-Cookie` 値。
- `virtual:env/server` から読み取るシークレット。

このテンプレートの cookie は署名済みで改ざん検知できますが、暗号化はされていません。
ペイロードにシークレットを入れないでください。
失効、より大きなデータ、サーバー所有のセッション状態が必要な場合は、ストレージに裏付けられたセッションライブラリを使います。

認可は保護されたすべてのサーバー関数と API ハンドラー内に保持します。
ミドルウェアは `event.locals` に値を設定できますが、UI を隠すことやページリクエストのチェックは、他のサーバーエントリポイントを認可しません。
[セッションと認証](/building-apps/sessions-and-auth)を参照してください。

### ミドルウェアと API ルートを書き直す

`start.middleware` を通じてサーバー専用モジュールを設定します。
そのデフォルトエクスポートは、1 つの fetch スタイルミドルウェア関数またはその配列です:

```ts
type Middleware = (
	request: Request,
	next: (request?: Request) => Response | Promise<Response>
) => Response | Promise<Response>;
```

`await next()` の前のコードは宣言順に実行されます。
その後のコードはチェーンが巻き戻る間に実行されます。
`next()` を呼ばずに `Response` を返すとディスパッチを停止します。
チェーン内では `getRequestEvent()` を使って、リクエストスコープの locals とレスポンスメタデータを読み書きします。

API ルートの検出は独立した `filesystem-routing` 統合です。
`fileRoutes({ httpMethods: true })` を有効にし、そのディスパッチャーをミドルウェアチェーンに置きます:

```ts title="src/middleware.ts"
import { createAPIHandler } from "filesystem-routing/api";
import routes from "virtual:file-routes";

export default [createAPIHandler(routes)];
```

API モジュールは大文字の HTTP メソッドをエクスポートします:

```ts title="src/routes/api/users.ts"
import type { APIHandler } from "filesystem-routing/api";

export const GET: APIHandler = ({ request, params }) => {
	return Response.json({
		path: new URL(request.url).pathname,
		params,
	});
};
```

メソッドのみのモジュールはページを持たない API ルートです。
モジュールはページをデフォルトエクスポートし、かつメソッドをエクスポートすることもできます。
ハンドラーの結果とフォールバックのルールは SolidStart と同一ではないため、`HEAD`、存在しないメソッド、`undefined` の結果、ルートパラメーター、cookie、エラーを再テストしてください。
[ミドルウェアと API ルート](/building-apps/middleware-and-api-routes)を参照してください。

### デプロイ境界を再構築する

プロバイダー固有の統合を追加する前に `vite build` を実行します。
`start` と `ssr: true` を指定すると、ビルドは次を書き出します:

- ブラウザーアセットを `dist/client` へ。
- サーバーモジュールを `dist/server/server.js` へ。

サーバーモジュールは `handleRequest` をエクスポートします。
その契約は、Web の `Request` を受け取り、Promise 化された Web の `Response` を返すものです:

```ts
import { handleRequest } from "./dist/server/server.js";

const response = await handleRequest(request);
```

マッチしなかったリクエストをハンドラーへ渡す前に `dist/client` をサーブします。
リクエストの URL、メソッド、ヘッダー、ボディを保持します。
レスポンスのステータス、ヘッダー、個別の `Set-Cookie` 値、ストリームされたボディを保持します。

旧 Nitro の出力をデプロイしたり、SolidStart のプロバイダープリセットを再利用したりしないでください。
Node の場合は `start: { node: true }` を設定します。ビルドは `dist/server/node.js` を書き出し、これはこの境界を実装するサーバーで `node dist/server/node.js` で実行できます。
他のホストでは、この正確なアセットとハンドラーの境界を実装するアダプターまたは Vite 統合が必要です。

`start.external: true` は、ホスト統合がサーバービルドの配線と HTTP サーブの両方を所有する場合のみ設定します。
プラグインは引き続き、生成されるエントリ、クライアントマニフェスト、仮想ハンドラーを提供します。
[デプロイ](/building-apps/deployment)を参照してください。

### 削除されたフレームワーク機能を解決する

start モードは SolidStart のすべての機能を置き換えるわけではありません。
旧来の依存関係をそれぞれ明示的に解決します:

- `~` エイリアスを Vite エイリアスまたは相対インポートに置き換えます。
- `appRoot` とルートディレクトリの動作を、プラグインのパスと `fileRoutes({ dir })` に置き換えます。
- SolidStart の開発ツールバーを Vite とブラウザーのツールに置き換えます。
- フレームワークのルートプリレンダリングをホストまたはビルド統合に置き換えます。
- Nitro のタスク、ストレージ、WebSocket、デプロイプリセットをランタイム固有のサービスに置き換えます。
- アイランドやその他の SolidStart レンダリングモードを、サポートされる Solid 2 のアプリケーション設計に置き換えます。
- SolidStart の `serialization` オプションに依存していた値を、Solid 2 のサーバー関数コーデックに対して再テストします。
- `@solidjs/start/http` の便利ヘルパーを、Web API、`@solidjs/web`、または専用ライブラリに置き換えます。
- フレームワークの API ルートディスパッチを、`filesystem-routing` ミドルウェアまたは別のサーバー統合に置き換えます。

ターゲットホストに検証済みの Solid 2 アダプターがない項目は、未解決のままにします。
ホスト固有のギャップを `start.external` の後ろに隠さないでください。

## 各移行スライスを検証する

ルートグループやサーバー機能を移すたびに、次のチェックを実行します:

1. 新しいブラウザーリクエストでそのルートを直接開きます。
2. ブラウザーでそのルートへ遷移し、そこから離れます。
3. レンダーされたドキュメントの head とステータスコードを比較します。
4. サーバー関数の成功、バリデーション失敗、認可失敗、リダイレクトを確認します。
5. API メソッド、ミドルウェア順序、cookie、セッション期限切れを確認します。
6. `vite build` と `vite preview` を実行します。
7. ストリームされたレスポンスと複数の `Set-Cookie` ヘッダーで本番アダプターを実行します。
8. クライアント出力にサーバー専用モジュールやシークレット値が含まれていないか確認します。
9. ターゲットが同じ動作テストを通過してから、移行元のソース機能を削除します。

最後に実際のデプロイホストでテストします。
プレビューは生成された成果物を検証しますが、プロバイダーのルーティング、環境変数の注入、アセットルール、ストリーミング、cookie 転送は検証しません。
