---
title: "React からの移行"
version: "2.0"
description: "よく知られた React の概念を最も近い Solid の概念に対応付け、同等の例と移行時に重要となる意味上の違いを示します。"
---

React と Solid は多くのアプリケーション概念を共有していますが、インターフェースの更新方法は異なります。
このガイドでは、おなじみの React パターンを最も近い Solid の概念に対応付け、単純な置き換えでは Solid のモデルの一部を取りこぼしてしまう箇所を重点的に解説します。

コンポーネント、props、JSX、イベント、コンテキスト、ref、コンポジションに関する知識はそのまま活かせます。
主な変化は、状態の変更が DOM に届く仕組みです。
[Thinking in Solid](/docs/guides/thinking-in-solid.md) は、1 つの機能を最初から最後まで構築する中でその変化を示しています。このページでは概念を 1 つずつ対応付けます。

## まず実行モデルを理解する

React のコンポーネントは、現在の props と状態からレンダーされます。
その状態が変わると、React は次の結果を生成するためにコンポーネントを再実行します。

Solid のコンポーネントは、Solid がそのコンポーネントをマウントしたときに実行されます。
その後、シグナルとストアは自身を読み取った計算と JSX 式だけに通知します。
コンポーネント関数を再実行する必要はありません。

次のカウンターはどちらも同じインターフェースを表しています。

### React

```tsx
import { useState } from "react";

function Counter() {
	const [count, setCount] = useState(0);
	const doubled = count * 2;

	return (
		<button onClick={() => setCount((value) => value + 1)}>
			{count} × 2 = {doubled}
		</button>
	);
}
```

### Solid

```tsx
import { createSignal } from "solid-js";

function Counter() {
	const [count, setCount] = createSignal(0);
	const doubled = () => count() * 2;

	return (
		<button onClick={() => setCount((value) => value + 1)}>
			{count()} × 2 = {doubled()}
		</button>
	);
}
```

Solid のシグナルはアクセサーとセッターを返します。
アクセサーとは、リアクティブな値を読み取る関数です。
JSX 内で `count()` を呼び出すと、その式がシグナルを購読します。
JSX 内で `doubled()` を呼び出すと、同じ追跡スコープがその中の `count()` の読み取りを検出できるようになります。

追跡スコープは、実行中に読み取られたリアクティブな値を記録し、Solid が後でその処理を更新できるようにします。
リアクティブな読み取りは JSX 内か別の追跡スコープ内に置いてください。
コンポーネント本体は追跡されずに実行されるため、Solid コンポーネントのトップレベルでの読み取りは 1 回限りの読み取りになります。

追跡、スケジューリング、オーナーシップ、破棄については [リアクティビティ](/docs/concepts/reactivity.md) を参照してください。

## フックを目的別に変換する

React はレンダー中に決まった順序でフックを呼び出し、保持された状態へのアクセスや振る舞いのスケジューリングを行います。
Solid はコンポーネントのセットアップ中にプリミティブを作成します。
計算とクリーンアップはオーナーに結び付けられ、オーナーがマウントされたコンポーネントやリアクティブスコープのライフタイムを提供します。
Solid のプリミティブは通常の関数呼び出しであり、フックのような順序や命名のルールはありません。

各フックは、その役割に応じて変換してください。

- ローカルなスカラー状態は通常 [`createSignal`](/docs/reference/solid-js/reactivity/create-signal.md) に対応します。
- オブジェクトやコレクションの状態は [`createStore`](/docs/reference/solid-js/stores/create-store.md) に対応できます。
- キャッシュされた派生状態は [`createMemo`](/docs/reference/solid-js/reactivity/create-memo.md) に対応できます。
- 命令的な同期処理は [`createEffect`](/docs/reference/solid-js/reactivity/create-effect.md) に対応できます。
- サブツリーで共有する状態は [`createContext`](/docs/reference/solid-js/components-context/create-context.md) と [`useContext`](/docs/reference/solid-js/components-context/use-context.md) に対応できます。
- 再利用可能な状態を持つ振る舞いはカスタムプリミティブ、つまり Solid のプリミティブを作成して返す普通の関数にできます。

