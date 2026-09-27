---
title: "OBSERVE"
category: "高度なトピック / 診断と Dev フック"
use_cases: "高度な診断と dev フック api、observe の使い方"
tags:
  - "observe"
  - "advanced"
  - "diagnostics"
  - "dev"
  - "hooks"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "observe 層の配線です: レコードチャネル、診断チャネル、アトリビューションスロット。サーバーではこれに加えてバウンダリチャネルとトレースプロバイダースロットがあります。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/solid/src/index.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

observe 層の配線です: レコードチャネル、診断チャネル、アトリビューションスロット。サーバーではこれに加えてバウンダリチャネルとトレースプロバイダースロットがあります。プロダクションビルドでは `undefined`、observe ビルドと dev ビルドではオブジェクトです。

## インポート

```ts
import { OBSERVE } from "solid-js";
```

## 型シグネチャ

```ts
const OBSERVE: Observe | undefined;
```

## 関連項目

- [オブザーバビリティ](/docs/guides/observability.md)
- [オブザーバビリティアダプターの構築](/docs/guides/observability-adapters.md)
- [リアクティビティのデバッグ](/docs/guides/debugging-reactivity.md)

## 関連する型

### `AttributionSlot`

アトリビューションにおけるコア側の要素です: エンジンがインストールされる
フックスロットと、レンダリングランタイムがイベントディスパッチを包んで開く
インタラクションフレーム。エンジン本体――「なぜこれが実行されたか」、
コスト、ホールド、フィードバック――は `@solidjs/signals/attribution` に
あります。別エントリーなので、observe ビルドは何かがそれをインポートした
ときだけそのコストを負担します。

```ts
interface AttributionSlot {
  install(hooks: AttributionHooks | null): void;
  readonly installed: AttributionHooks | null;
  withInteraction<T>(ref: InteractionRef, fn: () => T): T;
  withOrigin<T>(ref: OriginRef, fn: () => T): T;
  currentOrigin(): ChangeOrigin | undefined;
};
```

#### `install`

- **型:** `void`

`hooks` を、コアが事実を報告する先のエンジンとしてインストールします
（`null` でアンインストール）。エンジンは一度に1つです。組み込みエンジンの
`enable()` がこれを呼び出し、外部コンシューマー（devtools）が代わりに
独自のものをインストールすることもあります。

#### `installed`

- **型:** `AttributionHooks | null`

インストールされているエンジンのフックです。何もインストールされていなければ `null` です。

#### `withInteraction`

- **型:** `T`

`fn` をユーザーインタラクションのハンドラーとして実行します: 内部での
ルート書き込みはそれをオリジンとして刻印され、そこから起きる
アクション・エフェクト・フライトもそれを引き継ぎます。web ランタイムは
すべてのイベントディスパッチをこれで包みます。カスタムレンダラーや
テストハーネスは自分で呼び出します。エンジンがインストールされてい
なければ単に `fn()` です。

#### `withOrigin`

- **型:** `T`

`fn` を宣言された作業単位――ルーターのナビゲーションで、マッチした
パラメーター化ルートによって記述されるもの――として実行します:
内部でのルート書き込みはそれに帰属し（外側にインタラクションがあれば
その配下で）、ルートのデータの背後にあるホールド、再実行、判定が
ルート名を引き継ぎます。任意のルーターがロケーション書き込みの周りで
これを呼びます。それ以外にルーター固有の点はありません。エンジンが
インストールされていなければ単に `fn()` です。

#### `currentOrigin`

- **型:** `ChangeOrigin | undefined`

今実行されたルート書き込みが刻印されるであろう出どころです――実行中の
ハンドラーを持つインタラクション、開いているナビゲーション・エフェクト・
アクションのフレーム、あるいは再計算内ならそれを引き起こした変更の
オリジン――を、インストールされたエンジンの視点で返します。エンジンが
ない場合、または何も有効でない場合（外部）は `undefined` です。エンジンの
レコードの隣に独自の事実を記録するランタイム向け: `@solidjs/web` は
自身の `"call"` レコードにこれを刻印するため、サーバー関数呼び出しは
時刻ではなくオブジェクトの同一性によって、それが実行された
インタラクションやナビゲーションに結び付きます。

### `BoundaryEvent`

