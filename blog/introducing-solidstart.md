> この発表以降、SolidStart には大きな変更がありました。2024年5月21日に SolidStart 1.0 が破壊的変更を含めて正式リリースされました。そのため、この記事に示されたコード例や API は古くなっている可能性があります。最新の SolidStart ドキュメントは start.solidjs.com をご覧ください。

私たちはかなり長い間 SolidJS に取り組んできました。最初の数年は、私自身が何かを証明するためだけのものでした。次の数年は、学んだことを広めるためのものでした。

この2年はずっとこんな感じでした。「Solid はすごく良さそう。`_____________` ができたら試してみたい」。言わせてもらえば、その空白は常に動くターゲットです。しかし最近は「Next.js」的なフレームワークに落ち着いてきたようです。そしてついに、お答えできるようになりました。

SolidStart がベータになったことを、嬉しく発表します！

# SolidStart のご紹介

SolidStart は SolidJS のファーストパーティ製プロジェクトスターター兼フレームワークで、規模以上の力を発揮し、Solid アプリをデプロイするファーストクラスの方法を提供します。そう、またフレームワークです。でも、実はそうでもありません。

SolidStart を特徴づけるのはモジュール性です。使用する少数のライブラリは、すでに Solid エコシステムにあるものと同じです。新しいルーターやメタタグ注入器を作ったわけではありません。これらに加えた改良はすべて、誰もが恩恵を受けられるよう各ライブラリに還元されます。SolidStart を単なる CLI + Vite プラグインと見なしても、それほど不合理ではありません。

