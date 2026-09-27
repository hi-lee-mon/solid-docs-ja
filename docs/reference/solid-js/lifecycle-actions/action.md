---
title: "action"
category: "ライフサイクルとアクション"
use_cases: "lifecycle & actions api、action の使い方"
tags:
  - "action"
  - "lifecycle"
  - "actions"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "ミューテーションのためのプリミティブ：書き込みが非同期のギャップをまたぐ命令的な非同期ワークフロー — 楽観的書き込み、サーバー往復、調整書き込み — で、中間状態を漏らしてはならず、失敗はクリーンに巻き戻る必要があるもの（`createOptimistic` / `createOptimisticStore` と組み合わせて使います）。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/core/action.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

ミューテーションのためのプリミティブ：書き込みが*非同期のギャップをまたぐ*
命令的な非同期ワークフロー — 楽観的書き込み、サーバー往復、調整書き込み —
で、中間状態を漏らしてはならず、失敗はクリーンに巻き戻る必要があるもの
（`createOptimistic` / `createOptimisticStore` と組み合わせて使います）。

ナビゲーション型の更新にアクションは不要です。素のセッター呼び出しで
十分です。読み取りが非同期を引き受け、下流の非同期計算は新しい値が
準備できるまでノードごとに前の値を保持します（`isPending` /
`latest` が実行中の状態を公開します）。`action` が必要なのは、書き込みが
非同期処理の*後*に起こるときだけであって、単にその上流にあるだけでは
使いません。

フレームワークレベルのアクション（ルーターのフォームアクション、サーバーアクション）は
このプリミティブの特殊化です。まさにこの意味でのアクション —
同じトランザクションセマンティクス — であり、その上にフォームバインディング、
シリアライズ、サブミッション追跡を重ねたものです。名前が共通なのは意図的です。

ジェネレーター関数をラップし、各呼び出しが、yield と yield の間のすべての
シグナル／ストア書き込みをバッチする単一のトランザクションとして実行されるようにします。
周囲の UI からは yield されたステップごとに 1 回のアトミックな更新として見え、
アクションが完了するか次の `yield` が解決するまで何もコミットされません。

`yield` はトランザクション安全なサスペンションポイントです。アクションは
yield された Promise を待機し、その後のコードを実行する前にトランザクションへ
再入場します。素の `await` にはこの性質がありません — ランタイムは非同期
ジェネレーター内部の await 継続にフックできないため、`await` と
次の `yield` の間にあるコードはトランザクションの*外*で実行されます。
新しいシグナルへの書き込みは即座にコミットされ、そこでリーダーを作成するもの
すべて — `until()`、`latest()`、メモやエフェクト、マウント — はメインラインで
作成され、このアクションの保持中の状態を読み取ると、保持されたまま誕生する
（born held、A29）状態、つまりトランザクションとともにステージングされその
コミットでリプレイされる状態になります。`until()` にとっては、そのコミットが
自身の Promise を開いたままにしている確定です（#3482）。`await` は
型付きの結果を得るには依然として扱いやすい選択肢です。後に続く書き込みや
リーダー作成の前に裸の `yield` を 1 つ置くだけでよいのです — 次の `yield` の
式はステップが再入場する前に評価されるため、これも対象に含まれます：

```ts
const saved = await api.createTodo(text); // typed result
yield; // re-enter the transaction before writing or reading
setTodos(t => { ... });
yield until(() => todos.some(t => t.id === saved.id));
```

（同じ理由で、アクション本体内で `flush()` を呼ばないでください。
ステップの途中でトランザクションを流してしまいます。）

各呼び出しは、ジェネレーターの戻り値で解決する `Promise` を返し、
throw された場合は reject します。`createOptimistic` /
`createOptimisticStore` と組み合わせると、アクションが失敗したときに
自動的に巻き戻る暫定的な書き込みを適用できます。

## インポート

```ts
import { action } from "solid-js";
```

## 型シグネチャ

```ts
function action<Args extends any[], Y, R>(
  genFn: (...args: Args) => Generator<Y, R, any> | AsyncGenerator<Y, R, any>
): (...args: Args) => Promise<R>;
```

## パラメータ

### `genFn`

- **型:** `(...args: Args) => Generator<Y, R, any> | AsyncGenerator<Y, R, any>`

ジェネレーターまたは非同期ジェネレーター。各 `yield` はトランザクションへ再入場するサスペンションポイントで、yield 間の書き込みはまとめてコミットされます。

## 戻り値

ジェネレーターのパラメータを持ち、その戻り値の Promise を返す関数。ジェネレーターが throw すると Promise は reject します。

## 例

```ts
const [todos, setTodos] = createOptimisticStore<Todo[]>([]);

const addTodo = action(async function* (text: string) {
  const tempId = crypto.randomUUID();
  setTodos(t => { t.push({ id: tempId, text, pending: true }); }); // optimistic
  const saved = await api.createTodo(text); // network round-trip, typed
  yield; // re-enter the transaction
  setTodos(t => {
    const i = t.findIndex(x => x.id === tempId);
    if (i >= 0) t[i] = saved;
  });
  return saved;
});

await addTodo("buy milk");
```

## 注意点

- 素の `await` はトランザクションを離れます。`await` に続く書き込みの前に裸の `yield` を置くか、`await` の代わりに `yield` を使ってください。
- ジェネレーター内で `flush()` を呼ばないでください。ステップの途中でトランザクションを流してしまいます。
- ナビゲーション型の更新（入力を書き込み、非同期の結果を読む）にアクションは不要です。素のセッター呼び出しは自動的に保持されます。

## よくある問題

- [クリック後に画面が固まったように見える](/guides/debugging-reactivity#the-screen-looks-dead-after-a-click)
- [エラーが一瞬表示されてから消える](/guides/forms#errors-show-for-a-moment-and-then-vanish)

## 関連項目

- [カートをサーバーへ移す](/concepts/mutations#move-the-cart-to-the-server)
- [ミューテーションとレスポンス](/building-apps/server-functions/mutations-and-responses)
- [非同期リアクティビティ](/concepts/async-reactivity)
- [不要なエフェクトを避ける](/guides/avoid-unnecessary-effects)