サーバーレンダー中に待機（WAITED）した1つの `<Loading>` バウンダリです――
保留中の非同期とともに発見され、その後確定しました。確定した時点で、
`<Reveal>` グループがそのスワップを保留していた場合は公開された時点でも、
`OBSERVE.records.subscribe("boundary", …)` に配信されます。最初のパスで
コンテンツがレンダーされたバウンダリは何も出力しません: 帰属させる待機が
なかったためです。これはクライアントの `hold` レコードと同じルールです。

```ts
interface BoundaryEvent {
  id: string;
  at: number;
  durationMs: number;
  heldMs: number;
  passes: number;
  outcome: "settled" | "fallback" | "client" | "error";
  streamed: boolean;
  revealGroup?: string;
  ownerPath?: string[];
};
```

#### `id`

- **型:** `string`

バウンダリのハイドレーション id です――`SSR_RENDER_ERROR_CONTAINED` が
`data.boundary` で名指す id であり、`<template id="pl-…">` プレースホルダーの
id でもあります。

#### `at`

- **型:** `number`

発見時点の `performance.now()` です: 最初のレンダーパスが始まった時刻です。

#### `durationMs`

- **型:** `number`

発見から確定までのミリ秒です: 最初のレンダーパスから、コンテンツが完成
する（`"settled"`）か、サーバーがそれを生成しないと判断される
（その他の結果）までです。

#### `heldMs`

- **型:** `number`

確定から公開までです: `<Reveal>` グループが兄弟のために完成したコンテンツを
どれだけ保留したか（`order="together"`、順次処理の末尾）。バウンダリの確定と
同時にスワップが発行された場合は `0` で、グループ外のすべてのバウンダリも
これに含まれます。

#### `passes`

- **型:** `number`

バウンダリのコンテンツに対するレンダーパスの回数です: 発見パスに加えて
待機ごとに1回。`2` なら非同期が1ラウンドです。それより多い場合は順次
チェーン――前の結果に依存した読み取りがあることを意味します。

#### `outcome`

- **型:** `"settled" | "fallback" | "client" | "error"`

`"settled"` ―― コンテンツがサーバーでレンダーされ、スワップされました。
`"fallback"` ―― レンダラーに確定先のストリームがありませんでした
（`renderToString`、またはその配下で畳まれたスロット）: フォールバックが
最終形として配信され、クライアントがコンテンツをレンダーします。
`"client"` ―― コンテンツがクライアント専用です（`ssrSource: "client"`）:
クライアントがハイドレーション後にレンダーします。`"error"` ―― コンテンツが
スローしました。`live.error` がスローされた値そのもので、対になる
`SSR_RENDER_ERROR_CONTAINED` の検出結果がその発生場所を示します。

#### `streamed`

- **型:** `boolean`

結果がシェルのフラッシュ後にクライアントへ届いた場合は `true` です――
ユーザーはフォールバックを見てからスワップを見ます。バウンダリがシェルに
インラインするのに間に合うほど早く確定した場合（あるいはストリーミング
自体がなかった場合）は `false` です。

#### `revealGroup`

- **型:** `string`

このバウンダリのスワップを調整する `<Reveal>` グループです（あれば）。

#### `ownerPath`

- **型:** `string[]`

診断と同様に、バウンダリを囲むコンポーネントラベルをルートから順に並べたものです。

### `BoundaryListener`

```ts
type BoundaryListener = (event: BoundaryEvent, live: BoundaryLive) => void;
```

### `BoundaryLive`

バウンダリレコードのライブ側です。

```ts
interface BoundaryLive {
  error?: unknown;
};
```

#### `error`

- **型:** `unknown`

`outcome` が `"error"` のとき、スローされた値です。

### `CallEvent`

ブラウザから行われた1回のサーバー関数呼び出しです――フェッチとその
デコードを、呼び出し側が await した形で表したもの――確定時点で
`OBSERVE.records.subscribe("call", …)` に配信されます。サーバーの
`"invocation"` レコードのクライアント側の双子です: 両者は `id` で
結合し（こちらは呼び出し、あちらはそれが引き起こした実行）、両者の
期間の差がワイヤー上の時間です。統合がローカルで応答した呼び出し
（ハンドラーの `intercept`、t = 0）はリクエストを発行しておらず、
何も出力しません。

