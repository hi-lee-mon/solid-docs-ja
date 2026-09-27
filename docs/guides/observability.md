---
title: "オブザーバビリティ"
version: "2.0"
description: "本番環境でバウンダリが捕捉したエラーを報告し、リクエストをサーバーからブラウザまで追跡し、各ユーザーインタラクションに何がかかったのかを、コンポーネントをラップせずに確認します。"
---

本番環境で、チェックアウトフォームが `Errored` バウンダリの内側で例外を投げました。
フォールバックはレンダリングされ、買い物客はリロードして再試行しますが、起きたことを伝えるものは何もありません。ブラウザのグローバルエラーハンドラーはそのエラーを一度も見ていません。バウンダリが捕捉したからです。
あるいは、「Place order」のクリックが一部の買い物客には遅く感じられ、ブラウザ自身のタイミング計測はページがどれくらい無応答だったかを教えてくれますが、どの書き込みが何を待っていたかは教えてくれません。

Solid のランタイムは、この両方の答えを持っています。
すべてのビルドで、各プラットフォームのエラーフックが、ランタイムが処理したすべての失敗を一度だけ、例外を投げたコンポーネントと捕捉したバウンダリとともに受け取ります。
observe ビルドではさらに、ランタイムは自身が行ったことをプレーンなレコードとして発行します — サーバーを待った `Loading` バウンダリ、サーバー関数の呼び出しとそれが引き起こした実行、ユーザーインタラクションとそれが保持した書き込み — そしてリクエストのトレースをブラウザへ自力で運びます。
このガイドでは、それぞれの有効化方法と、それぞれにかかるコストを示します。

## 3 つのビルド

Solid はすべてのランタイムパッケージについて 3 つのビルドを提供しており、エクスポート条件で選択されます。

| ビルド  | 条件          | 含まれるもの                                                                                                                            | `OBSERVE` | `DEV`     |
| ------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- |
| prod    | default       | ランタイムとエラーフック。                                                                                                          | undefined | undefined |
| observe | `observe`     | prod に加えて、レコードチャネル・診断チャネル・属性付けスロット・サーバーのトレーススロット。コンソール出力もチェックもなし。 | object    | undefined |
| dev     | `development` | observe に加えて、開発用チェックとコンソールレポーター。未ミニファイ。                                                                | object    | object    |

ビルドは入れ子になっています。observe ビルドで動くものはすべて dev ビルドでも動きます。
Solid のサイズスイートでは、小さなクライアントレンダリングアプリの上限は observe ビルドで 16.80 KB、本番ビルドで 15.25 KB（brotli）です。その上に属性付けエンジンを有効にすると上限は 27.25 KB に上がります。エンジンは別エントリーなので、それをインポートしない observe ビルドがそれを同梱することはありません。

observe ビルドへのオプトインは Vite プラグインで行います:

```ts title="vite.config.ts"
import solid from "@solidjs/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [solid({ ssr: true, observe: true })],
});
```

`observe: true` はすべての環境に `observe` 条件を追加し、コンパイラの `componentNames` オプションを有効にします。これにより `<Checkout>` のようなコンポーネントラベルがミニファイ後も残り、以下のパスは `computed` ではなくコンポーネント名を示します。
`vite dev` では `development` 条件が依然として優先されます。dev ビルドは observe の上位集合なので、そこで観測した内容は本番でも成立します。
プラグインを使わない場合は、バンドラーの `resolve.conditions`（バンドルしないサーバーなら `node --conditions=observe`）とコンパイラオプションを自分で設定します。

:::note[エラーはすべてのビルドで報告される]
2 つのエラーフックは `OBSERVE` ではなくランタイムの一部です。
オブザーバビリティツールを一切入れていない本番アプリでもフックは利用できます。observe ビルドはレコードとトレースのためのものです。
:::

## バウンダリが捕捉したエラーを受け取る

