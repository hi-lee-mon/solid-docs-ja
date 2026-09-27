# 翻訳用語集（GLOSSARY）

翻訳時はこの用語集に統一する。API 名・識別子・ライブラリ名は翻訳しない。

## 固有名詞・そのまま表記

- Solid, SolidJS, SolidStart, Solid Router, Solid Meta
- JSX, TSX, DOM, HTML, CSS, API, SSR, CSR, SPA, MPA, URL, JSON
- `createSignal`, `createEffect`, `<Show>`, `props` などのコード識別子
- パッケージ名: `solid-js`, `@solidjs/router`, `vite`, `vinxi` など

## 日英対応表

| English | 日本語 |
|---|---|
| signal | シグナル |
| reactivity / reactive | リアクティビティ / リアクティブ |
| fine-grained reactivity | 細粒度リアクティビティ |
| memo | メモ |
| store | ストア |
| component | コンポーネント |
| props | props |
| children | children（文脈により「子要素」可） |
| render / rendering | レンダー / レンダリング |
| control flow | 制御フロー |
| effect | エフェクト |
| derived signal / derived value | 派生シグナル / 派生値 |
| primitive | プリミティブ |
| lifecycle | ライフサイクル |
| owner / ownership | オーナー / オーナーシップ |
| tracking | 追跡 |
| subscription / subscribe | 購読 / 購読する |
| observer | オブザーバー |
| getter / setter | ゲッター / セッター |
| accessor | アクセサー |
| batch | バッチ |
| untrack | アントラック（`untrack()` はコードのまま） |
| cleanup | クリーンアップ |
| resource | リソース |
| fetcher | フェッチャー |
| mutation | ミューテーション |
| transition | トランジション |
| streaming | ストリーミング |
| deferred | 遅延 |
| selector | セレクター |
| context | コンテキスト |
| portal | ポータル |
| error boundary | エラーバウンダリ |
| suspense | サスペンス |
| hydration | ハイドレーション |
| server-side rendering | サーバーサイドレンダリング |
| lazy / lazy loading | 遅延 / 遅延ロード |
| ref | ref |
| directive | ディレクティブ |
| binding | バインディング |
| router / route / routing | ルーター / ルート / ルーティング |
| action | アクション |
| loader | ローダー |
| cache | キャッシュ |
| middleware | ミドルウェア |
| endpoint | エンドポイント |
| entry point | エントリーポイント |
| deployment / deploy | デプロイ / デプロイする |
| meta tag | メタタグ |
| attribute | 属性 |
| element | 要素 |
| node | ノード |
| state | 状態（「ステート」も可だが「状態」優先） |
| immutable / mutable | イミュータブル / ミュータブル（不変 / 可変） |
| proxy | プロキシ |
| dependency | 依存関係 |
| computation | 計算 |
| dispose / disposal | 破棄 |
| fallback | フォールバック |
| placeholder | プレースホルダー |
| snippet | スニペット |
| playground | プレイグラウンド |
| playground / sandbox | プレイグラウンド / サンドボックス |
| guide | ガイド |
| reference | リファレンス |
| getting started | 入門 |
| quick start | クイックスタート |
| advanced | 高度なトピック |
| built-in | 組み込み |
| framework | フレームワーク |
| library | ライブラリ |
| compiler | コンパイラ |
| bundler | バンドラー |
| TypeScript | TypeScript |
| template | テンプレート |
| boilerplate | ボイラープレート |
| scaffold | スキャフォールド |
| monorepo | モノレポ |
| runtime | ランタイム |
| build step | ビルドステップ |
| hot module replacement | ホットモジュールリプレイスメント（HMR） |
| tree shaking | ツリーシェイキング |
| isomorphic | アイソモーフィック |
| headless | ヘッドレス |
| scoped | スコープ付き / スコープされた |
| namespace | 名前空間 |
| annotation | アノテーション |
| utility | ユーティリティ |
| wrapper | ラッパー |
| higher-order component | 高階コンポーネント（HOC） |
| render prop | レンダープロップ |
| slot | スロット |
| key / keyed | キー / キー付き |
| index (component) | `<Index>` |
| for (component) | `<For>` |
| await | await（そのまま） |
| async / asynchronous | 非同期 |
| promise | Promise |
| callback | コールバック |
| event handler | イベントハンドラー |
| native event | ネイティブイベント |
| delegation | デリゲーション（移譲） |
| performance | パフォーマンス |
| optimization | 最適化 |
| overhead | オーバーヘッド |
| memory | メモリ |
| garbage collection | ガベージコレクション |
| benchmark | ベンチマーク |
| ecosystem | エコシステム |
| community | コミュニティ |
| contributor | コントリビューター |
| pull request | プルリクエスト（PR） |
| issue | Issue / 課題 |
| release | リリース |
| changelog | 変更履歴（CHANGELOG） |
| migration | マイグレーション |
| deprecated | 非推奨 |
| experimental | 実験的 |
| stable | 安定版 |
| edge case | エッジケース |
| caveat | 注意点 |
| gotcha | 落とし穴 |
| tip | ヒント |
| note | 補足 |
| warning | 警告 |
| see also | 関連項目 |
| for example | 例 |
| in other words | 言い換えると |
| under the hood | 内部では / 内部実装では |
| out of the box | 標準で / 最初から |

## Solid 2.0 固有の概念

| English | 日本語 |
|---|---|
| boundary / boundaries | バウンダリ（`<Reveal>`・`<Loading>`・`<Errored>` はコードのまま） |
| read / write（非同期モデルの） | 読み取り / 書き込み |
| live data / live query | ライブデータ / ライブクエリ |
| single-flight | シングルフライト |
| optimistic update / optimistic UI | 楽観的更新 / 楽観的UI |
| optimistic store | 楽観的ストア（`createOptimistic` はコードのまま） |
| projection | プロジェクション |
| pending / isPending | 保留中 / `isPending` |
| settled / onSettled | 確定 / `onSettled` |
| server function | サーバー関数 |
| progressive enhancement | プログレッシブエンハンスメント |
| rendering mode | レンダリングモード |
| resumability | リジューマビリティ（再開可能性） |
| not-ready error | NotReady エラー（`NotReadyError` はコードのまま） |
| wire / on the wire | 通信上 / ワイヤー上 |
| migration / migrate | マイグレーション / 移行する |
| async reactivity | 非同期リアクティビティ |
| owner introspection | オーナー Introspection（オーナー内省） |
| manual hydration | 手動ハイドレーション |
| diagnostics | 診断 |
| file-system routing | ファイルシステムルーティング |
| nested routes | ネストされたルート / ネストルート |
| route definition | ルート定義 |
| data API | データAPI |
| session / auth | セッション / 認証 |
| middleware | ミドルウェア |
| API route | APIルート |
| environment | 環境 |
| thinking in Solid | Thinking in Solid（「Solid 的な考え方」も可） |

## 文体ルール

- です・ます調。簡潔で自然な日本語。
- 「あなた」は基本省略（例: "you can use" → 「〜を使えます」）。
- 長い英語の慣用句は直訳せず意訳。
- 太字・斜体・引用・リスト・表のマークダウン構造は保持。
- コードブロック（```で囲まれた部分）はコメント含め一切翻訳しない。
- インラインコード（`code`）内は翻訳しない。
- URL・リンクのhrefは変更しない（機械処理で後から書き換える）。
