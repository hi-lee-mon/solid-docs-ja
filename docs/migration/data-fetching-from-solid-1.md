---
title: "Solid 1 のデータフェッチ"
version: "2.0"
description: "Solid 1 のデータ読み込みパターンを一度に 1 フェッチずつ非同期の計算へ移し、更新を待たせるか・薄く表示するか・プレースホルダーを見せるかをフェッチごとに決める。"
---

Solid 1 からの移行の大半は改名と形の調整です。エフェクトを分割し、ストアのセッターを変換し、`Suspense` を `Loading` に置き換える。
しかしデータフェッチは違います。
`createMemo(async () => ...)` は `createResource` を儀式めいた部分を省いたもののように見え、1 ページに 1 つのメモという規模なら実際その通りです。
アプリケーション全体では、画面がいつ更新されるかが変わります。しかもその変化は静かです。エラーも警告もなく、アプリはこれまで待ったことのない場所で待つようになります。

このページは、Solid 1 のアプリですでに機能する形でデータをフェッチしているチーム向けです。
よくあるパターンに名前を付け、それぞれを Solid 2 でも変えずに動かし続ける方法を示し、変換したときに何が変わるかを示したうえで、フェッチごとに選択できるようにします。
これは目的地ではなく経路です。協調する動作は新しいコードにとってよりよいデフォルトであり、その理由は[非同期リアクティビティ](/docs/concepts/async-reactivity.md)のページで説明しています。
フェッチ以外のすべては[移行ガイド全般](/docs/migration/from-solid-1.md)が扱っています。

## 何が変わるか

Solid 1 では、フェッチとそのコンシューマーをつなぐのはあなたでした。
エフェクトやリソースがリクエストを開始し、シグナル・ストア・リソース自身のいずれかが結果を受け取り、JSX がそれを読んでローディングフラグを確認していました。
Solid はリクエストと値が関連していることを知らないため、入力への書き込みがあると各コンシューマーがそれぞれのスケジュールで反応していました。

Solid 2 では、非同期の計算はグラフ内の値です。
Solid はそれがどの入力に依存しているかを知っており、まだ回答を持っていないときも分かっています。
そこから生じる、最も身に付けるべき結論はこれです。**非同期の計算の入力への書き込みは、その計算が次の回答を得るまで保留され、同じ更新内の他のすべても一緒に待ちます。**

ダッシュボードで違いが分かります。
期間セレクターが 3 つのパネルに入力を供給し、リクエストにはそれぞれ 200 ミリ秒、1 秒、10 秒かかるとします。

```tsx
const [period, setPeriod] = createSignal("2026-Q2");

<PeriodSelect value={period()} onChange={setPeriod} />
<SummaryPanel period={period()} />   // 200 ms
<TrendPanel period={period()} />     // 1 s
<AuditPanel period={period()} />     // 10 s
```

Solid 1 のフェッチでは、期間を変えるとセレクターは即座に切り替わり、各パネルは自分のリクエストが届き次第内容を置き換えます。
その 10 秒間、サマリーは新しい期間を表示し、その横で監査ログは古い期間を表示し続けます。

3 つの非同期メモの場合、`period` への書き込みは保留されます。
セレクターと 3 つのパネルすべてが古い内容を保持し、10 秒後にすべてが一体として切り替わります。
ページが自分自身と矛盾することはありません。
速いパネルは遅いパネルを待ちます。そしてクリックを受理したことを示すものがなければ、その 10 秒間ページは反応しないように見えます。

すべての画面に正しい一方の答えはありません。
合計が一致しなければならない数値、詳細ページ、フォームは一体として変わるべきです。
独立したウィジェットはそうである必要はありません。
Solid 2 はどちらのための道具も提供しますが、デフォルトは移動しました。移行したアプリは新しいデフォルトをあらゆる場所で一度に引き継ぎます。
このページの残りでは、その選択を一度に 1 フェッチずつ意図的に行う方法を説明します。

## この順序で移行する