ブラウザでは、どこにも捕捉されなかったエラーはリアクティブシステムを停止させ、`reportError` に渡されます。`window.onerror` とすべてのエラーモニターはすでにこれをリッスンしています。
バウンダリが捕捉したエラーは別の道を行きます。フォールバックがレンダリングされ、アプリは動き続け、どのグローバルハンドラーもそれを知りません。
ランタイムがその道を報告する場所が `configureClientErrors` です:

```ts title="src/monitor.ts"
import { configureClientErrors } from "solid-js";

configureClientErrors({
	onError(error, { ownerPath, boundaryPath }) {
		report(error, {
			thrownIn: ownerPath?.join(" › "),
			caughtBy: boundaryPath?.join(" › "),
		});
	},
});
```

価格が壊れた状態で「Place order」をクリックすると `Errored` のフォールバックが表示されます。フックは 1 回発火し、`ownerPath` は `<App> › <Checkout> › <OrderSummary> › computed`、`boundaryPath` は `<App> › <Checkout> › <Errored>` と読み取れます。
2 つのパスは異なる問いに答えます。コードがどこで壊れたか、そして買い物客が代わりに何を見たかです。
バウンダリの `reset()` が同じ失敗ノードを再計算すると同じエラーオブジェクトを再び捕捉しますが、再び報告されることはありません。
これらのパスはランタイムがオーナー名を保持するビルド、つまり observe ビルドと dev ビルドで存在します。本番ビルドでもフックは発火しますが、パスは `undefined` です。

ルートには、グローバルなフックより先に独自のフックを持たせられます。`render(App, el, { onError })` と `hydrate(App, el, { onError })` は同じ関数を取り、最も近いルートが優先されます。

## サーバーが処理するすべての失敗を受け取る

サーバーはクライアントより多くの失敗処理方法を持っており、グローバルハンドラーはそのどれも見ません。ストリームにレンダリングされた `Errored` フォールバック、reject されて再レンダリングのためにクライアントへ渡された `Loading` フラグメント、例外を投げたサーバー関数、シリアライズできなかったハイドレーション値、そしてリクエスト自体を失敗させる失敗です。
`configureServerErrors` はこれらすべてを、エラーオブジェクトごとに 1 回、その失敗に出会った箇所とともに受け取ります:

```ts title="src/instrument.ts"
import { configureServerErrors } from "@solidjs/web";

configureServerErrors({
	onError(
		error,
		{ kind, handling, ownerPath, boundaryPath, functionId, direct }
	) {
		report(error, {
			site: `${kind}/${handling}`,
			thrownIn: ownerPath?.join(" › "),
			caughtBy: boundaryPath?.join(" › "),
			serverFunction: functionId,
			duringRender: direct,
		});
	},
});
```

`kind` と `handling` は失敗がどの道を通ったかを示します:

| `kind`            | `handling`  | 起きたこと                                                                           |
| ----------------- | ----------- | ----------------------------------------------------------------------------------- |
| `render`          | `fallback`  | `Errored` バウンダリがフォールバックをレンダリングしました。                                        |
| `render`          | `client`    | `Loading` フラグメントが reject されました。クライアントがそのサブツリーを再レンダリングします。                  |
| `render`          | `failed`    | 何も受け止められませんでした。リクエストは失敗します。                                            |
| `render`          | `serialize` | ハイドレーションストリームに書き込まれた値がシリアライズできませんでした。                        |
| `server-function` | `thrown`    | 関数が例外を投げました。レンダリング中のインプロセス呼び出しでは `direct` が `true` になります。      |
| `server-function` | `channel`   | head がコミットされた後、返されたストリームまたはイテラブルを通じて reject が抜け出しました。 |

