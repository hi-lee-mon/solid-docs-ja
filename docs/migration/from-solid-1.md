---
title: "Solid 1.x から"
version: "2.0"
description: "Solid 1.x アプリケーションを Solid 2 に移行します。パッケージのインポート、リアクティビティ、エフェクト、ストア、非同期データ、レンダリング、テストを含みます。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "documentation/solid-2.0/MIGRATION.md"
---

Solid 2 では API 名だけでなく実行モデルも変わります。
移行はアプリケーションレベルのアップグレードとして計画し、その後でサブシステムを 1 つずつ変換してください。

## 移行の順序と互換性の境界

ランタイム、レンダラー、JSX コンパイラ、フレームワーク連携はまとめてアップグレードします。
Solid 2 には従来の `solid-js/web` や `solid-js/store` というパッケージエクスポートがなく、`@solidjs/web` は Solid 2 を peer として要求します。
削除されたパスをインポートしているライブラリや、Solid 1 のエフェクト・ストア・リソースの挙動に依存しているライブラリには、Solid 2 対応のリリースが必要です。

次の順序で進めます:

1. 移行用のブランチを作成し、Solid 1 でパスしているテスト・クライアントビルド・サーバーレンダーのベースラインを記録します。
2. `solid-js`、レンダラーパッケージ、Vite プラグイン（`vite-plugin-solid` は `@solidjs/vite-plugin` に置き換わります）、フレームワークアダプターを 1 つの依存関係セットとしてアップグレードします。
3. TypeScript と本番ビルドが新しいパッケージ境界を解決できるようになるまで、インポートと JSX 型を移します。
4. セッターのタイミング、エフェクト、ライフサイクルコード、リアクティブスコープ内の書き込みを変換します。
5. ストアとストアユーティリティを変換します。
6. リソース、削除されたトランジション API、ミューテーション、非同期バウンダリを置き換えます。
7. クライアントレンダリング、サーバーサイドレンダリング（SSR）、ハイドレーション、ホスト連携を更新します。
8. 開発モードでテストを実行して Solid 2 の診断を洗い出し、その後で本番のクライアントビルドとサーバービルドを検証します。

型チェックが通ったことを、連携の互換性の証明として扱わないでください。
コンパイラ変換、ルートでのイベントデリゲーション、ハイドレーション ID、非同期スケジューリングはランタイムの契約です。

## パッケージと JSX の所有権を移す

Web レンダリングと Web 用の JSX 型は `solid-js` の外に移動しました。
ストア API は逆方向に移動し、現在は `solid-js` からエクスポートされています。

```ts
// Solid 1
import { createStore, reconcile } from "solid-js/store";
import { hydrate, render } from "solid-js/web";

// Solid 2
import { createStore, reconcile } from "solid-js";
import { hydrate, render } from "@solidjs/web";
```

Web プロジェクトを更新し、レンダラーを JSX 型の所有者として使うようにします:

```json
{
	"compilerOptions": {
		"jsx": "preserve",
		"jsxImportSource": "@solidjs/web"
	}
}
```

DOM 固有の `JSX` 型や `ComponentProps` 型は `@solidjs/web` からインポートします。
API が DOM の JSX に依存しない場合は、`solid-js` から `Component` や `Element` のようなレンダラー中立の型を使います。

代替レンダラーも移動しています:

- `solid-js/h` は `@solidjs/h` に移動しました。
- `solid-js/html` は `@solidjs/html` に移動しました。
- `solid-js/universal` は `@solidjs/universal` に移動しました。
- `solid-js/jsx-runtime` と `solid-js/jsx-dev-runtime` は、`@solidjs/web/jsx-runtime` のようなレンダラー側のエントリーに移動しました。

ソースファイル、生成コード、テスト設定、パッケージのエクスポートマップ、宣言ファイルを調べ、古いパスを検索してください。

## シグナルと段階的書き込みを変換する

[`createSignal`](/reference/solid-js/reactivity/create-signal) が返すゲッターとセッターのペアは変わりません。
変わったのはセッターの書き込みが見えるタイミングです。
Solid 2 では通常の書き込みはいったんステージされ、リアクティブキューは次のマイクロタスクでコミットされます。
セッターの直後に読み取ると、最後にコミットされた値が返ります。