```ts
interface CallEvent {
  id: string;
  at: number;
  durationMs: number;
  method: "GET" | "POST";
  outcome: "ok" | "error";
  status?: number;
  origin?: ChangeOrigin;
  deferred?: true;
};
```

#### `id`

- **型:** `string`

関数 id です――サーバーの `"invocation"` レコードが持つ `id` と同じものです。

#### `at`

- **型:** `number`

呼び出しが行われた時点の `performance.now()` です。

#### `durationMs`

- **型:** `number`

呼び出しから確定までのミリ秒です: リクエストの構築と送信、レスポンスの
受信とデコード（または設定された `responseHandler` による取得）――
呼び出し側が見た await の全体です。ストリーミング結果は引き渡し時点で
確定します――`deferred` を参照してください。

#### `method`

- **型:** `"GET" | "POST"`

GET エンコードされた読み取り（`GET(fn)`）の場合は `GET`、それ以外は `POST` です。

#### `outcome`

- **型:** `"ok" | "error"`

#### `status`

- **型:** `number`

レスポンスが到着した場合、その HTTP ステータスです。レスポンスが来る前に
呼び出しが失敗した場合（フェッチ自体が reject された場合）は存在しません。

#### `origin`

- **型:** `ChangeOrigin`

アトリビューションエンジン（`solid-js/attribution`）が有効で把握している
場合に、その呼び出しが何のために実行されたかを示します: それを行った
ハンドラーを持つインタラクション（`kind: "interaction"`）、それを必要とした
データを持つナビゲーション（`kind: "navigation"`、その `interaction` が
クリック）、エフェクトやアクションのステップ、再計算が再度呼び出した
非同期ランディング――エンジン自身のオリジンオブジェクトなので、同一性と
して `InteractionEvent.origin` / `NavigationEvent.origin` /
`HoldEvent.origin` そのものです。オブザーバーは時刻での結合なしに、
呼び出しをインタラクションのレコードの下に置けます。ディスパッチ時に
読み取られるため、ハンドラー内の `await` の後に行われた呼び出しは何も
刻印しません（そこでの書き込みと同じ抜け道です）。エンジンがなければ
存在しません。

#### `deferred`

- **型:** `true`

確定した値は呼び出し側が駆動するボディです――非同期イテラブル
（`live()` ソース、ジェネレーター結果など）――そのため `durationMs` は
それを生成した呼び出しを対象とし、その消費は含みません。

### `CallListener`

```ts
type CallListener = (event: CallEvent, live: CallLive) => void;
```

### `CallLive`

プロセス内コンシューマー向けの、呼び出しのライブ側です。`response` は
クローンではなくトランスポート自身のオブジェクトです: ステータスと
ヘッダーは読み取り可能で、ボディはデコード側のものです（すでに消費済みか、
ストリーミング結果なら呼び出し側が消費中です）。`error` は呼び出し側に
スローされた値そのものです――デコードされたサーバーエラー、または
トランスポート自体の失敗です。

```ts
interface CallLive {
  args: unknown[];
  response?: Response;
  result?: unknown;
  error?: unknown;
};
```

#### `args`

- **型:** `unknown[]`

#### `response`

- **型:** `Response`

#### `result`

- **型:** `unknown`

`outcome` が `"ok"` のとき、確定した値です。

#### `error`

- **型:** `unknown`

`outcome` が `"error"` のとき、スローされた値です。

### `DiagnosticCapture`

```ts
interface DiagnosticCapture {
  readonly events: readonly DiagnosticEvent[];
  clear(): void;
  stop(): DiagnosticEvent[];
};
```

#### `events`

- **型:** `readonly DiagnosticEvent[]`

#### `clear`

- **型:** `void`

#### `stop`

- **型:** `DiagnosticEvent[]`

### `DiagnosticCode`

