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

[レンダリングと SSR](/concepts/rendering-and-ssr) では、3 つのレンダリングパスとハイドレーションを説明しています。

- [`render`](/reference/solid-web/rendering-ssr/render) はツリーを DOM 要素にマウントし、破棄関数を返します。
- [`hydrate`](/reference/solid-web/rendering-ssr/hydrate) はサーバーレンダリングされた HTML にツリーをアタッチします。
- [`renderToString`](/reference/solid-web/rendering-ssr/render-to-string) は同期的に文字列へレンダーします。[`renderToStream`](/reference/solid-web/rendering-ssr/render-to-stream) はシェルをストリーミングし、その後各バウンダリを確定次第ストリーミングします。
- [`httpStatus`](/reference/solid-web/rendering-ssr/http-status) と [`httpHeader`](/reference/solid-web/rendering-ssr/http-header) はツリー内からレスポンスメタデータを宣言します。
- [`clientOnly`](/reference/solid-web/rendering-ssr/client-only) はコンポーネントをブラウザへ延期します。
- [`isServer`](/reference/solid-web/rendering-ssr/is-server) と [`isDev`](/reference/solid-web/rendering-ssr/is-dev) はビルド時定数です。

## Head

- [`useHead`](/reference/solid-web/head/use-head) はアンビエント head レジストリにタグを登録します。[`HeadTag`](/reference/solid-web/head/head-tag) がそれらを記述します。
- [`@solidjs/meta`](/reference/solid-meta) はレジストリをコンポーネントでラップします。[Head とメタデータ](/building-apps/head-and-metadata) で両方を紹介しています。

## コンポーネント

- [`Portal`](/reference/solid-web/components/portal) は children をドキュメント内の別の場所にレンダーします。
- [`dynamic`](/reference/solid-web/components/dynamic) はリアクティブなソースからコンポーネントを作成します。

## JSX プロパティ

レンダラー固有の動作を持つ属性: [`ref`](/reference/solid-web/jsx-properties/ref)、[`class`](/reference/solid-web/jsx-properties/class)、[`style`](/reference/solid-web/jsx-properties/style)、[`textContent`](/reference/solid-web/jsx-properties/text-content)、[`innerHTML`](/reference/solid-web/jsx-properties/inner-html)。

## サーバー関数

`"use server"` の背後にあるランタイム: [`GET`](/reference/solid-web/server-functions/get) や [`live`](/reference/solid-web/server-functions/live) などの宣言、呼び出しごとの [`invoke`](/reference/solid-web/server-functions/invoke) オプション、ホスト統合フック。
[サーバー関数インデックス](/reference/solid-web/server-functions) でそれらをグループ化しています。[サーバー関数ガイド](/building-apps/server-functions) でアプリケーションパターンを説明しています。

## リクエストとレスポンス

サーバー上のリクエストを扱う機能: [`getRequestEvent`](/reference/solid-web/request-response/get-request-event)、レスポンスヘルパーの [`respond`](/reference/solid-web/request-response/respond)・[`redirect`](/reference/solid-web/request-response/redirect)・[`reload`](/reference/solid-web/request-response/reload)、[cookie](/reference/solid-web/request-response/cookies)、[安全なエラー](/reference/solid-web/request-response/safe-errors)、リクエストの W3C トレースのための [`getTraceContext`](/reference/solid-web/request-response/get-trace-context)。
[リクエストとレスポンスのインデックス](/reference/solid-web/request-response) にすべて一覧されています。
