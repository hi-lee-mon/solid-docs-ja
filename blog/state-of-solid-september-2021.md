---
title: "The State of Solid: September 2021"
date: "2021-09-30"
author: "Ryan Carniato"
---

1.0 リリースからのここ数か月、Solid では多くのわくわくする出来事がありました。

まずは大きなニュースから始めましょう。

---

## Netlify が公式デプロイパートナーに参加

![Netlify](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/w00wmhamyf0r5ek6b901.png)

Netlify がデプロイパートナー兼スポンサーとして本プロジェクトに参加することを、大変嬉しく発表します。Solid の開発と成長に向けて、[月額 500 ドル](https://opencollective.com/solid)の支援をいただきます。

公式の[スターターテンプレート](https://github.com/solidjs/templates)に [Deploy with Netlify](https://www.netlify.com/blog/2016/11/29/introducing-the-deploy-to-netlify-button/) を追加し、Solid アプリケーションをこれまで以上に簡単にデプロイできるようにする予定です。

---

## 1.0 リリースと反響

1.0 リリースには信じられないほどの反響をいただきました。長年の取り組みが実を結ぶのを見るのは素晴らしいことです。業界の声が Solid について何と言っているかご覧ください:


[ツイートを見る](https://twitter.com/markdalgleish/status/1409811453696118786)

[ツイートを見る](https://twitter.com/DavidKPiano/status/1409592349370560513)

[ツイートを見る](https://twitter.com/mweststrate/status/1409599364838920200)

[ツイートを見る](https://twitter.com/trueadm/status/1413972672342528017)

[ツイートを見る](https://twitter.com/fredkschott/status/1424876545823318020)

---

## チームの拡大

このプロジェクトは私が始め、長年一人で運営してきましたが、間違いなく私一人の手に余る規模にまで成長しました。私たちはチームを拡大してきました。これまで他のメンバーを正式に紹介する機会がなかったので、ここで紹介します:

David Di Biase - ウェブサイト/コミュニティマネージャー

Alexandre Mouton Brady - テンプレート/インテグレーション

Milo M. - ツーリング

Ryan Turnquist - ルーター/ライブラリ

Dan Jutan - ドキュメント/トレーニング

また、Solid のエコシステムに素晴らしい追加をもたらしてくれている少人数のコントリビューターグループもいます。[紹介はこちら](https://www.solidjs.com/contributors)でご覧いただけます。

---

## 成長するエコシステム

Solid で何ができるかを示す新しいライブラリが、毎日のように登場しているようです。そこで、いくつかを紹介したいと思います。

[Solid Primitives](https://github.com/davedbase/solid-primitives) - 私たち版の「React Use」。高品質で再利用可能なプリミティブのセットです。

[Solid Flip](https://github.com/otonashixav/solid-flip) - FLIP アニメーションをこれまで以上に簡単に実現する新しいアニメーションライブラリです。

[Solid DND](https://github.com/thisbeyond/solid-dnd) - Solid の細粒度リアクティビティを活かすために作られた dnd-kit のドラッグ&ドロップ移植版です。

[@felte/solid](https://github.com/pablo-abc/felte/blob/main/packages/solid/README.md) - Svelte 向けフォームライブラリ Felte の Solid 移植版です。

[Solid URQL](https://github.com/Acidic9/solid-urql) - Solid で GraphQL をこれまで以上に簡単に使えるようにする URQL ラッパーです。

まだ完成はしていませんが、現在いくつかのコンポーネントライブラリが開発中です:
[Solid Headless](https://github.com/LXSMNSYC/solid-headless)
[Solid Blocks](https://github.com/atk/solid-blocks)

また最近は DSL の議論に関連して、Svelte 風の構文を Solid に取り込もうとするプロジェクトもいくつか登場しています:
[Babel Plugin Solid Labels](https://github.com/LXSMNSYC/babel-plugin-solid-labels)
[Babel Plugin Undestructure](https://github.com/orenelbaum/babel-plugin-solid-undestructure)

さらに見たい方は、ウェブサイトの [Resources セクション](https://www.solidjs.com/resources)や、コミュニティ主導の [Awesome Solid](https://github.com/one-aalam/awesome-solid-js)をチェックしてください。

---

## 翻訳

リリース直後からこれほど翻訳への関心が集まるとは予想もしていませんでしたが、コントリビューターの皆さんによる素晴らしい作業がたくさん行われています。現在、[solidjs.com](https://solidjs.com) のドキュメントは 10 言語で利用できます。

全チュートリアルの翻訳も進行中で、現在は英語、日本語、中国語で利用できます。

以下の皆さんに心から感謝します:
- Gaving Cong 🇨🇳
- Jun Shindo 🇯🇵
- David Di Biase 🇮🇹
- Candido Sales Gomez 🇧🇷
- Steven Yung 🇫🇷
- Mehdi (MidouWebDev) 🇫🇷
- Athif Humam 🇮🇩
- Alex Lohr 🇩🇪
- Pheianox 🇷🇺

---

## コンテンツの爆発的な増加

同様に、Solid に関する新しいコンテンツの殺到ぶりは驚くべきものです。正直なところ、[Fireship](https://www.youtube.com/watch?v=cuHDQhDhvPE) での特集から、私が参加した多くの個人配信やインタビュー/ポッドキャストまで、本当にたくさんあります。その中でも特に印象に残ったものをいくつか紹介します:

### 記事

[Introduction to the Solid JavaScript Library by Charlie Gerard](https://css-tricks.com/introduction-to-the-solid-javascript-library/) - CSS-Tricks
これまでに書かれた中でも最高の入門記事の一つです。すべてのコア機能を網羅した、本当に素晴らしい概観です。

[SolidJS said stiffly: I am more react than React by Kasong](https://segmentfault.com/a/1190000040275257/en) - Segment Fault
翻訳越しでも、この記事のユーモアは伝わってきます。Solid のアプローチを説明する素晴らしい例がいくつも載っています。

### ポッドキャスト

[SolidJS with Ryan Carniato](https://podrocket.logrocket.com/solidjs) - PodRocket
Solid だけでなく、フロントエンド全般のトレンドについても多く語っています。

[Spotify で聴く](https://open.spotify.com/episode/40RDz6zayJYk7QM8kQxaBK)

[React vs Svelte vs Solid & MicroFrontends | Ryan Carniato](https://show.nikoskatsikanis.com/episodes/ryan-carniato) - Nikos Show
このポッドキャストでは、JavaScript フレームワークにおけるコンパイラとサーバーサイドレンダリングの進展について語っています。

[Spotify で聴く](https://open.spotify.com/episode/1d9XabKMHflqFLGuMT0bLh)

### 動画

[YouTube で見る](https://www.youtube.com/watch?v=OqcHoLWyyIw)

まだ見ていない方は、React Finland での私の講演もチェックしてください。React 出身の方にとって素晴らしい SolidJS の入門となっています。


[YouTube で見る](https://www.youtube.com/watch?v=2iK9zzhSKo4)

私は[自身の YouTube チャンネル](https://www.youtube.com/channel/UCLLVlcmcCP4CUe7xSqVEnxw)での配信も始めました。フレームワークの内部動作に興味がある方は、見てみる価値があると思います。

---

## 現在の開発

今後数か月の間に、Solid に新しいものが次々と登場します。私たちが最も重視しているのは、人々が Solid を使い始めやすくすることです。そのために、このプロセスを大きく助けると考えている 3 つのことに取り組んでいます。

### ドキュメント

春の数か月間、寝る間も惜しんで書き続けたおかげで今の形になりましたが、まだ改善の余地があります。Dan Jutan は、あらゆる習熟度の開発者にとってチュートリアルがより分かりやすくなるよう、言葉遣いに焦点を当てた素晴らしい仕事をしています。また、Web 開発に不慣れな人たちのオンボーディングを助けるため、より初心者向けの長編チュートリアルにも取り組んでいます。

### サーバーサイドレンダリング

ユースケースを統合・一般化し、さまざまなプロジェクトで Solid を使いやすくします。これには、より良いドキュメントと、多くの粗い部分の改善が含まれます。Single Page App の SSR の旗艦となる体験は、新しい [Solid Start](https://github.com/solidjs/solid-start) プロジェクトを通じて提供されます。これは [Vite](https://vitejs.dev/) 上に構築された公式の最小限のメタフレームワークで、さまざまなプラットフォームへのデプロイをサポートしています。またこの取り組みには、Multi-Page App に関心のある方向けに [Astro](https://astro.build/) との統合をより良くサポートすることも含まれます。どのようなタイプの Web アプリケーションを構築する場合でも、私たちがカバーします。

### リアクティブパフォーマンス

最後に、私自身がコアのリアクティブシステムの作り直しと最適化に取り組んでいます。前回しっかりとチューニングしたのは 2020 年 2 月のことです。それ以来多くの機能を追加してきたので、エッジケースを整理し、パフォーマンスを改善する時期です。これは、WebGL やネイティブといったカスタムレンダラーのサポートを見据える上で特に重要です。

---

今回は以上です。今後はこれらのアップデートをより頻繁にお届けする予定です。実に素晴らしいことがたくさん起きており、次回どんなことを共有できるのか想像するだけで楽しみです。
