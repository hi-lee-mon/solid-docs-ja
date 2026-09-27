---
title: Solid Meta 0.x から
version: "1.0"
description: "アプリケーションを @solidjs/meta 0.x から 1.0 へ移行します。"
---

Solid Meta 1.0 は、Solid 2.0 の組み込み head レジストリの上の薄いレイヤーとして再構築されました。
ほとんどのコンポーネントは名前と props を維持していますが、プロバイダー、サーバーの配管処理、重複排除のセマンティクスは変わりました。

::::caution[Solid 2 が必要です]
Solid Meta 1.0 は Solid 2 を必要とし、単体では Solid 1 アプリケーションをアップグレードできません。
Solid Meta 1.0 をインストールする前に、[Solid 1 から](/docs/migration/from-solid-1.md)でアプリケーションのランタイムを移行してください。
::::

## 移行手順

### `<MetaProvider>` を削除する

head レジストリはアンビエントになりました。プロバイダーと `MetaContext` はもう存在しません。
ラッパーを削除してください:

```tsx del={1,5,7}
import { MetaProvider } from "@solidjs/meta";

export default function App() {
	return (
		<MetaProvider>
			<Layout />
		</MetaProvider>
	);
}
```

### サーバーの配管処理を削除する

0.x のサーバーフロー、`MetaProvider` に `tags={[]}` の配列を渡し、`renderTags(tags)` をテンプレートに差し込む流れはなくなりました。
`renderToString` / `renderToStream` でドキュメントをレンダーすると、重複排除で残ったタグが自動的に `<head>` に差し込まれ、[`Loading` バウンダリ](/docs/concepts/boundaries.md)の下で登録されたタグはパッチとしてクライアントにストリーミングされます。
HTML ドキュメントを自分で組み立てる場合は、代わりに `onHead` レンダーオプションで head マークアップを受け取ってください。

### タグ重複のセマンティクスを確認する

0.x では、他の属性が異なれば同じ `name` の `<Meta>` タグを複数保持できました。
1.x では `name`/`property`/`http-equiv`（`media` による修飾付き）で重複排除され、後のものが勝ちます。

複数の `og:image` を共存させたいような意図的なセットでは、それらを [`<Head>`](/docs/reference/solid-meta/head.md) で囲んでください:

```tsx
<Head>
	<Meta property="og:image" content="/image-1.png" />
	<Meta property="og:image" content="/image-2.png" />
</Head>
```

衝突してしまう同一性を分岐させたい場合は、各タグに個別の `key` を付けてください。

### `useHead` の呼び出しを更新する

`useHead` は `@solidjs/meta` からエクスポートされなくなりました。このプリミティブは Solid 2.0 本体に属しています。
`@solidjs/web` からインポートしてください。`HeadTag` 記述子（`{ tag, props, key? }`）を受け取ります。単一のタグ、配列（グループ）、または関数（リアクティブなグループ）です:

```tsx
import { useHead } from "@solidjs/web";

useHead({ tag: "meta", props: { name: "description", content: () => desc() } });
```

### 削除された機能

- **`escape` prop** — すべてがエスケープされるようになりました。テキストは `textContent` 経由で適用されるため、マークアップのインジェクションはできません。
- **head タグ上の `ref` とイベントハンドラー** — head タグはデータであり、管理される要素ではありません。必要な稀なケースでは DOM を直接クエリしてください。
- **クライアントで動的な `<Base>` / `<Meta charset>`** — これらはサーバーのシェルにのみレンダーされ、クライアントでは（開発時の警告とともに）無視されます。ドキュメントのロード後に変わる base や charset は矛盾しています。
- **`noscript`** — コアのタグユニオンから除外されました。ドキュメントシェルに静的に記述してください。

### 新しい機能

- [`<Script>`](/docs/reference/solid-meta/script.md) は新機能です。JSON-LD やその他の head スクリプトに `useHead` の抜け道は不要になりました。
- [`<Head>`](/docs/reference/solid-meta/head.md) は子タグを、リアクティブなメンバーシップを持つ 1 つの置換セットにグループ化します。
- アイコン（`rel="icon"` / `rel="apple-touch-icon"`）は置換可能です。`href` を差し替えると、蓄積されるのではなくファビコンが置き換わり、アンマウントすると以前のものに戻ります。
- 異なる `media` クエリを持つ `theme-color` のバリアントは共存します。
