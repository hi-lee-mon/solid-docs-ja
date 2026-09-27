---
title: クイックスタート
version: "2.0"
description: "空のディレクトリーから、自分で変更を加えた状態で動作する Solid アプリを作り、残りのドキュメントがその上に積み上げる考え方に触れます。"
---

このページでは、空のディレクトリーから、自分で変更を加えた状態で動作するアプリまで進みます。
`basic` というプロジェクト形状を使います。これはルーター、ファイルシステムルート、ページごとのタイトル、テストスイートを備えながら、純粋に静的なビルドを生成します。

## プロジェクトを作成する

Node.js `20.19` 以降、または `22.12` 以降をインストールしてください。
これらのバージョンは、メンテナンスされているテンプレートが使う Vite 8 のランタイム要件を満たしています。

Solid CLI を実行します:

```bash
npm init solid@latest
```

別のパッケージマネージャーでは同等のコマンドを使います:

```bash
pnpm create solid@latest
yarn create solid@latest
bun create solid@latest
```

CLI がプロジェクト形状を尋ねたら `basic` を選びます。
ディレクトリーとパッケージマネージャーを選び、CLI が表示する開発用コマンドを実行します。
開発サーバーはポート `3000` で起動します。

`http://localhost:3000` を開きます。
Solid のロゴ、「Hello Solid!」という見出し、クリックを数えるボタン、そして Home と Users のリンクを持つナビが表示されます。
Users をクリックすると、ユーザーレコードを読み込み、次のユーザーへリンクするページが見えます。

## 中を見てみる

プロジェクトには `index.html` も、`render()` を呼ぶファイルもありません。
Vite プラグインは start モードと呼ぶ仕組みでそれらの部分を生成し、いくつかの決まったファイルを中心に組み立てます。

```text
src/
  App.tsx            the root component: router, nav, site-wide layout
  Document.tsx       the HTML document shell; site-wide head tags live here
  router.ts          creates the router from the file-system route manifest
  routes/
    index.tsx        the / page
    users.tsx        a layout that wraps every page under /users
    users/[id].tsx   the /users/:id page, with data loading
    [...404].tsx     the catch-all page
  components/
    Counter.tsx      the click counter on the home page
    Counter.test.tsx its test
vite.config.ts
```

`vite.config.ts` が start モードを有効にし、ファイルシステムルーティングのプラグインを追加します:

```ts
import { fileRoutes } from "filesystem-routing/vite";
import { defineConfig } from "vitest/config";
import solid from "@solidjs/vite-plugin";

export default defineConfig({
	plugins: [
		solid({ start: true, extensions: [".jsx", ".tsx"], diagnostics: true }),
		fileRoutes({ types: true }),
	],
	// ...
});
```

`src/App.tsx` はすべてのページがその内側でレンダリングされるコンポーネントです。
ルーターはここにマウントされ、すべてのページに表示すべきものもここに置かれます:

```tsx
import { Title } from "@solidjs/meta";
import { Loading } from "solid-js";
import { paths, Router } from "./router";
import "./App.css";

export default function App() {
	return (
		<Router>
			{(props) => (
				<>
					<Title>Solid App</Title>
					<nav>
						<a href={paths()}>Home</a>
						<a href={paths.users(1)}>Users</a>
					</nav>
					<Loading fallback={<main>Loading…</main>}>{props.children}</Loading>
				</>
			)}
		</Router>
	);
}
```

このファイルには、Solid で繰り返し登場するものが3つあります:

- `props.children` はマッチしたページがレンダリングされる場所です。
  Solid のレイアウトは、children をレンダリングする普通のコンポーネントです。
- `<Loading>` はバウンダリです。
  内側のページが初めてデータを待つとき、バウンダリはページの代わりにフォールバックを表示します。
  その後は、次のページの読み込み中も Solid 自身が現在のページを画面に保持し続けます。その保持にバウンダリは関与しません。
- `paths.users(1)` はルートツリーから URL `/users/1` を組み立てるため、リンクのタイプミスは壊れたページではなく型エラーになります。

