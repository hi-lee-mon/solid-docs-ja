---
title: "型"
version: "2.0"
description: "Solid Router 2 がエクスポートするアプリケーション向け型の一覧。"
source_repo: "solidjs/solid-router"
source_ref: "next"
source_path: "src/index.tsx"
---

特に別のエントリーが示されていない限り、これらの型は `@solidjs/router` からインポートします。

```ts
import type {
	Location,
	NavigateOptions,
	RouteDefinition,
	RouteProps,
	RouterInstance,
} from "@solidjs/router";
```

## ルーターファクトリー

- `RouterConfig<R>` は `createRouter` のオプションオブジェクトです。
- `RouterInstance<R>` は `paths`、`routes`、`config`、`match` を持つプロバイダーコンポーネントです。
- `RouterProps` はサーバー専用の `url` とルートのレンダープロップ `children` を含みます。
- `DefinedRoute<S, T, F, C, Sch>` は `defineRoute` の保持される戻り値の型です。

シグネチャは[ルーターファクトリー](/reference/solid-router/router-factory)を参照してください。

## ルート定義

- `RouteDefinition<S, T>` はルート設定オブジェクトを表します。
- `RoutePreloadFunc<T, P>` はルートプリロード関数です。
- `RoutePreloadFuncArgs<P>` は `params`、`location`、`intent` を含みます。
- `RouteSectionProps<T, P>` はルートコンポーネントの props を含みます。
- `RouteProps<Path, T>` はパスウィットネスからルートの props を導出します。
- `RouteComponent<Path, T>` はパスウィットネスから型付けされたコンポーネントです。
- `RouteParams<S>` はパスパターンから実行時パラメータ文字列を導出します。
- `RouteInfo` は拡張可能なルートメタデータインターフェースです。
- `RouteDescription` は `RouteMatch` を通じて公開されるコンパイル済みルート記述です。
- `RouteMatch` はコンパイル済みルート記述とマッチしたパス・パラメータを組み合わせます。
- `OutputMatch` は `Router.match(url)` の 1 件の結果です。

```ts
interface PathMatch<P extends Params = Params> {
	params: P;
	path: string;
}

interface RouteMatch extends PathMatch {
	route: RouteDescription;
}

interface OutputMatch {
	path: string;
	pattern: string;
	match: string;
	params: Params;
	info?: RouteInfo;
}
```

## パスとフィルター

- `Params` は `Record<string, string | undefined>` です。
- `SetParams` はキーごとに string、number、boolean、null、undefined の値を受け取ります。
- `MatchFilter` は文字列配列、正規表現、または述語です。
- `MatchFilters<P>` はルートパラメータ名をマッチフィルターにマッピングします。
- `TypedMatchFilter<T>` は実行時フィルターにパスビルダーの入力型を載せます。
- `TypedPath<P>` はシリアライズ可能なパスノードのインターフェースです。
- `RoutePaths<R>` はリテラルなルートタプルからルーターのパスプロキシを導出します。
- `PathEnd<Sch, P>` は終端の型付きパスノードです。
- `PathParamsOf<N>` はパスノードから実行時パラメータレコードを抽出します。

```ts
type Params = Record<string, string | undefined>;

type MatchFilter = readonly string[] | RegExp | ((value: string) => boolean);
```

## 検索パラメータ

- `SearchParams` はキーごとに生の文字列、文字列配列、または undefined の値を含みます。
- `SetSearchParams` はキーごとに string、number、boolean、それらの配列、null、undefined を受け取ります。
- `TypedSearchPath<In, Out>` はルートの検索入力型と出力型を保持します。
- `DefaultSearchTypes` は入力に `SetSearchParams`、出力に `SearchParams` を使用します。
- `StandardSchemaV1<Input, Output>` はルートの `search` が受け入れるバリデーター契約です。

```ts
interface StandardSchemaV1<Input = unknown, Output = Input> {
	readonly "~standard": {
		readonly version: 1;
		readonly vendor: string;
		readonly validate: (
			value: unknown
		) => StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>;
		readonly types?: {
			readonly input: Input;
			readonly output: Output;
		};
	};
}
```

Solid Router は共有型では Standard Schema の Promise を受け入れますが、`useSearchParams(path)` は実行時に非同期の検証結果を拒否します。

## ロケーションとナビゲーション

- `Location<S>` は `useLocation` が読み取るリアクティブなロケーションです。
- `LocationChange<S>` は履歴アダプターへの書き込みです。
- `NavigateOptions<S>` は解決・置換・スクロール・状態を設定します。
- `Navigator` は `useNavigate` が返します。
- `PathMatch<P>` は `useMatch` が返します。
- `LinkState` は `useLinkState` が返します。
- `BeforeLeaveEventArgs` は `useBeforeLeave` に渡されます。

シグネチャは[ナビゲーションプリミティブ](/reference/solid-router/navigation)を参照してください。

## 履歴統合

- `RouterHistory` は履歴アダプターの契約です。
- `MemoryHistoryAdapter` は `RouterHistory` を `go`、`back`、`forward`、`listen` で拡張します。
- `RouterIntegration` はルーターコアが使用するシグナルとユーティリティの契約です。
- `RouterUtils` はオプションの履歴レンダリング・パース・走査・離脱ガード・パラメータ・クエリアダプターを含みます。

サポートされている組み込みアダプターは[履歴アダプター](/reference/solid-router/history)を参照してください。

## データ

- `CachedFunction<T>` は `query` が返します。
- `Action<T, U, V>` は `action` が返します。
- `Submission<T, U>` は確定したアクションのレコードです。

シグネチャは[データ API](/reference/solid-router/data)を参照してください。

## その他のパッケージエントリー

`@solidjs/router/fs` のエクスポート:

- `FileRouteConfig`
- `FileRouteEntry`
- `FileRouteLazyRef`
- `FileRouteEagerRef`
- `FileRouteFrom`
- `FileRoutesFrom`

`@solidjs/router/server` のエクスポート:

- `FlightDataCollectorOptions`
- `CollectFlightDataHook`
- `ServerFunctionOutcome`

[ファイルシステムアダプター](/reference/solid-router/filesystem)と[サーバー統合](/reference/solid-router/server)のページを参照してください。