1. **フェッチのやり方を変えずに、アプリを Solid 2 で動かす。**
   エフェクトを計算フェーズとエフェクトフェーズに分割し、書き込みが即座に見えることを前提にしている読み取りを修正し、`onMount` と `Suspense` を置き換えます。
   フェッチのコードは形もタイミングも維持します。
   ここでテストしてください。これがベースラインです。
2. **一度に 1 フェッチずつ非同期の計算に変換する。**
   それぞれについて、再フェッチ中にユーザーに何を見せるべきかを、下の[表](#decide-per-fetch)で決めます。
   ページ上で単独で成立している、保留が見た目に何も変えないフェッチから始めます。
3. **グラフが代わりにやってくれるようになったものを削除する。**
   ローディングフラグ、置き換えられたリクエストのキャンセル、古い結果へのガードは、各フェッチが変換されるにつれて不要になります。

すべてのフェッチを 1 回のコミットで変換しないでください。
保留はグラフの性質なので、チェーンの中の最後の非同期でないリンクが変換されたときに現れます。それは編集しているコードから遠く離れた場所かもしれません。

## パターン: エフェクト・ストア・ローディングフラグ

この形は `Suspense` を採用しなかった Solid 1 アプリケーションでよく見られます。

```tsx
// Solid 1
function TabPanel() {
	const [global] = useGlobalStore();
	const [tabData, setTabData] = createStore<TabData>({ rows: [] });
	const [isLoading, setIsLoading] = createSignal(true);

	const fetchTabData = async () => {
		setIsLoading(true);
		const response = await TabAPI.get(global.period, global.department.id);
		if (response.success) setTabData(response.result);
		setIsLoading(false);
	};

	onMount(fetchTabData);
	createEffect(
		on(
			[() => global.period, () => global.department.id, reloadSignal],
			fetchTabData,
			{
				defer: true,
			}
		)
	);

	return (
		<Show when={!isLoading()} fallback={<LoadingIndicator />}>
			<TabRows rows={tabData.rows} />
		</Show>
	);
}
```

### ステップ 1: そのまま動かし続ける

Solid 2 のエフェクトには 2 つのフェーズがあります。
計算フェーズは読み取りを追跡して値を返します。エフェクトフェーズはその値を受け取り、追跡されずに実行され、命令的な処理を行うことができ、クリーンアップを返すこともできます。
エフェクトは作成時に一度実行されるため、`onMount` の呼び出しはエフェクトに畳み込まれます。

```tsx
// Solid 2, same behavior
function TabPanel() {
	const [global] = useGlobalStore();
	const [tabData, setTabData] = createStore<TabData>({ rows: [] });
	const [isLoading, setIsLoading] = createSignal(true);

	createEffect(
		() => [global.period, global.department.id, reloadSignal()] as const,
		([period, departmentId]) => {
			const controller = new AbortController();
			setIsLoading(true);
			TabAPI.get(period, departmentId, controller.signal).then((response) => {
				if (controller.signal.aborted) return;
				if (response.success) setTabData(reconcile(response.result));
				setIsLoading(false);
			});
			return () => controller.abort();
		}
	);

	return (
		<Show when={!isLoading()} fallback={<LoadingIndicator />}>
			<TabRows rows={tabData.rows} />
		</Show>
	);
}
```

これは動作し、診断も出力されません。
エフェクトフェーズからシグナルやストアへ書き込むのは、エフェクトフェーズ本来の役目であり、[`createEffect`](/docs/reference/solid-js/reactivity/create-effect.md) のリファレンスもアボートのクリーンアップ付きのフェッチを例に使っています。
グラフは `tabData` がリクエスト由来だとは知らないため、何も保留されません。期間への書き込みは即座にコミットされ、パネルはインジケーターを表示し、行はレスポンスが届き次第置き換わります。
これは Solid 2 の上での Solid 1 の動作です。

これは通過点であり、止まる場所ではありません。
グラフはこのフェッチを見えていないため、[`isPending`](/docs/reference/solid-js/reactivity/is-pending.md)、[`refresh`](/docs/reference/solid-js/lifecycle-actions/refresh.md)、[`Errored`](/docs/reference/solid-js/components-jsx/errored.md)、サーバーストリーミングは適用されず、ローディングフラグ、キャンセル、古いレスポンスへのガードをあなたが持ち続けることになります。
[不要なエフェクトを避ける](/docs/guides/avoid-unnecessary-effects.md)ガイドは新しいコードでこの形を使うことに反対しており、その主張は有効です。
すでに 50 個あるアプリにとっては、これが安全な最初のコミットです。

### ステップ 2: 変換し、再フェッチの動作を選ぶ

非同期版はフラグ、キャンセル、ガードを取り除きます。

```tsx
function TabPanel() {
	const [global] = useGlobalStore();
	const [tabData] = createStore<TabData>(
		async () => {
			const response = await TabAPI.get(global.period, global.department.id);
			if (!response.success) throw new Error(response.error);
			return response.result;
		},
		{ rows: [] }
	);

	return (
		<Loading fallback={<LoadingIndicator />}>
			<TabRows rows={tabData.rows} />
		</Loading>
	);
}
```

`createStore(async fn, seed)` は入力を読み取り、レスポンスを待ち、結果をストアへ突き合わせるため、`TabRows` は変わった行だけを再レンダーします。
より新しい実行に置き換えられた実行は Solid が破棄します。`AbortController` はその仕事を手動でやっていました。
失敗したレスポンスは throw されるため、最も近い `Errored` バウンダリがそれを表示し、リトライできます。
`reloadSignal()` は `refresh(tabData)` になります。

ここで[最初のセクション](#what-changes)の動作変更が適用されます。
最初の読み込みではやはり `LoadingIndicator` が表示されます。
`global.period` が変わっても、インジケーターは戻ってきません。古い行は画面に残り、`period` への書き込みは保留され、行はレスポンスが届いたときに入れ替わります。
他のパネルが同じ期間を読んでいれば、すべてが一緒に入れ替わり、セレクターもそれらと一緒に待ちます。

このパネルが再フェッチ中に何をすべきかを決めます。

- **古い行を残し、薄く表示する**。新しい行の読み込み中。
  これがデフォルトであり、協調する動作です。
  待っていることが見えるようにインジケーターを追加します。

  ```tsx
  <Loading fallback={<LoadingIndicator />}>
  	<div class={{ refreshing: isPending(() => tabData.rows) }}>
  		<TabRows rows={tabData.rows} />
  	</div>
  </Loading>
  ```

- **インジケーターを再表示する**。Solid 1 版がそうしていたように、パネルの対象が変わったときに。
  その対象をバウンダリの `on` prop で指定します。

  ```tsx
  <Loading
  	on={`${global.period}/${global.department.id}`}
  	fallback={<LoadingIndicator />}
  >
  	<TabRows rows={tabData.rows} />
  </Loading>
  ```

  期間や部署が変わると、このバウンダリはフォールバックを表示し、更新を保留する代わりに自分で待ちを処理します。
  このパネルはもはやセレクターの更新を妨げません。
  `on` なしで同じ期間を読んでいる他のパネルは依然として更新を保留するため、独立して振る舞うべき各パネルに `on` を付けてください。
  バウンダリは `on` の値を同一性で比較するため、複数の入力は配列ではなく 1 つの文字列や数値に結合してください。

Solid 1 の `<Show when={!isLoading()}>` を文字通り訳すと、`Loading` バウンダリの内側の `<Show when={!isPending(() => tabData.rows)} fallback={<LoadingIndicator />}>` です。
これは動きます。再フェッチが保留中のあいだ内容はアンマウントされ、それによってパネルが更新を保留することも止まります。
対象の変更でパネルをリセットすべき場合は `on` を優先してください。`on` は `refresh` のような同じ対象への再フェッチでは内容をアンマウントしないからです。

## パターン: `createResource` と `Suspense`

```tsx
// Solid 1
const [user] = createResource(() => params.id, fetchUser);

<Suspense fallback={<UserSkeleton />}>
	<UserProfile user={user()} />
</Suspense>;
```

リソースを非同期メモに、バウンダリを `Loading` に変換します。

```tsx
// Solid 2
const user = createMemo(() => fetchUser(params.id));

<Loading fallback={<UserSkeleton />}>
	<UserProfile user={user()} />
</Loading>;
```

`user()` の型は `User | undefined` ではなく `User` であり、バウンダリは `Suspense` と同じように最初の読み込みを処理します。

変わるのは再フェッチです。
Solid 1 では、`params.id` を変えるとリソースが再フェッチされ、その変更が `startTransition` の中で起きない限り、バウンダリはフォールバックを再表示していました。
チームは `user.latest` を使うか、ナビゲーションをトランジションで包むことでこれを回避していました。
Solid 2 では保留される更新がデフォルトです。古いユーザーは画面に残り、書き込みは保留され、準備ができたときに新しいユーザーが置き換わります。
`resource.latest` に相当するものはありません。それが今や通常の読み取りの動作だからです。

すでに協調モデルに近かったため、ほとんどのリソースと `Suspense` のコードは改名だけで済みます。
Solid 1 の再フェッチ時フォールバックが意図した設計だった場所、たとえば別のユーザーのデータの上に一人のユーザーの名前を表示すべきでないプロフィールページでは、`on` を使います。

```tsx
<Loading on={params.id} fallback={<UserSkeleton />}>
	<UserProfile user={user()} />
</Loading>
```

保留される動作を得るために `startTransition` を使っていた場所では、それを削除してください。その動作は今やデフォルトであり、[`isPending`](/docs/reference/solid-js/reactivity/is-pending.md) が `useTransition` の保留中フラグの代わりになります。

リソースの他のメンバーの対応は次の通りです。

| Solid 1                      | Solid 2                                                                                                                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 初回読み込み時の `user.loading` | `Loading` バウンダリ                                                                                                                                                                |
| 再フェッチ時の `user.loading`   | `isPending(user)`                                                                                                                                                                   |
| `user.error`                 | `Errored` バウンダリ                                                                                                                                                                |
| `refetch()`                  | [`refresh(user)`](/docs/reference/solid-js/lifecycle-actions/refresh.md)。再読み込みを保留中として表示したい場合は先に [`affects(user)`](/docs/reference/solid-js/lifecycle-actions/affects.md) を追加 |
| `mutate(value)`              | [`createOptimistic`](/docs/reference/solid-js/reactivity/create-optimistic.md) を使う `action`                                                                                              |
| `user.latest`                | 通常の読み取り                                                                                                                                                                      |

## パターン: `.loading` 付きの `createResource`（`Suspense` なし）

```tsx
// Solid 1
const [orders] = createResource(() => filters(), fetchOrders);

<Show when={!orders.loading} fallback={<Spinner />}>
	<OrderTable orders={orders()!} />
</Show>;
```

これはフラグ付きの値として使うリソースで、[エフェクトのパターン](#pattern-an-effect-a-store-and-a-loading-flag)と同じように振る舞います。初回読み込みと毎回の再フェッチでスピナーが表示され、各テーブルがそれぞれのスケジュールで更新されます。

変換は上と同じで、同じ選択が適用されます。

```tsx
// Solid 2
const orders = createMemo(() => fetchOrders(filters()));

<Loading on={filters()} fallback={<Spinner />}>
	<OrderTable orders={orders()} />
</Loading>;
```

`on` を付けると、フィルターの変更はスピナーを表示し、更新を保留しません。これが Solid 1 の動作です。
`on` なしでは、古いテーブルが残り、新しい注文が届くまで更新が保留されます。それを示すには `isPending(orders)` を追加します。

初回読み込みの分岐をバウンダリではなく自分の JSX に置かなければならない場合、たとえばスピナーがテーブル自身のレイアウトの一部である場合は、`loadingValue` でプレースホルダーを宣言します。

```tsx
const orders = createMemo<Order[] | undefined>(() => fetchOrders(filters()), {
	loadingValue: undefined,
});

<Show when={orders()} fallback={<Spinner />}>
	{(loaded) => <OrderTable orders={loaded()} />}
</Show>;
```

プレースホルダーは最初の結果が来る前にソースの代わりに回答するため、読み取りは `Loading` バウンダリに届かず、`Show` が何をレンダーするかを決めます。
再フェッチは依然として上記の通りに動作します。
これに頼るのはバウンダリが合わないときだけにしてください。初回読み込みを表現するならバウンダリのほうが明確です。

## パターン: Solid Router の `createAsync` と `cache`

Solid 1 のルーターのデータ読み込みはリソースの上に成り立っていたため、`Suspense` 付きの `createAsync` は[リソースのパターン](#pattern-createresource-with-suspense)と同じように振る舞います。再フェッチ動作の変更も含めて。
`createAsync(() => getUser(params.id))` を `createMemo(() => getUser(params.id))` に、`cache` を `query` に置き換えます。
ルートナビゲーションは Solid 1 ですでにトランジションの内側で実行されていたため、ナビゲーション中に内容が保持されていたルートはその動作を維持します。

[Solid Router 移行ガイド](/docs/migration/from-solid-router.md#migrate-data-loading-and-caching)が API の変更を説明しており、[データ読み込みとミューテーション](/docs/routing/solid-router/data.md)が Solid 2 の `query`、`preload`、再検証を説明しています。

## フェッチごとに決める

デザイナーが答えられる問いを立ててください。**このデータが再フェッチされているあいだ、ユーザーには何が見えるべきか?**

| ユーザーに見えるべきもの                                                   | 使うもの                                                  |
| ---------------------------------------------------------------------- | -------------------------------------------------------- |
| 入力に依存するすべてが準備できるまで何も変わらない                          | デフォルト。待ちが見えるように `isPending` を追加        |
| 触れたコントロールには今すぐ入力を反映し、内容は待つ                       | コントロールに `latest`、内容を薄くするのに `isPending`   |
| 変わった対象の内容の代わりにプレースホルダー                              | その内容を `<Loading on={key}>` で囲む                    |

最初の 2 行は同じ画面を説明しています。タブは即座にハイライトされ、内容は薄くなり、準備ができたときに内容が入れ替わります。
[非同期リアクティビティ](/docs/concepts/async-reactivity.md#what-the-hold-means-for-a-shared-input)にそれぞれの要素が示されています。

ウィジェットへの有用なテスト: 前の期間の数値がスピナー付きで 5 秒間表示されたら、それは問題ないか、間違いか?
問題ないなら、そのウィジェットは独立しており、`on` でも薄く表示する保留でもどちらでも構いません。
間違いなら、そのウィジェットは一貫したビューの一部であり、デフォルトの保留が役目を果たしています。

## 移行を終えると得られるもの

変換されたフェッチごとに、あなたが保守していたコードが取り除かれます。

- ローディングフラグと、それを正しい順序で設定するコード。
- `AbortController` や「このレスポンスはまだ最新か」のガード。より新しい実行に置き換えられた実行は Solid が破棄します。
- エラーを静かな空の状態に変えていた `success` チェック。throw されたエラーは `Errored` に届き、リトライできます。
- 再読み込みシグナル。`refresh(source)` が同じ問いを再び尋ねます。

そしてこれまで得られなかった動作も加わります。兄弟と一緒に表示されるパネル、props にフラグを通さずにどのコンシューマーからでも使える `isPending`、そしてデータが確定するたびに各領域をストリーミングするサーバーレンダリングです。

まず単独で成立するフェッチを変換し、次に `on` を付けた独立したパネルを、最後に一貫したビューを、保留がそれらに何をもたらすかが見えた段階で変換してください。

## チェックリスト

- [ ] アプリが Solid 1 のフェッチの形のまま Solid 2 で動作し、テストに合格する。
- [ ] 各フェッチに決定がある: 保留、コントロールに `latest` を使った保留、または `on`。
- [ ] すべての `on` prop が `params.id` のような値を受け取り、アクセサーではない。
- [ ] 保留される更新がさもなければ反応しないクリックに見えるすべての場所に `isPending` がある。
- [ ] ローディングフラグ、アボートコントローラー、古いレスポンスへのガードが変換済みのフェッチから消えている。
- [ ] 再読み込みシグナルが `refresh(source)` 呼び出しになり、再読み込みを保留中として表示すべき場所に `affects` がある。
- [ ] 失敗したリクエストは throw され、`Errored` バウンダリがそれらをカバーしている。