```ts
type DiagnosticCode =
  | "STRICT_READ_UNTRACKED"
  | "PENDING_ASYNC_UNTRACKED_READ"
  | "PENDING_ASYNC_FORBIDDEN_SCOPE"
  | "REACTIVE_WRITE_IN_OWNED_SCOPE"
  | "ASYNC_STORE_SETTER"
  | "ACTION_CALLED_IN_OWNED_SCOPE"
  | "RUN_WITH_DISPOSED_OWNER"
  | "NO_OWNER_CLEANUP"
  | "CLEANUP_IN_FORBIDDEN_SCOPE"
  | "SETTLED_CLEANUP_UNOWNED"
  | "SETTLE_WALK_UNINITIALIZED_SOURCE"
  | "FLUSH_IN_EFFECT_CALLBACK"
  | "PRIMITIVE_IN_FORBIDDEN_SCOPE"
  | "NO_OWNER_EFFECT"
  | "NO_OWNER_BOUNDARY"
  | "ASYNC_OUTSIDE_LOADING_BOUNDARY"
  | "INVALID_REFRESH_TARGET"
  | "INVALID_AFFECTS_TARGET"
  | "MISSING_EFFECT_FN"
  | "SYNC_NODE_RECEIVED_ASYNC"
  | "REACTIVITY_HALTED"
  | "INVARIANT_VIOLATION"
  | "HUGE_FAN_OUT"
  | "HUGE_FAN_IN"
  | "HOT_SCOPE_RERUNS"
  | "HOT_SCOPE_TIME"
  | "WIDE_SCOPE_DEPS"
  | "UNSTABLE_MEMO_OUTPUT"
  | "WIDE_WRITE"
  | "ASYNC_WATERFALL"
  | "HOT_SCOPE_FANOUT"
  | "SILENT_HOLD"
  | "LONG_HOLD"
  | "EFFECT_WRITES_OWN_SOURCE"
  | "EFFECT_RELAY_TEAR"
  | "IMMUTABLE_UPDATE_IN_STORE"
  | "UNSTABLE_LIST_IDENTITY"
  // Server / SSR — emitted by the server runtimes (`solid-js`'s server
  // facade, `@solidjs/web`'s server entries) through `OBSERVE.diagnostics.emit`.
  | "SSR_RENDER_ERROR_CONTAINED"
  | "SSR_SUBTREE_ABANDONED"
  | "SSR_STREAM_ABANDONED"
  | "SSR_CLIENT_CONTENT_MASKED"
  | "LATE_HEADER_WRITE"
  | "SERVER_FN_ERROR_SANITIZED"
  | "SSR_ERROR_SANITIZED"
  | "SERVER_WRITE"
  | "REVEAL_IN_RENDER_TO_STRING"
  | "LAZY_ASSET_UNMAPPED"
  | "PRELOAD_DESCRIPTOR_INVALID"
  | "HEAD_TAG_INVALID"
  | "UNRECOGNIZED_INSERT_VALUE"
  | "BEHAVIOR_CLAIM_DROPPED"
  | "FRAME_MARKER_CORRUPTED";
```

### `DiagnosticEvent`

```ts
interface DiagnosticEvent {
  sequence: number;
  code: DiagnosticCode;
  kind: DiagnosticKind;
  severity: DiagnosticSeverity;
  message: string;
  ownerId?: string;
  ownerName?: string;
  nodeName?: string;
  ownerPath?: string[];
  data?: Record<string, unknown>;
};
```

#### `sequence`

- **型:** `number`

#### `code`

- **型:** `DiagnosticCode`

#### `kind`

- **型:** `DiagnosticKind`

#### `severity`

- **型:** `DiagnosticSeverity`

#### `message`

- **型:** `string`

#### `ownerId`

- **型:** `string`

#### `ownerName`

- **型:** `string`

#### `nodeName`

- **型:** `string`

#### `ownerPath`

- **型:** `string[]`

イベントの対象を囲む名前付きオーナーのチェーンをルートから順に並べた
ものです――コンポーネントルートは `<Name>`、計算は `name` オプション
（または `effect`/`computed` のデフォルト）で表されます。例:
`["<App>", "<TodoRow>", "effect"]`。名前のないオーナー（プレーンな
ルート）はスキップされます。対象に名前付きオーナーが1つもない場合
（トップレベルスコープ、またはオーナーのないプリミティブ――それ自体が
通常は検出結果です）は存在しません。

#### `data`

- **型:** `Record<string, unknown>`

### `DiagnosticKind`

```ts
type DiagnosticKind =
  | "strict-read"
  | "async"
  | "write"
  | "lifecycle"
  | "owner"
  | "error"
  | "perf"
  | "graph"
  | "responsiveness"
  | "ssr"
  | "head"
  | "render";
```

### `DiagnosticListener`

