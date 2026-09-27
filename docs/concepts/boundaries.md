---
title: "バウンダリ"
version: "2.0"
description: "Loading・Errored・Reveal を適切なサブツリーに配置して、ページのどの部分にスピナーを表示し、どの部分にエラーを表示し、各領域をどの順序で現れさせるかを決める。"
---

商品ページは、商品・そのレビュー・レコメンデーションの一覧を読み込みます。
ページ全体を1つのバウンダリで囲むと、最初に失敗したリクエストがすべてを道連れにし、遅いレコメンデーションのクエリが商品自体までスピナーの後ろに隠してしまいます。
バウンダリがまったくなければ、処理されなかったエラーがリアクティブシステムを停止させ、ページ上のすべてが二度と更新されなくなります。

バウンダリは、保留中または失敗した読み取りがページのどれだけの範囲に影響するかを決めます。
[`Loading`](/docs/reference/solid-js/components-jsx/loading.md) はサブツリー内の非同期読み取りに値がない間フォールバックをレンダーし、[`Errored`](/docs/reference/solid-js/components-jsx/errored.md) はサブツリーがエラーを投げたときにフォールバックをレンダーし、[`Reveal`](/docs/reference/solid-js/components-jsx/reveal.md) は兄弟領域が現れる順序を決めます。
それぞれをどこに置くかが、このページで扱う設計上の判断です。

```tsx
import { Errored, Loading, createMemo, createSignal } from "solid-js";

type Product = { id: string; name: string; description: string };

async function fetchProduct(id: string): Promise<Product> {
	const response = await fetch(`/api/products/${id}`);
	if (!response.ok) throw new Error(`Could not load product ${id}`);
	return response.json();
}

function ProductPanel() {
	const [productId, setProductId] = createSignal("mug");
	const product = createMemo(() => fetchProduct(productId()));

	return (
		<>
			<ProductPicker value={productId()} onSelect={setProductId} />
			<Errored
				fallback={(error, reset) => (
					<section>
						<p>{String(error())}</p>
						<button onClick={reset}>Retry</button>
					</section>
				)}
			>
				<Loading on={productId()} fallback={<p>Loading product…</p>}>
					<h2>{product().name}</h2>
					<p>{product().description}</p>
				</Loading>
			</Errored>
		</>
	);
}
```

初回レンダーでは、パネルに "Loading product…" が表示され、ピッカーは操作できます。
リクエストが解決すると商品が表示され、拒否されるとエラーメッセージと **Retry** ボタンが同じ場所に表示されます。
別の商品を選ぶと、ピッカーが動作し続ける間、パネルは再びローディングのテキストを表示します。

この動作は3つのルールで説明できます。
バウンダリは自分のサブツリー内の読み取りが生成したステータスを処理し、処理を担うのは最も近い一致するバウンダリです。
ローディングとエラーのステータスは別物なので、`Loading` がエラーを隠すことはなく、`Errored` がローディング UI を置き換えることもありません。両方が同じ領域を守れます。
バウンダリの外側にあるコントロールはフォールバックの外側にあるため、どの状態でもピッカーは画面に残ります。

## `Loading` バウンダリ

