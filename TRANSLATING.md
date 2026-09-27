# 翻訳ルール（TRANSLATING.md）

このリポジトリは docs.solidjs.com / solidjs.com の日本語訳を収める学習用リポジトリ。
翻訳作業はこのルールと `GLOSSARY.md` に従う。

## 対象ファイル

- `docs/**/*.md` — docs.solidjs.com のページ（元は `.mdx`）
- `blog/*.md` — solidjs.com/blog の記事（元は `.mdx`）

## 翻訳のやり方

1. `GLOSSARY.md` とこのファイルを必ず読む。
2. 割り当てられたファイルを**その場で**日本語に書き換える（in-place）。ファイル名・パスは変更しない。
3. YAML frontmatter:
   - `title`, `description`, `use_cases`, `category` → 日本語に翻訳
   - `tags`, `order`, `version`, `redirect_from` などその他のキー → 値は英語のまま維持
   - frontmatter が無いファイルはそのまま
4. 本文:
   - 見出し・本文・表・リスト・引用を日本語に
   - コードブロック（```〜```）は**一字一句そのまま**。中のコメント・文字列も翻訳しない
   - インラインコード `...` は翻訳しない
   - リンクの href は絶対に変更しない（`[テキスト](/concepts/foo)` → テキストのみ訳す）
   - 画像 `![alt](src)` の alt は訳してよいが src は変更しない
5. HTML/JSX 風カスタムタグの処理（GitHub で読める markdown にするため）:
   - `<EraserLink href="H" preview="P"/>` → `[📊 図を Eraser で見る](P)`（preview が無ければ href）
   - `<ImageLink title="T" href="H" logo="x"/>` → `- [T](H)`
   - `<QuickLinks>`…`</QuickLinks>` → 中身を箇条書きリンクに
   - `<Tabs>`/`<Tab title="...">` → `**タイトル:**` という太字見出しを付けて内容を順に展開
   - その他の `<div>` 等のレイアウト用タグ → タグ自体は取り除き中身を残す
   - コードブロック内のタグは上記対象外（一切触れない）
6. 機械翻訳っぽい不自然さを避け、Solid の技術的正確さを優先。不明な用語はカタカナ＋原文（例: 「レンタル（rental）」ではなく適切に）。

## 出力条件

- 全ファイル UTF-8、Markdown として妥当な構造
- ファイル末尾に余計な「翻訳メモ」を付けない
- 原文の削除・省略は禁止。内容は全量訳す
