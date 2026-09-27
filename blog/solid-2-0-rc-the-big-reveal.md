UI フレームワークにおける最も難しい問題は、決してレンダリングではありませんでした。効率的に変更できる DOM は最初からありました。最初の課題は同期でした――何が起きていようと一貫したインターフェースを表示し、それを効率的に行うことです。細粒度リアクティビティは 10 年前にそれを解決しました。変更されたものだけを正確に更新し、残りはスキップする。

なくならなかった問題は非同期です。私たちのものを含め、あらゆるフレームワークが非同期を、自分に*降りかかる*条件として扱ってきました。同期的なコアが耐え忍ぶしかないものとして。

そして今日、Solid 2.0 はリリース候補（Release Candidate）に到達し、もう一つの道を取ります。非同期はリアクティブシステム自体の性質であり、グラフの一部です。この一つの決定が、このリリースのすべてを貫いています。モデルがより多くを担うため、フレームワークはより少なくて済みます。

## 非同期はグラフの中に生きる

計算は Promise（または非同期イテレーター）を返すことができ、下流のすべてがそれを理解します。それを吸収する特別なプリミティブも、手動のローディング状態も、null チェックも不要です。

```tsx
import { createMemo, isPending, Loading } from "solid-js";

function Profile(props) {
  const user = createMemo(() => fetchUser(props.id));

  return (
    <Loading fallback={<Skeleton />}>
      <h1 class={{ stale: isPending(user) }}>{user().name}</h1>
    </Loading>
  );
}
```

これがデータフェッチの物語のすべてです。`user` はたまたま非同期なメモです。`<Loading>` は準備ができるまでそれをカバーします。`props.id` が変わると、新しい回答が届くまでの間も古いコンテンツは表示されたままになり、`isPending` が変更が来ることを教えてくれます――「どこかで何かがフェッチ中か」ではなく、「*この*質問への新しい回答が届く途中か」です。

派生状態、エラーハンドリング、トランジション、楽観的更新はすべてこの一つのアイデアから自然に導かれます。そして非同期がグラフの中にあるため、データがクライアントのフェッチ、サーバーレンダー、サーバー関数のどこから来ても同じコンポーネントが動作します。サーバーの物語はアプリを置き換えるのではなく、その上に重なります。

非同期の物語は 1 つのセクションでは語り尽くせません――後述の「次は何か」をご覧ください。

## 学ぶことは少なく、使えることは多く

Solid 2.0 が取り除いたものはすべて、あなたが学ばなければならなかったものです。追加されたものはすべて、あなたが使えるものです。これらは私たちが削った機能ではありません。あなたが学ばなければならなかった回避策でした。今では、それらは Solid の動作そのものです。

- **`createResource` ―― 廃止。** 非同期は普通のメモを流れます。
- **`batch` ―― 廃止。** すべてがバッチされます。書き込みはマイクロタスクで適用され、今すぐ必要なら `flush()` します。
- **`startTransition` / `useTransition` ―― 廃止。** グラフが自分で一貫した状態を保持し、`isPending` と `latest` がそれを読み取ります。
- **`on` と `createComputed` ―― 廃止。** 分割エフェクト `createEffect(compute, apply)` が、追跡と副作用を分離します。
- **`produce` と `createMutable` ―― 廃止。** ストアのセッターはミューテートするドラフトを渡します。これが今のストアの動作です。