```ts
type DiagnosticListener = (event: DiagnosticEvent) => void;
```

### `Diagnostics`

```ts
interface Diagnostics {
  subscribe(listener: DiagnosticListener): () => void;
  capture(): DiagnosticCapture;
  emit(
    event: Omit<DiagnosticEvent, "sequence">,
    subject?: DiagnosticSubject | null
  ): DiagnosticEvent;
};
```

#### `subscribe`

- **型:** `() => void`

#### `capture`

- **型:** `DiagnosticCapture`

#### `emit`

- **型:** `DiagnosticEvent`

リアクティブコアの外部からチャネルにイベントを記録します――ホスト
ランタイムが独自の検出結果（ハイドレーションミスマッチ、サーバーレンダーの
障害）を報告し、コンシューマーが1つのストリームとして見られるように
します。`subject` は内部の発行箇所と同じように位置付けます。オーナーが
signals のオーナーではないホストは、代わりにイベントに `ownerPath` を
渡し、それがそのまま使われます。

### `DiagnosticSeverity`

`info` は助言レベルです: 表示する価値のある構造的な事実で、バグと
断定はできないものです（例: 2段の順次フェッチチェーン――本質的な
データ依存かもしれません）。バジェット/アサーション系のコンシューマーは、
`info` にオプトインしない限り `warn`/`error` のみを失敗として
扱うべきです。

```ts
type DiagnosticSeverity = "info" | "warn" | "error";
```

### `DiagnosticSubject`

診断の対象になりうるあらゆるものです: オーナー（ルート、computed、エフェクト）またはシグナルです。

```ts
type DiagnosticSubject = Owner | Signal<any> | Computed<any>;
```

### `FrameAppliedEvent`

`"frame"` レコードのクライアント側です: 適用された1つのフレーム
ストリーム――フレームストリームレスポンスがフレームホスト
（`applyFrameResponse`）にチャンクごとに読み込まれ、`start` から
`complete` まで――ストリーム終了時に配信されます。シングルフライト
レスポンスはリフレッシュしたフレームごとに1つのストリームを運び、
それぞれがサーバーと同様に独立したレコードです。

```ts
interface FrameAppliedEvent extends FrameEventBase {
  side: "client";
  address?: string;
  outcome: "complete" | "truncated" | "error";
};
```

#### `side`

- **型:** `"client"`

#### `address`

- **型:** `string`

コンシューマーがプロデューサーのルート id を自身のバウンダリに
マッピングし直した場合に、チャンクが適用されるローカル id です
（`applyFrameResponse` の `as`――サーバーコンポーネントトランスポート
における呼び出しのアドレス）。ワイヤー上の id で適用された場合は
存在しません。

#### `outcome`

- **型:** `"complete" | "truncated" | "error"`

`complete` ―― `complete` チャンクが到着しました。`truncated` ―― その前に
ボディが終わりました（接続が切れた、プロデューサーがストリームを放棄
した）。`error` ―― 読み取りに失敗しました（不正なチャンク、ボディ
エラー）。失敗内容は `live.error` に入ります。

### `FrameEvent`

どちらかの端が観測した1つのフレームストリームです――
`OBSERVE.records.subscribe("frame", …)` に配信され、`side` が
どちら側かを示します。両側は同じ形を共有します（同じセンサス、それぞれの
立場で測定した同じタイミング）。コンシューマーは `id` と `version` で
結合し、その差がワイヤー上の時間です。

```ts
type FrameEvent = FrameProducedEvent | FrameAppliedEvent;
```

### `FrameListener`

```ts
type FrameListener = (event: FrameEvent, live: FrameLive) => void;
```

### `FrameLive`

フレームレコードのライブ側です。

```ts
interface FrameLive {
  error?: unknown;
  response?: Response;
};
```

#### `error`

- **型:** `unknown`

スローされた値です: サーバーの同期失敗、またはクライアントの読み取り失敗です。

#### `response`

- **型:** `Response`

クライアントのみ: ストリームが読み込まれたレスポンスです。

### `FrameProducedEvent`

`"frame"` レコードのサーバー側です: 生成された1つのフレームストリーム――
サーバーコンポーネントがフレームトランスポート
（`renderServerComponent` / `renderToFrameStream`）にレンダーされ、
`start` チャンクから `complete` まで――完了時に配信されます。

