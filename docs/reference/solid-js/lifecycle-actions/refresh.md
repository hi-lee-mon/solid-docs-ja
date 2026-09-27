---
title: "refresh"
category: "ライフサイクルとアクション"
use_cases: "lifecycle & actions api、refresh の使い方"
tags:
  - "refresh"
  - "lifecycle"
  - "actions"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "1 つのリアクティブソースを無効化し、入力が変わっていなくても強制的に再実行させ、対象の次の確定状態 — 再要求（およびそれに取って代わるもの）が確定した状態 — の Promise を返します。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/signals.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

1 つのリアクティブソースを無効化し、入力が変わっていなくても強制的に
再実行させます。対象の次の確定状態 — 再要求（およびそれに取って代わる
もの）が確定した状態 — の Promise を返します。

Solid が生成したアクセサー、または `createStore(fn, ...)` /
`createProjection(...)` で作成されたプロジェクションストアを渡します。
`refresh()` は書き込み的な無効化操作です。対象の値を読み取ることはなく、
素のシグナルアクセサーをリフレッシュしても即座に解決する no-op です。

返された Promise は無視しても安全です（撃ちっぱなしのリフレッシュの
挙動は変わらず、失敗した再フェッチが未処理の reject として表面化することも
ありません）。await すると、命令的なフローにリアクティブな読み取りなしで
確定ポイントを与えます：

- アクセサー対象は確定した値で解決し、ストア対象は渡された
  ストアノードで解決します（await 後にそれを通した読み取りは最新です）。
- 失敗した再要求はそのエラーで reject します（アクションのジェネレーター
  内では、`yield refresh(x)` が yield ポイントで throw し返され、
  アクションは他の失敗と同様に巻き戻ります）。
- セマンティクスはフライトの同一性ではなく静止です。途中で別の
  リフレッシュ（または任意の無効化）がこの再要求に取って代わった場合、
  Promise は最終的に到着するものを待ち、それを返します。
- アクション内では、保持されたトランザクションに着地する真の値は
  ステージングされますが、Promise はその時点で確定し（`until()` と
  同じ）、ステージングされた値を返します — 呼び出し側自身の楽観的な
  上書きが返されることは決してありません。
- 再要求自体は以前と同じく判定を伴わず静かに行われます。素の
  リフレッシュでは `isPending` は反転しません（可視の保留中
  ウィンドウには `affects()` と組み合わせてください）。

## インポート

```ts
import { refresh } from "solid-js";
```

## 型シグネチャ

```ts
function refresh<T>(
  target: Refreshable<T>
): Promise<T extends (...args: any) => infer V ? V : T>;
```

## パラメータ

### `target`

- **型:** `Refreshable<T>`

Solid が生成したアクセサーまたはプロジェクションストア。素のシグナルアクセサーは no-op です。

## 戻り値

対象の次の確定状態の Promise。無視しても安全です。失敗した再要求は reject しますが、無視した場合に未処理の reject として表面化することはありません。

## 例

```ts
const user = createMemo(async () => fetch(`/users/${id()}`).then(r => r.json()));

// Fire-and-forget re-fetch
<button onClick={() => refresh(user)}>Reload</button>;

// Imperative settle point
const fresh = await refresh(user);
```

## 注意点

- 素のシグナルアクセサーのリフレッシュは即座に解決する no-op です。
- 再要求は静かです：`isPending` は反転しません。UI に保留中の状態を表示すべきときは先に `affects()` を呼んでください。
- アクション内では、解決される値はステージングされた真の値であり、呼び出し側自身の楽観的な上書きでは決してありません。

## よくある問題

- [クリック後に画面が固まったように見える](/guides/debugging-reactivity#the-screen-looks-dead-after-a-click)

## 関連項目

- [データを最新に保つ](/guides/data-fetching-patterns#keep-data-fresh)
- [ミューテートしてから再フェッチ](/guides/data-fetching-patterns#mutate-then-refetch)
- [非同期リアクティビティ](/concepts/async-reactivity)
- [不要なエフェクトを避ける](/guides/avoid-unnecessary-effects)
