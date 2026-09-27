---
title: "リファレンス"
version: "2.0"
description: "Solid の API リファレンス：リアクティブコア、Web レンダラー、Solid Router、Solid Meta、Vite プラグイン、ファイルシステムルーティング。"
---

このリファレンスはすべての公開エクスポートを、API ごとに 1 ページで説明します。
Solid を学習中の場合は、まず [Learn ページ](/) から始め、正確なシグネチャーが必要なときにここへ戻ってきてください。必要なものが分かっている場合は、エクスポート名で検索してください。

## パッケージ

| Package                                                | 内容                                                                                           |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| [`solid-js`](/reference/solid-js)                      | シグナル、メモ、エフェクト、ストア、アクション、コンテキスト、組み込みフローコンポーネント       |
| [`@solidjs/web`](/reference/solid-web)                 | DOM と HTML へのレンダリング、ハイドレーション、head タグ、サーバー関数、リクエストイベント     |
| [`@solidjs/router`](/reference/solid-router)           | ルート定義、型付きナビゲーション、ルートデータ、サーバー連携                                     |
| [`@solidjs/meta`](/reference/solid-meta)               | `<title>`、`<meta>`、`<link>`、その他の head タグ用コンポーネント                               |
| [`@solidjs/vite-plugin`](/reference/vite-plugin-solid) | JSX トランスフォーム、start モード、`"use server"` コンパイル                                   |
| [`filesystem-routing`](/reference/filesystem-routing)  | ルートスキャン、ファイル規約、生成されるルートマニフェスト                                       |

## ページの構成

各生成ページは同じ順序で構成されているため、必要な部分へ直接移動できます：

- **Import** と **Type signature** は、記録された `source_path` のソースからそのまま取得されています。
- **Parameters** または **Props** は各引数とその型を列挙します。**Return value** は戻り値を説明します。
- **Examples** は API を実際的なコンポーネントやモジュールの中で示します。
- **Caveats** はシグネチャーからは明らかでないルールをまとめています。
- **Common problems** は Learn ページのトラブルシューティングセクションへリンクします。
- **Learn more** は API の背後にあるモデルを説明する概念ページへリンクします。
- **Related types** はそのページのエクスポートが使うオプション型と戻り値の型を説明します。

**Advanced** 配下のページは、オーナー Introspection、カスタムバウンダリプリミティブ、手動ハイドレーション、開発用フックを扱います。
アプリケーションコードで必要になることはほとんどありません。ライブラリやツールの作者向けのものです。

## よく使われる API

- [`createSignal`](/reference/solid-js/reactivity/create-signal)、[`createMemo`](/reference/solid-js/reactivity/create-memo)、[`createEffect`](/reference/solid-js/reactivity/create-effect)
- [`createStore`](/reference/solid-js/stores/create-store) と [`reconcile`](/reference/solid-js/stores/reconcile)
- [`Show`](/reference/solid-js/components-jsx/show)、[`For`](/reference/solid-js/components-jsx/for)、[`Switch` と `Match`](/reference/solid-js/components-jsx/switch-and-match)
- [`Loading`](/reference/solid-js/components-jsx/loading) と [`Errored`](/reference/solid-js/components-jsx/errored)
- [`action`](/reference/solid-js/lifecycle-actions/action) と [`onSettled`](/reference/solid-js/lifecycle-actions/on-settled)
- [`render`](/reference/solid-web/rendering-ssr/render) と [`hydrate`](/reference/solid-web/rendering-ssr/hydrate)
- [`createRouter`](/reference/solid-router/router-factory#createrouter) と [`query`](/reference/solid-router/data#query)

## バージョンとソース

リファレンスページは、各ページの frontmatter（`source_repo`、`source_ref`、`source_path`）に記録されたコミット時点の Solid ソースから生成されています。
このサイトのシグネチャーがエディターに表示される型と一致しない場合、インストールされているバージョンがドキュメントのバージョンと異なっています。frontmatter を見れば、そのページがどのコミットを説明しているか分かります。