`Loading` は、サブツリー内で読み取られた非同期の値が最初の答えを返していない間、`fallback` をレンダーします。
一度コンテンツを表示した後は、以降の更新中もそのコンテンツを表示し続けます。[非同期リアクティビティ](/docs/concepts/async-reactivity.md#settled-view-and-in-flight-work)のページで説明しているように、入力への変更は保留され、現在の画面はそのまま残り、準備ができた時点で新しいコンテンツに置き換わります。
更新が進行中であることをユーザーに見せたい場合は、コンテンツ内で `isPending` を使います。

フォールバックが置き換えるべき最小の領域を囲むようにバウンダリを置き、読み込み中にユーザーが必要とするコントロールはその外側に残します:

```tsx
// Avoid: one boundary around the page, so a slow query hides everything
<Loading fallback={<PageSkeleton />}>
	<ProductPicker value={productId()} onSelect={setProductId} />
	<ProductDetail id={productId()} />
	<Recommendations id={productId()} />
</Loading>

// Prefer: one boundary per region that should have its own fallback
<ProductPicker value={productId()} onSelect={setProductId} />
<Loading fallback={<DetailSkeleton />}>
	<ProductDetail id={productId()} />
</Loading>
<Loading fallback={<CardSkeleton />}>
	<Recommendations id={productId()} />
</Loading>
```

`Avoid` 版を実行すると、2つのリクエストのうち遅い方が届くまでピッカーが消えます。
`Prefer` 版では、ピッカーは常に表示され、詳細ペインは商品が届いたときに、レコメンデーションはそれらが届いたときに表示されます。

`on` prop は、変化したときに初期化済みのバウンダリにフォールバックを再び表示させるべき値を指定します。
これがなければ、新しい商品を選んでも新しい商品の読み込み中は古い商品が画面に残り続けます。`on={productId()}` があれば、バウンダリは更新をまたいで id を比較し、対象が変わったときにスケルトンを表示します。
同じ商品のリフレッシュのような、それ以外の原因による保留中の処理は、コンテンツをそのままにします。

`on` は、その領域が更新を待たせる理由でなくなるようにするだけで、更新をコミットさせるものではありません。
同じ商品を読み取る見出しや `on` のない兄弟領域のように、バウンダリの外側にも新しい商品を待つものがある場合、更新は保留されたままになり、バウンダリはスケルトンを表示しません。
新しい対象を読み取るものをすべて囲むか、各兄弟に `on` 付きの独自のバウンダリを与えてください。[非同期リアクティビティ](/docs/concepts/async-reactivity.md#show-a-placeholder-again-loading-on)のページに両方のケースがあります。

:::pitfall[on に値ではなくアクセサーを渡す]
`on` は更新をまたいで `!==` で比較されるため、プリミティブを渡してください。配列を渡すのではなく、複数の入力を1つの文字列に結合します。

```tsx
// Avoid: the function reference never changes, so the fallback never returns
<Loading on={productId} fallback={<DetailSkeleton />}>

// Prefer: pass the value
<Loading on={productId()} fallback={<DetailSkeleton />}>
```

アクセサーを渡した場合、別の商品を選んでも読み込み中ずっと古い商品が画面に残ります。これは `on` が変えようとしていた動作そのものです。
:::

## エラーバウンダリ

`Errored` は、拒否された非同期ソースを含め、サブツリー内の読み取りや計算が投げたエラーを捕捉し、コンテンツの代わりにフォールバックをレンダーします。
バウンダリの外側のコンテンツは画面に残ります。

1つの単位として失敗し回復できる最小の領域を囲むように配置してください。
商品ページでは、詳細ペインとレコメンデーションはそれぞれ別の単位です。失敗したレコメンデーションのクエリが商品まで道連れにすべきではありません。

フォールバックには要素または関数を渡せます。
関数にはエラーのアクセサーと `reset` 関数が渡されます。`reset` を呼ぶと失敗したソースが再実行され、そのブランチは再度レンダーできるようになります。

### 回復

エラーになった領域は、誰かがリセットするまで固まったままというわけではありません。
エラーは "not ready" と同じようにグラフのその部分の現在のステータスであり、グラフが再び値を生成すれば解消されます:

- 失敗した計算の入力が変わる。
  上の例では、失敗したリクエストの後に別の商品を選ぶと新しい id のフェッチが実行され、そのリクエストが成功すればコンテンツが戻ります。
- `refresh(source)` が成功した結果を持って届く。
- `live` のサーバー関数が再接続して値を返す。

`reset` は、ネットワーク障害のように上流が自力では変わらない場合をカバーします。
失敗したソースを再実行するため、同じエラーにぶつかったリトライは同じフォールバックを表示し、成功したリトライはコンテンツを表示します。

:::caution[フォールバック内のエラーはバウンダリの外側]
`Errored` のフォールバックをレンダーしている最中に投げられたエラーは、そのバウンダリでは捕捉されません。
親の `Errored` がそれを捕捉できます。
上にバウンダリがなければ、処理されなかったエラーはリアクティブシステムを停止させます。開発環境では `[REACTIVITY_HALTED]` として報告されます。その報告については[リアクティビティのデバッグ](/docs/guides/debugging-reactivity.md#every-update-stopped-after-an-error)で説明しています。
:::

## Reveal の順序

独立したローディング領域は、データが届いた順に現れます。
詳細ペイン・レビュー・レコメンデーションを持つ商品ページでは、速いレコメンデーションのクエリが詳細スケルトンの下に飛び込み、各領域が届くたびにレイアウトがずれます。
サーバーレンダリングでも同じ問題が HTML ストリーム内で起き、フラグメントは順不同で届きます。

`Reveal` は、その内側に直接作られた `Loading` バウンダリを協調させます。
データをフェッチしたり、ローディング状態を作ったり、ネットワークを遅らせたりはしません。コンテンツは準備ができ次第届き、`Reveal` はそれをいつ表示するかを制御します:

```tsx
import { Loading, Reveal } from "solid-js";

<Reveal collapsed>
	<Loading fallback={<DetailSkeleton />}>
		<ProductDetail id={productId()} />
	</Loading>
	<Loading fallback={<CardSkeleton />}>
		<Reviews id={productId()} />
	</Loading>
	<Loading fallback={<CardSkeleton />}>
		<Recommendations id={productId()} />
	</Loading>
</Reveal>;
```

レコメンデーションが最初に終わっても、詳細ペインとレビューの後ろで順番を待ちます。
`collapsed` は現在のスケルトンより後のスケルトンがその下に積み重なるのを防ぐため、一度に見えるスケルトンは1つだけです。

3つの順序は次のとおりです:

- `sequential`（デフォルト）はスロットを登録順に公開します。後のスロットは、前のスロットがすべて準備できるまでフォールバックのままです。
- `together` は直接のスロットをすべて準備ができるまで保持し、まとめて解放します。
- `natural` は各スロットを自分のデータが解決したときに公開させます。
  トップレベルでは `Reveal` がないのと同じです。その目的はネストであり、natural グループは外側の順序の中で1つの位置を占めます。

```tsx
function ProductPage() {
	return (
		<Reveal>
			<Loading fallback={<DetailSkeleton />}>
				<ProductDetail id={productId()} />
			</Loading>
			<Reveal order="natural">
				<Loading fallback={<CardSkeleton />}>
					<Reviews id={productId()} />
				</Loading>
				<Loading fallback={<CardSkeleton />}>
					<Recommendations id={productId()} />
				</Loading>
			</Reveal>
			<Loading fallback={<FooterSkeleton />}>
				<RelatedProducts id={productId()} />
			</Loading>
		</Reveal>
	);
}
```

詳細ペインが最初に現れます。
次にレビューとレコメンデーションが、届いた順にそれぞれ独立して現れます。
関連商品はその両方が表示されるまで待ちます。

:::deep-dive[どのバウンダリが Reveal グループに参加するか]
`Loading` バウンダリは、バウンダリが作られた時点で存在する最も近い `Reveal` に参加します。
ネストされた `Loading` や `Errored` はそのサブツリーに別のバウンダリスコープを開始するため、別の `Loading` の内側にネストされたローディングバウンダリは外側のグループの追加スロットにはならず、`Errored` に包まれたローディングバウンダリは祖先のグループを遅らせません。

ネストされた `Reveal` は異なります。親グループに対して1つの複合スロットとして自分自身を登録します。
外側の保持はそれを通じて伝播し、親がスロットを解放するまで子孫のローディングバウンダリはフォールバックのままになり、その後内側のグループは自分の順序に従います。

参加は構造的です。
子孫を別のローディングバウンダリで包んでも外側の保持からは逃れられません。独自に公開する必要がある場合は、その領域を外側の `Reveal` の外に移してください。
:::

## プリミティブ形式

上のコンポーネントは3つのプリミティブから作られています。
アプリケーションコードでこれらを使う必要はありません。カスタムバウンダリコンポーネントやレンダラー統合のために存在します。

- [`createLoadingBoundary(fn, fallback, options?)`](/docs/reference/solid-js/advanced/jsx-component-primitives/create-loading-boundary.md) は、追跡される `fn` とフォールバックを切り替えるアクセサーを返します。
  プリミティブは JSX の props を受け取らないため、その `on` オプションはアクセサーを取ります。
- [`createErrorBoundary(fn, fallback)`](/docs/reference/solid-js/advanced/jsx-component-primitives/create-error-boundary.md) はアクセサーを返し、フォールバックにエラーのアクセサーとリセット関数を渡します。
- [`createRevealOrder(fn, options?)`](/docs/reference/solid-js/advanced/jsx-component-primitives/create-reveal-order.md) は `fn` をリビールコントローラーの下で実行します。その `order` と `collapsed` オプションはアクセサーです。

```tsx
import { createErrorBoundary, createLoadingBoundary } from "solid-js";

function StatusBoundary(props: {
	children: JSX.Element;
	loading: JSX.Element;
}) {
	const output = createErrorBoundary(
		() =>
			createLoadingBoundary(
				() => props.children,
				() => props.loading
			)(),
		(error, reset) => (
			<section>
				<p>{String(error())}</p>
				<button onClick={reset}>Retry</button>
			</section>
		)
	);

	return output() as JSX.Element;
}
```

## よくある問題

### 1つの領域の読み込み中にページ全体がスケルトンになる

`Loading` バウンダリが遅い領域より上にあります。
フォールバックを表示すべき領域までバウンダリを下げ、ページの残りはその外側に残してください。
リクエストは元の場所に置いたままで構いません。フェッチとバウンダリが独立して配置される理由は[非同期リアクティビティ](/docs/concepts/async-reactivity.md#fetch-high-block-low)のページで説明しています。

### 新しい項目を選んでも古い項目が画面に残る

これがデフォルトです。最初の答えの後、バウンダリはコンテンツを保持し、更新は保留されます。
対象の変化でフォールバックを表示したい場合はバウンダリに `on={id()}` を追加し、アクセサーではなく値を渡してください。

`on` がすでにあっても古い項目が残る場合、バウンダリの外側で何かが同じ変化を待っています。同じ項目を読み取るタイトルや、`on` のない兄弟バウンダリです。
その読み取り側が準備できるまで更新はコミットできないため、フォールバックは表示されません。
バウンダリを外に広げてその読み取り側も囲むか、兄弟に独自の `on` を与えるか、`on` を外して `isPending` で待ちを表示してください。

### リトライで同じエラーが表示される

`reset` は失敗したソースを同じ入力で再実行します。
原因が変わっていなければ、同じエラーが戻ってきます。
修正が別の入力である場合は入力を変えてください。バウンダリは自力で回復します。

### `Reveal` 内の領域がデータ準備後も現れない

その領域は `sequential` グループのスロットであり、前のスロットがまだ準備できていません。
グループに `order="natural"` を与えるか、独立した領域をネストした `<Reveal order="natural">` で包むか、その領域をグループの外に移してください。

## まとめ

- `Loading` はフォールバックが置き換えるべき最小の領域を囲み、ユーザーが必要とするコントロールは外側に残します。
- `Errored` は1つの単位として失敗し回復できる最小の領域を囲みます。両方のバウンダリが同じ領域を包めます。
- 最初の答えの後、`Loading` は更新中もコンテンツを保持します。変わった対象にフォールバックを再び表示させたい場合は `on={key()}` を追加し、アクセサーではなく値を渡します。
  これは、バウンダリの外側で同じ変化を待っているものがない場合にのみ効果があります。
- エラーになった領域は、入力が変わるかリフレッシュが成功すると回復します。`reset` は上流が自力では変わらない場合のためのものです。
- フォールバックが投げたエラーには、その上にバウンダリが必要です。
- 兄弟領域が現れる順序を制御するには `Reveal` を使います。変わるのはタイミングであり、各バウンダリが観察するものではありません。
- `<Reveal order="natural">` をネストすると、領域のグループが外側の順序の中で1つの位置を占められます。

## 次のステップ

- [レンダリングと SSR](/docs/concepts/rendering-and-ssr.md): `Loading` バウンダリが、初期の HTML シェルに入れるものと後でストリーミングするものをどう決めるか。
- [ミューテーション](/docs/concepts/mutations.md): `action` が自分で捕捉すべきエラーと、`Errored` に届かせるべきエラー。
- [サーバー関数](/docs/building-apps/server-functions/index.md): これらのバウンダリが扱うエラーや再接続を持つ、読み取りとライブソース。
- [Solid Router](/docs/routing/solid-router/index.md): 初回ページロードにフォールバックを持たせるための `props.children` の周りへの `Loading` バウンダリの置き方、そして後のナビゲーションがなければ現在のページを維持する理由。