```ts
const [count, setCount] = createSignal(0);

setCount(1);
count(); // 0

flush();
count(); // 1
```

ほとんどのイベントハンドラーでは明示的なフラッシュは不要です。
[`flush()`](/reference/solid-js/reactivity/flush) を追加するのは、次のマイクロタスクより前に更新後のリアクティブな状態や DOM を監視しなければならない命令的な境界だけにしてください。
テストは代表的な例です。
`flush(fn)` は同期フラッシュスコープ内で書き込みを実行し、戻る前にキューを空にします。

`batch` は削除してください。
連続した書き込みは、すでにデフォルトのマイクロタスクバッチを共有しています。
各 `batch` 呼び出しを `flush` に置き換えると、遅延処理が同期処理に変わってしまいます。

開発モードでは、コンポーネント本体やメモ計算のような通常のオーナー付きスコープ内での書き込みも拒否されます。
書き戻し型の派生は [`createMemo`](/reference/solid-js/reactivity/create-memo) に置き換え、セッターはイベントハンドラー、アクション、エフェクトのエフェクト関数から呼び出してください。
`ownedWrite: true` は、スコープ内での書き込みを意図的に受け付ける内部シグナルに限定してください。

コンポーネント本体がトップレベルでリアクティブな値を読み取ると、その読み取りが追跡スコープの外にあるため Solid 2 は警告します。
リアクティブな props やストアのプロパティは、JSX 式または計算の中に保持してください。
[`untrack`](/reference/solid-js/reactivity/untrack) は意図的な一回限りの読み取りにのみ使います。

```tsx
// Solid 1 code that loses reactivity in Solid 2
function Heading({ title }: { title: string }) {
	return <h1>{title}</h1>;
}

// Solid 2
function Heading(props: { title: string }) {
	return <h1>{props.title}</h1>;
}
```

関数形式の `createSignal(fn)` は新機能です。
書き込み可能な派生シグナルを作成するもので、以前は別のシグナルへ書き戻していた派生を置き換えられます。

## エフェクトを計算フェーズとエフェクトフェーズに分割する

[`createEffect`](/reference/solid-js/reactivity/create-effect) は、依存関係の追跡と副作用を分離するようになりました:

```ts
// Solid 1
createEffect(() => {
	document.title = title();
});

// Solid 2
createEffect(
	() => title(),
	(value) => {
		document.title = value;
	}
);
```

計算関数はリアクティブな読み取りを追跡し、アプリケーションの書き込みを含まない状態を保つ必要があります。
エフェクト関数は追跡されず、命令的な処理を実行でき、クリーンアップ関数を返すことができます。
ストアのプロキシをそのまま渡して追跡されないエフェクトフェーズで読み取るのではなく、計算フェーズでストアのプロパティを取り出してください。

```ts
createEffect(
	() => ({ name: user.name, role: user.role }),
	(value) => sendAnalytics(value.name, value.role)
);
```

エフェクトのクリーンアップはエフェクト関数から返します:

```ts
createEffect(
	() => roomId(),
	(id) => {
		const connection = connect(id);
		return () => connection.close();
	}
);
```

Solid 1 の `initialValue` 引数は `createEffect` と `createMemo` から削除されました。
計算関数は `prev` を受け取りますが、初回実行時は `undefined` です。
計算に最初の前回値が必要な場合は、デフォルトパラメーターを使ってください。
`createMemo` の第 2 引数は、現在はオプションオブジェクトです。

よく使うライフサイクルとエフェクトのヘルパーは、次のように置き換えます:

- `on(...)` は計算関数に置き換え、必要に応じてエフェクトの `defer` オプションを使います。
- `onMount` は [`onSettled`](/reference/solid-js/lifecycle-actions/on-settled) に置き換え、そのコールバックからクリーンアップを返します。
- エフェクト内の `onCleanup` 呼び出しは、エフェクト関数から返すクリーンアップに置き換えます。
- `createTrackedEffect` は、追跡されるコールバックが 1 つだけ必要な場合にのみ使います。
  これと `onSettled` はネストされたプリミティブを作成できません。
