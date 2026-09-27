---
title: "オブザーバビリティアダプターを作る"
version: "2.0"
description: "ランタイムのフックとチャネルを通じて、エラーモニターやトレーシング SDK を Solid アプリに接続します。ラップもパッチも書き換えも不要です。"
---

エラーモニターやトレーシング SDK を保守していて、Solid を使うチームから統合を求められたとします。
多くのフレームワークでは、それはエラーバウンダリ用のコンポーネントラッパー、ナビゲーションスパン用のルーター統合、トレースヘッダーを HTML に注入するミドルウェア、そしてサーバー用のホストごとのプリロードを意味します。
Solid のランタイムはそれらのそれぞれをフックまたはチャネルとして公開しているため、アダプターは各プラットフォームで購読を行う 1 つの `init()` です。
このガイドは、それらのフックの背後にある契約を説明します。何が、いつ、何とともに発火し、リスナーが何をしてよいかを扱います。

:::advanced[ツール作者向け]
既存のツールを有効にしたいアプリ作者は[オブザーバビリティ](/guides/observability)を参照してください。
このページはツールを作る人向けです。
:::

## アダプターの構成要素

| 必要なもの                                                            | Solid が提供するもの                                                                                 | ビルド   |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------- |
| バウンダリが捕捉したエラー（ブラウザ）                            | `solid-js` の `configureClientErrors`                                                        | すべて   |
| サーバーが処理した、あるいは処理に失敗したすべての失敗                       | `@solidjs/web` の `configureServerErrors`                                                    | すべて   |
| バウンダリの待機、サーバー関数の実行と呼び出し、フレームストリーム | `OBSERVE.records.subscribe(type, listener)`                                                    | observe |
| ユーザーインタラクション、ナビゲーション、ホールド、再実行                      | `solid-js/attribution` の `attribution.enable()` と `attribution.subscribe(type, listener)` | observe |
| ランタイムの検出結果（Issue として）                                    | `OBSERVE.diagnostics.subscribe(listener)`                                                      | observe |
| リクエスト上のトレース id（ブラウザへ運ばれる）               | `OBSERVE.server.trace.provide(provider)`                                                       | observe |
| 自分の UI をデータの外に保つ                                    | `OBSERVE.exclude(owner)`                                                                       | observe |

インポートは `solid-js` と `@solidjs/web` からのみ行います。
どちらのパッケージもアプリが選んだビルドに解決されるため、アダプターはアプリと同じ `OBSERVE` を見ます。下層にあるエンジン `@solidjs/signals` は公開サーフェスではありません。

## エラー: オブジェクトごとに 1 回、フックのみから

