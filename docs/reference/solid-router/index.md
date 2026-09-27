---
title: "@solidjs/router"
titleTemplate: ":title"
mainNavExclude: true
version: "2.0"
description: "ルーター作成・ナビゲーション・データ・履歴・ファイルルート・サーバー統合を含む Solid Router 2 の API リファレンス。"
source_repo: "solidjs/solid-router"
source_ref: "next"
source_path: "src/index.tsx"
---

Solid Router は 3 つのパッケージエントリーとして公開されています。

## エントリー

- `@solidjs/router` はルーターファクトリー、ルートヘルパー、ナビゲーションプリミティブ、履歴アダプター、クエリ、アクション、公開型をエクスポートします。
- `@solidjs/router/fs` はファイルシステムマニフェストアダプターをエクスポートします。
- `@solidjs/router/server` はサーバー関数のフライトデータコレクターをエクスポートします。

## リファレンスグループ

- [ルーターファクトリー](/docs/reference/solid-router/router-factory.md): `createRouter`、`defineRoute`、`defineRoutes`
- [ルートと型付きパス](/docs/reference/solid-router/routes-and-paths.md): ルート定義、パスパターン、`int`、インスタンスパス、マッチング
- [ナビゲーションプリミティブ](/docs/reference/solid-router/navigation.md): ロケーション、ナビゲーション、マッチング、検索、プリロード、リンク状態、離脱ガード
- [データ API](/docs/reference/solid-router/data.md): `query`、`revalidate`、`action`、`useAction`、`useSubmissions`
- [履歴アダプター](/docs/reference/solid-router/history.md): ブラウザ・ハッシュ・メモリ履歴
- [ファイルシステムアダプター](/docs/reference/solid-router/filesystem.md): `fileRoutes` と `defineFileRoute`
- [サーバー統合](/docs/reference/solid-router/server.md): `createFlightDataCollector`
- [型](/docs/reference/solid-router/types.md): 公開されているアプリケーション向けの型