フックはリクエストスコープ内で実行されるため、その中で `getRequestEvent()` が使えます。
`renderToStream(App, { onError })` と `renderToString(App, { onError })` はリクエスト単位のフックを取り、そのリクエストではグローバルなフックより優先されます。
モニタリング SDK の `init()` は、パッチを当てるモジュールが読み込まれる前に実行しなければなりません。プラグインでホストされるアプリでは、プラグインの [`start.instrument`](/building-apps/app-structure#loading-instrumentation-first) オプションがその指定場所で、上のモジュールがその形になります。

:::danger[戻り値はワイヤーに乗る]
フックは投げられたままのエラーを受け取ります。
クライアントが受け取るもの — `Errored` フォールバック内のシリアライズされたエラーや、失敗したサーバー関数呼び出しのレスポンスボディ — はランタイムがサニタイズした値で、dev ビルド以外では汎用の `Error` です。
フックから値を返すと、その値がクライアントに届く値を置き換えます。
エラーそのものを返すと、そのメッセージ・スタック・そしてそれらが含むあらゆる秘密情報がブラウザに届きます。
買い物客が問い合わせ時に提示できる参照を返すか、何も返さないでください。
:::

```ts
configureServerErrors({
	onError(error, context) {
		const ref = report(error, context);
		// The shopper sees "Something went wrong (ref 4f2a)"; the log has the rest.
		return new Error(`Something went wrong (ref ${ref})`);
	},
});
```

## リクエストをブラウザまで追跡する

リクエストは W3C `traceparent` ヘッダー付きで、またはなしで到着します。
サーバーは与えられたトレースを継続するか、新たに開始します。リクエスト中のすべての `getTraceContext()` 呼び出し（インプロセスのサーバー関数呼び出しを含む）は同じコンテキストを読み取ります。
サーバー関数から、その先に呼び出すサービスへトレースを転送します:

```ts
import { getTraceContext } from "@solidjs/web";

export async function chargeCard(orderId: string) {
	"use server";
	return fetch(paymentsUrl, {
		method: "POST",
		headers: { ...getTraceContext()?.entries },
		body: JSON.stringify({ orderId }),
	});
}
```

ランタイムはまた、ページがどのトレースに属するかをブラウザに伝えます。自身がすでに持っている 2 つの担い手で、すべてのレスポンスの `Server-Timing` ヘッダーと、HTML シェルの head 内の `<meta>` タグ（名前付きエントリーごとに 1 つ）です。
フレームストリームとサーバー関数レスポンスには `<head>` がないため、ヘッダーがそれらを結合可能にします。ドキュメントを書き換えるミドルウェアはありません。
ブラウザに伝えられるのは、入ってきた `traceparent` がサンプリング済みだった場合か、プロバイダーが応答した場合です。サンプリングされていない、あるいはこちらで開始したトレースはサーバー側に留まるため、トレーシングツールのないページのレスポンスは変わりません。

observe ビルドでは、ヘッダー由来の導出の代わりにトレーシングツールがトレースを提供できます:

```ts
import { OBSERVE } from "solid-js";

OBSERVE?.server.trace.provide((request) => {
	const span = activeSpan();
	if (!span) return undefined;
	return {
		traceId: span.traceId,
		spanId: span.spanId,
		entries: { "my-trace": `${span.traceId}-${span.spanId}` },
	};
});
```

プロバイダーはリクエストごとに 1 回、リクエスト中に、シェルのフラッシュ時か最初の `getTraceContext()` 読み取り時の、早い方で呼ばれます。
返されたフィールドはランタイムの導出値を置き換えます。`entries` はランタイムの `traceparent` に名前でマージされ、`undefined` は導出をそのまま残します。

## ランタイムが行ったことを見る

`OBSERVE.records` は、ランタイムが属性付けに値する何かを完了するたびに、両方のプラットフォームでプレーンなレコードを配送します:

| 型             | プラットフォーム | 1 レコードにつき                                                                                       |
| -------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `"boundary"`   | server   | レンダリング中に待機した `Loading` バウンダリ。最初のパスでレンダリングできたものは何も発行しません。 |
| `"invocation"` | server   | サーバー関数の実行（HTTP ディスパッチまたはインプロセス呼び出し）。                               |
| `"call"`       | client   | ページが行い、呼び出し側が await したサーバー関数呼び出し。                                      |
| `"frame"`      | both     | フレームストリームの生成（サーバー）または適用（クライアント）。                                                |

買い物客を待たせたバウンダリをログに出します:

```ts
import { OBSERVE } from "solid-js";

OBSERVE?.records.subscribe("boundary", (event) => {
	if (event.durationMs < 200) return;
	console.log(
		`<Loading> at ${event.ownerPath?.join(" › ")} waited ${Math.round(event.durationMs)}ms`,
		event.outcome
	);
});
```

遅いデータベースで `/orders` をレンダリングすると、その行は `<Loading> at <App> › <Orders> › <Loading> waited 640ms settled` と読み取れます。
レコードはデータです。id、名前、結果、`performance.now()` 時計上の `at`、継続時間、回数が含まれます。
生きているもの — リクエスト、レスポンス、引数、投げられたままのエラー — はすべてリスナーへの第 2 引数に乗り、レコードには乗りません。これによりレコードはそのままプロセスを出ることができます。
クライアントの `"call"` とそれが引き起こしたサーバーの `"invocation"` は `id` を共有します。両者の継続時間の差がワイヤー上の時間です。
バウンダリのレンダーパス中に行われた呼び出しはそのバウンダリを指名するため、待機をそれを構成した呼び出しとして読み解けます。

リスナーはレコードが完成した瞬間に、ランタイム内で同期的に実行されます。
リスナーはシグナルを書き込んではいけません。例外を投げたリスナーはコンソールに報告され、他のリスナーは引き続き実行されます。
アプリより先に読み込まれるモジュールから購読してください。チャネルはプロセスごとに 1 つしか存在しないため、購読はホストがバンドルするランタイムのすべてのコピーからのレコードに届きます。

## 各インタラクションに何がかかったか

属性付けエンジンは冒頭の 2 つ目の問い — クリックが遅く感じられたが、それは何を待っていたのか — に答えます。
これは[リアクティビティのデバッグ](/guides/debugging-reactivity#something-updates-too-often)が開発時に使うのと同じエンジンで、observe ビルドでは有効にすると本番でも動きます:

```ts
import { attribution } from "solid-js/attribution";

attribution.enable();

attribution.subscribe("interaction", (event) => {
	if (event.settledMs === undefined || event.settledMs < 300) return;
	console.log(
		`${event.name} on ${event.target} took ${Math.round(event.settledMs)}ms to settle:`,
		event.holds.map(
			(hold) => `${hold.blockers.join(", ")} held ${Math.round(hold.holdMs)}ms`
		)
	);
});
```

「Place order」をクリックすると、その行は `click on button#place-order "Place order" took 840ms to settle: ["placeOrder held 812ms"]` と読み取れます。
インタラクションレコードには、ハンドラー自身の時間、それが行った書き込み、書き込みが引き起こした再実行と作成、それに遡れる最後のエフェクトが実行された時点（`settledMs`）、そしてそれが実行したホールドとナビゲーション（それぞれインタラクションより先に確定します）が含まれます。
ホールドは、書き込みをブロックしたもの、その期間、そして画面が `isPending`・`latest`・楽観的値で待機をユーザーに示したかどうかを示します。何にも示されなかったホールドは、買い物客が「反応しないクリック」として経験するものです。
ロケーション書き込みを `OBSERVE.attribution.withOrigin` でラップするルーターは、そのナビゲーションにマッチしたルートパターンを名前として与えます。これにより `/orders/:id` が買い物客をまたいで 1 つにまとめられます。

エンジンは記録するだけで、集計テーブルは別物です。
`feedback()`・`costs()`・`why()`・`subscriptions()` は `solid-js/attribution` の独立したエクスポートなので、レコードの購読だけを行うビルドはそれらを一切同梱しません。

## プロセスから出ていくもの

レコードは名前を記録します。コンポーネントラベル、スコープに与えた `name` オプション、ストアパス、ルートパターン、サーバー関数 id です。
名前以外に、4 つのフィールドがページからのデータを運びます。レコードをデバイスの外に送るツールは、それぞれをどう扱うかを決めます:

- インタラクションとコールの origin にある `target`: `tag#id "text"` 形式の要素で、テキストコンテンツは最大 30 文字。
- 変更レコードと保持された書き込みにある `prev` と `value`: 値のプレビューで、文字列は 40 文字で切られます。
- ナビゲーションにある `to`・`from`・`params`: 実際の URL とバインドされたパラメーター。
- サーバーのレンダーエラー検出結果にある `data.error`: 投げられたままのエラー。

監視対象のアプリの中でレンダリングするツール — 診断パネルや devtools — は、自身のルートを自分のものとしてマークします。これによりそのツールのエフェクトやストアがアプリについての検出結果として現れることはありません:

```ts
import { createRoot, getOwner, OBSERVE } from "solid-js";

createRoot(() => {
	OBSERVE?.exclude(getOwner()!);
	// the panel's signals, stores, and effects
});
```

## よくある問題

### 本番で `OBSERVE` が `undefined` になる

本番ビルドが解決されてしまっています。
バンドラーが `undefined` になっている環境に `observe` 条件を適用しているか確認してください。`solid({ observe: true })` はすべての環境に適用し、バンドルしないカスタムサーバーには `node --conditions=observe` が必要です。

### パスが `computed` と `effect` を示し、コンポーネント名が出ない

コンパイラの `componentNames` オプションがオフのため、コンポーネントに記録すべきラベルがありません。
`solid({ observe: true })` で有効になります。他のセットアップでは、コンパイラに `componentNames: true` を渡してください。
`vite dev` ではラベルは常に存在します。

### `Server-Timing` エントリーもページの `<meta>` もない

ランタイムにトレースが記録されたことを伝えるものが何もありませんでした。入ってきた `traceparent` に sampled フラグがなかったか、`traceparent` が存在せずプロバイダーも応答しなかったかのどちらかです。
プロバイダーをインストールするか、エッジからサンプリング済みの `traceparent` を送ってください。

### 自作ツールのエフェクトが検出結果として現れる

ツールのルートを作成時に `OBSERVE.exclude(getOwner()!)` でマークしてください。
除外されたサブツリーへの書き込みは、どこから来ても除外されたままです。それらを `runWithOwner` 経由で回さないでください。オーナー付きスコープでの書き込みになってしまいます。

## まとめ

- エラーはすべてのビルドで `configureClientErrors` と `configureServerErrors` を通じて、エラーオブジェクトごとに 1 回、投げられた場所（`ownerPath`）と捕捉された場所（`boundaryPath`）とともに報告されます。
- サーバーフックの戻り値がクライアントの受け取るものです。エラーではなく参照を返してください。
- レコード・トレース・属性付けには observe ビルドが必要です。`solid({ observe: true })`、または手動で `observe` 条件と `componentNames` を設定します。
- `OBSERVE.records` は確定済みでシリアライズ可能なレコードを配送します。生きたハンドルはレコードの横を通り、リスナーはシグナルを書き込んではいけません。
- ランタイムはサンプリング済みまたは提供されたトレースを `Server-Timing` と `<meta>` でブラウザへ運びます。ミドルウェアは不要です。
- `attribution.enable()` の後に `attribution.subscribe("interaction", …)` で、各クリックが何を待っていたかが分かります。集計テーブルは別エクスポートで、インポートしたときだけコストがかかります。
- ツール自身のルートを `OBSERVE.exclude` でマークし、ツールが自分自身を報告しないようにします。

## 次のステップ

- [オブザーバビリティアダプターを作る](/guides/observability-adapters): エラーモニターやトレーシング SDK のために、ツール作者が依拠する契約。
- [リアクティビティのデバッグ](/guides/debugging-reactivity): 開発時にコンソールで読む同じレコードと、それらが供給する診断。
- [引数とセキュリティ](/building-apps/server-functions/arguments-and-security): サーバー関数がリクエストから信頼してよいもの（転送するトレースを含む）。
- [バウンダリ](/concepts/boundaries): フックが知る前に `Errored` と `Loading` が失敗に対して行うこと。