両方のフックは、ランタイムがそのエラーオブジェクトに最初に出会ったときに、オブジェクトごとに 1 回だけ呼ばれます。
クライアントフックはエラーバウンダリがフォールバックをレンダリングしたときに発火します。未捕捉のエラーはリアクティブシステムを停止させて `reportError` に届き、これはグローバルハンドラーがすでにカバーしているため、フックはそれを繰り返しません。
サーバーフックはサーバーランタイムが処理する、あるいは処理に失敗するすべての失敗で発火します。コンテキストの `kind` と `handling` がどちらかを示し、[オブザーバビリティ](/guides/observability#hear-every-failure-the-server-handles)に一覧表があります。

両方のコンテキストは、エラーが投げられた場所 `ownerPath` と捕捉された場所 `boundaryPath` を、ルートから順のラベル配列として持ちます。
グループ化には結合し、表示には分けたまま使います。

エラーフックは、アダプターが例外をキャプチャする唯一の場所です。
下記のレコードは、失敗した呼び出しやコールの横に同じエラーオブジェクトを載せます。1 つのオブジェクトを 2 つのリスナーに渡すランタイムは二重報告を招きます。SDK が持つ「オブジェクトごとに 1 回」のガードは先に実行されたリスナーが取り、その順序はあなたのものではなくランタイムのものです。
スパンへのステータス設定はレコードから、キャプチャはフックから行います。

サーバーでは、戻り値がクライアントの受け取るものを置き換えます。
これを提供するアダプター — ユーザーが提示できる参照 — は、元のエラーから何もワイヤーを越えないという約束を引き受けます。提供しないアダプターは何も返しません。

## レコード: 確定済み・シリアライズ可能・ランタイム内で配送

`OBSERVE.records` は 4 つのレコード型を配送します。詳しくは[オブザーバビリティ](/guides/observability#see-what-the-runtime-did)を参照してください。
スパンビルダーを形作る契約は次のとおりです:

- レコードは受け取った時点で完成しています。`at` は `performance.now()` 時計上の値で、継続時間はミリ秒です。
  スパンは事後に、明示的な開始と終了で構築します: `epochSeconds = (performance.timeOrigin + at) / 1000`。
- レコードはプレーンなデータです。
  生きているもの — リクエスト、レスポンス、引数、結果、投げられたままのエラー — は第 2 引数 `live` であり、プロセス内に留まります。
- リスナーはランタイム内で同期的に実行されます。
  シグナルを書き込んではいけません。スパン作成はマイクロタスクに遅らせ、SDK 自身の簿記が Solid のフラッシュ内で実行されないようにします。
  例外を投げたリスナーはコンソールに報告され、他のリスナーは止まりません。
- サーバーのレコードはリクエスト中に配送されるため、アクティブスパンがリクエストである Node SDK は、親を引き回すものなしでそれらを子にできます。
- クライアントの `"call"` とそれが引き起こしたサーバーの `"invocation"` は `id` を共有します。
  バウンダリのレンダーパス中に行われた呼び出しは `boundary` を持ち、それはそのバウンダリのレコードの `id` です。

```ts
import { OBSERVE } from "solid-js";

const unsubscribe = OBSERVE?.records.subscribe("invocation", (event, live) => {
	queueMicrotask(() => {
		const span = startSpan({
			name: event.id,
			startTime: (performance.timeOrigin + event.at) / 1000,
			attributes: { direct: event.direct, outcome: event.outcome },
		});
		if (event.outcome === "error") span.setStatus("error");
		span.end((performance.timeOrigin + event.at + event.durationMs) / 1000);
	});
	void live;
});
```

チャネルはプロセスごとに 1 つ、登録済みシンボルの下に存在します。
アプリのランタイムが読み込まれる前に購読しても、その購読はレコードを受け取ります。コアの 2 つ目のバンドルされたコピーから購読しても、同じリスナーセットに届きます。
返される `unsubscribe` は保持してください。2 回初期化される SDK（テストやホットリロード）は、購読を積み上げるのではなく以前の購読を破棄すべきです。

## 属性付け: 書き込みの背後にあるインタラクション

属性付けエンジンは別エントリーの `solid-js/attribution` で、`OBSERVE.attribution` にインストールされ、独自の `subscribe` を通じてレコードを配送します。
最初に `enable()` を呼びます。`disable()` はすべての購読を破棄します。

```ts
import { attribution } from "solid-js/attribution";

attribution.enable();

attribution.subscribe("interaction", (event) => {
	// event.holds and event.navigations are settled; event.origin is the identity below
});
attribution.subscribe("navigation", (event) => {});
attribution.subscribe("hold", (event) => {});
attribution.subscribe("rerun", (event) => {});
```

各レコードは確定したときに届きます。
インタラクションのレコードはすでにその `holds` と `navigations` を保持しているため、スパンツリーを構築するリスナーは子を親の前、または親の内側で受け取ります。どのインタラクションも実行しなかったナビゲーションやホールドは単独で届きます。
`"rerun"` レコードは 1 実行につき 1 件送るのではなく、インタラクションごとのホットリストに畳み込みます。再実行の `nodeId` はノードではなく数値です。

レコードは時間ではなく同一性で結合します。
インタラクションの `origin` オブジェクトは、ランタイムがそのインタラクションのハンドラー下で行われたクライアント `"call"` レコード、およびそれが引き起こしたホールドとナビゲーションに押すスタンプと同じオブジェクトです。
origin からスパンへの `WeakMap` を持てば、コールは時計比較なしで親を見つけられます。
スタンプはディスパッチ時に読まれます。ハンドラー内で同期的に行われたコールは、レスポンスがインタラクション確定後に届いてもスタンプを持ちます。これは `onClick={async () => set(await call())}` の通常の形です。ハンドラー内で `await` の後に行われたコールは何も持ちません。これはそこでの書き込みと同じ抜け道です。

ルーターは `OBSERVE.attribution.withOrigin` でナビゲーションをエンジンに宣言するため、ナビゲーションレコードはマッチしたルートパターンを `name` として持ちます。アダプターにルーターのコードは不要です。

## トレースコンテキスト: 1 回答えれば、ランタイムが運ぶ

サーバーでは、プロバイダーをインストールすると、ランタイムがリクエストごとに 1 回それに問い合わせます:

```ts
import { OBSERVE } from "solid-js";

OBSERVE?.server.trace.provide((request) => {
	const span = activeSpan();
	if (!span) return undefined;
	return {
		traceId: span.traceId,
		spanId: span.spanId,
		parentId: span.spanId,
		sampled: true,
		entries: {
			"my-trace": `${span.traceId}-${span.spanId}`,
			"my-baggage": baggageFor(span),
		},
	};
});
```

返したフィールドはランタイムの導出を置き換えます。`entries` はランタイムの `traceparent` に名前でマージされ、`undefined` は導出をそのまま残します。
ランタイムはすべてのエントリーを、すべてのレスポンスの `Server-Timing` ヘッダーと HTML シェルの head 内の `<meta name content>` タグとして出力します。これによりブラウザ SDK のページロードは、すでにパースしているドキュメントからサーバーのトレースを継続でき、`<head>` のないフレームストリームやサーバー関数レスポンスはヘッダー経由で結合されます。
SDK がランタイムとは異なるヘッダーから継続する場合は `parentId` を設定します。ブラウザは 2 つ送ることがあり、プロバイダーがあなたの側の解釈を優先させる場所です。

## 診断: スパンではなく Issue

`OBSERVE.diagnostics.subscribe(listener)` はランタイムの検出結果を配送します。何にも示されなかったホールド（`SILENT_HOLD`）、頻繁に再実行されるスコープ（`HOT_SCOPE_RERUNS`）、依存リクエストのウォーターフォール（`ASYNC_WATERFALL`）、サーバーが受け止めたレンダーエラー（`SSR_RENDER_ERROR_CONTAINED`）です。
検出結果は安定した同一性を持ち再発するため、Issue です。`code` と `ownerPath` でフィンガープリントし、カウントを増やしていきます。
重要度はランタイムのもので、`info`・`warn`・`error` です。`info` の検出結果はどのビルドでもコンソールに届かないため、転送するかどうかはアダプターが決めます。
サーバーのレンダーエラー検出結果の `data.error` は投げられたままのエラーです。エラーフックがすでにキャプチャしています。

## アダプターを自身のデータの外に保つ

監視対象のアプリ内でレンダリングするアダプターは、自身のエフェクト・ストア・ホールドをアプリの検出結果として報告してしまいます。
ルートを作成時にアダプター自身のものとしてマークします:

```ts
import { createRoot, getOwner, OBSERVE } from "solid-js";

createRoot(() => {
	OBSERVE?.exclude(getOwner()!);
	// the adapter's own signals, stores, effects
});
```

除外されたオーナーの下では、そのサブツリーについての診断は配送も報告もされず、エンジンはその計算の実行を記録しません。
その下で作成されたシグナルとストアは、書き込みがどこから来ても除外されたままです。そのため書き込みに `runWithOwner` は不要で、使ってもいけません。オーナー下での書き込みはオーナー付きスコープでの書き込みとなり、dev ビルドがそれを指摘します。

## observe ビルドに対してテストする

ユニットテストはバンドラーと同じ方法で `solid-js` と `@solidjs/web` を解決します。
デフォルトで `development` 条件を適用するテストランナーは dev ビルドを与えます。dev は observe の上位集合なので、そこでテストが通ってもアダプターが observe で動くことの証明にはなりません。
テストは明示的に observe アーティファクトに向け、両方のパッケージを 1 つのモジュールローダー内に保ってください。ランナーがネイティブに読み込む `@solidjs/signals` のコピーと、変換されて読み込まれるコピーがあると、それは 2 つの `OBSERVE` オブジェクトであり、アダプターが購読した方はアプリが書き込む方ではありません。

## まとめ

- `solid-js` と `@solidjs/web` からインポートします。どちらが見る `OBSERVE` もアプリのビルドが決めます。
- 例外のキャプチャはエラーフックのみから、スパンのステータス設定はレコードから行います。
- レコードは確定済みでシリアライズ可能、ランタイム内で同期的に配送されます。スパンは `at` と `durationMs` からマイクロタスクで構築し、`live` はプロセス内に留めます。
- コールとそのインタラクションは時間ではなく `origin` の同一性で結合します。ハンドラー内でディスパッチされたコールは、インタラクション確定後に届いてもそれを持ちます。
- `OBSERVE.server.trace.provide` にはリクエストごとに 1 回应答します。ランタイムがそのエントリーを `Server-Timing` と `<meta>` でブラウザへ運びます。
- 診断は `code` と `ownerPath` でフィンガープリントされた Issue として扱います。
- アダプター自身のルートを `OBSERVE.exclude` し、`unsubscribe` ハンドルを保持して再初期化時に破棄します。

## 次のステップ

- [オブザーバビリティ](/guides/observability): アプリ作者が有効にするものと、このページが依拠するエラー箇所とレコード型の一覧表。
- [`OBSERVE` リファレンス](/reference/solid-js/advanced/diagnostics-dev-hooks/observe): すべてのレコードフィールドとチャネルメソッド。
- [属性付けリファレンス](/reference/solid-js/advanced/diagnostics-dev-hooks/attribution): インタラクション・ナビゲーション・ホールド・再実行レコードの形。
- [リアクティビティのデバッグ](/guides/debugging-reactivity): 診断コードとそれぞれの意味。
