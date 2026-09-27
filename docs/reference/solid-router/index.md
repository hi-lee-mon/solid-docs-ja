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

- [ルーターファクトリー](/reference/solid-router/router-factory): `createRouter`、`defineRoute`、`defineRoutes`
- [ルートと型付きパス](/reference/solid-router/routes-and-paths): ルート定義、パスパターン、`int`、インスタンスパス、マッチング
- [ナビゲーションプリミティブ](/reference/solid-router/navigation): ロケーション、ナビゲーション、マッチング、検索、プリロード、リンク状態、離脱ガード
- [データ API](/reference/solid-router/data): `query`、`revalidate`、`action`、`useAction`、`useSubmissions`
- [履歴アダプター](/reference/solid-router/history): ブラウザ・ハッシュ・メモリ履歴
- [ファイルシステムアダプター](/reference/solid-router/filesystem): `fileRoutes` と `defineFileRoute`
- [サーバー統合](/reference/solid-router/server): `createFlightDataCollector`
- [型](/reference/solid-router/types): 公開されているアプリケーション向けの型