```ts
interface FrameProducedEvent extends FrameEventBase {
  side: "server";
  outcome: "complete" | "error";
};
```

#### `side`

- **型:** `"server"`

#### `outcome`

- **型:** `"complete" | "error"`

`complete` ―― レンダーが最後まで実行されました（フラグメントの失敗が
あれば `errors` に入ります）。`error` ―― レンダーが同期的にスローし、
ストリームはその失敗だけを内容として運んで完了しました。

### `HostRecordTypes`

ホストランタイムが宣言するレコード型です――`RecordTypes` を参照してください。

```ts
interface HostRecordTypes {};
```

### `InvocationEvent`

1回のサーバー関数実行です。確定時点で
`OBSERVE.records.subscribe("invocation", …)` に配信されます。
シリアライズ可能です――ライブハンドル（`event`、`args`、スローされた
エラー）はレコード自体ではなく `InvocationLive` 内を並行して移動します。

```ts
interface InvocationEvent {
  id: string;
  direct: boolean;
  at: number;
  durationMs: number;
  outcome: "ok" | "error";
  deferred?: true;
  boundary?: string;
};
```

#### `id`

- **型:** `string`

関数 id です――スパンやログ行が持つ名前です。

#### `direct`

- **型:** `boolean`

SSR 中のプロセス内呼び出しでは `true`、HTTP ディスパッチでは `false` です。

#### `at`

- **型:** `number`

実行が開始された時点の `performance.now()` です。

#### `durationMs`

- **型:** `number`

実行の開始から確定までのミリ秒です。この実行は `wrapInvocation` で
ラップされた実行です: リクエストが呼び出しに費やした時間で、ポリシー
（認証ガード、関数ごとのミドルウェア）も含みます。ジェネレーターや
ストリームボディは引き渡し時点で確定します――`deferred` を参照して
ください。

#### `outcome`

- **型:** `"ok" | "error"`

#### `deferred`

- **型:** `true`

確定した値は呼び出し側が駆動するボディです――ジェネレーター、
`ReadableStream` など――そのため `durationMs` はそれを生成した
呼び出しを対象とし、その消費は含みません。

#### `boundary`

- **型:** `string`

直接呼び出しのみ: 呼び出しを行ったレンダーパスを持つ `<Loading>`
バウンダリのハイドレーション id です――そのバウンダリの `"boundary"`
レコードの `id`――これによりバウンダリの待機を、それを構成した
サーバー関数呼び出し群として読み取れます。バウンダリのパス外での
呼び出し（シェルや HTTP ディスパッチ）では存在しません。

### `InvocationListener`

```ts
type InvocationListener = (event: InvocationEvent, live: InvocationLive) => void;
```

### `InvocationLive`

プロセス内コンシューマー向けの、実行のライブ側です。レコードの一部では
ありません: `args` と `result` はアプリケーションデータ（名前・PII の
ポリシーはコンシューマーが管理）、`error` はスローされた値そのもの
（HTTP ハンドラーのプロダクション用サニタイズがワイヤー上で置き換える
前の値）、`event` は呼び出しが実行されたリクエストイベント（直接
呼び出しでは呼び出しごとの派生イベント）です。

```ts
interface InvocationLive {
  event: RequestEvent;
  request?: Request;
  args: unknown[];
  result?: unknown;
  error?: unknown;
};
```

#### `event`

- **型:** `RequestEvent`

#### `request`

- **型:** `Request`

HTTP ディスパッチのみです。直接呼び出しでは存在しません。

#### `args`

- **型:** `unknown[]`

#### `result`

- **型:** `unknown`

`outcome` が `"ok"` のとき、確定した値です。

#### `error`

- **型:** `unknown`

`outcome` が `"error"` のとき、スローされた値です。

### `Observe`

observe 層です: 構造化チャネルとアトリビューション配線――プロダクションの
オブザーバビリティコンシューマーが必要とするすべてを含み、コンソールの
前に開発者がいることを前提とするものは含みません。dev ビルドと observe
ビルド（`__OBSERVE__`）に存在し、prod では `undefined` です。

```ts
interface Observe {
  diagnostics: Diagnostics;
  records: Records;
  attribution: AttributionSlot;
  server: ServerObserve;
  subjectOf(record: DiagnosticEvent | RerunEvent): DiagnosticSubject | undefined;
  exclude(owner: Owner): void;
  isExcluded(subject: DiagnosticSubject | null | undefined): boolean;
};
```