これらの対応関係は、互換できる実装ではなく関連する責務を示したものです。
コードが必要とするデータフローから Solid のプリミティブを選んでください。

## ローカル状態の読み取りと書き込み

`useState` と `createSignal` はどちらも値とセッターを提供します。
Solid のシグナルはアクセサーを使うため、見た目の構文が異なります。
上のカウンターは、それぞれのライブラリで同じ状態更新を示しています。

どちらのセッターも、前の状態から値を導出する更新関数を受け付けます。

```tsx
setCount((value) => value + 1);
```

### スケジューリングの補足

Solid は、同期的なフラッシュスコープの外で行われたシグナルやストアへの書き込みをいったん保留します。
現在の JavaScript タスクが完了した後、マイクロタスクでリアクティブキューをコミットします。
アプリケーションのイベントハンドラーでは、通常、明示的なフラッシュは必要ありません。
テストや命令的な連携で、コミットされた状態や DOM を同期的に観測する必要がある場合は [`flush()`](/docs/reference/solid-js/reactivity/flush.md) を使います。

## オブジェクトやコレクションの状態を扱う

React アプリケーションでは、新しいオブジェクトを生成してオブジェクトを更新することがよくあります。
Solid のストアは読み取り専用のリアクティブなビューを提供し、そのセッターはドラフトを直接変更します。

### React

```tsx
const [profile, setProfile] = useState({
	name: "Ada",
	role: "Engineer",
});

function rename(name: string) {
	setProfile((current) => ({ ...current, name }));
}
```

### Solid

```tsx
import { createStore } from "solid-js";

const [profile, setProfile] = createStore({
	name: "Ada",
	role: "Engineer",
});

function rename(name: string) {
	setProfile((draft) => {
		draft.name = name;
	});
}
```

追跡スコープ内で `profile.name` を読み取ると、そのプロパティが購読されます。
無関係なプロパティの更新では、その読み取り側を再実行する必要はありません。

値全体が 1 つの同一性を持ち、まとめて変更される場合は、オブジェクトにもシグナルが使えます。
ストアのセッター、プロジェクション、リコンシリエーション、楽観的ストアについては [ストア](/docs/concepts/stores.md) を参照してください。

## 状態から値を導出する

React はレンダー中に値を計算でき、パフォーマンス最適化として `useMemo` を使えます。
React はそのキャッシュを破棄することがあるため、アプリケーションの動作をキャッシュの存続に依存させることはできません。

Solid の派生関数は、それを呼び出した追跡スコープ内で実行されます。
`createMemo` はリアクティブな計算を作成し、キャッシュされた結果と等価性の振る舞いはリアクティブグラフの一部になります。

1 か所で使う小さな導出には関数を使います。

```tsx
const fullName = () => `${firstName()} ${lastName()}`;

return <p>{fullName()}</p>;
```

コストの高い導出、複数のコンシューマーが同じ結果を必要とする場合、あるいは結果を等価性のバウンダリにしたい場合は `createMemo` を使います。

```tsx
import { createMemo } from "solid-js";

const fullName = createMemo(() => `${firstName()} ${lastName()}`);

return (
	<>
		<h1>{fullName()}</h1>
		<label>
			Display name
			<input value={fullName()} readOnly />
		</label>
	</>
);
```

このメモは `firstName()` と `lastName()` を追跡します。
コンシューマーは個々の入力ではなくメモを追跡します。

他のリアクティブな値から計算できる状態は、通常、そのまま導出として表現します。
2 つ目のシグナルと、2 つの値を同期し続けるエフェクトは必要ありません。
同期的な導出、非同期の導出、一時的な書き込み可能オーバーライドについては [不要なエフェクトを避ける](/docs/guides/avoid-unnecessary-effects.md) を参照してください。

## props 由来の編集可能な値を保つ

編集可能なフィールドでは、ユーザーがローカルで変更するまでは prop に追従し、上流の prop が変わったらリセットしたい場合があります。
React と Solid のどちらでも、これをエフェクトなしで表現できます。

