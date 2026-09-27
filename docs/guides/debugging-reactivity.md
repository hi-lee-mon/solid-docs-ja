---
title: "リアクティビティのデバッグ"
version: "2.0"
description: "値が更新されない理由、逆に更新されすぎる理由、そして Solid の開発用診断の読み方を説明します。"
---

カート内の数量入力を変更したのに、隣の小計が変わりません。
あるいは小計は変わるのに、キー入力のたびにリストの全行まで変わってしまいます。
リアクティビティのバグにはこの2つの形があります。更新されるべきものが更新されないか、必要以上に頻繁に更新されるかです。
Solid の開発ビルドは前者を発生と同時に報告し、後者は要求に応じて説明できます。
このガイドでは、それらの報告の読み方と、何を直すべきかを説明します。

:::note[開発ビルドのみ]
このページの内容はすべて開発ビルドが必要です。
プロダクションビルドでは診断は取り除かれ、`DEV` エクスポートは `undefined` になります。
:::

## 診断を読む

開発ビルドは検出事項ごとに1件のコンソールエントリを出力します。角括弧付きのコードと、発生箇所を示す行が付きます:

```text
[STRICT_READ_UNTRACKED] Reactive value read directly in <LineItem> will not update.
Move it into a tracking scope (JSX, a memo, or an effect's compute function).
  in <App> › <Cart> › <LineItem>
```

コードはリリース間で安定しています。続く文は、ランタイムが観測した内容と何を直すべきかを示しています。
`in` の行は、ルートから検出を出したスコープまでのオーナーのチェーンです。コンポーネントは `<Name>`、計算は指定した `name` オプション、指定がなければデフォルトで `effect`/`computed` と表示されます。
検出が JSX バインディング（属性・class・style・挿入テキスト）に関するものの場合、コンソールエントリは書き込み先の DOM 要素を第2引数として持ちます。ブラウザーのコンソールでそれにホバーするとページ上の要素がハイライトされ、クリックすると Elements パネルにジャンプします。

各コードが初めて現れたとき、Solid は `solid-js` パッケージ内の `skills/reactivity-diagnostics/SKILL.md` に同梱されている修復ガイドへのフッターと、そのコードにアンカーされた GitHub 上の同一ファイルを指すリンクを追加します。

コードはいくつかのグループに分かれます:

- 誤った場所での読み取り: `STRICT_READ_UNTRACKED`、`PENDING_ASYNC_UNTRACKED_READ`
- 誤った場所での書き込み: `REACTIVE_WRITE_IN_OWNED_SCOPE`、`ACTION_CALLED_IN_OWNED_SCOPE`、`FLUSH_IN_ACTION`、`SERVER_WRITE`
- リーク: `NO_OWNER_EFFECT`、`NO_OWNER_BOUNDARY`、`NO_OWNER_CLEANUP`
- 非同期の配置: `ASYNC_OUTSIDE_LOADING_BOUNDARY`
- グラフサイズ（常時有効）: `HUGE_FAN_OUT`、`HUGE_FAN_IN`
- コスト（アトリビューション有効時のみ）: `HOT_SCOPE_RERUNS`、`WIDE_WRITE`、`ASYNC_WATERFALL`、`UNSTABLE_MEMO_OUTPUT`、`EFFECT_WRITES_OWN_SOURCE`、`EFFECT_RELAY_TEAR`、`IMMUTABLE_UPDATE_IN_STORE`、`UNSTABLE_LIST_IDENTITY`
- 応答性（アトリビューション有効時のみ）: `SILENT_HOLD`

各検出には3段階の重大度のいずれかが付きます。
error は例外を投げて実行を停止します。動作が壊れています。
warning はコンソールに記録されます。コードは動きますが、構造的に誤っているか、コストが高い状態です。
`info` の検出はコンソールにすら届きません。`OBSERVE.diagnostics.subscribe()` と `@solidjs/diagnostics` が読み取る構造化チャネルに記録されます。ランタイムに手がかりはあるものの、中断するほどの確証がないケース向けです。
意味を理解していないコードを黙らせてはいけません。どれも実際の欠陥か実際のコストを表しています。

