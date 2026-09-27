---
title: "@solidjs/web"
titleTemplate: ":title"
version: "2.0"
description: "@solidjs/web のリファレンス: DOM・HTML レンダリング、ハイドレーション、head レジストリ、DOM コンポーネント、JSX プロパティ、サーバー関数、リクエストイベント。"
---

`@solidjs/web` はレンダラーです。
`solid-js` が記述するコンポーネントツリーをブラウザでは DOM に、サーバーでは HTML に変換し、サーバー関数とリクエスト処理のためのサーバーサイドランタイムをホストします。

このパッケージにはブラウザビルドとサーバービルドがあります。
バンドラーはエクスポートマップから適切な方を選ぶため、同じインポートがどちらの場所でも機能します:

```ts
import { render, hydrate, isServer } from "@solidjs/web";
```

## レンダリングと SSR

[レンダリングと SSR](/docs/concepts/rendering-and-ssr.md) では、3 つのレンダリングパスとハイドレーションを説明しています。

- [`render`](/docs/reference/solid-web/rendering-ssr/render.md) はツリーを DOM 要素にマウントし、破棄関数を返します。
- [`hydrate`](/docs/reference/solid-web/rendering-ssr/hydrate.md) はサーバーレンダリングされた HTML にツリーをアタッチします。
- [`renderToString`](/docs/reference/solid-web/rendering-ssr/render-to-string.md) は同期的に文字列へレンダーします。[`renderToStream`](/docs/reference/solid-web/rendering-ssr/render-to-stream.md) はシェルをストリーミングし、その後各バウンダリを確定次第ストリーミングします。
- [`httpStatus`](/docs/reference/solid-web/rendering-ssr/http-status.md) と [`httpHeader`](/docs/reference/solid-web/rendering-ssr/http-header.md) はツリー内からレスポンスメタデータを宣言します。
- [`clientOnly`](/docs/reference/solid-web/rendering-ssr/client-only.md) はコンポーネントをブラウザへ延期します。
- [`isServer`](/docs/reference/solid-web/rendering-ssr/is-server.md) と [`isDev`](/docs/reference/solid-web/rendering-ssr/is-dev.md) はビルド時定数です。

## Head

- [`useHead`](/docs/reference/solid-web/head/use-head.md) はアンビエント head レジストリにタグを登録します。[`HeadTag`](/docs/reference/solid-web/head/head-tag.md) がそれらを記述します。
- [`@solidjs/meta`](/docs/reference/solid-meta/index.md) はレジストリをコンポーネントでラップします。[Head とメタデータ](/docs/building-apps/head-and-metadata.md) で両方を紹介しています。

## コンポーネント

- [`Portal`](/docs/reference/solid-web/components/portal.md) は children をドキュメント内の別の場所にレンダーします。
- [`dynamic`](/docs/reference/solid-web/components/dynamic.md) はリアクティブなソースからコンポーネントを作成します。

## JSX プロパティ

レンダラー固有の動作を持つ属性: [`ref`](/docs/reference/solid-web/jsx-properties/ref.md)、[`class`](/docs/reference/solid-web/jsx-properties/class.md)、[`style`](/docs/reference/solid-web/jsx-properties/style.md)、[`textContent`](/docs/reference/solid-web/jsx-properties/text-content.md)、[`innerHTML`](/docs/reference/solid-web/jsx-properties/inner-html.md)。

## サーバー関数

`"use server"` の背後にあるランタイム: [`GET`](/docs/reference/solid-web/server-functions/get.md) や [`live`](/docs/reference/solid-web/server-functions/live.md) などの宣言、呼び出しごとの [`invoke`](/docs/reference/solid-web/server-functions/invoke.md) オプション、ホスト統合フック。
[サーバー関数インデックス](/docs/reference/solid-web/server-functions/index.md) でそれらをグループ化しています。[サーバー関数ガイド](/docs/building-apps/server-functions/index.md) でアプリケーションパターンを説明しています。

## リクエストとレスポンス

サーバー上のリクエストを扱う機能: [`getRequestEvent`](/docs/reference/solid-web/request-response/get-request-event.md)、レスポンスヘルパーの [`respond`](/docs/reference/solid-web/request-response/respond.md)・[`redirect`](/docs/reference/solid-web/request-response/redirect.md)・[`reload`](/docs/reference/solid-web/request-response/reload.md)、[cookie](/docs/reference/solid-web/request-response/cookies.md)、[安全なエラー](/docs/reference/solid-web/request-response/safe-errors.md)、リクエストの W3C トレースのための [`getTraceContext`](/docs/reference/solid-web/request-response/get-trace-context.md)。
[リクエストとレスポンスのインデックス](/docs/reference/solid-web/request-response/index.md) にすべて一覧されています。