その通りです。SolidStart は [Vite](https://vitejs.dev) の上に構築されています。これにより、Vite と Rollup のエコシステムから膨大な数のプラグインを利用できます。つまり、CSS のようなアセット処理は、すでに私たちのために管理されています。

# では、具体的に何をするのか？

SolidStart を使えば、JavaScript または TypeScript のプロジェクトテンプレートを起動し、クライアントレンダリングまたはサーバーレンダリングを選び、アダプターを取り替えるだけの手軽さで、[Netlify](https://www.netlify.com/)、[Vercel](https://vercel.com/)、[Cloudflare](https://www.cloudflare.com/)、[Deno Deploy](https://deno.com/deploy) のサーバーレス・エッジ関数へデプロイできます。

とはいえ、正直なところ、これはどのモダンな Web フレームワークにも当てはまる説明です。カスタムミドルウェアを追加できるブラウザの Request/Response モデルの採用。プラットフォームに依存しないセッション（[Remix](https://remix.run/) に感謝）。ホットモジュールリロード。フロントエンドエコシステム全体から学んだことを土台にしていなければ、Solid のプロジェクトとは言えません。

## ネストされたファイルシステムルーティング

Solid の[ルーター](https://github.com/solidjs/solid-router)は常にかなり強力でした。アイソモーフィックに動作し、Solid のサスペンスとトランジションに自動で連携する、並列化されたデータフェッチ付きのネストルーティングです。過去3年間 Solid を使ってきた方なら、何のことかお分かりでしょう。

なので私たちがやるべきだったのは、始めやすくするためにファイルシステムルーティングの規約を追加することだけでした。ネストにはフォルダーシャドウイングのパターンを採用し（[Nuxt](https://nuxtjs.org/docs/features/file-system-routing/#nested-routes) から）、`[]` のパラメータ化ルートと `()` のグルーピングを組み合わせました。また、`()` は `index.tsx` ルートにもぴったりだと気づきました。おかげで、プロジェクト内のファイルに同名を付ける必要が一切なくなります。

![ルート一覧の例](/blog/images/introducing-solidstart/routes.jpeg)

ファイルシステムルーティングは驚くほど便利ですが、時には制約にもなります。そこで `<FileRoutes />` コンポーネントとしてエクスポートしており、ルート定義に自分で挿入しても、しなくても構いません。（[Hydrogen](https://shopify.dev/api/hydrogen/components/framework/fileroutes) に感謝）。

```ts filename="index.js"
<Routes>
  <FileRoutes />
  {/* other manual route definitions */}
</Routes>
```

## サーバー関数

Solid は `GET`、`POST`、`DELETE` のような大文字の HTTP 動詞の名前付きエクスポートで API ルートを提供していますが（[SvelteKit](https://kit.svelte.dev/docs/routing#server) に感謝）、SolidStart におけるブラウザとサーバー間通信の中核となる方法は RPC（Remote Procedure Call）です。

インライン RPC 呼び出しの素晴らしい点は、型の自動化がかなり簡単なことです。

```ts filename="index.js"
const greeting = server$(async (name: string) => {
  console.log("I'm always on the server");
  return `Hello ${name}`;
});

greeting(); // Error: Expected 1 argument, but got 0.

greeting(0); // Error: Argument is not assignable to type 'string'

console.log(await greeting('Adam'));
```

これらは任意のファイルで定義でき、どこでも使えます。

## RouteData と RouteActions

サーバー関数の生の力を解放して分かったことの1つは、ほぼ何でもできてしまう一方で、人々は規定された選択肢を必要としているということです。Solid のルーターはすでに `routeData` 関数をサポートしているので、[Turbo Query](https://github.com/StudioLambda/TurboSolid) や [Tanstack Query](https://tanstack.com/query/v4/docs/adapters/solid-query) のようなソリューションをサポートするのに作業は不要でした。フェッチをサーバー関数で拡張することすら不要でした。ルートセクションごとに個別の無効化を持つ複数の異なるリソースを許可することもできました。

```ts filename="index.js"
export const routeData = ({ params }) => {
  const [post] = createResource(
    () => `posts/${params.id}`,
    server$(getPostFromDB), // <= only on the server
  );
  return post;
};
```

とはいえ、シンプルなケース向けにもっと流線型のソリューションも提供したいと考えました。そこで [Remix](https://remix.run/) と [Tanstack Query](https://tanstack.com/query/v4/docs/adapters/solid-query) から少しインスピレーションを得て、Solid ならではのものに融合させました。リソースの上に構築した `createRouteData` と、そのサーバー専用の対となる `createServerData$` を作りました。単一の非同期関数ほどのシンプルさではありませんが、その代わりに細粒度の無効化が得られます。

```ts filename="index.js"
export const routeData = ({ params }) => {
  return createServerData$(getPostFromDB, {
    key() {
      return ['posts', params.id];
    },
  });
};
```

しかし、ミューテーションのないデータフェッチとは何でしょう。[GraphQL の RPC スタイルミューテーション](https://graphql.org/learn/queries/#mutations)と [Remix](https://remix.run/) のアクションに触発され、ここでもサーバー関数を活用して、ページあたり好きなだけのアクションを、コンポーネントツリーのどこにでも定義でき、それぞれが独立して無効化できる仕組みを提供しました。

```ts filename="index.js"
const [togglingTodo, toggleTodo] = createServerAction$(
  async (id: number) => await db.toggleTodo(id),
  { invalidate: ['todos', id] },
);

// mutate
toggleTodo(id);

// optimistic updates
const completed = () => (togglingTodo.pending ? !todo.completed : todo.completed);
```

そして、JavaScript なしでも動くプログレッシブエンハンスメントなフォームも生成できなければ、この話は完成しません。

```ts filename="index.js"
const [togglingTodo, toggleTodo] = createServerAction$(
  async (form: FormData) => {
    await db.toggleTodo(Number(form.get('id')));
    return redirect('/');
  },
  { invalidate: ['todos', id] },
);

<toggleTodo.Form>
  <input type="hidden" name="id" value={todo.id} />
  <button type="submit">
    <ToggleIcon />
  </button>
</toggleTodo.Form>;
```

# まだ始まったばかり

[ツイート](https://twitter.com/fredkschott/status/1589662230962147332)

SolidStart はエコシステム全体から集めたモダンフロントエンドの集大成かもしれませんが、私たちは現状に甘んじる人間ではありません。すでに新しい実験的機能として、[部分ハイドレーションとハイブリッドネストルーティングの新たな解釈](https://dev.to/this-is-learning/client-side-routing-without-the-javascript-3k1i)を披露しています。

SolidStart は今日ベータです。バグや未実装の機能はあるでしょう。ドキュメントもまだ作成途中で、より良いガイドとチュートリアルを提供するために拡充しているところです。しかし、プロジェクトで試す準備はできています。ドキュメントと最新情報は [start.solidjs.com](https://start.solidjs.com/getting-started/what-is-solidstart) をご覧ください。デプロイパートナーにある公式テンプレートもご利用いただけます。あるいは、ターミナルを開いて次を入力して始めてください。

```bash
> npm init solid
```

SolidJS の最新情報を話し合う [Discord](https://discord.com/invite/solidjs) にぜひ参加してください。