## 更新されない場合

以下を順に確認してください。
最初の3つで大半の報告をカバーできます。

### 読み取りは追跡スコープの内側か?

コンソールで `[STRICT_READ_UNTRACKED]` を探してください。
見ているコンポーネントが名指しされている場合、シグナル・メモ・ストアのプロパティ・prop のいずれかがコンポーネント本体で読み取られています。
本体は一度だけ実行されます。追跡されるのは JSX 式・メモの関数・エフェクトの計算関数・`createSignal` と `createStore` の関数形式です。
読み取りをそこへ移すか、計算を関数で包んで JSX からその関数を呼んでください。
詳しい説明は [リアクティビティ](/concepts/reactivity) のページにあります。

props を分割代入した場合も同じ警告が出て、直し方も同じです。

### シグナルは呼び出されているか?

シグナルは関数です。
JSX 中の `{quantity}` は型エラーです。関数は有効な DOM の子ではないからです。`"Qty: " + quantity` は型チェックを通りますが、関数の文字列表現がレンダーされてしまいます。
コンポーネント内で、後ろに `()` のないシグナル名を検索してください。

### 書き込みはリアクティブな値に届いているか?

ストアはプロパティごとに追跡されます。
書き込みはセッター経由で行う必要があります:

```ts
const [cart, setCart] = createStore({ items: [] as Item[] });

// Avoid: a write to the proxy, which the store drops
cart.items.push(item);

// Prefer: a write to the setter's draft
setCart((draft) => {
	draft.items.push(item);
});
```

`Avoid` の版を実行しても何も起きません。エラーも警告もなく、リストも変わりません。

素のシグナルに保持されたオブジェクトでは逆の失敗になります。
`items().push(item)` は配列を実際に変更しますが、シグナルの値は同じ配列のままなので誰にも通知されません。`setItems((current) => [...current, item])` なら、シグナルに報告すべき新しい値を渡せます。
ネストされた更新については [ストア](/concepts/stores) のページを参照してください。

### エフェクトが誤ったフェーズで読み取っていないか?

`createEffect` が追跡するのは最初の関数だけです。
2番目の関数で読み取ったシグナルは、エフェクトを再実行させません:

```ts
// Avoid: price() is read in the untracked effect function
createEffect(
	() => quantity(),
	(value) => {
		document.title = `${value} × ${price()}`;
	}
);

// Prefer: read both in the compute function and hand the values across
createEffect(
	() => [quantity(), price()] as const,
	([value, unitPrice]) => {
		document.title = `${value} × ${unitPrice}`;
	}
);
```

`Avoid` の版を実行して価格を変更すると、数量も変わるまでタイトルは古い価格のままです。

### 値がまだ準備できていないのでは?

Promise を返したメモは、その Promise が確定するまで値を持ちません。
`Loading` バウンダリ内の JSX で読み取ればフォールバックが表示されますが、コンポーネント本体で読み取ると `[PENDING_ASYNC_UNTRACKED_READ]` が投げられます。
コンソールに `[ASYNC_OUTSIDE_LOADING_BOUNDARY]` が表示される場合、読み取りは追跡されていますが保留中状態を受け止めるものがなく、ルート全体が待たされます。
読み取りの上にバウンダリを追加してください。
[バウンダリ](/concepts/boundaries) を参照してください。

## 更新が多すぎる場合

ここで使う道具はアトリビューションです。再実行されたすべてのスコープ、原因となった変更、かかった時間を記録します。
調べたいスコープに名前を付け、アトリビューションを有効にして、動作を再現させてから、そのスコープがなぜ実行されたかを問い合わせます:

```ts
import { createMemo, createStore } from "solid-js";
import { attribution, why } from "solid-js/attribution";

const [cart, setCart] = createStore(initialCart, { name: "cart" });
const total = createMemo(() => sum(cart.items), { name: "total" });

attribution.enable();

// reproduce the interaction in the app, then:
for (const event of why(total)) {
	console.log(event.nodeName, event.causes, `${event.selfMs}ms`);
}
```

