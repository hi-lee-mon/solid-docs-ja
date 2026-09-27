---
title: "SolidStart 1.0: The Shape of Frameworks to Come"
date: "2024-05-21"
author: "SolidJS Core"
---

JavaScript におけるサーバーレンダリングの役割は拡大しています。パフォーマンスと最適化を追求する中で、すべてがサーバーをより活用する方向を指しています。

また、このテクノロジーを使い始めるのが簡単になっているわけでもないことは明らかです。webpack の設定だけでも十分に苦労していたのに、今度はサーバーとうまく連携するためにさらに多くのことをこなさなければなりません。

何かをする必要がありましたが、それは正しいやり方でなければなりませんでした。あまり労力をかけずに始められるほど簡単でありながら、特定のテクノロジーに縛られてしまうほど強い主張も持たないもの。その解決策はすべての人に響くものでなければならず、成長し続けるエコシステムを分断するものであってはなりませんでした。

幸い、Vite 2.0 のリリースがその実現方法を示してくれて、あとは歴史が動くだけでした……。

……と言いたいところです。しかし実際には、まだ解決すべきことがたくさんありました。複数回の書き直し、2 度のベータ期間、そして多くの学び。それでも 3 年後、私たちは最初のメジャーリリースにたどり着きました。

## SolidStart とは？

SolidStart は、SolidJS アプリを構築してさまざまなプロバイダーにデプロイするために設計された JavaScript フレームワークです。これは他の多くの JavaScript フレームワークと大きく変わらないように聞こえるかもしれません。しかし、悪魔は細部に宿ります。

### すべてはアラカルト

SolidStart は何よりもまずスターターとして設計されています。つまり、ライブラリを一切インストールしない基本セットアップでも、Minify と GZip 後で約 5 KB の JavaScript で Hello World のサンプルが動きます。追加のライブラリを使いたくないですか？ 心配いりません、使わなくても構いません。

SolidStart の基本部分は特定の規約にあなたを縛り付けません。SolidStart が提供する規約のいくつかを採用すれば多くの場合最良の体験が得られますが、必要のない機能の対価を払うことは必須ではありません。

### 自分のアプリケーションルーターを持ち込める

SolidStart にはファイルシステムルーティングがあります。`[]` でパラメーターを渡すという、Nuxt と似た規約を採用しています。ただし私たちは `()` も使っており、Route Groups、名前付き index ルート、ネストからの脱出といった、より強力なことを実現します。基本的に、括弧の間に置いたものはマッチングからは除外されますが、ルートの構造には依然として影響します。

![ルート構造のスクリーンショット](/blog/images/solid-start-the-shape-frameworks-to-come/routes-tree.png)

ファイルシステムから得られた設定はアプリケーションに戻され、選択したルーターで使えます。`FileRoutes` をコンポーネントとしても通常の関数としても呼び出せば、SolidStart が生成した設定を取得できます。

```js
import { FileRoutes } from '@solidjs/start/router';
import { Router } from '@solidjs/router';

function App() {
  return (
    <Router>
      <FileRoutes />
    </Router>
  );
}
```

ルートはどう設定しますか？ `route` エクスポートでカスタムルート設定を定義できます。default エクスポートされたコンポーネントを自動的に `lazy` でラップし、`component` プロパティとして設定に追加します。

```js
import { type RouteDefinition } from "@solidjs/router";
import { getStory } from "~/lib/api";

export const route = {
  load({ params }) {
    void getStory(params.id);
  },
  matchFilters: {
    id: /^\d+$/ // only allow numbers
  }
} satisfies RouteDefinition;

export default function MyRouteComponent() {}
```

独自の型を設定し、プロジェクトで好きなルーターを好きなように設定して使えます。

### サーバーが強化する（書き直しは不要）

SolidStart は「シングルページアプリ」ファーストで構築されました。すべての機能は、すでに使っているライブラリすべてと連携するように設計されています。そのためには、サーバー専用の機能の追加方法を慎重に検討する必要がありました。