[1.x 移行ガイド](https://v2.solidjs.com/migration/from-solid-1)は、すべての削除とその代替の対応を示しています。

新しい API は別の話です。最初のアプリを作るのに、楽観的ストア、プロジェクション、アクション、表示順序の制御は必要ありません。10 個目のアプリでも必要ないかもしれません。しかし必要になったとき、それらはそこにあり、他のすべてと連携します。学ぶことは少なく、できることは多い。そしてランタイムはその半分にすぎません。

## 1 つのプラグイン、プラットフォーム全体

私たちのツールチェーンも同じトレードをしました。

Solid 2.0 は [Oxc](https://oxc.rs/) の上に構築された Rust 製の新しいコンパイラツールチェーンを同梱し、`@solidjs/vite-plugin` は**デフォルトでそれを使います**。プラグインをアップグレードすれば、ネイティブツールで Solid をコンパイルしています。設定ゼロ。移行も不要。Babel プリセットも引き続き利用できます。

| ワークロード | babel-plugin-jsx-dom-expressions | Oxc コンパイラ | 高速化 |
| --- | ---: | ---: | ---: |
| Fixture 一式（88 ファイル、175 KB、全 10 モード） | 440 ms | 19 ms | 23x |
| 129 KB の単一モジュール | 545 ms | 9.4 ms | 58x |
| 1 MB の単一モジュール | 24,975 ms | 70 ms | 355x |

そしてプラグインには **start モード** が追加されました――プラグインに直接組み込まれた、すぐに使えるサーブレイヤーです。

```ts
// vite.config.ts
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";

export default defineConfig({
  plugins: [solid({ start: true })]
});
```

これだけで、プレーンな Vite 上の完全なアプリセットアップです。エントリーファイルも `index.html` も dev サーバースクリプトも不要。プラグインがエントリー、dev サーブ、ビルドを担います。`src/App.tsx` を書くだけです。

そこからすべてが積み重なります。

- **デフォルトで SPA。** `start: true` だけでクライアントモードです。dev はストリーム配信されるドキュメントシェルにアプリをクライアントレンダリングで提供し、`vite build` は純粋に静的な `dist/client` を出力します――任意の静的ホストにデプロイ可能です。
- ルーター中立の [filesystem-routing](https://github.com/solidjs/filesystem-routing) パッケージによる**ファイルシステムルーティング**――SolidStart で実証済みの規約、HMR とコード分割、フェッチミドルウェアとしての `GET`/`POST` API ルート、Solid Router 向けの型付きルート出力。
- `solid({ start: true, ssr: true })` による **SSR**。プラグインは `render` を `hydrate` に置き換え、ハイドレーション可能な変換を有効にし、サーバーバンドルを出力します。本番の契約は 1 つの関数 `handleRequest(request)` であり、だからこそ任意のホストプラットフォームと合成できます。フェッチスタイルのミドルウェア（`start.middleware`）、ルーター向けのリクエストごとのセットアップ接続点（`start.setup`）、[Standard Schema](https://standardschema.dev) で検証される型付き環境変数――サーバーのシークレットがクライアントチャンクに漏れた場合にコンパイルをブロックするビルド時チェック付き――がサーブレイヤーを完成させます。
- **サーバー関数。** `"use server"` は `@solidjs/web/server-functions` に支えられた*コア*機能になりました――型付き RPC、ストリーミング返却、プログレッシブエンハンスメント、任意の Vite アプリでのカスタムシリアライゼーション。サーバー関数のサーバー側はあなたの関数本体です――バリデーション、認証、ロギングはフレームワークのフックではなくコード行です。本体内でのみ参照されるものはクライアントに届きません。ディレクティブの境界自体がプライバシー機構です。

```ts
import { reload } from "@solidjs/web";

export async function addTodo(title: string) {
  "use server";
  await db.insert(title);
  return reload({ revalidate: "todos" });
}
```

- **デプロイするときは**、1 回のビルドで `dist/client` と、Web 標準の Fetchable ハンドラーを default エクスポートするサーバーモジュールが出力されます――Cloudflare Workers、Netlify Functions、Nitro、Bun、`deno serve` がすでに対応している規約です。[Cloudflare](https://developers.cloudflare.com/workers/vite-plugin/)、[Netlify](https://www.npmjs.com/package/@netlify/vite-plugin)、[Nitro](https://nitro.build/) のプラットフォーム Vite プラグインは Solid のサーバー環境を直接採用しているため、あなたが設定する Solid アダプター層も、私たちがメンテナンスする層も存在しません。デプロイは Web 標準とあなたのプラットフォームのツールだけです。[完全なデプロイガイド。](https://v2.solidjs.com/building-apps/deployment)

## SolidStart は役目を終えた

メタフレームワークは、フレームワークの隙間を埋めるために存在します。SolidStart の仕事は、コアが提供できないものを提供することでした。2.0 のサイクルを通じて、それらの機能は一つずつ本来の場所へ移りました。サーバー関数はコアへ、サーブレイヤーは start モードへ、ファイルシステムルーティングはルーター中立のパッケージへ。その過程の最後に残ったのは、もはやラップを必要としないものを包むラッパーでした。

そこで、中身の空っぽな 3.0 を出す代わりに、私たちはそれを退役させます。**start モードが SolidStart に取って代わります。**

今日 SolidStart を本番で動かしていても、何も壊れません。SolidStart は引き続きメンテナンスリリースを受け取り、[移行ガイド](https://v2.solidjs.com/migration/from-solid-start)はすでに公開されています。ほとんどのアプリでは移行は機械的な作業で、残りは後述の移行アシスタントが指摘します。これは終わりではありません――フレームワークが、メタフレームワークが始めた仕事をやり遂げることです。

## 10 秒ツアー

ベータの発表を追っていた方なら基礎はご存知でしょう。そうでない皆さんのために、各項目にはドキュメントへのリンクが付いています。

- **[`<Loading>`・`<Errored>`・`<Reveal>`。](https://v2.solidjs.com/concepts/boundaries)** 新しい非同期モデルに合わせて再考された Suspense、ErrorBoundary、SuspenseList――再検証中も古いコンテンツは表示されたまま、バウンダリは回復し、表示順序は調整されます。
- **[コアのアクションと楽観的状態。](https://v2.solidjs.com/concepts/async-reactivity)** `action`、`createOptimistic`、`createOptimisticStore` が、実行中のミューテーションを即座にレンダーし、サーバーの応答で整合させます。
- **[ドラフトファーストのストア。](https://v2.solidjs.com/concepts/stores)** セッターは直接ミューテートする値を返します。プロジェクションと派生ストア（`createStore(fn)`、`createProjection`）が 1.x の書き戻しパターンに取って代わります。
- **[統一されたリスト。](https://v2.solidjs.com/concepts/components-and-jsx)** キー指定モードを持つ 1 つの `<For>` が `<For>`/`<Index>` に取って代わり、`<Repeat>` は diffing なしで個数指定でレンダーします。
- **[HTML に近い DOM モデル。](https://v2.solidjs.com/concepts/components-and-jsx)** 標準の属性セマンティクス、boolean の有無、`class` オブジェクトと配列、`ref` ディレクティブファクトリー。
- **クリーンなパッケージグラフ。** リアクティブコアは `@solidjs/signals`、ウェブランタイムは `@solidjs/web`、ストアは `solid-js` 自体にあります。

これらすべての設計根拠は [2.0 RFC](https://github.com/solidjs/solid/blob/next/documentation/solid-2.0/README.md) にあります。

## 次は何か

この記事には意図的に入れていないことが 2 つあります。

非同期モデルは本格的な深掘りに値します。来週からシリーズが始まります。読み取り、書き込み、そしてワイヤー上の通信――メモ、楽観的ミューテーション、ストリーミングサーバーのどこからデータが来ても、コンポーネントがどうレイテンシを意識せずにいられるかを扱います。

そして設定型の中の `serverFunctions: { components: true }` に気づいた方へ。はい、サーバー関数はコンポーネントを返せます。リアクティブサーバーコンポーネントはそのフラグの下で実験的プレビュー中で、2.0 安定版の後に正式な発表を予定しています。待つ価値はあります。

## 試して、移行して

Solid 2.0 のプレビュードキュメントは [v2.solidjs.com](https://v2.solidjs.com) で公開中です。

新しいプロジェクトでは、以下から Solid 2.0 テンプレートを選んでください。

```sh
npm create solid@latest
```

既存プロジェクトの移行は、[こちら](https://v2.solidjs.com/migration/from-solid-1)のガイドに従ってください。

また、プロジェクトをスキャンして、検出したすべての 1.x 移行箇所――レガシーなインポート、1 引数の `createEffect`、`onMount`、`Suspense`/`Index`/`classList`、旧ストアヘルパー――に対して具体的なガイダンスを表示する[移行アシスタント](https://github.com/solidjs-community/solid-migration-assistant)も開発中です。

```sh
npx solid-migration-assistant
```

エコシステムは待っていませんでした。[Solid Router 2.0](https://v2.solidjs.com/routing/solid-router) は、完全に型付けされたルート、パラメーター、ナビゲーションとともに RC と同時にリリースされます。[Solid Meta 1.0](https://v2.solidjs.com/migration/from-solid-meta) は 2.0 の組み込み head レジストリの薄いレイヤーになりました。TanStack がお好みですか？ [fullstack-tanstack テンプレート](https://v2.solidjs.com/routing/tanstack)は TanStack Router と TanStack Query を start モードと標準で組み合わせ、[TanStack Start](https://tanstack.com/start) はすでに Solid 2.0 ベータ（`@tanstack/solid-start@beta`）を出しています。そして実際にアプリを作るのに使うライブラリ――[Solid Primitives](https://primitives2.solidjs.community/)、[Kobalte](https://kobalte.dev/)、[Solid Testing Library](https://github.com/solidjs/solid-testing-library)、[Storybook](https://github.com/solidjs-community/storybook)、[AG Grid](https://github.com/dsnchz/solid-ag-grid)――はベータ期間を通じて 2.0 対応に懸命に取り組み、今日 RC とともに使えます。ユーティリティ、コンポーネント、メタフレームワーク、テスティング、ルーティング、head 管理。リリースよりも先にスタックは整っています。

## 謝辞

この 5 か月間、これを実現するために費やされた努力は並大抵のものではなく、言葉では言い表せません。こんな短時間にこれほど多くを成し遂げられるとは思ってもみませんでした。手を抜きがちなのはいつも使い勝手に関わる細部ですが、そこが違いを生みました。Solid 2.0 ベータは、ローンチする前からすでにかなり「Solid（堅牢）」でした。宣言的リアクティビティの最良のパターンに関する長年の研究が、ここに結実しました。

しかし予期していなかったのは、Solid 1.0 リリースの準備と比べて、どれほど様子が違っていたかです。あのときコミュニティはずっと小さく、永遠に時間がかかるように感じられました。今回は息子の Nico との絆を深めるために 6 週間の育児休暇を取りましたが、開発は一拍も乱れませんでした。ベータテスターと AI エージェントが、ただ前へ進み続けました。コアのスコープを膨らませないと固く決めていましたが、それ以外のすべては自然とついてきました。Solid 3.0、ひいては 4.0 用に控えていたものまで。実は半年前に Solid 3.0 の計画書を書き起こしていたのですが――その内容はすべて達成しました。

それは AI の時代における物事の進み方なのかもしれませんが、それを可能にした人々を認めることが重要です。紹介しきれないほどたくさんの方々がいますが、簡単に謝意を述べさせてください。

まず私の仕事を直接支援してくださる方々から。寛大な雇用主である [Sentry](https://sentry.io)、そして不可能を可能にするクレジットを提供してくれた [Cursor](https://cursor.com/) に感謝します。

そしてベータのテストと貢献に関わったすべての皆さんへ：
@brenelz @yumemi-thomas @mizulu @titoBouzout @GabbeV @birkskyum @dangkyokhoang @tsushanth @maciek50322 @kanashimia @SnowingFox @atk @AFatNiBBa @snatvb @better-salmon @m-canton @arpitjain099 @DominicDolan @deluksic @danon @danielalanbates @beanscg @trusktr @sonukapoor @rtritto @ngotruonghuy @mudmaster556 @jpdutoit @gameroman @echab @danielrkling @katywings @clinuxrulz @ahzvenol @tonghuaxingdsb @thomasbuilds @thep0y @subotac @spokodev @samualtnorman @rvlzzr @rrshaban @rexblade58 @mitsuhiko @mesram @mariokresic @madaxen86 @lxsmnsyc @Tommypop2 @LadyBluenotes @le0-0 @jer3m01 @iamssen @gnomical @developerdizzle @devagrawal09 @milomg @mihar-22 @tannerlinsley @crassicus @alfi-dim @aekobear @WolffM @VXsz @PierBover @Jungzl @JLouisa @DakshSinghDhami @CxRes

リリース候補とは API が凍結されたという意味であり、バグがないという意味ではありません。プロジェクトをアップデートして Issue を報告してくださる皆さんに心から感謝します。エコシステムの構築者の方、あるいは Solid 1.0 でプロジェクトをメンテナンスしている方は、ぜひ今すぐ移行して Issue を報告してください。

Solid 2.0 を正式リリースへ届けましょう！