`solid-js/attribution` は開発ビルドと observe ビルドでは記録エンジンに解決され、プロダクションでは同じエクスポートを持つ無効化された双子に解決されるため、import はコードに残したままで構いません。

各エントリには、更新を始めた書き込み、変更された依存関係、再計算にかかった時間が示されます。
アトリビューション有効中は、同じチェーンが折りたたまれた `[why-run]` グループとしてコンソールにも出力されます。再実行ごとに1つずつ、原因チェーンと依存関係の変更が内側に入ります。
`costs()` はスコープを自己時間でランク付けします（結果が変わらなかった実行に費やした時間も含みます）。また書き込みを、それぞれが引き起こした下流の作業量でランク付けします。
`why`・`costs`・`feedback`・`subscriptions` は `solid-js/attribution` の別々のエクスポートなので、記録だけを行うビルドにはそれらは含まれません。`attribution` オブジェクト自体は `enable()`・`subscribe()`・`history()`・`waterfalls()`・`holds()`・`interactions()`・`navigations()` を持ちます。

チェーンはシグナル名で終わるのではなく、根本の書き込みを行ったものまで遡ります。
コンパイルされたイベントハンドラー内で行われた書き込みにはインタラクションのスタンプ（`click on button#add "Add"`）が付きます。そのため、再実行時の `event.interaction` は、途中でいくつのエフェクトが中継したとしても、遡った先のクリックを名指します。
エフェクトやアクションからの書き込みにはそのエフェクトやアクションのスタンプが付き、タイマーやモジュールスコープからの書き込みは `external` と表示されます。

アトリビューション有効中、Solid は以下のパターンも自動的に警告します。
各警告にはスコープと原因が示されるため、通常は `why` に問い合わせる必要はありません。

:::tip[記録する前にスコープに名前を付ける]
すべてのレポートと `why` チェーンは、ノードを `name` オプションで参照します。名前のないメモは `computed`、名前のないエフェクトは `effect`、名前のないシグナルは `signal` と表示されます。
調査対象のスコープには先に名前を付けてください。匿名ノードのチェーンは追いにくいです。
:::

よくある原因とその直し方:

### メモが使う以上のものに依存している

ストアオブジェクト全体を読み取るメモや、それをスプレッドするメモは、すべてのプロパティに依存します。
メモの内側で、計算に必要なプロパティだけを読み取り、それ以外は読まないでください。
`subscriptions(total)` はスコープの現在の依存関係を列挙するので、計算が実際に使っているものと比較できます。

### 序盤のリンクに等価バウンダリがないためにチェーンが再計算される

素の派生関数は、入力が変わるたびに読み手ごとに再計算し、結果が同じでも下流へ再計算を伝えます。
結果が変わらないことが多い場合、複数の読み手が共有する場合、下流の処理が重い場合は、そのリンクを `createMemo` にしてください。
メモは結果を前回と比較し、等しければ読み手に通知しません。

何でもメモ化してはいけません。
メモはグラフ内のノードと実行ごとの比較のコストがかかります。読み手が1つだけの安い式なら、関数のほうが小さく速いです。

### メモが前回と同じ内容の新しいオブジェクトを返している

`[UNSTABLE_MEMO_OUTPUT]` は、メモが何回も連続して前回と同じ内容の新しい配列やオブジェクトを返したときに発生します。
メモの等価チェックは参照で比較するため、再計算を吸収できず、すべての読み手が無駄に実行されます。
変化がないときは同じ参照を返すか、データをストアに保持するか、内容で比較する `equals` オプションを渡してください。

### 書き込みが変わっていないオブジェクトを置き換えている

`setItems(await fetchItems())` は全アイテムを新しいオブジェクトに置き換えるため、アイテムを読んでいるすべての行が作り直されます。
`reconcile` を使うストアで新しいデータを既存オブジェクトにマージすれば、変更されたプロパティだけが読み手に通知します。
[ストア](/concepts/stores) を参照してください。

