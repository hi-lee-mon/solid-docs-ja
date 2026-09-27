SolidJS とそのシグナルの活用は、この1年でフロントエンドの世界を大きく揺さぶりましたが、誕生から最初の数年は、少数のメンテナーだけが関わる比較的無名のプロジェクトでした。その物語は一夜の成功ではなく、小さな一歩の積み重ねです。そしてある日目覚めると、ほぼすべての JavaScript フレームワークがシグナルから影響を受け、細粒度リアクティビティへの関心を新たにしている世界になっていました。

ここに至るまでの道のりは容易ではありませんでした。私たちは多くのインスピレーション元から大いに拝借しただけでなく、コントリビューターや支援者のコミュニティの善意に支えられてきました。Netlify、JetBrains、Builder.io をはじめとする多くの企業が開発を支援し、[フェローシップ](https://www.solidjs.com/blog/solid-fellowships-announcement)、[SolidHack](https://hack.solidjs.com/)、そして現在の [SolidStart Fund](https://opencollective.com/solid/projects/solidstart-fund) といったプログラムにつなげてくれました。これらのプログラムや取り組みは、パートタイムのリソースを直接支援し、メンバーが Solid に取り組む機会を得られるようにすることで、コミュニティに価値を還元するよう丁寧に設計されています。

そこで、Chrome チームが [Aurora](http://developer.chrome.com/aurora) を通じて、私たちの継続的なパフォーマンス研究に $30,000 を拠出してくれることを、とても嬉しく発表します。Aurora はオープンソースフレームワークの Core Web Vitals 改善に資金を提供しています。

きっかけは昨年秋、Chrome チームの [Addy Osmani](https://twitter.com/addyosmani) が [Taste Movies App](https://tastejs.com/movies/) の Solid 版を作るよう勧めてくれたことでした。私たちはこれを機会に、取り組んでいた最新の実験的技術をコミュニティに試してもらいました。結果は私たちの期待すら超えるものでした。クライアントナビゲーション付きの完全なサーバーレンダリングアプリが作られ、Lighthouse のページメトリクスで最高得点を記録し、JavaScript ペイロードは最も普及しているソリューションの1/10でした。

[![ルート一覧の例](/blog/images/chrome-supports-solidjs/devto-article-image.png)](https://dev.to/this-is-learning/client-side-routing-without-the-javascript-3k1i)

これを実現したのは、ネストされたルーティングによるサーバーレンダリング HTML パーシャルと、部分的にハイドレーションされる「アイランド」を組み合わせる手法です。アイランドの小さな JavaScript 配信量と、シングルページアプリケーションが持つ状態保持を組み合わせています。

新しくてエキサイティングな技術のプロトタイプを作ることと、それを一般に普及させることを支えることは、まったく別のことです。[改善すべきパフォーマンス、適用すべき手法、滑らかにすべき粗い部分](https://github.com/solidjs/solid-start/issues/400)はまだ残っています。この拠出により、この技術を作り上げるだけでなく、ハイドレーションやシリアライズのコストのような、JavaScript フレームワークであまり理解されていないオーバーヘッドの探究も可能になります。

このプロジェクトには、SolidJS 開始以来と同じ、数字に基づくアプローチで臨みます。指針となるのは [Core Web Vitals](https://web.dev/learn-core-web-vitals/) です。特に、低い LCP（Largest Contentful Paint）と TBT（Total Blocking Time）を維持しながら、優れた INP（Interaction to Next Paint）スコアを確保することに注力しています。

オープンソースソフトウェアと SolidJS にとって、エキサイティングな時期です。SolidJS チームは、研究開発を続け、驚異的なパフォーマンスと DX を引き出す新しい道やアイデアを探究する、この素晴らしい機会を得られたことを光栄に思います。Chrome チームと緊密に協力し、より速いウェブを構築していくことを楽しみにしています。