- `catchError` や `onError` は、[`Errored`](/reference/solid-js/components-jsx/errored) バウンダリまたはエフェクトバンドルの `error` コールバックに置き換えます。

## ストアをドラフトセッターに変換する

[`createStore`](/reference/solid-js/stores/create-store) は引き続き、読み取り専用のストアとそのセッターを返します。
セッターはミュータブルなドラフトを受け取るようになりました。
これにより、Solid 1 のプロパティ単位のモデルを維持しつつ、ドラフトへの変更がデフォルトの更新形式になります。

```ts
// Solid 1
setState("user", "address", "city", "Paris");

// Solid 2
setState((draft) => {
	draft.user.address.city = "Paris";
});
```

`produce(...)` のラッパーは削除し、プロデューサーの本体をそのままセッターに渡してください。
`createMutable` と `modifyMutable` は、`createStore` と明示的なドラフトセッターに置き換えます。
ストアへの書き込みは、シグナルと同じ段階的書き込みのタイミングに従います。

[`storePath`](/reference/solid-js/advanced/store-advanced/store-path) は、一括で変換できないパスセッター向けの移行ヘルパーです:

```ts
setState(storePath("user", "address", "city", "Paris"));
```

新しいコードではドラフトセッターを優先してください。
`storePath` はインデックス指定・フィルター指定・範囲指定のパスもサポートしているため、複雑なセッターを変換する際は元のパスセマンティクスを維持してください。

`reconcile` は選択されたドラフトに対して実行されるようになりました:

```ts
// Solid 1
setState("todos", reconcile(serverTodos));

// Solid 2
setState((draft) => {
	reconcile(serverTodos, "id")(draft.todos);
});
```

以下のユーティリティの変更も確認してください:

- シリアライズや外部コードがプレーンな非リアクティブな値を必要とする場合は、`unwrap(store)` を [`snapshot(store)`](/reference/solid-js/advanced/store-advanced/snapshot) に置き換えます。
- `mergeProps` は [`merge`](/reference/solid-js/stores/merge) に置き換えます。
  `merge` では `undefined` が明示的な上書き値として扱われます。
- `splitProps(props, ["a", "b"])` は [`omit(props, "a", "b")`](/reference/solid-js/stores/omit) に置き換えます。
- セレクター型の状態は、[`createProjection`](/reference/solid-js/stores/create-projection) または関数形式の `createStore` に置き換えます。

エフェクトがネストされたすべてのプロパティを購読する必要がある場合は、エフェクトの計算フェーズで [`deep(store)`](/reference/solid-js/advanced/store-advanced/deep) を使います。
ストアを購読せずに現在のプレーンな値が必要な場合は `snapshot(store)` を使います。

## リソースを非同期計算に置き換える

Solid 2 の計算は Promise と非同期イテラブルを受け付けます。
基本的な `createResource` は非同期メモに置き換えます:

```ts
// Solid 1
const [user] = createResource(userId, fetchUser);

// Solid 2
const user = createMemo(() => fetchUser(userId()));
```

初期状態で未解決になり得る読み取りは、[`Loading`](/reference/solid-js/components-jsx/loading) の下に配置します:

```tsx
<Loading fallback={<UserSkeleton />}>
	<UserProfile user={user()} />
</Loading>
```

これが初回ロードの基本モデルです。
バウンダリが分岐の準備状態を管理し、必要な読み取りが確定するまでフォールバックをレンダーします。
コンテンツがレンダーされた後の更新は保留され、コミット済みのコンテンツが表示され続けます。

:::caution[非同期計算は画面が更新されるタイミングを変えます]
非同期計算の入力への書き込みは、その計算が次の答えを得るまで保留され、同じ更新に含まれる他のすべても一緒に待機します。
Solid 1 のリソースやエフェクトベースのフェッチではこのようなことはなく、各コンシューマーがそれぞれのスケジュールで更新されていました。
すべてのフェッチを一度に変換したアプリケーションはどこでも新しい動作を引き継ぎ、期間セレクターのような共有入力は、それを読み取る最も遅いフェッチを待つことになります。
[Solid 1 からのデータフェッチ](/migration/data-fetching-from-solid-1)では、まず各パターンを変えずに動かし続ける方法を示し、その後で一度に 1 つのフェッチずつ変換し、フェッチごとにリフェッチの挙動を選択します。
:::