React ではまず、その値をレンダー中に計算できるか、`key` でコンポーネントをリセットできるかを確認することが推奨されています。
1 つのローカル状態を prop の変更に合わせて調整しなければならない場合、React は現在の prop を前回のレンダーで保存した情報と比較する方法もドキュメントに記載しています。

### React

```tsx
function NameField({ name }: { name: string }) {
	const [previousName, setPreviousName] = useState(name);
	const [draft, setDraft] = useState(name);

	if (name !== previousName) {
		setPreviousName(name);
		setDraft(name);
	}

	return (
		<input
			value={draft}
			onChange={(event) => setDraft(event.currentTarget.value)}
		/>
	);
}
```

ガード付きのセッターは、新しい prop から導出した状態で現在のレンダーをやり直すよう React に要求します。
これは React の [レンダー中の状態調整](https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes) ガイダンスに従ったもので、エフェクトが修正する前に古い値がコミットされるのを防ぎます。

### Solid

Solid では、`createSignal` に関数を渡して書き込み可能な派生シグナルを作成できます。

```tsx
function NameField(props: { name: string }) {
	const [draft, setDraft] = createSignal(() => props.name);

	return (
		<input
			value={draft()}
			onInput={(event) => setDraft(event.currentTarget.value)}
		/>
	);
}
```

この導出は、`setDraft` がローカルのオーバーライドを上書きするまで `props.name` を供給します。
導出の依存関係が変わると、ソースが次の値を生成してそのオーバーライドを置き換えます。
同期用のエフェクトや、前回の prop を記録しておく処理は必要ありません。

