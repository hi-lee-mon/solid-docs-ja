---
title: プロジェクトの形状
version: "2.0"
description: "初日にアプリが必要とするもので bare・basic・fullstack のテンプレートを選びます。後から上位へ移っても変わるのは設定であり、コードではありません。"
---

CLI がファイルを書き込む前に尋ねる質問は1つだけです: `bare`、`basic`、それとも `fullstack` か。
その答えがインストールされるものとビルドが生成するものを決め、それは決定事項のように見えます。
ですが実際は違います: 各形状は1つ前の形状の完全な上位集合であり、`src/App.tsx` と `src/Document.tsx` の規約は3つすべてで同じなので、`bare` で始まったアプリはコンポーネントを書き直すのではなく、設定を変えるだけで `fullstack` になります。

アプリが最初のデプロイで必要とするもので選んでください:

- ルーティングのない単一ページ、ウィジェット、実験: `bare`。
- 静的ファイルとして配信できる複数のページ。マーケティングサイトや、既存の API と通信するクライアントレンダリングのダッシュボードなど: `basic`。
- サーバーレンダリング、サーバー関数、セッション、APIルート: `fullstack`。

迷ったら小さい方を選んでください。
上へ移るのは設定の変更ですが、下へ移るのは不要なコードの削除を意味します。

| 形状       | 追加されるもの                                       | ビルド出力                                                   |
| ----------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| `bare`      | Solid のみ                                     | `vite build` が静的ファイルを出力                              |
| `basic`     | ルーター、ファイルシステムルート、ページごとのタイトル、テスト | 依然として静的。`dist/client` を任意の静的ホストへデプロイ        |
| `fullstack` | ストリーミング SSR、サーバー関数、セッション、APIルート | 静的クライアントアセットに加えて `dist/server` のリクエストハンドラー |

## サーバーサイドレンダリングを有効にする

どの形状でも、`vite.config.ts` の1つのオプションでサーバーレンダリングを有効にできます:

```ts
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";

export default defineConfig({
	plugins: [
		solid({
			start: true,
			ssr: true, // remove for a static shell rendered on the client
		}),
	],
});
```

`ssr` がなければ、ビルドは空のドキュメントシェルを静的 HTML として書き出し、ページはブラウザーでレンダリングされます。
`ssr: true` なら、ページはサーバーからストリーミングされ、ブラウザーでハイドレートされます。
`src/App.tsx` と `src/Document.tsx` の構造は変わりません。

変わるのは、コードが前提にしてよいことです。
コンポーネントとモジュールのコードはブラウザーだけでなく Node でも実行されるようになるため、モジュールスコープでの `window` や `localStorage` の読み取りは、`ReferenceError: window is not defined` でサーバーレンダリングを停止させます。
[レンダリングと SSR](/docs/concepts/rendering-and-ssr.md#server-and-client-boundaries) では、ブラウザー専用コードの置き場所と、ハイドレーションのためにサーバーとクライアントの出力を一致させる方法を示しています。

## `fullstack` をデプロイする

ビルドされたサーバーエントリーは `handleRequest(request)` をエクスポートします。これは fetch 互換の `Request -> Promise<Response>` ハンドラーです:

```js
import { handleRequest } from "./dist/server/server.js";

// serve dist/client statically; everything else:
const response = await handleRequest(request);
```

`fullstack` テンプレートは `start: { node: true }` を設定するため、ビルドは `dist/server/node.js` も書き出します。これは同じものの Node 版で、`dist/client` を配信し、残りを `handleRequest` に渡して、`PORT` でリッスンします。
fetch ネイティブなプラットフォームでは、`handleRequest` をホストのリクエストエントリーポイントに対応付け、その静的アセットサービスを `dist/client` に向けてください。
Workers・Deno・Bun はそれぞれ独自のモジュール・アセット・環境の設定を持ちます。[デプロイ](/docs/building-apps/deployment.md) で解説しています。

## 次のステップ

- [クイックスタート](/docs/getting-started/quick-start.md): まだなら、`basic` プロジェクトを作成して最初の変更を加えます。
- [アプリの構造](/docs/building-apps/app-structure.md): `App.tsx` と `Document.tsx` が何をするのか、そしてプラグインが各形状に生成するエントリー。
- [レンダリングモードを選ぶ](/docs/guides/choose-a-rendering-mode.md): クライアントレンダリングのシェル、ストリーミング SSR、プリレンダリングのトレードオフ。
- [デプロイ](/docs/building-apps/deployment.md): `fullstack` のリクエストハンドラー向けのプラットフォーム固有のセットアップ。
