# Solid ドキュメント日本語翻訳（非公式）

[Solid](https://www.solidjs.com/) の公式ドキュメントサイト [docs.solidjs.com](https://docs.solidjs.com/) の全ページ、公式チュートリアル、公式ブログ記事を日本語に翻訳した学習用リポジトリです。

> ⚠️ これは非公式の翻訳です。正確な最新情報は必ず原文を参照してください。

## 収録内容

| ディレクトリ | 内容 | 出典 |
|---|---|---|
| [`docs/`](docs/) | docs.solidjs.com の全ページ（271ページ） | [solidjs/solid-docs](https://github.com/solidjs/solid-docs) |
| [`tutorial/`](tutorial/) | 公式チュートリアル全40レッスン（日本語） | [solidjs/solid-docs-legacy](https://github.com/solidjs/solid-docs-legacy) `langs/ja` |
| [`legacy/`](legacy/) | 旧版ドキュメント（ガイド8本 + APIリファレンス） | 同上 `langs/ja` |
| [`blog/`](blog/) | solidjs.com/blog の全記事（10本） | [solidjs/solid-site](https://github.com/solidjs/solid-site) |

## 読み方

- 学習を始めるなら [`docs/quick-start.md`](docs/quick-start.md) → [`docs/concepts/`](docs/concepts/) の順がおすすめ。
- 対話形式で学びたい場合は [`tutorial/`](tutorial/)（各レッスンに初期コードと解答が付属）。
- API仕様の確認は [`docs/reference/`](docs/reference/) と [`legacy/api.md`](legacy/api.md)。
- 用語の対応表は [`GLOSSARY.md`](GLOSSARY.md)。

## 構成について

- 元の `.mdx` ファイルは `.md` に変換し、ディレクトリ名の順序プレフィックス `(0)` などは除去してあります。
- ドキュメント内のページ順は frontmatter の `order` フィールドで確認できます。
- `<EraserLink>`・`<ImageLink>` などのサイト独自コンポーネントは通常のリンク・画像に置き換えています。
- コードブロック内のコードは原文のままです。

## ライセンス・帰属

- 原文の著作権は Solid チームに帰属します。翻訳は学習目的の非公式なものです。
- `tutorial/`・`legacy/` 配下のコンテンツは [solid-docs-legacy](https://github.com/solidjs/solid-docs-legacy)（MIT License）由来です。
- ブログ・サイトコードは [solid-site](https://github.com/solidjs/solid-site)（MIT License）由来です。
- `docs/` の原文リポジトリ（solid-docs）には明示的なライセンスファイルがありません。帰属表示のみ行っています。