同じ失敗のストア版はスプレッドによるコピーです:

```ts
// Avoid: a fresh array to add one item, so every reader of items re-runs
setCart((draft) => {
	draft.items = [...draft.items, next];
});

// Prefer: change the draft, which notifies readers of the new index and the length only
setCart((draft) => {
	draft.items.push(next);
});
```

`Avoid` の版を実行すると、アイテム1つの追加のために `items` パスの全読み手が再実行されます。アトリビューションはこれを `[IMMUTABLE_UPDATE_IN_STORE]` と報告します。
これは、ストアのパスが、葉の値がほとんど以前と同じコンテナで置き換えられたときに発生します。
ストアは各葉をすでに追跡しています。新しいコンテナは、動いた1枚の葉のためにパスの全読み手を再実行させます。
ドラフトを変更するか、サーバーから新しいツリーとして届くデータには `reconcile()` を渡してください。

### リストが同じレコードの行を作り直している

`[UNSTABLE_LIST_IDENTITY]` は、`For` や `mapArray` の更新が、置き換え前とフィールド単位で同じアイテムを持つ行を破棄して作り直したときに発生します。
リストはオブジェクトの同一性でキー付けされており、再取得が同じレコードに新しいオブジェクトを渡したため、すべての行の DOM と状態が捨てられて作り直されました。
レコードの id でリストにキーを付けるか、データをストアに reconcile してオブジェクトの同一性を保つか、上流で id によりキャッシュしてください。
リストにすでにキー関数があるのに警告が出る場合、メッセージは代わりにキー関数を指します。呼び出しごとに新しいもの（インデックスやオブジェクトなど）を返しているのです。
[リストのガイド](/guides/lists#keep-row-identity-across-updates) に両方の直し方があります。

### エフェクトが別スコープの派生元となるシグナルに書き込んでいる

エフェクト内の書き込みはすべて、最初の更新が反映された後に2回目の更新をスケジュールするため、コピーされた値の読み手は変更ごとに2回実行され、その間に中間状態を見ることになります。
アトリビューションはこれをグラフから証明し、`[EFFECT_RELAY_TEAR]` と報告します。読み手は1つの根本的変更に対して2回実行されました。1回目はソースが変わったフラッシュで、2回目はエフェクトが中継した後です。その間のフレームは、新しいソースと古いコピーが並んだ画面を見せました。
エフェクトが入力をそのままコピーし、対象シグナルに書き込むものが他にない場合、その値は1フラッシュ遅れで維持される派生状態です。メモにして、エフェクトは削除してください。
書き込みがレイアウトや時計のようなグラフ外のものを読んでいる場合、メッセージはその旨を伝えます。この場合の tear は計測のコストであり、エフェクトは残します。
[不要なエフェクトを避ける](/guides/avoid-unnecessary-effects#let-external-observations-become-new-inputs) では、このケースを `onSettled` で書いた例と、派生に置き換えられる例を順に説明しています。

### エフェクトが自分の書き込みで再実行されている

`[EFFECT_WRITES_OWN_SOURCE]` は、エフェクトが書き込んだシグナルやストアが、直接またはいくつかのメモを経由してエフェクト自身の入力に戻ってくるときに発生します。
ランタイムは最終的に落ち着きますが、変更ごとに余分なフラッシュがかかり、その間画面には書き込み前の値が表示されます。
書き込まれる値はエフェクトが読むものの関数なので、メモに入れるべきです。あるいは、正規化はソースが書き込まれる場所で行うべきです。
2つ以上のエフェクトがリング状に書き込みを中継し合う場合、1つのエフェクトを責める代わりに、`info` 重大度のレポート1件でリング全体が名指しされます。

## クリック後に画面が反応しなく見える

書き込みが非同期処理に着地すると、Solid はデータが確定するまでその書き込みとそこから派生するすべてを保留します。そのため、ページに中途半端に適用された更新が表示されることはありません。
この保留は正しい動作ですが、画面上でそれを示すものが何もなければ、リクエストが終わるまでインタラクションは壊れているように見えます。

アトリビューション有効中、Solid はこれを `[SILENT_HOLD]` と呼びます:

```text
[SILENT_HOLD] click on button#next "Next →" wrote selectedId; the write was held 640ms
waiting on product and the screen showed nothing for the wait: no isPending()/latest()
reader downstream, no optimistic value, no affects() mark, and no effect ran while it
was held — the interaction was dead for 640ms.
```

保留が開いている間、以下のいずれも成立しない場合、その保留は「silent」（音沙汰なし）です。保留中のグラフへの `isPending()` や `latest()` の読み取り、楽観的な値、`affects()` 宣言、実行されて描画されたエフェクトのいずれもない状態です。
100ms 未満の保留は記録されますが報告されません。100ms からは `info`、200ms からは warning になります。
両方のしきい値は `attribution.enable({ holds: { infoMs, warnMs } })` のオプションで変更できます。

直し方は常にフィードバックを追加することであり、保留を外すことではありません:

- 結果がレンダーされる場所で `isPending(source)` を読み取り、更新中の状態を表示する。
- 選択行のように即座に動くべき UI 部分には `latest(source)` を読み取らせる。
- アクション内で期待される結果を `createOptimistic` や `createOptimisticStore` に書き込む。
- その処理が UI の読んでいるデータを変更する場合は `affects(source)` を宣言する。

それぞれの説明は [非同期リアクティビティ](/concepts/async-reactivity#another-answer-is-coming-ispending) にあります。

まだコンテンツを表示していない `Loading` バウンダリや、`on` の値が変わったバウンダリは別の状況です。読み取りは保留に入る代わりにフォールバックを表示するため、報告すべき `SILENT_HOLD` はありません。
すでにコンテンツを表示したバウンダリは、他と同じように保留に入ります。
`on` 付きのバウンダリでも、その外側の何かが同じ変更を待っている場合は同様です。更新はとにかく保留され、フォールバックは表示されず、レポートはクリックが待っていたソースを名指します。そのソースをバウンダリの外で読んでいる場所を探してください。
フィードバックはあったものの長く続いた保留は、500ms の待機から `[LONG_HOLD]` と報告され、1000ms からは warning になり、`Loading on={...}` バウンダリの追加が提案されます。しきい値は `attribution.enable({ longHolds: { infoMs, warnMs } })` で変更できます。
それより短い確認済みの保留は、フィードバックテーブルに `late` として記録されます。正しく待機したコードを責めずにコストを可視化するためです。

:::deep-dive[フィードバックテーブルと、ルーターが保留に名前を付ける仕組み]
`attribution.holds()` はセッション中のすべての保留を返します。報告の有無に関わらず。
`feedback()` は保留と再実行を、悪い順に並んだテーブルに集約します:

- `sources`: 非同期ソースごとに、引き起こした保留の数、そのうち silent だった数、残りを受け止めたフィードバック手段。
- `interactions`: ユーザーイベントごとに、引き起こした再実行時間と保留された時間。インタラクションが遅く感じられる2つの側面です。
- `flights`: 非同期ソースごとに、開始・着地・着地前に放棄されたリクエスト数。放棄数が多いのは、キー入力ごとにリクエストを送っている兆候です。
- `fallbacks`: `Loading` バウンダリごとに、フォールバックが表示された頻度と時間、そのうち 150ms 未満のちらつきだった回数。

ルーターは、ナビゲーションが引き起こす保留に、マッチしたルートパターン（`/products/mug` ではなく `/products/:id`）で名前を付けられます。これにより、これらのテーブルで発生がまとめて集約されます。
これは、ロケーションへの書き込みを `OBSERVE.attribution.withOrigin({ kind: "navigation", name, to, params }, write)` で包むことで実現します。これはルーター非依存で、アトリビューションの他の部分はルーティングを知りません。
[attribution リファレンス](/reference/solid-js/advanced/diagnostics-dev-hooks/attribution#navigationref) には `NavigationRef` のフィールドと、書き込み時点でマッチが確定していないルーターが後からフィールドを埋める方法が説明されています。
:::

## テストが古い DOM を見る

Solid は、現在のコードが終わった後で書き込みをバッチ適用します。
イベントを発火させて次の行でアサートするテストは、バッチが適用される前にアサートしてしまいます:

```tsx
fireEvent.click(button);
flush(); // apply staged writes and run effects now
expect(button).toHaveTextContent("Clicks: 1");
```

`flush` は `solid-js` から import します。
アプリケーションコードが呼ぶことは通常ありません。呼ぶのはテストや命令的な統合です。
テスト環境の残りのセットアップは [テスト](/guides/testing) ガイドを参照してください。

`flush()` はキューに溜まった書き込みを流しますが、非同期処理は待ちません。
テスト内の非同期メモのように、追跡スコープの外から1つのリアクティブ式を await するには [`resolve(fn)`](/reference/solid-js/advanced/interop-async/resolve) を使います。最初に確定した値で resolve するか、式のエラーで reject します:

```ts
const product = await resolve(() => productMemo());
```

`flush()` を置いてはいけない場所の1つがアクション本体の内側です:

```text
[FLUSH_IN_ACTION] flush() inside an action body is not allowed. An action's writes are held in its
transaction and commit when the action settles: flush() cannot reveal them, and draining here would
detach the writes that follow from the transaction.
```

アクションの書き込みはアクションが resolve するまで保持されるため、途中の `flush()` には見せるものがなく、それ以降の書き込みをトランザクションから切り離してしまいます。
`flush()` を削除し、アクションの Promise が resolve してからアサートしてください。
開発ビルドでは例外が投げられます。プロダクションでは drain をスキップし、コールバックがあればトランザクション内で実行します。

## サーバーでの書き込みが何もしなかった

```text
[SERVER_WRITE] Writing a signal on the server is deprecated and will become an error.
Server render is pure: state changes flow from async sources (promises, async iterables), never setters.
```

サーバーレンダーは入力から HTML への1パスです。
そのパス中に呼ばれたセッターは無効なデータとして着地し、何も更新されません。この書き込みは、サーバーには存在しないクライアント側の更新ループをコードが期待している兆候です。
直し方は書き込みの目的によって異なります:

- サブスクリプションや Promise をシグナルへ橋渡しする場合: `createSignal(() => source)` や `createStore(async () => ..., seed)` のようにソース自体を値にして、サーバーとクライアントで同じ読み方になるようにします。
- 楽観的状態: 意味を持つのはクライアントだけで、非同期処理が確定すると元に戻ります。
  サーバーの出力は確定済みの状態なので、そこでの書き込みは no-op です。

この警告は書き込みごとではなくカテゴリごとに1回だけ発生するため、最初の1件を直すと次の1件が現れることがあります。

## エラー後にすべての更新が止まる

どのバウンダリにもキャッチされない計算内で投げられたエラーは、リアクティブシステムを停止させます:

```text
[REACTIVITY_HALTED] An uncaught error halted the reactive system. No further updates will be processed.
Handle errors with createErrorBoundary/<Errored> or treat this as a crash.
```

この後、リロードするまでページ上の何も更新されなくなります。
失敗しうるツリーの部分を [`Errored`](/reference/solid-js/components-jsx/errored) バウンダリで包んでください。障害がそこに閉じ込められ、アプリの残りは動き続けます。
配置場所は [バウンダリ](/concepts/boundaries) で説明しています。

## テストでリグレッションをチェックする

`@solidjs/diagnostics` はシナリオ実行中の診断チャネルとアトリビューションチャネルを記録し、アサーションに変換します。
開発依存として追加し、セットアップファイルから Vitest マッチャーを import します:

```ts
// vitest-setup.ts
import "@solidjs/diagnostics/vitest";
```

そしてシナリオをキャプチャします:

```ts
import { captureArtifact } from "@solidjs/diagnostics";
import { render, fireEvent } from "@solidjs/testing-library";
import { flush } from "solid-js";
import { expect, test } from "vitest";

import Cart from "./Cart";

test("adding an item recomputes the total once", async () => {
	const { artifact } = await captureArtifact(
		() => {
			const { getByRole } = render(() => <Cart />);
			fireEvent.click(getByRole("button", { name: "Add" }));
			flush();
		},
		{ scenario: "add-item" }
	);

	expect(artifact).toHaveNoDiagnostics();
	expect(artifact).toStayWithinRerunBudget(1, { scope: "total" });
	expect(artifact).toHaveNoWaste();
	expect(artifact).toHaveNoSilentHolds();
});
```

`toHaveNoDiagnostics` は、シナリオ中にコード付きの警告が1つでも発生するとテストを失敗させます。追跡されていない読み取りやリークしたエフェクトが、誰も読まないコンソールの1行ではなく赤いテストになります。
`info` の検出では失敗しません。
再実行バジェットと waste のチェックは2番目の種類のバグを捉えます。スコープの再計算を以前より増やしてしまう変更です。
`toHaveNoSilentHolds` は応答性のゲートです。書き込みが非同期処理で保留され、画面上の何も待機を示さなかった場合に失敗します。メッセージにはインタラクション、保留された書き込み、待っていたソースが示されます。
`toStayWithinHoldBudget(ms)` は、確認の有無に関わらずすべての保留に上限を設けます。

アーティファクトには `attribution.holds` と `attribution.feedback`（`holds()`・`feedback()` メソッドが返すのと同じデータ）も含まれるため、テストはそれらを直接アサートできます。
バジェットファイルでは、再実行制限と並べて `maxSilentHoldMs` と `maxHoldMs` を指定できます。

`@solidjs/diagnostics` が `package.json` にあれば、Vite プラグインは同じキャプチャ機能を開発サーバーの `/__solid/diagnostics` で提供するため、スクリプトやエージェントが実行中のアプリに対してシナリオを記録できます。
無効にするにはプラグインオプションで `diagnostics: false` を設定します。

## まとめ

- まず角括弧のコードを読みます。リリース間で安定しており欠陥を指し、`in` の行はそれを出したスコープを指します。
- 値が更新されない場合は順に確認します。読み取りが追跡スコープ内か、シグナルが呼ばれているか、書き込みがセッター経由か、読み取りがエフェクトの計算関数内か、値が保留中ではないか。
- 更新が多すぎる場合は、スコープに名前を付け、アトリビューションを有効にし、再現して、`why(scope)` に問い合わせます。
- ストアのドラフトではプロパティ1つだけを変更します。スプレッドコピーや新しい配列は、そのパスの全読み手を再実行させます。
- 状態をコピーしているエフェクトはメモに置き換えます。エフェクトを残すのは、書き込みがグラフ外の何かを記録するときだけです。
- クリックが反応なしに見えるときは、`isPending`・`latest`・楽観的な値・`affects` でフィードバックを追加します。保留を外してはいけません。
- `flush()` はテストでイベント発火の後に呼びます。アクション本体の内側では決して呼びません。
- 例外を投げうるサブツリーは `Errored` バウンダリで包みます。キャッチされないエラーはすべての更新を停止させます。

## 次のステップ

- [リアクティビティ](/concepts/reactivity): 診断が強制するルール。
- [不要なエフェクトを避ける](/guides/avoid-unnecessary-effects): ほとんどの書き込み配置警告への対処法。誤った版と正しい版を並べて示しています。
- [ストア](/concepts/stores): プロパティごとの追跡、`reconcile`、書き込みパスが重要な理由。
- [パフォーマンス](/guides/performance): 余分な実行が遅さにもつながる場合、各アトリビューションテーブルが指す調整ポイント。
- [オブザーバビリティ](/guides/observability): プロダクションの observe ビルドで同じ記録とエラーフックを使う方法。
- [テスト](/guides/testing): 診断が動作するテスト環境。
