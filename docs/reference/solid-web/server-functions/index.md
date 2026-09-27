---
title: "サーバー関数"
titleTemplate: ":title"
category: "@solidjs/web/server-functions"
version: "2.0"
description: "Solid のサーバー関数宣言・トランスポート・ホスト統合のリファレンス。"
---

`@solidjs/web/server-functions` は `"use server"` でコンパイルされた関数が使用するランタイムを提供します。
このパッケージはクライアントビルドではブラウザ向けトランスポートに、サーバービルドではディスパッチャーに解決されます。
`GET`、`live`、`withMeta`、`invoke` などの共有宣言は、どちらの環境でも対応する型を持ちます。

アプリケーションのパターンについては[サーバー関数ガイド](/building-apps/server-functions)から始めてください。
ルーター、開発ツール、カスタムサーバーホストを構築する場合は、このセクションの統合ページを参照してください。

## 宣言と呼び出し

- [`GET()`](/reference/solid-web/server-functions/get) は HTTP 読み取りを宣言します。
- [`live()`](/reference/solid-web/server-functions/live) は再接続する値ストリームを宣言します。
- [`invoke()`](/reference/solid-web/server-functions/invoke) は呼び出しごとの Fetch オプションを指定します。
- [メタデータ API](/reference/solid-web/server-functions/metadata) は宣言メタデータを付与・検査します。

## ランタイム設定

- [`configureServerFunctionsClient()`](/reference/solid-web/server-functions/configure-client) はブラウザのエンドポイント、コーデック、リクエストポリシーを設定します。
- [`enableRichArguments()`](/reference/solid-web/server-functions/rich-arguments) は JSON では保持できない引数を有効にします。
- [ホスト設定](/reference/solid-web/server-functions/host-configuration) はサーバーのディスパッチャーとポリシーフックを説明します。
- [呼び出しコンテキスト](/reference/solid-web/server-functions/invocation-context) は現在のサーバー関数呼び出しを識別します。

## 統合プロトコル

- [アドレッシング](/reference/solid-web/server-functions/addressing) はサーバー関数 URL を構築・解析します。
- [プログレッシブエンハンスメント](/reference/solid-web/server-functions/progressive-enhancement) はクライアントランタイムなしで行われたリクエストを処理します。
- [シングルフライトデータ](/reference/solid-web/server-functions/single-flight) は、ルーターが更新済みデータをミューテーションレスポンスに折り込めるようにします。
- サーバー関数の呼び出しと実行は、observe ビルドでは [`OBSERVE.records`](/reference/solid-js/advanced/diagnostics-dev-hooks/observe) のレコードとして届きます。[オブザーバビリティ](/guides/observability)を参照してください。

設定フックとワイヤーデコーダーは統合層の API です。
アプリケーションコードは通常、生成されたリファレンス、`@solidjs/web` のレスポンスヘルパー、およびオプションのルーターデータレイヤーを使用します。

サーバーコンポーネントと `@solidjs/web/frames` トランスポートは実験的な段階です。
安定版のサーバー関数リファレンスには含まれません。