Solid 1 のリソースが持っていたプロパティとアクションは、個別の操作になります:

- `resource.loading` は、初期の準備状態には `Loading` バウンダリ、処理中の変更された答えには [`isPending(() => resource())`](/reference/solid-js/reactivity/is-pending) に置き換えます。
- `resource.error` は `Errored` バウンダリまたはエフェクトの `error` コールバックに置き換えます。
- `refetch()` は [`refresh(resource)`](/reference/solid-js/lifecycle-actions/refresh) に置き換えます。
- `mutate()` は、アクションと [`createOptimistic`](/reference/solid-js/reactivity/create-optimistic) または [`createOptimisticStore`](/reference/solid-js/stores/create-optimistic-store) に置き換えます。
- 命令的なコードが処理中の値を調べる必要がある場合は、`resource.latest` を [`latest(resource)`](/reference/solid-js/reactivity/latest) に置き換えます。

素の `refresh()` は、`isPending` を true にせずに同じ問いを再度発行します。
リフレッシュを保留中として表示する必要がある場合は、周囲のアクション内で `refresh(target)` の前に [`affects(target)`](/reference/solid-js/lifecycle-actions/affects) を呼び出します。
UI がミューテーション自体の進行を表示する必要がある場合は、ミューテーション専用の楽観的フラグを使います。

`loadingValue` とストアオプションの `seedLoadingValue` は、最初の結果が来る前にソースの代わりに答えるプレースホルダーを宣言します。
暫定データを最終データと同じ UI でレンダーしたい場合や、Solid 1 の `undefined` チェックを JSX に残す必要がある場合に使います。
宣言された値は初回のサスペンドを防ぎ、最初の本物の答えが届くまで `isPending` を false に保ちます。
暫定データが最終値の形状をそのまま持てない場合は `Loading` を使います。

## ミューテーションを変換し、トランジション API を削除する

`startTransition` と `useTransition` は削除します。
Solid 2 はグラフを通じて非同期計算を調整します。
未解決の分岐には `Loading`、公開されていない変更後の答えには `isPending`、暫定的なミューテーション状態には楽観的プリミティブを使います。

[`action`](/reference/solid-js/lifecycle-actions/action) は、書き込みが非同期の境界をまたぐ命令的なワークフロー向けです。
アクションはジェネレーターまたは非同期ジェネレーターであり、Promise を返します。
通常のシグナルやストアへの書き込みはトランザクションに保持されたままになりますが、楽観的な書き込みは表示され、トランザクションが確定すると派生値またはベース値に戻ります。

```ts
const [todos, setTodos] = createOptimisticStore(fetchTodos, []);

const addTodo = action(function* (todo: Todo) {
	setTodos((draft) => {
		draft.push(todo);
	});
	yield saveTodo(todo);
	refresh(todos);
});
```

アクションのトランザクションを維持するには Promise を yield してください。
非同期ジェネレーターが型付きの結果に `await` を使う場合は、後続の書き込みの前に素の `yield` を置いてトランザクションに再入室してください。
アクション内で `flush()` を呼び出さないでください。トランザクションのステップを空にしてしまいます。
アクションはイベントハンドラーや他の命令的スコープから呼び出し、コンポーネントや計算の本体からは呼び出さないでください。

統合されたモデルの詳細は[非同期リアクティビティ](/concepts/async-reactivity)を参照してください。

## バウンダリ、制御フロー、JSX を更新する

以下の UI 移行を直接適用します:

- `Suspense` は `Loading` に置き換えます。
- `ErrorBoundary` は `Errored` に置き換えます。
  その関数フォールバックはエラーのアクセサーを受け取るため、`error()` でエラーを読み取ります。
- `SuspenseList` は [`Reveal`](/reference/solid-js/components-jsx/reveal) に置き換えます。
- `Index` は [`For keyed={false}`](/reference/solid-js/components-jsx/for) に置き換えます。
  このモードではアイテムはアクセサー、インデックスは安定した数値になります。