#### `diagnostics`

- **型:** `Diagnostics`

#### `records`

- **型:** `Records`

ランタイムからの完了済みレコードを種類別にしたものです――`Records` を参照してください。

#### `attribution`

- **型:** `AttributionSlot`

アトリビューションのフックスロットとインタラクションフレームです――`AttributionSlot` を参照してください。

#### `server`

- **型:** `ServerObserve`

サーバーランタイムの提供面です――`ServerObserve` を参照してください。

#### `subjectOf`

- **型:** `DiagnosticSubject | undefined`

発行側が把握している場合に、発行されたレコードが関するライブノードです。
レコードはシリアライズ可能でノードを決して持たず――診断イベントは
`ownerPath`/`nodeName` で対象を名指し、再実行レコードは `nodeId` で
名指します――そのためプロセス内で動くコンシューマー（devtools、
コンソールレポーター、`attribution.subscriptions(OBSERVE.subjectOf(run))`）
はここでノードを引きます。`DiagnosticEvent` とアトリビューション
エンジンの `RerunEvent` に答えます。それ以外、およびプロセスを出て
戻ってきたレコードには `undefined` です。

#### `exclude`

- **型:** `void`

`owner` のサブツリーをオブザーバー自身のものとしてマークします。監視
対象のアプリ内でレンダーするコンシューマー――APM アダプターのパネル、
devtools――は、そうしなければ自身のエフェクト・ストア・ホールドが
アプリに関する検出結果として報告されるのを目にすることになります。
除外されたオーナーの配下では: 対象がそのサブツリー内にある診断は
配信も報告もされず（エントリー自体は構築されるため、メッセージを
スローする箇所はやはりスローします）、アトリビューションエンジンは
その計算の実行を記録しません。ルートは作成時にマークします
（`createRoot(() => { OBSERVE.exclude(getOwner()!); … })`）。その配下で
作成されたシグナルやストアは、書き込みの発生元（クリックハンドラー、
アダプターコールバックなど）に関係なく除外対象となるため、書き込みに
`runWithOwner` は不要です――使ってはいけません: オーナー配下での
書き込みはオーナー付きスコープでの書き込みです
（REACTIVE_WRITE_IN_OWNED_SCOPE）。オーナーの存続期間中、取り消しは
できません。

#### `isExcluded`

- **型:** `boolean`

`subject` が除外されたオーナーの配下にあるかどうかです（そのオーナー自身を含む）。

### `RecordEvent`

```ts
type RecordEvent<K extends RecordType> = RecordTypes[K] extends { event: infer E }
  ? E
  : never;
```

### `RecordListener`

```ts
type RecordListener<K extends RecordType> = (
  event: RecordEvent<K>,
  live: RecordLive<K>
) => void;
```

### `RecordLive`

```ts
type RecordLive<K extends RecordType> = RecordTypes[K] extends { live: infer L } ? L : never;
```

### `Records`

レコードチャネルです――`OBSERVE.records`。どちらのプラットフォームでも
同じです: コンシューマー（APM アダプターの `init()`、devtools、診断
ハーネス）が、ランタイムが行ったことの完了済みでシリアライズ可能な
要約――サーバーで待機した `<Loading>` バウンダリ、サーバー関数の実行や
呼び出し、生成・適用されたフレームストリーム――を購読する唯一の場所
です。各レコードは完了した瞬間に同期的に配信され、そのライブハンドルは
レコードの隣に渡されます。リスナーはいくつでも登録でき、観測対象を
変更することはできません。スローしたリスナーは報告され、残りは実行
されます。（リアクティブなアトリビューション――再実行、ホールド、
インタラクション――はアトリビューションエンジンの `subscribe` であり、
インポートされたときだけ observe ビルドがコストを負担する別エントリー
です。）

このオブジェクトは登録済みシンボルの下でプロセスごとに一度だけ作成
されます。そのため、発行側ランタイムが読み込まれる前に行われた購読や、
コアの2つ目のバンドルコピーからの購読も、同じリスナー集合に届きます。
prod では `OBSERVE` の他の部分とともに存在しません。

