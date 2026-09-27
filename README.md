# Solid 2.0 ドキュメント日本語翻訳（非公式）

[Solid](https://www.solidjs.com/) 2.0（RC）の公式ドキュメントサイト [v2.solidjs.com](https://v2.solidjs.com/) の全ページ、公式チュートリアル、公式ブログ記事を日本語に翻訳した学習用リポジトリです。

> ⚠️ これは非公式の翻訳です。正確な最新情報は必ず原文を参照してください。

## 収録内容

| ディレクトリ | 内容 | 出典 |
|---|---|---|
| [`docs/`](docs/) | v2.solidjs.com の全ページ（195ページ：入門・概念・アプリ構築・ルーティング・ガイド・移行・リファレンス） | [solidjs/solid-docs](https://github.com/solidjs/solid-docs) `v2-rebuild` ブランチ |
| [`blog/`](blog/) | solidjs.com/blog の全記事（14本。「Solid 2.0 RC」「Async Solid」シリーズを含む） | [solidjs/solid-site](https://github.com/solidjs/solid-site) `deploy-prod` ブランチ |
| [`tutorial/`](tutorial/) | 公式チュートリアル全40レッスン（日本語）※Solid 1.x 向け | [solidjs/solid-docs-legacy](https://github.com/solidjs/solid-docs-legacy) `langs/ja` |
| [`legacy/`](legacy/) | 旧版ドキュメント（ガイド8本 + APIリファレンス）※Solid 1.x 向け | 同上 `langs/ja` |

## 読み方

- Solid 2.0 を学ぶなら [`docs/index.md`](docs/index.md) → [`docs/getting-started/`](docs/getting-started/) → [`docs/concepts/`](docs/concepts/) の順がおすすめ。
- v1 からの移行は [`docs/migration/`](docs/migration/) を参照。
- API リファレンスは [`docs/reference/`](docs/reference/)（solid-js / solid-web / solid-router / solid-meta / vite-plugin-solid / filesystem-routing）。
- `tutorial/` と `legacy/` は Solid 1.x 時代の内容です。`createResource`・`createEffect` など 2.0 で変更・削除された API を含むため、2.0 学習では `docs/` を正本としてください。
- 用語の対応表は [`GLOSSARY.md`](GLOSSARY.md)。

## 構成について

- 元の `.mdx` ファイルは `.md` に変換し、ディレクトリ名の順序プレフィックス `(0)` などは除去してあります。
- ドキュメント内のページ順は frontmatter の `order` フィールドで確認できます。
- コードブロック内のコードは原文のままです。

## ライセンス・帰属

- 原文の著作権は Solid チームに帰属します。翻訳は学習目的の非公式なものです。
- `tutorial/`・`legacy/` 配下のコンテンツは [solid-docs-legacy](https://github.com/solidjs/solid-docs-legacy)（MIT License）由来です。
- `blog/` の原文は [solid-site](https://github.com/solidjs/solid-site)（MIT License）由来です。
- `docs/` の原文リポジトリ（solid-docs）には明示的なライセンスファイルがありません。帰属表示のみ行っています。