`src/Document.tsx` はドキュメントシェルで、`index.html` を置き換えるファイルです。
完全な `<html>` 要素をレンダリングし、アプリを `props.children` として受け取ります。
ブラウザーには JavaScript を一切送らず、アプリを包む静的なシェルを生成するためだけに存在します。

`src/routes/index.tsx` はホームページです。
`src/routes` 配下でデフォルトエクスポートを持つ各ファイルが、対応する URL のページになります: `index.tsx` は `/`、`users/[id].tsx` は `/users/:id`、`[...404].tsx` はそれ以外すべてを受け止めます。
`users.tsx` を `users/` ディレクトリーと組み合わせると、そのディレクトリー内のすべてのページを包むレイアウトになります。

`src/components/Counter.tsx` はこのプロジェクトで最小の完全な Solid コンポーネントです:

```tsx
import { createSignal } from "solid-js";

export default function Counter() {
	const [count, setCount] = createSignal(0);
	return (
		<button
			class="increment"
			onClick={() => setCount(count() + 1)}
			type="button"
		>
			Clicks: {count()}
		</button>
	);
}
```

`createSignal(0)` はペアを返します: `count` は現在の値を読み取る関数で、`setCount` は新しい値を書き込みます。
JSX は波括弧の内側で `count()` を読み取ります。
読み取りが JSX の内側で起きるため、Solid はこのテキストノードが `count` に依存していると認識し、ボタンがクリックされたときにそのテキストノードだけを、他は何も更新せずに更新します。
`Counter` 自体は一度だけ実行されます。

## 変更を加える

カウンターにステップを追加します。
`Counter.tsx` の中身を次に置き換えます:

```tsx
import { createSignal } from "solid-js";

export default function Counter() {
	const [count, setCount] = createSignal(0);
	const [step, setStep] = createSignal(1);

	return (
		<>
			<button
				class="increment"
				onClick={() => setCount((current) => current + step())}
				type="button"
			>
				Clicks: {count()}
			</button>
			<label>
				Step
				<input
					type="number"
					min="1"
					value={step()}
					onInput={(event) => setStep(event.currentTarget.valueAsNumber || 1)}
				/>
			</label>
			<p>Next click adds {step()}.</p>
		</>
	);
}
```

ファイルを保存します。
ページはリロードなしで更新されます。
ステップを `5` に変えてボタンをクリックします: カウントは5ずつ増え、ボタンの下の文はクリックする前からそのことを示しています。