関数形式は「書き込み可能な導出」を意味し、関数自体をシグナルの値として保存するわけではありません。
ネストしたフォーム状態で同じパターンを使うには、`createStore` の関数形式を使います。
ストア版や、代わりに独立したローカル状態を選ぶ場合の指針については [不要なエフェクトを避ける](/docs/guides/avoid-unnecessary-effects.md#use-a-writable-derivation-for-a-local-override) を参照してください。

## エフェクトを責務別に変換する

React は、命令的なエフェクトコールバックと宣言された依存配列を組み合わせます。
Solid は追跡される計算関数を使ってリアクティブな読み取りから依存関係を検出し、その結果を追跡されないエフェクト関数に渡します。

### React

```tsx
useEffect(() => {
	const connection = connect(roomId);
	return () => connection.close();
}, [roomId]);
```

### Solid

```tsx
import { createEffect } from "solid-js";

createEffect(
	() => props.roomId,
	(roomId) => {
		const connection = connect(roomId);
		return () => connection.close();
	}
);
```

計算関数は、エフェクトをトリガーすべきリアクティブな依存関係をすべて読み取ります。
その戻り値がエフェクト関数への入力になります。
エフェクト関数は命令的な処理を実行し、クリーンアップを返すことができます。
エフェクト関数内での読み取りは依存関係になりません。

React のエフェクトがすべて Solid のエフェクトになるわけではありません。

- レンダー可能な値は関数またはメモで計算します。
- インタラクション固有の処理は、そのインタラクションを観測したイベントハンドラーで開始します。
- 非同期の派生データは非同期メモまたはストアのプロジェクションに置きます。
- 確定したリアクティブな結果で Solid 外の命令的システムを更新しなければならない場合にエフェクトを使います。

この区別は、依存配列を機械的に変換するよりも、多くの場合有用です。

## props をリアクティブに保つ

React の props は現在のコンポーネントレンダーから得られる値なので、分割代入するのが一般的です。
変更され得る Solid の props はゲッターで裏付けられていることがあります。
追跡スコープがその prop にアクセスしたとき、子コンポーネントは現在の値を読み取ります。

値が変わり得る場合は、props オブジェクトをそのまま保持します。

```tsx
function Greeting(props: { name: string; punctuation?: string }) {
	return (
		<p>
			Hello, {props.name}
			{props.punctuation ?? "."}
		</p>
	);
}
```

パラメーターリストでの分割代入は、コンポーネントのセットアップ時にそれらの値を読み取ります。

```tsx
function Greeting({ name }: { name: string }) {
	return <p>Hello, {name}</p>;
}
```

分割代入形式は、1 回限りの値でよいことが意図的な場合にだけ使ってください。
分割代入はゲッターで裏付けられた props を即時に読み取ります。
コンポーネントがトップレベルでリアクティブな値を読み取ると、Solid は開発時に警告を出します。

ローカル名にリアクティブな振る舞いを持たせたい場合は、メモを作成します。

```tsx
function Greeting(props: { first: string; last: string }) {
	const name = createMemo(() => `${props.first} ${props.last}`);
	return <p>Hello, {name()}</p>;
}
```

## イベントとフォームコントロールの処理

イベント props は `onClick` や `onInput` のような camelCase のままです。
Solid のハンドラーはネイティブの DOM イベントを受け取り、`event.currentTarget` はそのハンドラーを持つ要素として型付けされます。

### React

```tsx
const [query, setQuery] = useState("");

return (
	<input
		value={query}
		onChange={(event) => setQuery(event.currentTarget.value)}
	/>
);
```

### Solid

```tsx
const [query, setQuery] = createSignal("");

return (
	<input
		value={query()}
		onInput={(event) => setQuery(event.currentTarget.value)}
	/>
);
```

`onInput` はブラウザの input イベントを毎回観測します。
ネイティブの change イベントのタイミングが意図した動作である場合は `onChange` を使います。

イベントハンドラーはリアクティブな追跡の外で実行されます。
シグナルやストアの現在値を、それらを購読せずに読み取れます。

## DOM プロパティとスタイルの変換

ほとんどの JSX 属性はそのまま認識できます。
DOM 向けの細部にはいくつか違いがあります。

- `className` の代わりに `class` を使います。
- Solid の [`class` prop](/docs/reference/solid-web/jsx-properties/class.md) は文字列、条件付きオブジェクト、ネストした配列を受け付けます。
- スタイルオブジェクトは `backgroundColor` のような JavaScript 名ではなく、`"background-color"` のような CSS 名を使います。
- 数値のスタイル値には単位が自動で付きません。
- エスケープされたテキストのみのコンテンツには `textContent` を使い、`innerHTML` は信頼できる、またはサニタイズ済みのマークアップにだけ使います。

```tsx
<button
	class={["button", { active: selected(), pending: saving() }]}
	style={{
		"background-color": props.background,
		"inline-size": `${props.width}px`,
	}}
>
	Save
</button>
```

それぞれの DOM での振る舞いについては、[`style`](/docs/reference/solid-web/jsx-properties/style.md)、[`textContent`](/docs/reference/solid-web/jsx-properties/text-content.md)、[`innerHTML`](/docs/reference/solid-web/jsx-properties/inner-html.md) の各リファレンスを参照してください。

## 条件とリストのレンダー

JavaScript の三項演算子や論理式は Solid の JSX でそのまま使えます。
JSX コンパイラはこのネイティブな制御フロー構文を認識し、その周囲にリアクティブな条件分岐を作成します。

`map` のような配列メソッドも有効な JSX を返します。
ただしそれらは通常の関数呼び出しのままなので、コンパイラは呼び出し自体から行の同一性やライフサイクルを推論できません。
Solid のリストコンポーネントは、これらの更新セマンティクスを明示的にします。

### 条件付きコンテンツ

React の条件分岐は三項演算子の形をそのまま使えます。
Solid 版ではリアクティブなアクセサーを呼び出します。

```tsx
return <>{user() ? <Profile user={user()!} /> : <SignIn />}</>;
```

コンパイラは `user()` を追跡し、truthy かどうかの評価が変わったときにアクティブな分岐を更新します。
明示的なフォールバック、絞り込まれた値、同一性の制御が役立つ場合は [`Show`](/docs/reference/solid-js/components-jsx/show.md) を使います。

```tsx
import { Show } from "solid-js";

return (
	<Show when={user()} fallback={<SignIn />}>
		{(currentUser) => <Profile user={currentUser()} />}
	</Show>
);
```

デフォルトでは、`Show` は truthy な変化をまたいで子要素を保持し、関数の子には絞り込まれたアクセサーを渡します。
`keyed` を指定すると、生の値を渡し、値の同一性が変わったときに子要素を再マウントします。

### リストコンテンツ

React のリストは一般に `key` 付きの `map` を使います。

```tsx
return todos.map((todo) => <TodoRow key={todo.id} todo={todo} />);
```

Solid でも `map` を直接使ってレンダーできます。

```tsx
return (
	<>
		{todos().map((todo) => (
			<TodoRow todo={todo} />
		))}
	</>
);
```

`map` は通常の関数呼び出しなので、この式を再評価するとマップされた行の出力が作り直されます。
リアクティブなリストでは、[`For`](/docs/reference/solid-js/components-jsx/for.md) が明示的な同一性モードに従って行を保持します。

```tsx
import { For } from "solid-js";

return (
	<For each={todos()} keyed={(todo) => todo.id}>
		{(todo) => <TodoRow todo={todo()} />}
	</For>
);
```

React の `key` と Solid の `keyed` 関数は、どちらも行の同一性を表現します。
デフォルトでは `For` はアイテムの同一性を使います。
代わりに `keyed={false}` で位置による同一性を使うことも、上の例のようなキー関数を使うこともできます。

配列アイテムや同一性を差分比較せずに、ストアに対する位置的なレンダリングを行うには [`Repeat`](/docs/reference/solid-js/components-jsx/repeat.md) を使います。
その `from` と `count` props は、絶対インデックスが重複範囲内に残る行を保持しながら、スライドウィンドウを表現できます。

## コンテキストで状態を共有する

どちらのライブラリも、コンテキストを使って値を子孫にスコープします。
Solid では、コンテキストオブジェクト自体がそのプロバイダーコンポーネントでもあります。

```tsx
import {
	type Accessor,
	type Element,
	type Setter,
	createContext,
	createSignal,
	useContext,
} from "solid-js";

type Theme = "light" | "dark";
type ThemeContextValue = {
	theme: Accessor<Theme>;
	setTheme: Setter<Theme>;
};

const ThemeContext = createContext<ThemeContextValue>();

function ThemeProvider(props: { children: Element }) {
	const [theme, setTheme] = createSignal<Theme>("light");

	return (
		<ThemeContext value={{ theme, setTheme }}>{props.children}</ThemeContext>
	);
}

function ThemeButton() {
	const { theme, setTheme } = useContext(ThemeContext);

	return (
		<button
			onClick={() =>
				setTheme((value) => (value === "light" ? "dark" : "light"))
			}
		>
			Current theme: {theme()}
		</button>
	);
}
```

デフォルト値のないコンテキストは、囲むプロバイダーなしでコードが読み取ると例外をスローします。
`App` のルートで提供するアプリケーション全体の状態も含め、子孫がリアクティブな状態を必要とするときは、コンテキスト経由でシグナル、ストア、サービスオブジェクトを渡します。
共有状態にモジュールレベルのシグナルやストアを使うのは避けてください。それらにはオーナーがなく、サーバーでは 1 つのモジュールインスタンスがリクエスト間で共有されます。

## ref とオーナー付きセットアップを扱う

どちらのライブラリでも、DOM 要素をコンポーネントのコードに公開できます。

### React

```tsx
function SearchField() {
	const input = useRef<HTMLInputElement>(null);

	return (
		<>
			<input ref={input} type="search" />
			<button onClick={() => input.current?.select()}>Select query</button>
		</>
	);
}
```

### Solid

Solid では `ref` コールバックを通して、要素をローカル変数に代入できます。

```tsx
function SearchField() {
	let input!: HTMLInputElement;

	return (
		<>
			<input ref={(element) => (input = element)} type="search" />
			<button onClick={() => input.select()}>Select query</button>
		</>
	);
}
```

React はコミットされた要素を ref オブジェクトの `current` プロパティに格納します。
Solid のコールバックは、Solid が要素を作成した後にそれを受け取り、ローカル変数に代入します。
Solid は `ref` prop で、代入可能な変数やコールバックの配列も受け付けます。

### コンポーネントをまたいだ ref の受け渡しと合成

React 19 では `ref` を通常のコンポーネント prop として受け取れるため、新しいコンポーネントに [`forwardRef`](https://react.dev/reference/react/forwardRef) は不要です。
`forwardRef` は引き続き使えますが、React は将来のリリースで非推奨にする予定です。
それ以前の React バージョンを対象とするコードでは、その ref を受け取って渡すために `forwardRef` を使うことがあります。

Solid も `props.ref` を通してコンポーネントの ref を受け取ります。
コンポーネントが同じ要素をローカルでも必要とする場合は、ref 配列の 1 要素として要素に渡します。

```tsx
import type { Ref } from "solid-js";

type SearchFieldProps = {
	ref?: Ref<HTMLInputElement>;
};

function SearchField(props: SearchFieldProps) {
	let input!: HTMLInputElement;

	return (
		<>
			<input ref={[props.ref, (element) => (input = element)]} type="search" />
			<button onClick={() => input.select()}>Select query</button>
		</>
	);
}
```

Solid は配列を再帰的に平坦化し、各 ref コールバックを順番に呼び出します。
親は `props.ref` を通して要素を受け取り、コンポーネントはラッパーコールバックなしで、ローカルの要素アクセスと追加のディレクティブを組み合わせられます。

要素の振る舞いに、再利用可能なセットアップ、ネイティブイベントのオプション、オーナー付きのリアクティブな処理、クリーンアップが必要な場合は ref ディレクティブを使います。
そのライフサイクルとコールバックの合成については、[ref とディレクティブ](/docs/concepts/components-and-jsx.md#refs-and-directives) と [`ref` リファレンス](/docs/reference/solid-web/jsx-properties/ref.md) を参照してください。

## 非同期 UI を状態で対応付ける

React アプリケーションは、フレームワーク API、Suspense バウンダリ、トランジション、データライブラリを通じて非同期 UI を調整します。
Solid は非同期の読み取りをリアクティブグラフの一部として表現します。

各責務を個別に対応付けます。

- React の Suspense フォールバックに最も近いのは Solid の `Loading` フォールバックです。
- React のエラーバウンダリに最も近いのは Solid の `Errored` バウンダリです。
- `SuspenseList` 形式の表示ポリシーに最も近いのは Solid の `Reveal` です。
- 保留中のトランジション UI に最も近いのは、`isPending` を使った Solid の自動的な保留更新です。
- ミューテーションの調整には Solid の `action` が使えます。

これらの概念は関連する UI の責務を担いますが、ランタイム上の契約は互換ではありません。

非同期メモもアクセサーのままです。

```tsx
import { type Accessor, Errored, Loading, createMemo } from "solid-js";

function UserProfile(props: { user: Accessor<User> }) {
	return (
		<Loading fallback={<p>Loading user...</p>}>
			<article>
				<h2>{props.user().name}</h2>
				<p>{props.user().bio}</p>
			</article>
		</Loading>
	);
}

function Page(props: { id: string }) {
	const user = createMemo(async () => {
		const response = await fetch(`/api/users/${props.id}`);
		if (!response.ok) throw new Error("Could not load user");
		return response.json() as Promise<User>;
	});

	return (
		<Errored fallback={(error) => <p>{String(error())}</p>}>
			<UserProfile user={user} />
		</Errored>
	);
}
```

[`Loading`](/docs/reference/solid-js/components-jsx/loading.md) は、確定した結果がまだない読み取りを処理します。
[`Errored`](/docs/reference/solid-js/components-jsx/errored.md) は、リアクティブグラフを通って伝播するエラーを処理します。

非同期メモは `Page` で作成されますが、`Loading` は `props.user()` の読み取りの直上である `UserProfile` に置かれています。
ローディングバウンダリは、「まだ準備できていない（not ready）」と報告できる読み取りのオーナー祖先であることだけが必要です。
計算を作成したコンポーネントや、読み取りを実行するコンポーネントの親の呼び出し箇所を包む必要はありません。
1 つのフォールバックでより大きな一貫した領域をカバーしたい場合は、バウンダリをオーナーツリーのさらに上に置くこともできます。

### 非同期の調整はデータに従う

Solid はコンポーネントをサスペンドの単位として扱うのではなく、リアクティブなデータを待ちます。
未準備（not ready）の読み取りはそのリアクティブな出力をブロックしますが、残りのネストされたコンポーネントツリーのセットアップを中断しません。

```tsx
import { render } from "@solidjs/web";
import { Loading, createMemo } from "solid-js";
import { fetchTimeIn3Seconds } from "./api.js";

function A() {
	const a = createMemo(fetchTimeIn3Seconds);

	return (
		<div class="box">
			A completed in {a()} seconds.
			<B />
		</div>
	);
}

function B() {
	const b = createMemo(fetchTimeIn3Seconds);

	return (
		<div class="box">
			B completed in {b()} seconds.
			<C />
		</div>
	);
}

function C() {
	const c = createMemo(fetchTimeIn3Seconds);

	return <div class="box">C completed in {c()} seconds.</div>;
}

render(
	() => (
		<Loading fallback="Loading...">
			<A />
		</Loading>
	),
	document.getElementById("root")!
);
```

`A` は `a()` が値がまだ準備できていないことを報告する前に、リクエストを開始します。
Solid はネストされた JSX のセットアップを続けるため、`B`、続いて `C` が同じパスでそれぞれのリクエストを開始します。
コンポーネントはネストされていますが、3 つのリクエストはすべて重なり合います。

`A` の上にある 1 つの `Loading` バウンダリが、その配下のすべての未準備の読み取りを処理します。
進行中の分岐を表示出力から切り離し、そのリアクティブなオーナーシップをオフスクリーンに保持したまま、フォールバックを表示します。
非同期の式が解決に向かう間、コンポーネントのセットアップとオーナーシップはそのまま残ります。
値が確定すると、Solid はリアクティブなテキスト式を更新し、保持していた分岐を表示します。
コンポーネント関数が再実行されることはありません。

別の非同期結果を読み取る計算は、その依存関係を待ちます。
並列処理は、コンポーネントツリーの深さではなく、独立したデータ依存関係から生まれます。

React アプリケーションも、フレームワークのローディング、キャッシュ、プリロードを通じて並列リクエストを実現できます。
この例は Solid のデフォルトを示しています。保留中ステータスはデータの読み取りに属するため、保留中の式があっても、ネストされたコンポーネントが独自の独立した処理をセットアップするのを止めません。

### 複数のローディング領域を調整する

React は実験的な `SuspenseList` API を通じて、複数の Suspense バウンダリの調整を検討してきました。
React 19 では `SuspenseList` は安定版 API に含まれていませんが、実験的なリリースやフレームワークの抽象化でこの概念に出会うことがあります。

Solid の [`Reveal`](/docs/reference/solid-js/components-jsx/reveal.md) は、兄弟の `Loading` バウンダリが表示されるタイミングを調整します。

```tsx
import { Loading, Reveal } from "solid-js";

<Reveal order="sequential">
	<Loading fallback={<ProfileSkeleton />}>
		<Profile />
	</Loading>
	<Loading fallback={<ActivitySkeleton />}>
		<Activity />
	</Loading>
</Reveal>;
```

`Reveal` は非同期処理を開始したり、ローディング状態を作成したりしません。
直下のローディング領域がいつ表示されるかを制御します。

- `"sequential"` は登録順に表示します。
- `"together"` は直下のすべての領域に最初の表示コンテンツがそろうまで待ちます。
- `"natural"` は各領域が自身の処理の確定時に表示されるようにします。

ネストされた `Reveal` グループは、親グループ内の 1 つのスロットとして合成されます。
順序付け、折りたたまれたフォールバック、グループのメンバーシップについては [バウンダリ](/docs/concepts/boundaries.md#reveal-order) を参照してください。

### 更新は暗黙的に調整される

React は選択した状態更新をノンブロッキングとしてマークする `startTransition` を提供します。
Solid は更新をマークするラッパーを必要としません。
1 つの中断されない同期コールスタック中に行われたすべてのシグナルとストアへの書き込みは、同じ調整された更新にまとめられます。

```tsx
function selectUser(id: string) {
	setSelectedId(id);
	setPanel("profile");
}
```

上の 2 つの書き込みは 1 つの更新に属します。
この暗黙的なグループ化は、React のトランジション API のような優先度や中断可能性の API ではありません。

下流の処理が同期的なままなら、Solid は通常のマイクロタスクのフラッシュで更新をコミットします。
参加する計算が非同期処理を待つ場合、その単位は保留された更新（held update）になります。
Solid は現在のコミット済みビューを表示したままにし、その処理が確定したときに参加する書き込みをまとめて表示します。
この UI 保持の振る舞いが、React のトランジションに最も近いものです。

保持されたビューに更新中のインジケーターが必要な場合は [`isPending`](/docs/reference/solid-js/reactivity/is-pending.md) を使います。
この動作は、明示的な `startTransition` 呼び出しではなく、自動的に行われます。

Solid の [`action`](/docs/reference/solid-js/lifecycle-actions/action.md) は、ジェネレーターベースのミューテーション、楽観的状態、リフレッシュの振る舞いを調整します。
「アクション」という用語が共通していても、異なるエコシステムの action API が同一の契約を持つことを意味しません。

準備状態、保留された更新、エラー、アクション、楽観的状態、永続的なリフレッシュについては [非同期リアクティビティ](/docs/concepts/async-reactivity.md) を参照してください。

## 段階的な移行を計画する

React と Solid の JSX は似ていますが、コンパイルされたコンポーネントの値とランタイムのオーナーシップは互換ではありません。
ルート、ページ、アイランド、独立したアプリケーションルートを、2 つのレンダラー間の境界として扱います。

実践的な移行の順序は次のとおりです。

1. Solid のアプリケーションシェルを作成し、ルーティングとレンダリングの設定を決めます。
2. フレームワークに依存しない型、バリデーション、データクライアント、ユーティリティ関数を移動します。
3. 末端の UI コンポーネントとそのローカル状態を移行します。
4. 利用するコンポーネントに明確な Solid の境界ができたら、共有状態とコンテキストを移動します。
5. 派生状態とエフェクトを責務に応じて変換します。
6. 非同期の読み取り、ローディング UI、エラー、ミューテーションを Solid の非同期モデルに移します。
7. その子孫の移動が完了したら、React のルートまたはルート境界を廃止します。

Solid プロジェクトの作成には [クイックスタート](/docs/getting-started/quick-start.md) を使います。
[ルーティングの概要](/docs/routing/overview.md) では、ルーターに依存しないアプリケーション境界を説明し、サポートされているルーターへのリンクを示しています。

## 移行結果を確認する

移行したコンポーネントを完成と見なす前に、次を確認してください。

- シグナルの値がアクセサーを呼び出して読み取られている。
- リアクティブな更新を駆動するための読み取りが、JSX、メモ、非同期の計算、エフェクトの計算関数のいずれかで行われている。
- イベントハンドラーや意図的な 1 回限りのスナップショットが、追跡せずに値を読み取っている。
- 変更され得る props が、props オブジェクト上に残っているか、リアクティブな導出でラップされている。
- 計算された値が、同期された状態のコピーではなく導出のままになっている。
- エフェクトが、確定したリアクティブな結果を命令的なシステムに送っている。
- インタラクション固有の処理が、それを観測したイベントハンドラーまたはアクションで開始されている。
- リアクティブなリストが、コレクションの変化の仕方に合った `For` のキー付けモードまたは `Repeat` の範囲を使っている。
- 非同期の読み取りに、適切なローディングバウンダリとエラーバウンダリがある。
- レンダラー固有の React コンポーネントが、Solid のコンポーネントツリーに直接またがっていない。

成功した移行とは、アプリケーションの振る舞いを保ちながら、そのデータフローを Solid の実行モデルで表現するものです。