これが、[2022 年初頭](https://www.youtube.com/watch?v=G5vwaoXck_g)に「サーバー関数」を先駆けて開発した経緯です。この機能はその後、いくつかの[人気](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)[フレームワーク](https://qwik.dev/docs/server$/)にも取り入れられました。

関数に `"use server";` を追加すると、その関数はサーバーでのみ実行され、サーバー上で自然に呼び出されるか、クライアントからの RPC として使われます。サーバー関数は TypeScript の観点から透過的で、Tanstack Query のフェッチャーのような既存の API に組み込めます。

```js
import { createQuery } from "@tanstack/solid-query"

function Posts() {
  const query = createQuery(() => {
    queryKey: ["posts"],
    queryFn: async () => {
      "use server";
      const evt = getRequestEvent();
      if (!evt.locals.userId)
        throw new Error("Not Logged In");

      const posts = await db.posts.getMany({
        where: { userId: evt.locals.userId }
      })
      return posts;
    }
  });

  return /* ... */
}
```

この方法により、最初の SSR 時でもその後のナビゲーション時でも、データのフェッチでもミューテーションでも、さらにはブラウザーでの純粋なクライアントサイドレンダリングでも、すべてが期待どおりにサーバーとクライアントで動作します。

私たちのサーバー関数は、Async Iterables、Streams、Promises のような高度なシリアライゼーションに対応しており、望む API を構築できます。

この機能を使って、Solid Router の API でシングルフライトミューテーションのようなことを実現しています。更新の後、サーバーが次ページのデータのフェッチを開始し、クライアントがリダイレクトを処理している間に同じレスポンスでストリームで送り返せます。これと、並列化されたロード・キャッシュパターン、Solid のノンブロッキング非同期により、不要なウォーターフォールをほぼ排除しました。

![シングルフライトミューテーションを示す図](/blog/images/solid-start-the-shape-frameworks-to-come/single-flight.png)

[Notes サンプル](https://github.com/solidjs/solid-start/tree/main/examples/notes)で実際の動作を確認できます。

## さらなる高みへ

正直なところ、SolidStart には語りきれないほど多くの機能があります。体験はまさにあなたが作るものだからです。クライアントレンダーモード、サーバーサイドレンダリング、静的サイト生成、順不同ストリーミング、楽観的 UI、キーベースのキャッシュ・無効化、プログレッシブに強化されたフォーム、API ルート、並列化されたネストルートのデータフェッチ、シングルフライトミューテーション、Islands（実験的）、サスペンス、トランジション。枚挙にいとまがありません。

これは、作り手と、自分の意見を持つ人のために設計されたフレームワークです。私たちはここにある可能性をまだ掘り起こし始めたばかりです。それが「到来するフレームワークの形（The Shape of Frameworks to Come）」という意味です。SolidStart が最後の Solid フレームワークになることはありません。私たちは始まったばかりです。すでに CreateJDApp や MediaKit のように、その上にメタフレームワークを構築する人たちを見てきました。

そのために、私たち（Solid コアチーム）は心から感謝しています。Issue や PR を投稿してくれるすべてのコントリビューターに感謝します。Vite、Vinxi、Nitro のようにこれを技術的に可能にしてくれるオープンソースプロジェクトに感謝します。Netlify、Google Chrome、JetBrains のように資金を提供してくれるすべてのスポンサーに感謝します。そして何よりも、オープンな開発を受け入れ、手軽さよりもより良いものを選び、この旅路をともに歩んでくれた皆さんに感謝します。皆さんが、私たちに最高のソリューションを作り続け、ウェブ開発の未来を形作り続ける力を与えてくれます。

[📺 YouTube で動画を見る](https://www.youtube.com/watch?v=ZVjXtfdKQ3g)

この記事のレビューをしてくれた Theo Browne、Erik Demaine、Dev Agrawal、bigmistqke に、そしてシングルフライトミューテーションの画像を提供してくれた Dev Agrawal に感謝します。
