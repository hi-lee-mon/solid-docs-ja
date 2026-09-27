---
title: "用語集"
version: "2.0"
description: "Solid 固有の言葉を、それぞれ数文で定義し、その概念を教えるページへリンクしています。"
---

このページは、別のページで出会った用語の短い説明が欲しいときのためのものです。
各項目は数文で意味を説明し、その概念を例やトレードオフとともに詳しく解説するページへリンクしています。
ある概念が別の場所で別の名前で呼ばれる場合は、「別名」の行にその名前を記載しているので、すでに知っているものと結び付けられます。

## リアクティビティ

### バッチ

シグナルとストアへの書き込みはステージングされ、現在のコードが終わった後のマイクロタスクで Solid がステージングされた書き込みをすべてまとめて適用するため、次の行での読み取りにはまだ古い値が見えます。
`flush()` はステージングされた書き込みを同期的に適用します。テストではイベントを発火させた後にこれを呼びます。

[更新が反映されるタイミング](/docs/concepts/reactivity.md#when-updates-land)を参照してください。

### 計算（computation）

読み取ったリアクティブな値が変わると Solid が再実行するスコープです。メモの関数、エフェクトの計算関数、JSX 式などです。
Promise を返す計算も計算であり、その読み取り側は結果を待ちます。

[派生値](/docs/concepts/reactivity.md#derived-values)と [Promise を返すメモ](/docs/concepts/async-reactivity.md#a-memo-that-returns-a-promise)を参照してください。

### カスタムプリミティブ

シグナル・メモ・エフェクト・クリーンアップをパッケージ化して、複数のコンポーネントから呼び出せるようにする、自分で書く `createX` 関数です。
コアのプリミティブと同じルールに従います。コンポーネント本体や別のプリミティブの中で呼び出し、アクセサーを受け取り、アクセサーを返します。

別名: フック。

[プリミティブはオーナーの内側で実行される関数](/docs/guides/custom-primitives.md#a-primitive-is-a-function-that-runs-inside-an-owner)を参照してください。

### エフェクト

ストレージ・ドキュメントのタイトル・チャートライブラリなど、Solid が所有しないものへデータを Solid から移すプリミティブです。
`createEffect` は、追跡スコープ内で実行されて値を返す計算関数と、その値を受け取り、更新が反映された後に追跡されずに実行され、クリーンアップを返してもよいエフェクト関数を受け取ります。

別名: 副作用。

[エフェクト](/docs/concepts/reactivity.md#effects)を参照してください。

### メモ

キャッシュされた派生値です。
`createMemo` は追跡スコープ内で関数を実行し、結果を保存し、結果が変わったときだけ読み取り側に通知します。そのため派生の連鎖における有用な境界になります。

別名: computed。

[派生値](/docs/concepts/reactivity.md#derived-values)を参照してください。

### オーナー

プリミティブが作られたときに実行中だったスコープで、後でそれを破棄するものです。
コンポーネントはオーナーです。Solid がコンポーネントを取り除くと、それが作ったすべてのメモ・エフェクト・クリーンアップが一緒に破棄されます。これがオーナーシップの意味です。イベントハンドラーの中で作られたプリミティブにはオーナーがなく、クリーンアップされることもありません。

別名: リアクティブコンテキスト、リアクティブスコープ。ランタイムの警告ではそのように呼ばれます。

[オーナーシップ](/docs/concepts/reactivity.md#ownership)を参照してください。

### プリミティブ

リアクティビティや振る舞いの構成要素となる関数で、破棄が必要なものを作るときは現在のオーナーにそれを結び付けます。名前は通常 `create` または `use` で始まります。

[プリミティブはオーナーの内側で実行される関数](/docs/guides/custom-primitives.md#a-primitive-is-a-function-that-runs-inside-an-owner)を参照してください。

### リアクティブな値

Solid が追跡できるあらゆる値です。シグナル、メモ、ストアのプロパティ、`props` のプロパティなどです。
追跡スコープの内側で読み取るとそのスコープが購読され、それ以外の場所で読み取ると1回限りのスナップショットが返ります。

[シグナル](/docs/concepts/reactivity.md#signals)を参照してください。

### ルート（root）

`createRoot` で手動で作るオーナーで、`createRoot` はその破棄関数を返します。
何も実行されていない場所で作れば単独で存在し、コンポーネントの内側で作ればそのコンポーネントに属し、一緒に破棄されます。
コンポーネントの外でリアクティビティを動かすテストや統合のためのもので、アプリケーションコードでは代わりにコンテキストを通じて状態を共有します。

[ルート](/docs/concepts/reactivity.md#roots)を参照してください。

### シグナル

誰が読んだかを知っている、1つの値のためのコンテナです。
`createSignal` はゲッターとセッターを返します。追跡スコープ内での読み取りはそのスコープを購読させ、書き込みは購読しているスコープを再実行します。

[シグナル](/docs/concepts/reactivity.md#signals)を参照してください。

### 追跡スコープ

Solid がどのリアクティブな値が読まれたかを記録するコードの領域です。JSX 式、メモの関数、エフェクトの計算関数などです。
そこで読まれた各値はそのスコープの依存関係になります。コンポーネント本体は追跡スコープではないので、そこでの読み取りは1回限りのスナップショットです。

別名: 追跡コンテキスト。

[シグナル](/docs/concepts/reactivity.md#signals)を参照してください。

### untrack

追跡スコープの内側でリアクティブな値を、それを購読せずに読み取ります。追跡されない読み取りに関する開発時の警告も出しません。

[シグナル](/docs/concepts/reactivity.md#signals)と [`untrack` リファレンス](/docs/reference/solid-js/reactivity/untrack.md)を参照してください。

## 更新と非同期

### アクション

`solid-js` の `action` で包んだジェネレーター関数で、ミューテーションを1つのトランザクションとして実行します。各 `yield` は Promise を待ってからトランザクションを復元するので、`yield` の前の書き込みとその後のリフレッシュは同じ更新に属します。素の `await` ではその更新から外れます。
Solid Router にも独自の `action` があり、サーバー関数の上にフォーム URL・サブミッション・再検証を追加します。

[カートをサーバーへ移す](/docs/concepts/mutations.md#move-the-cart-to-the-server)と [アクションでミューテートする](/docs/routing/solid-router/data.md#mutate-with-actions)を参照してください。

### affects

周囲のアクションが進行中の間、ソース・ストア・ストアの1つのプロパティを、その値を予測せずに保留中としてマークします。そのデータの読み取り側は `isPending` を報告します。

[データに変化中の印を付ける](/docs/concepts/mutations.md#mark-data-as-changing-affects)を参照してください。

### 保持された更新

以前の答えがすでにある状態で、コミットが非同期の処理を待つ書き込みです。
現在のビューは画面に残り、同じ更新の中の他の書き込みも一緒に待ち、処理が確定するとすべてがまとめてコミットされます。ページに新旧のデータが混在することはありません。

別名: トランジション。

[確定済みビューと処理中の処理](/docs/concepts/async-reactivity.md#settled-view-and-in-flight-work)を参照してください。

### isPending

1つの式についての問いです。すでに答えを持っている値に、より新しい答えが来る途中かどうか。
書き込みが保持された瞬間から下流のすべてが確定するまで `true` になり、初回の読み込みは報告しません。

[次の答えが来る途中](/docs/concepts/async-reactivity.md#another-answer-is-coming-ispending)を参照してください。

### latest

更新がコミットした値ではなく、更新が向かっている値を読み取ります。
タブや選択された行など、ユーザーが触れたコントロールに付けます。コントロールはすぐに切り替わり、その下のコンテンツは待ちます。

[入力を今すぐ表示する](/docs/concepts/async-reactivity.md#show-the-input-now-latest)を参照してください。

### 準備未了（not ready）

非同期の値に最初の答えが届く前の状態です。
準備未了の値を読み取ると読み取り側は待たされ、最も近いローディングバウンダリがフォールバックをレンダリングします。ランタイムはこの状態を `NotReadyError` として運び、バウンダリがそれを処理するので、アプリケーションコードがキャッチすることはありません。

[Promise を返すメモ](/docs/concepts/async-reactivity.md#a-memo-that-returns-a-promise)と [`NotReadyError` リファレンス](/docs/reference/solid-js/advanced/interop-async/not-ready-error.md)を参照してください。

### 楽観的な値

ミューテーションの期待される結果で、サーバーが確認する前に表示されます。
`createOptimisticStore` への、アクション内での書き込みは永続的な値の上のオーバーレイです。アクションが確定すると、成功時も失敗時も Solid はオーバーレイを破棄するので、ロールバックのコードはありません。

別名: 楽観的更新。

[楽観的ストア](/docs/concepts/stores.md#optimistic-stores)と [カートをサーバーへ移す](/docs/concepts/mutations.md#move-the-cart-to-the-server)を参照してください。

### 保留中（pending）

処理が進行中であることを表します。保持された更新は非同期処理が確定するまで保留中であり、アクションは解決するまで保留中であり、`affects` は宣言によってデータを保留中としてマークします。

[次の答えが来る途中](/docs/concepts/async-reactivity.md#another-answer-is-coming-ispending)と [保存中の行を表示する](/docs/concepts/mutations.md#show-that-a-row-is-saving)を参照してください。

### refresh

入力を変えずに、非同期ソースへ同じ問いをもう一度投げます。ミューテーションの後、`refresh(items)` は派生を再実行し、ストアがサーバーの持つものとリコンサイルするようにします。

[カートをサーバーへ移す](/docs/concepts/mutations.md#move-the-cart-to-the-server)を参照してください。

### 再検証（revalidation）

キャッシュされた読み取りを古いものとしてマークし、実際に読まれているものを再実行することです。
サーバー関数は `revalidate` オプションでキーを指定して `reload`、`respond`、`redirect` を返します。Solid Router はアクションの完了時にそれらを `query` キャッシュと照合し、キーがなければすべてのクエリが再検証されます。

[再検証](/docs/routing/solid-router/data.md#revalidate)と [再検証を要求する](/docs/building-apps/server-functions/mutations-and-responses.md#request-revalidation)を参照してください。

### 確定（settled）

非同期処理が終わり、その答えがユーザーに見えているものです。
値がいったん確定すれば、その入力への変更は画面を空白にするのではなく保持されます。`onSettled` は最初のレンダーが確定した後にコールバックを1回実行します。ルーターアクションの `.onSettled(hook)` は別の API で、各サブミッションが完了するたびに実行されます。

[確定済みビューと処理中の処理](/docs/concepts/async-reactivity.md#settled-view-and-in-flight-work)を参照してください。

### 破棄された実行（superseded）

入力が再び変わったために、より新しい実行に置き換えられた非同期の計算の実行です。Solid は破棄された実行への答えを捨てるので、リクエストカウンターや `AbortController` を書く必要はありません。

[非同期の処理は派生に置く](/docs/guides/avoid-unnecessary-effects.md#put-asynchronous-work-in-a-derivation)を参照してください。

### 仮の値と正本（tentative / authoritative）

仮の値はアクション内での楽観的な書き込みです。すぐに表示され、アクションが確定すると取り除かれます。
正本の値は、ストアがソースから導出する値です。オーバーレイが消えた後にページが表示するものであり、`until` が読み取るものです。

別名: 正本側は durable value（永続的な値）。

[楽観的ストア](/docs/concepts/stores.md#optimistic-stores)と [サーバーが書き込みをエコーするのを待つ](/docs/concepts/mutations.md#wait-for-the-server-to-echo-the-write-until)を参照してください。

### トランザクション

アクションが実行される単位です。その書き込みはアクションが確定するまで保持され、`yield` の前後の書き込みは同じ更新に属します。

[カートをサーバーへ移す](/docs/concepts/mutations.md#move-the-cart-to-the-server)を参照してください。

### until

正本のデータに対する述語が真になるまでアクションを開いたままにします。確認がレスポンスではなくライブソース上で後から届くトランスポート向けです。

[サーバーが書き込みをエコーするのを待つ](/docs/concepts/mutations.md#wait-for-the-server-to-echo-the-write-until)を参照してください。

## コンポーネントとレンダリング

### バウンダリ

保留中または失敗した読み取りがページのどの程度に影響するかを決めるコンポーネントで、コンテンツの代わりにフォールバック・プレースホルダー・エラーメッセージをレンダリングします。
最も近い一致するバウンダリが、自身のサブツリー内の読み取りが生んだ状態を処理し、その外側に置かれたコントロールはどの状態でも画面に残ります。

[バウンダリ](/docs/concepts/boundaries.md)を参照してください。

### children

親がコンポーネントのタグの間に置く JSX で、`props.children` として受け取られます。コンポーネントが children を受け付けるのは、その props の型に `children` プロパティが含まれるときだけです。

別名: function child。`children` として関数を渡し、親がそれを呼び出す形です。

[children と合成](/docs/concepts/components-and-jsx.md#children-and-composition)を参照してください。

### クライアントレンダリング

`render` はブラウザーで DOM コンテナにツリーをマウントし、破棄関数を返します。静的シェルのプロジェクト形状は空のドキュメントシェルを配信し、アプリ全体をこの方法でレンダリングします。

[クライアントレンダリング](/docs/concepts/rendering-and-ssr.md#client-rendering)を参照してください。

### clientOnly

サーバーで実行できないコンポーネントを包みます。サーバーはそのフォールバックをレンダリングしてインポートを開始せず、ブラウザーはモジュールが読み込まれハイドレーションが確定した後にコンポーネントを差し込みます。

[サーバーとクライアントのバウンダリ](/docs/concepts/rendering-and-ssr.md#server-and-client-boundaries)を参照してください。

### コンポーネント

一度だけ実行される関数です。状態をセットアップして JSX を返し、二度と呼ばれません。返された JSX 式はそれ自身で更新し続けます。

[JSX の実行のしくみ](/docs/concepts/components-and-jsx.md#how-jsx-executes)を参照してください。

### コンテキスト

中間のすべてのコンポーネントへ転送せずに、コンポーネントのサブツリーへ値を渡します。
`createContext` はそれ自身がプロバイダーでもあるコンテキストを返します。`useContext` は現在のオーナーに対応する値を読み取り、コンテキストにデフォルトがないときにプロバイダーの外で呼ばれると `ContextNotFoundError` をスローします。

[コンテキスト](/docs/concepts/components-and-jsx.md#context)を参照してください。

### ディレクティブ

`ref` に渡す関数です。独立したディレクティブの構文はありません。
ディレクティブファクトリーはコンポーネントのセットアップ中にオーナー付きのプリミティブを作り、要素に振る舞いを適用するコールバックを返します。

別名: `use:` ディレクティブ、カスタムディレクティブ。

[ref とディレクティブ](/docs/concepts/components-and-jsx.md#refs-and-directives)を参照してください。

### エラーバウンダリ

`Errored` はサブツリー内の読み取りや計算がスローしたエラー（reject された非同期ソースを含む）を捕捉し、コンテンツの代わりにフォールバックをレンダリングします。
エラーは、入力が変わるかリフレッシュが成功するとクリアされる状態です。`reset` は失敗したソースを再実行します。

[エラーバウンダリ](/docs/concepts/boundaries.md#error-boundaries)を参照してください。

### ハイドレーション

サーバーがレンダリング済みの HTML に、ノードを作り直さずにイベントハンドラーとリアクティブなバインディングを取り付けることです。
Solid はサーバーレンダリング中に各テンプレートルートへハイドレーションキーを割り当て、クライアントが対応するノードを引き取れるようにします。これがサーバーとクライアントが同じ初期構造をレンダリングしなければならない理由です。

[サーバー HTML のハイドレーション](/docs/concepts/rendering-and-ssr.md#hydrating-server-html)と [ハイドレーション警告を読む](/docs/guides/ssr-safe-code.md#reading-the-hydration-warnings)を参照してください。

### isServer

`@solidjs/web` からのビルド時定数です。サーバービルドでは `true`、ブラウザービルドでは `false` なので、バンドラーが到達不能な側を取り除きます。

[サーバーとクライアントのバウンダリ](/docs/concepts/rendering-and-ssr.md#server-and-client-boundaries)を参照してください。

### ローディングバウンダリ

`Loading` は、サブツリー内で読み取られた非同期の値が最初の答えを出していない間、フォールバックをレンダリングします。
いったんコンテンツを表示した後は、以降の更新中もそのコンテンツを保持します。`on` prop はフォールバックを呼び戻すべき変更の対象となる値を指定します。それはバウンダリの外側で同じ変更を待っているものが何もないときにだけ起きます。

別名: `Suspense`。

[`Loading` バウンダリ](/docs/concepts/boundaries.md#loading-boundaries)を参照してください。

### ポータル

children を別の要素（デフォルトでは `document.body`）へレンダリングします。children はコンポーネントのリアクティブスコープに留まります。サーバーはポータルに対して何もレンダリングせず、その children はハイドレーションが確定した後にブラウザーでレンダリングされます。

[Solid を外部のコンテナへレンダリングする](/docs/guides/integrate-non-solid-code.md#render-solid-into-a-foreign-container)を参照してください。

### プリレンダリング

`vite build` の間に一度だけ行われるサーバーレンダリングです。クローラーがサーバービルドを通じて到達可能な各ページをレンダリングして HTML を書き出すので、デプロイされるサイトは静的ファイルになり、コンテンツの鮮度は最後のビルド時点のものです。

別名: 静的サイト生成（SSG）。

[ビルド時のプリレンダリング](/docs/guides/choose-a-rendering-mode.md#prerendered-at-build-time)を参照してください。

### props

コンポーネントが受け取る唯一のオブジェクトです。
コンパイラは動的な属性をゲッターに変えるので、`props.quantity` は使われる場所、つまり子の JSX の内側で読み取られます。分割代入すると1回だけ読み取られ、子は更新を止めます。

[Props](/docs/concepts/components-and-jsx.md#props)を参照してください。

### Reveal の順序

兄弟のローディング領域が現れる順序です。
`Reveal` はその直下に作られた `Loading` バウンダリを調整します。それぞれがスロットです。`sequential` はスロットを登録順に公開し、`together` はグループとして解放し、`natural` はそれぞれが個別に公開されるようにします。

[Reveal の順序](/docs/concepts/boundaries.md#reveal-order)を参照してください。

### サーバーレンダリング

同じコンポーネントをサーバーで実行し、リクエストに対する HTML を生成することです。
`renderToString` はフォールバックを含んだシェルを返します。`renderToStream` は最初にシェルを送り、各バウンダリのコンテンツを確定次第ストリーミングします。

別名: サーバーサイドレンダリング、SSR。

[レンダリングと SSR](/docs/concepts/rendering-and-ssr.md)を参照してください。

### ストリーミング

同期的なシェルを最初に出力し、各 `Loading` バウンダリのコンテンツが確定するごとにフラグメントを送るサーバーレンダリングです。上にバウンダリのない非同期の読み取りはシェルをブロックするので、バウンダリの配置はサーバー側の決定でもあります。

[ストリーミングレンダリング](/docs/concepts/rendering-and-ssr.md#streaming-rendering)を参照してください。

## データとサーバー

### API ルート

`src/routes` 以下のルートモジュールで、ページコンポーネントの代わりに、またはそれに加えて、`GET` や `POST` などの大文字の HTTP メソッドをエクスポートするものです。webhook・スクリプト・他のサービスなど、アプリではない呼び出し元のためのものです。

[API ルート](/docs/building-apps/middleware-and-api-routes.md#api-routes)を参照してください。

### ドラフト

ストアのセッターがそのコールバックに渡す引数です。
通常のプロパティ代入や配列メソッドでこれをミューテートすると、コールバックが戻るときに Solid がストアへ変更を適用します。ストアのプロキシ自体への書き込みは無視されます。

[ドラフトで更新する](/docs/concepts/stores.md#update-with-a-draft)を参照してください。

### locals

リクエストイベント上の入れ物で、ミドルウェアがサインイン済み顧客の id などのリクエストスコープの状態を置き、同じリクエストのサーバー関数・API ハンドラー・ページレンダーが読み取ります。

[信頼できるリクエストコンテキストを読む](/docs/building-apps/server-functions/arguments-and-security.md#read-trusted-request-context)を参照してください。

### ミドルウェア

リクエストと `next` 継続を受け取る関数で、start モードが処理するすべてのリクエストの前段で実行されます。リクエストはエクスポートされた配列を下り、レスポンスはそれを上って戻ります。

[ミドルウェアを追加する](/docs/building-apps/middleware-and-api-routes.md#add-a-middleware)を参照してください。

### オリジンチェック

サーバー関数のハンドラーは、`Sec-Fetch-Site`、`Origin`、`Referer` の各ヘッダーが別オリジンから来たことを示す、あるいはそれらを一切持たない状態変更リクエストを拒否します。
ブラウザーからのクロスサイトリクエストフォージェリを防ぎます。バリデーションと認可の代わりにはなりません。

別名: CSRF 対策。

[同一オリジン保護](/docs/building-apps/server-functions/arguments-and-security.md#same-origin-protection)を参照してください。

### プログレッシブエンハンスメント

サーバー関数の URL へ POST するフォームはクライアントバンドルが読み込まれる前から動作し、ハイドレーション後にルーターがそれを引き継ぎます。

[ルーターアクション経由でフォームを POST する](/docs/building-apps/server-functions/progressive-enhancement.md#post-a-form-through-a-router-action)を参照してください。

### プロジェクション

値が他のリアクティブな値から計算されるストアです。
メモが1つの値を導出するのに対し、プロジェクションはプロパティが個別に追跡され、項目が同一性を保つオブジェクトや配列を導出します。結果が `id` でシードへリコンサイルされるからです。

[プロジェクションでストアを導出する](/docs/concepts/stores.md#derive-a-store-with-a-projection)を参照してください。

### リコンサイル

キーによって入力データを既存のストアへ突き合わせ、変更のない項目がそのプロキシと DOM を保つようにします。
プロジェクションと `createStore` の関数形式は各結果を `id` でリコンサイルします。`reconcile` ヘルパーはセッターに渡された値に対して同じことを行います。

[プロジェクションでストアを導出する](/docs/concepts/stores.md#derive-a-store-with-a-projection)と [`reconcile` リファレンス](/docs/reference/solid-js/stores/reconcile.md)を参照してください。

### redirect

サーバー関数から `Location` ヘッダー付きの `Response` を返します。ルーターのアクションやクエリはページロードなしで遷移し、JavaScript なしのフォーム POST はリダイレクトに従い、素のコードは `Response` オブジェクトを受け取ります。

[呼び出し元をリダイレクトする](/docs/building-apps/server-functions/mutations-and-responses.md#redirect-the-caller)を参照してください。

### リクエストイベント

サーバー上の1回の HTTP やり取りを運ぶオブジェクトです。`request`、`locals` の入れ物、送信する `response` ヘッダーを持ちます。
`getRequestEvent()` はミドルウェア・サーバー関数・レンダーの中からそれを返します。レンダリング中に呼ばれたサーバー関数は、ページリクエストから派生したイベントの下で実行されます。

[プラットフォームが提供するもの](/docs/building-apps/sessions-and-auth.md#what-the-platform-supplies)を参照してください。

### respond

戻り値にステータスとヘッダーを組み合わせます。
返すと値で呼び出し元を解決し、スローすると値で呼び出し元を拒否します。ブラウザーが表示できる 400 を送る方法です。

[レスポンスメタデータ付きで値を返す](/docs/building-apps/server-functions/mutations-and-responses.md#return-a-value-with-response-metadata)を参照してください。

### 安全なエラー

`markSafeError` でマークされたエラーで、そのメッセージは本番でもブラウザーへ届きます。それ以外のスローされた値はすべて本番では `Internal Server Error` になるので、データベースドライバーのメッセージは漏れません。

[スローされたエラーを処理する](/docs/building-apps/server-functions/mutations-and-responses.md#handle-thrown-errors)を参照してください。

### シード

プロジェクションや非同期ストアが結果をリコンサイルして入れていく開始オブジェクトで、再計算をまたいでルートプロキシに安定した同一性を与えます。非同期関数の場合、`seedLoadingValue` が指定しない限り最初の答えとしては表示されません。

[プロジェクションでストアを導出する](/docs/concepts/stores.md#derive-a-store-with-a-projection)を参照してください。

### サーバー関数

最初の文が `"use server"` であるために、本体がサーバーで実行される関数です。
ビルドはブラウザーに HTTP リクエストを行う型付きスタブを残し、その呼び出しは両側で Promise を返します。

別名: サーバーアクション、RPC。

[サーバー関数を宣言する](/docs/building-apps/server-functions/index.md#declare-a-server-function)を参照してください。

### セッション

リクエストをまたいで呼び出し元を識別する状態です。
Solid はリクエストイベントを提供します。Cookie ライブラリが署名と有効期限を提供し、`fullstack` テンプレートは、サーバーで参照する id をペイロードに持つ署名付き Cookie を組み立てます。

[署名付き Cookie セッション](/docs/building-apps/sessions-and-auth.md#a-signed-cookie-session)を参照してください。

### シングルフライトミューテーション

レスポンスがページに必要な再取得済みクエリ結果も運ぶミューテーションです。ブラウザーは、ミューテーションとそれに続く再検証フェッチではなく、1回のリクエストで済ませます。

[ミューテーションを1回の往復で](/docs/routing/solid-router/server-rendering.md#one-round-trip-for-a-mutation)を参照してください。

### ストア

オブジェクトや配列の上のプロキシで、各プロパティを個別に追跡します。読み取り側は読んだプロパティを購読し、書き込みはセッターのドラフトを通り、1つの数量を変えればそれを読んでいる1つのテキストノードだけが更新されます。

[ネストされた状態を作る](/docs/concepts/stores.md#create-nested-state)を参照してください。

## ルーティング

### ファイルシステムルーティング

`src/routes` 以下のファイルがルートツリーになります。`filesystem-routing` がディレクトリをスキャンし、`@solidjs/router/fs` がそのマニフェストを、手書きの配列に含まれるのと同じルートオブジェクトへ変換します。

[ファイルシステムアダプターの位置づけ](/docs/routing/solid-router/index.md#where-the-file-system-adapter-fits)を参照してください。

### レイアウトルート

`children` を持つルートで、コンポーネントがマッチした子を `props.children` として受け取りその周囲にレンダリングされます。その下でページが切り替わっても、ルーターはレイアウトをマウントしたままにします。

[レイアウトとそのページ](/docs/routing/solid-router/nested-routes.md#a-layout-and-its-pages)を参照してください。

### パスなしルート

`path` を持たず、URL に追加せずにマッチへコンポーネントや `preload` を加えるルートです。ページ群の周囲のサインインチェックなどに使います。

[URL セグメントを持たないレイアウト](/docs/routing/solid-router/nested-routes.md#layouts-without-a-url-segment)を参照してください。

### preload

ルートがマッチしたとき、ページコンポーネントが存在する前に実行されるルート関数で、マッチした `params` と `intent` を受け取ります。
返すのではなく `void` でクエリを開始してください。返り値は `props.data` として一度だけ取り込まれるからです。

別名: ローダー。

[コンポーネントが実行される前に処理を始める](/docs/routing/solid-router/data.md#start-work-before-the-component-runs)を参照してください。

### query

非同期関数を包んで名前を付けます。その名前と引数がキャッシュキーを構成し、キャッシュの存続期間中に同じキーで呼ばれたものはすべて1つのリクエストを共有します。

[`query` で読み取りをキャッシュする](/docs/routing/solid-router/data.md#cache-reads-with-query)を参照してください。

### ルート定義

パスパターン・レンダリングするコンポーネント・オプションの `preload`・`children`・マッチフィルター・メタデータを持つプレーンなオブジェクトです。ルート配列は `paths` と `params` の型の由来でもあります。

[ルート定義](/docs/routing/solid-router/route-definitions.md)を参照してください。

### 検索パラメーター（search params）

URL のクエリ文字列で、リフレッシュに耐え共有可能であるべき状態の適切な置き場所です。`useSearchParams` がそれらを読み書きし、ルートの `search` スキーマが文字列を型付きの値に変えます。

[検索パラメーターを型付けする](/docs/routing/solid-router/navigation.md#type-search-parameters)を参照してください。

### start モード

Vite プラグインの `start: true` オプションで、`App.tsx` と `Document.tsx` を中心にクライアントエントリー・サーバーエントリー・リクエストハンドラーを生成します。サーバー関数・ミドルウェア・リクエストイベントはその下で実行されます。

[3 つのレンダリングモードと1つのレイアウト](/docs/building-apps/app-structure.md#three-rendering-modes-one-layout)を参照してください。

### サブミッション

ルーターアクションの1回の実行です。送られた `input`、その `result` または `error`、`retry()` と `clear()` を持ちます。
`useSubmissions` は、結果またはエラーを生んだ完了済みサブミッションを返します。JavaScript なしで POST されたフォームから記録されたものも含みます。

[失敗したとき](/docs/routing/solid-router/data.md#when-it-fails)を参照してください。

### 型付きパス（typed paths）

ルートツリーから推論されるプロキシ `paths` です。`paths.products("mug")` はコンパイラにチェックされ、ルート名を変えればすべての呼び出し箇所が型エラーになります。

[`paths` で URL を組み立てる](/docs/routing/solid-router/navigation.md#build-urls-with-paths)を参照してください。

## ツーリングと診断

### アトリビューション

どのスコープが再実行されたか、何が変わってそれを引き起こしたか、どれくらいかかったかを記録する、開発ビルドの記録です。
有効にして挙動を再現し、`solid-js/attribution` の `why(scope)` に尋ねます。有効な間、Solid は `SILENT_HOLD` などのコストと応答性の検出も報告します。

[更新が多すぎる場合](/docs/guides/debugging-reactivity.md#something-updates-too-often)を参照してください。

### 開発ビルドと本番ビルド

開発ビルドは診断を出力し、`attribution.enable()` が呼ばれるとアトリビューションを記録し、サーバー関数から実際のエラーメッセージを返します。
本番ビルドは診断を取り除き、ブランドのないエラーを `Internal Server Error` に無害化します。サーバーで両者を分かつのは `NODE_ENV` ではなく `development` エクスポート条件です。

[変更前に測定する](/docs/guides/performance.md#measure-before-changing)と [スローされたエラーを処理する](/docs/building-apps/server-functions/mutations-and-responses.md#handle-thrown-errors)を参照してください。

### 診断コード

開発時コンソールの各行の先頭にある角括弧付きの名前です。`[STRICT_READ_UNTRACKED]` などです。
コードはリリース間で安定していて、その後の文はランタイムが観測したことを述べ、`in` の行はそれを生んだスコープまでのオーナーの連鎖を示します。

[診断を読む](/docs/guides/debugging-reactivity.md#read-a-diagnostic)を参照してください。