クリックハンドラーは今、値ではなく関数を `setCount` に渡しています。
新しい値が古い値に依存するときはこの形が安全です: 別の書き込みがすでにキューに入っていても、最新の値を受け取ります。
違いは[リアクティビティ](/concepts/reactivity#signals)で説明しています。

次に、意図的に動かないものを試します。
読み取りを JSX の外に移します:

```tsx
const [count, setCount] = createSignal(0);
const current = count(); // read once, in the component body

return <button onClick={() => setCount(count() + 1)}>Clicks: {current}</button>;
```

ボタンは更新されなくなり、ブラウザーのコンソールに警告が表示されます:

```text
[STRICT_READ_UNTRACKED] Reactive value read directly in <Counter> will not update.
Move it into a tracking scope (JSX, a memo, or an effect's compute function).
```

これが、Solid の残りすべてを理解可能にする唯一のルールです。
コンポーネント本体は一度だけ実行されるため、そこで読み取った値はスナップショットです。
JSX、メモ、またはエフェクトの計算関数の内側での読み取りは追跡され、追跡された読み取りは更新されます。
その理由と、それでもコンポーネント本体で値が必要な場合の対処法は[リアクティビティ](/concepts/reactivity)のページで説明しています。
続ける前に、読み取りを JSX の内側に戻してください。

### 試してみる: リセットボタン

カウントをゼロに戻す **Reset** ボタンを追加し、カウントがすでにゼロの間は無効にします。
最初のクリック後にボタンが自分で有効になるには、`disabled` の値をどこで読み取る必要があるか考えてください。

:::solution[リセットボタン]

```tsx
<button type="button" onClick={() => setCount(0)} disabled={count() === 0}>
	Reset
</button>
```

`disabled={count() === 0}` は JSX 式なので追跡されます: ボタンは読み込み時に無効で、最初のクリック後に有効になり、リセット後に再び無効になります。
コンポーネント本体で `count()` を `const` に読み込むと、上の例でラベルが固定されたのと同じように、最初の状態に固定されます。
:::

## ページを追加する

`src/routes/about.tsx` を作成します:

```tsx
import { Title } from "@solidjs/meta";

export default function About() {
	return (
		<main>
			<Title>About - Solid App</Title>
			<h1>About</h1>
			<p>Built with Solid.</p>
		</main>
	);
}
```

次に `src/App.tsx` のナビにリンクを追加します:

```tsx
<nav>
	<a href={paths()}>Home</a>
	<a href={paths.about()}>About</a>
	<a href={paths.users(1)}>Users</a>
</nav>
```

`http://localhost:3000/about` を開きます。
ルートテーブルはファイルシステムに従うため、ルート登録の手順はありません。
`fileRoutes({ types: true })` プラグインはパス型も再生成するため、`paths.about()` が型チェックを通ります。
`<Title>` はこのページだけのブラウザータブを設定します。`App.tsx` の `<Title>` は、タイトルを設定しないページのフォールバックです。

## テストとビルドを実行する

テンプレートには `Counter` のテストが1つ含まれています:

```tsx
import { render, fireEvent } from "@solidjs/testing-library";
import { flush } from "solid-js";
import { describe, expect, test } from "vitest";

import Counter from "./Counter";

describe("<Counter />", () => {
	test("it increments on click", () => {
		const { getByRole } = render(() => <Counter />);
		const button = getByRole("button");
		expect(button).toHaveTextContent("Clicks: 0");
		fireEvent.click(button);
		// Solid batches DOM updates; flush() applies them synchronously.
		flush();
		expect(button).toHaveTextContent("Clicks: 1");
	});
});
```

`npm test` で実行します。
ステップの入力欄を残した場合でも、`getByRole("button")` は依然として唯一のボタンを見つけます。
`flush()` 呼び出しが重要です: Solid はイベントハンドラーが戻った後に DOM 更新をバッチで適用するため、`fireEvent.click` の直後にアサートするテストは古いテキストを見ることになります。
[テストガイド](/guides/testing)ではこれと他の環境を扱っています。

`npm run build` を実行します。
出力は `dist/client` の静的ファイル群で、各ルートがそれぞれのチャンクに入ります。
そのディレクトリーは任意の静的ホストにデプロイできます。
後でサーバーレンダリングやサーバー関数が必要になったら、`vite.config.ts` で `start: true` の隣に `ssr: true` を追加します。書いたファイルはそのまま引き継がれます。
[プロジェクトの形状](/getting-started/project-shapes)では `bare`、`basic`、`fullstack` を比較しています。

## 次のステップ

ルーティング、自分で変更したコンポーネント、そして合格するテストを備えたアプリができました。
理解したいことに応じて次のページを選びます:

- モデルを最初から最後まで: [Thinking in Solid](/guides/thinking-in-solid) では商品検索ページを作りながら、各ステップで React や Vue の開発者なら代わりに何を使うかを説明します。
- モデルを1概念ずつ: [リアクティビティ](/concepts/reactivity)では、追跡、メモ、エフェクト、そして更新がいつ反映されるかを、上で見た警告から説明します。
- コンポーネント: [コンポーネントと JSX](/concepts/components-and-jsx)では、コンポーネントが一度だけ実行される理由、props がどうリアクティブであり続けるか、`Show` と `For` がどう条件分岐と `map` を置き換えるかを説明します。
- プラットフォーム: [アプリの構造](/building-apps/app-structure)では、start モードが何を生成するか、`App` と `Document` がどう組み合わさるか、サーバーレンダリングをどう有効にするかを説明します。
- ルーター: [Solid Router](/routing/solid-router) では、ルート定義、レイアウト、ナビゲーション、データ読み込みを扱います。

行き詰まったら [Discord チャットルーム](https://discord.com/invite/solidjs)で尋ねてください。