```ts
interface Records {
  subscribe<K extends RecordType>(type: K, listener: RecordListener<K>): () => void;
  observed(type: RecordType): boolean;
  emit<K extends RecordType>(type: K, event: RecordEvent<K>, live: RecordLive<K>): void;
};
```

#### `subscribe`

- **型:** `() => void`

`type` のレコードを完了と同時に配信します。購読解除関数を返します。

#### `observed`

- **型:** `boolean`

`type` に何かが購読しているかどうかです――発行側の事前チェック用で、
誰も聞かないレコードは構築しないコストもゼロにできます（クロック
読み取りもなし）。

#### `emit`

- **型:** `void`

完了したレコードを `type` のリスナーに同期的に配信します: ランタイムの
公開方法です。スナップショットイテレーションのため、配信中に購読解除
したリスナーがいても、その回で誰かがスキップされたり二重呼び出し
されたりしません。

### `RecordType`

```ts
type RecordType = keyof RecordTypes & string;
```

### `RecordTypes`

ランタイムが `OBSERVE.records` に配信するレコードを種類別にしたもの
です――各エントリーは `{ event, live }`: シリアライズ可能なレコードと、
プロセス内コンシューマーがその隣に欲しがるライブハンドル（スローされた
エラー、リクエストなど）です。コアは何も発行せず宣言もしません。発行する
ランタイムがインターフェース拡張（augmentation）で各自のものを宣言し、
レコード型のユニオンは読み込まれたランタイムが宣言したものになります。
`solid-js` はこのインターフェース自体を拡張します（その `"boundary"`
レコード）。その上位のランタイム――`@solidjs/web` の `"invocation"`、
`"frame"`、`"call"`、ルーターなど――は `HostRecordTypes` を拡張します。
`HostRecordTypes` には `solid-js` の再エクスポート経由で到達し、この
インターフェースがそれを継承するため、チャネルは1つのカタログを見ます。

2つのインターフェースにそれぞれ1つの拡張者という設計です: TypeScript は
エイリアスをたどって再エクスポートされたインターフェースに拡張を
マージしますが、異なるエイリアス経由（solid-js からの `"@solidjs/signals"`、
web からの `"solid-js"`）で同じインターフェースに届く2つの拡張は順序
依存でマージされ、一方のセットが失われます。そのため各レイヤーは
1つのモジュール名を通じて、自分専用のインターフェースを拡張します。

```ts
interface RecordTypes extends HostRecordTypes {};
```

### `ServerObserve`

サーバーランタイムの observe 提供面です――サーバー側コンシューマーが、
サーバーにしか存在しないもの（トレースコンテキストのプロバイダー
スロット）をインストールする場所です。ここでは空で宣言され、提供面を
所有するランタイムが型付けします: `solid-js` のサーバーエントリーは
このインターフェースを `trace: ServerTrace` で拡張し、それは
`@solidjs/web` のサーバーエントリーが（`provide` で）埋める独自
インターフェースです――これによりコアはその形を知る必要がなく、
それでもコンシューマーは1つの `OBSERVE` 上でそれを見つけられます。
インターフェースごとに拡張者は1つです: 理由は `RecordTypes` を参照して
ください。

その背後にあるオブジェクトもコアのものではありません: コアは両
プラットフォーム向けに層ごとに1つの成果物を持ち、クライアントはそれを
無駄に抱えることになります。`solid-js` のサーバーエントリーは評価された
瞬間にこの空リテラルをプロセス全体のスロットで置き換えます
（solid-js/src/server/observe.ts の `serverSlots` を参照）。そのため
`solid-js` だけをインポートするコンシューマーは、それを読み取る web
ランタイムが読み込まれる前に provide でき、ホストが1つにバンドルする
場合は2つ目のコピーからでも行えます。クライアントではこれは `{}` の
ままです。

```ts
interface ServerObserve {};
```

### `ServerTrace`

トレースプロバイダースロットです――`OBSERVE.server.trace`。コンテナは
このランタイムのものです（差し替え可能な単一プロバイダー、
`serverSlots` を参照）。プロバイダーとは何か――その引数、その応答――は
web ランタイムのもので、このインターフェースを `provide` で拡張します
（`@solidjs/web` の `TraceSlot`）。そのランタイムが型付けする場所を
1つにするため、ここでは空で宣言されています。

```ts
interface ServerTrace {};
```
