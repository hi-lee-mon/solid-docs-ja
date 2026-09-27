---
title: "リクエストとレスポンス"
titleTemplate: ":title"
category: "@solidjs/web"
version: "2.0"
description: "リクエストコンテキスト、レスポンスメタデータ、Cookie、リダイレクト、エラーのリファレンス。"
---

`@solidjs/web` は、サーバーレンダリング、ミドルウェア、アクション、サーバー関数で使われる Web 標準のリクエスト値とレスポンス値を提供します。

- [`getRequestEvent()`](/reference/solid-web/request-response/get-request-event) は現在のリクエスト、ローカル値、レスポンススタブを読み取ります。
- [`provideRequestEvent()`](/reference/solid-web/request-response/provide-request-event) は Node サーバーやテストでリクエストコンテキストを確立します。
- [`respond()`](/reference/solid-web/request-response/respond) は値にステータス、ヘッダー、再検証メタデータを付けて返します。
- [`redirect()`](/reference/solid-web/request-response/redirect) はリダイレクトの制御フローを作成します。
- [`reload()`](/reference/solid-web/request-response/reload) はデータの再検証を要求します。
- [安全なエラー](/reference/solid-web/request-response/safe-errors)は、クライアント向けに意図した `Error` 値をマークします。
- [Cookie コーデック](/reference/solid-web/request-response/cookies)は Cookie ヘッダー値をパース・シリアライズします。

リクエスト処理については[ミドルウェアと API ルート](/building-apps/middleware-and-api-routes)、RPC パターンについては[サーバー関数](/building-apps/server-functions)を参照してください。
