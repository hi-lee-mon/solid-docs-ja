---
title: "リクエストとレスポンス"
titleTemplate: ":title"
category: "@solidjs/web"
version: "2.0"
description: "リクエストコンテキスト、レスポンスメタデータ、Cookie、リダイレクト、エラーのリファレンス。"
---

`@solidjs/web` は、サーバーレンダリング、ミドルウェア、アクション、サーバー関数で使われる Web 標準のリクエスト値とレスポンス値を提供します。

- [`getRequestEvent()`](/docs/reference/solid-web/request-response/get-request-event.md) は現在のリクエスト、ローカル値、レスポンススタブを読み取ります。
- [`provideRequestEvent()`](/docs/reference/solid-web/request-response/provide-request-event.md) は Node サーバーやテストでリクエストコンテキストを確立します。
- [`respond()`](/docs/reference/solid-web/request-response/respond.md) は値にステータス、ヘッダー、再検証メタデータを付けて返します。
- [`redirect()`](/docs/reference/solid-web/request-response/redirect.md) はリダイレクトの制御フローを作成します。
- [`reload()`](/docs/reference/solid-web/request-response/reload.md) はデータの再検証を要求します。
- [安全なエラー](/docs/reference/solid-web/request-response/safe-errors.md)は、クライアント向けに意図した `Error` 値をマークします。
- [Cookie コーデック](/docs/reference/solid-web/request-response/cookies.md)は Cookie ヘッダー値をパース・シリアライズします。

リクエスト処理については[ミドルウェアと API ルート](/docs/building-apps/middleware-and-api-routes.md)、RPC パターンについては[サーバー関数](/docs/building-apps/server-functions/index.md)を参照してください。