- `Context.Provider` はコンテキストコンポーネント `<Theme value={value}>` に置き換えます。
- `<Dynamic component={source} {...props} />` は [`dynamic()`](/reference/solid-web/components/dynamic) が返すコンポーネントに置き換えます。`const Comp = dynamic(() => source)` とし、その後 `<Comp {...props} />` とします。
  `Dynamic` は非推奨です。
  コンポーネントは JSX の外で一度だけ作成し、必要な場所でレンダーしてください。falsy なソースは以前と同様に何もレンダーしません。
- `createDynamic(source, props)` の直接呼び出しは `dynamic(source)` に置き換えます。

削除された JSX の形式を更新します:

- `classList` は `class` のオブジェクト形式または配列形式に置き換えます。
- `use:directive` は `ref` コールバックまたはディレクティブファクトリーに置き換え、コールバックの合成には `ref` の配列を使います。
- `on:` と `oncapture:` はキャメルケースの Solid イベント props に置き換えます。
  ネイティブのリスナーオプションが必要な場合は `ref` コールバックと `addEventListener` を使います。
- `attr:` と `bool:` は標準の属性と真偽値の有無に置き換えます。
- `/*@once*/` は削除します。
  値はリアクティブに保つか、初期状態には `defaultValue` のような DOM のデフォルトプロパティを使うか、`untrack` で限定的な JavaScript のスナップショットを取得してください。

ネストされたルート、`ShadowRoot` インスタンス、ポータルへのレンダリングには結合テストが必要です。
Solid 2 はデリゲートされたイベントを各レンダールートにスコープし、それらのリスナーをルートとともに破棄します。
以前のドキュメントグローバルな `clearDelegatedEvents` API の呼び出しは削除してください。

## クライアントレンダリングと SSR を更新する

[`render`](/reference/solid-web/rendering-ssr/render)、[`hydrate`](/reference/solid-web/rendering-ssr/hydrate)、およびすべてのサーバーレンダー関数は `@solidjs/web` からインポートします。
`render` が返す破棄関数は、引き続き保持して呼び出してください。

必要な結果に応じて SSR のエントリーポイントを選択します:

- [`renderToString`](/reference/solid-web/rendering-ssr/render-to-string) は同期で、未解決の読み取りには `Loading` のフォールバックをレンダーします。
- [`renderToStream`](/reference/solid-web/rendering-ssr/render-to-stream) はシェルを出力し、その後で解決済みの非同期フラグメントを出力します。
- 完全に確定した HTML 文字列が必要な場合は、`renderToStringAsync` を `await renderToStream(() => <App />)` に置き換えます。
- ストリームのコンシューマーは `pipe`、`pipeTo`、`readable` のいずれか 1 つだけを使います。
  `readable` ストリームは `Uint8Array` チャンクを含み、Web の `Response` に渡せます。

移行したすべてのリソースで `ssrSource` と `deferStream` オプションを確認してください。
デフォルトの `ssrSource: "server"` は、初回のクライアント計算を繰り返さずに、シリアライズされたサーバー結果を採用します。
`"hybrid"` や `"client"` は、計算がクライアント固有の動作を持つことが確認できた場合にのみ使います。

HTTP 交換を管理するコードは統合境界です。
Solid 2 は `@solidjs/web` を通じてリクエストイベント、レスポンスヘッドヘルパー、サーバー関数、ストリームレスポンスユーティリティを公開しますが、ルーティング、ミドルウェアポリシー、セッション、デプロイアダプターは依然としてフレームワーク固有の移行作業が必要です。
これらの API の代替を類似の名前から推測しないでください。
各連携の Solid 2 ガイドに従い、そのリクエスト、レスポンス、ハイドレーション、シリアライズのテストを検証してください。

## 削除された API を意図に応じて置き換える

以下のリストは一般的なアプリケーション API を網羅したもので、完全なエクスポート差分表ではありません。
動作に基づいて代替を選択してください:

- `createComputed`: 派生値には `createMemo`、副作用には分割した `createEffect`、書き込み可能な派生状態には関数形式の `createSignal` を使います。
- `batch`: デフォルトのバッチ処理に任せます。`flush` は同期で観測する必要がある場合にのみ使います。
- `on`: 依存関係はエフェクトの計算フェーズに置きます。
- `onMount`: `onSettled` を使います。
- `onError` と `catchError`: `Errored` またはエフェクトの `error` コールバックを使います。
- `createResource`: 非同期計算とバウンダリを使います。
- `createMutable` と `modifyMutable`: `createStore` とドラフトセッターを使います。
- `produce`: そのドラフトコールバックをそのままストアのセッターに渡します。
- `createSelector`: `createProjection` または関数形式の `createStore` を使います。
- `from` と `observable`: 流入するストリームには非同期イテラブル、外向きの通知には分割エフェクトを使います。
  標準の Observable アダプターに相当するコアの代替はありません。
- `createDeferred`: スケジューリングポリシーを Solid の外に移します。
- `indexArray`: `{ keyed: false }` を付けた `mapArray` を使います。
- `resetErrorBoundaries`: 削除します。エラーバウンダリは現在のグラフ状態または明示的なリセットコールバックを通じて復帰します。
- `enableScheduling` と `writeSignal`: 内部向けまたは廃止された用途なので削除します。

ドキュメントに記載のないインポートは個別に監査してください。
コンパイラ、レンダラー、devtools、メタフレームワーク連携のために存在していたエクスポートには、アプリケーションレベルの代替がない場合があります。
これらのインポートはホスト連携の作業として扱い、所有するパッケージのソースで確認してください。

## テストを更新する

テストのコンパイルでレンダラーの JSX ランタイムを使うように更新します。
Web コンポーネントのテストでは、テストがサーバーエントリーではなく `@solidjs/web` を実行するように、ブラウザと開発用パッケージの条件を解決します。
Testing Library のクリーンアップを維持するか、レンダーの破棄関数を明示的に呼び出してください。

ユニットテストでは段階的書き込みを考慮します:

```ts
setCount(2);
flush();
expect(count()).toBe(2);
```

エフェクト関数をアサートする前に、エフェクトの作成後にフラッシュしてください。
リアクティブな値、エフェクト、DOM をアサートする前に、セッターの後にフラッシュしてください。
ユーザーレベルのテストでは `await user.click(...)` を優先してください。イベントツールもイベントシーケンスを空にします。

テストがリアクティブな式の確定を待つ必要がある場合は、[`resolve(() => value())`](/reference/solid-js/advanced/interop-async/resolve) を使います。
最終的にコミットまたは復元された状態をアサートする前に、アクション呼び出しを await してください。
初期の `Loading` フォールバック、確定したコンテンツ、保留中の更新状態、エラーバウンダリを個別の状態としてテストします。

移行テストは開発モードで実行してください。
トップレベルのリアクティブ読み取りの警告、オーナー付きスコープからの書き込み、計算から呼び出されるアクション、`Loading` バウンダリ外の非同期読み取りは、診断を抑制するのではなく修正してください。
その後、同じクライアント、SSR、ストリーミング、ハイドレーションのパスを本番モードで実行します。

現在のテスト環境の分け方については[テストガイド](/guides/testing)を参照してください。

## 最終確認

移行をマージする前に:

1. 古いパッケージパスと削除されたシンボルを検索します。
2. TypeScript、lint、本番クライアントビルドを実行します。
3. 明示的なフラッシュポイントを含むユニットテストとコンポーネントテストを実行します。
4. 初回ロード、入力変更による更新、手動リフレッシュ、成功するミューテーション、失敗するミューテーション、バウンダリの復帰を確認します。
5. SSR のシェル出力、ストリーミング完了、ハイドレーション、イベントの動作を、記録した Solid 1 のベースラインと比較します。
6. 各サードパーティのプリミティブ、レンダラー、ルーター、メタフレームワークパッケージについて、明示的な Solid 2 対応リリースを確認します。

## 次のステップ

- [Solid 1 からのデータフェッチ](/migration/data-fetching-from-solid-1): リソースとエフェクトベースのフェッチを一度に 1 つずつ変換し、それぞれにリフェッチの挙動を選択します。
- [SolidStart から](/migration/from-solid-start)、[Solid Router から](/migration/from-solid-router)、[Solid Meta から](/migration/from-solid-meta): このガイドを土台にするフレームワークレベルの移行です。
- [非同期リアクティビティ](/concepts/async-reactivity): 保留される更新、`Loading`、`isPending`、アクションの背後にあるモデルです。
