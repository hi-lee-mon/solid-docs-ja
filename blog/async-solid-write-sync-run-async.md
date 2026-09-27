---
title: "Async Solid - Write Sync, Run Async"
date: "2026-08-24"
author: "Ryan Carniato"
---

*これは Solid 2.0 が非同期をどう扱うかを深掘りするシリーズの第2回です。[第1回](/blog/async-solid-fetch-high-block-low.md)は読み取りについて、第2回は書き込みについてです。*

前回は、非同期の読み取りにおけるカラーレスな合成によって、管理しやすいコードとパフォーマントな UI のどちらかを選ばなくて済むことを見ました。

書き込みは、さらに深い本質を見せてくれると思います。さらに嬉しいことに、その説明にはフロントエンドのデモとして史上最高の古典である TodoMVC を使えます。

フレームワーク作者が自分のアプローチに価値があることを証明するために最初に書くもの、それが TodoMVC です。私も今でも新しいフレームワークを評価するときにこれを見ます。すべての例が同等というわけではなく、過度に複雑化したものも多いですが、その根幹にあるのはシンプルなクライアントのリスト管理の例です。

では、もう少し実際的にしてみましょう。Todo はデータベースに保存されています。すべてのミューテーションはサーバーを経由します。リストを操作するときには即座の反応が欲しい。おそらく楽観的更新も欲しいでしょう。

シンプルな例はシンプルのままではいられなくなります。これを自分で一から実装したことがあれば、キャッシュのスナップショットを取り、予測を書き、ミューテーションを発行し、エラー時に復元し、成功時に無効化する、という作業を残されます。しかもこれはバニラ JS だけの話ではなく、GraphQL クライアントでも同じことをやっていた記憶があります。さらに言えば、これは並行リクエストの管理、競合状態、ローディング状態、楽観的更新のティアリングをまだ考慮すらしていません。

そこで Solid 2.0 の設計では、一歩引いて考えました。気づいたのは、クライアントだけのアプリケーションは、実は最初からずっと楽観的 UI だったということです。単にサーバーの存在をまだ知らなかっただけです。

## クライアントサイドの Todo

まず、シンプルなクライアントサイドの Todo アプリのコードから始めましょう。主な機能に集中できるよう、高度な機能（フィルターや一括トグルなど）は取り除いてあります。UI は次のようになります。

```tsx
// App.tsx
import { For } from 'solid-js';
import { createTodos, type Todo } from './todos.js';

const ENTER_KEY = 13;

export default function App() {
  const [todos, { addTodo, removeTodo, toggleTodo }] = createTodos();

  const onInput = ({ target, keyCode }) => {
    const title = target.value.trim();
    if (keyCode === ENTER_KEY && title) {
      addTodo(title);
      target.value = '';
    }
  };

  return (
    <section class="todoapp">
      <input
        class="new-todo"
        placeholder="What needs to be done?"
        onKeyDown={onInput}
      />
      <ul class="todo-list">
        <For each={todos}>
          {(todo) => (
            <Todo todo={todo} onToggle={toggleTodo} onRemove={removeTodo} />
          )}
        </For>
      </ul>
    </section>
  );
}

function Todo(props: {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const onToggleChange = ({ target: { checked } }) => {
    props.onToggle(props.todo.id, checked);
  };

  const onRemoveClick = () => {
    props.onRemove(props.todo.id);
  };

  return (
    <li class={['todo', { completed: props.todo.completed }]}>
      <div class="view">
        <input
          class="toggle"
          type="checkbox"
          checked={props.todo.completed}
          onChange={onToggleChange}
        />
        <label>{props.todo.title}</label>
        <button class="destroy" onClick={onRemoveClick} />
      </div>
    </li>
  );
}
```

そしてデータには Solid ストアを使います。

```ts
// todos.ts
import { createStore } from 'solid-js';

export type Todo = { id: string; title: string; completed: boolean };

export function createTodos() {
  const [todos, setTodos] = createStore<Todo[]>([]);
  const addTodo = (title: string) => {
    const todo = { id: crypto.randomUUID(), title, completed: false };
    setTodos((t) => { t.push(todo); });
  };
  const removeTodo = (id: string) => {
    setTodos((t) => t.filter((todo) => todo.id !== id));
  };
  const toggleTodo = (id: string, completed: boolean) => {
    setTodos((t) => {
      const index = t.findIndex((t) => t.id === id);
      t[index].completed = completed;
    });
  };
  return [todos, { addTodo, removeTodo, toggleTodo }] as const;
}
```

Solid のストアはミューテーションベースのセッターを持ち、細粒度の更新を集約します。そのため `todo.completed = true` と書いたとき、再評価されるのは特定の todo の completed 値を購読している UI の部分だけです。リストではなく、行全体でもありません。

ここまでのすべては標準的なパターンです。ロジックをカスタムプリミティブ `createTodos` に切り出し、読み取り専用のストアと名前付きミューテーションを提供しています。これにより UI はクリーンに保たれ、データを一元的に見る方法が得られます。

## 実際的にする

では、Todo をデータベースに保存したい場合はどうでしょう。API サービスを用意してもいいですし、サーバー関数をいくつか作ってもいいでしょう。

```ts
// api.ts
"use server";
import { db } from "./db";
import type { Todo } from "./todos.js";

export async function list(): Promise<Todo[]> {
  return db.todos.all();
}

export async function add(todo: Todo) {
  await db.todos.insert(todo);
}

export async function toggle(id: string, completed: boolean) {
  await db.todos.update(id, { completed });
}

export async function remove(id: string) {
  await db.todos.delete(id);
}
```

> 先頭のあの文字列は、これらの関数がサーバーで実行されることを意味します。それは次回の記事で取り上げます。また、これはあくまで例示です。実際のバックエンドにはエラーハンドリングとバリデーションのロジックが必要です。

アプリケーションを更新して、サーバーから読み取り、楽観的更新を行うようにしましょう。

```ts
// todos.ts
import { createOptimisticStore, action, refresh } from "solid-js";
import * as api from "./api.js";

export type Todo = { id: string; title: string; completed: boolean };

export function createTodos() {
  const [todos, setTodos] = createOptimisticStore<Todo[]>(() => api.list(), []);
  const addTodo = action(function* (title: string) {
    const todo = { id: crypto.randomUUID(), title, completed: false };
    setTodos(list => { list.push(todo); });
    yield api.add(todo);
    refresh(todos);
  });

  const removeTodo = action(function* (id: string) {
    setTodos((t) => t.filter((todo) => todo.id !== id));
    yield api.remove(id);
    refresh(todos);
  });

  const toggleTodo = action(function* (id: string, completed: boolean) {
    setTodos((t) => {
      const index = t.findIndex((t) => t.id === id);
      t[index].completed = completed;
    });
    yield api.toggle(id, completed);
    refresh(todos);
  });
  return [todos, { addTodo, removeTodo, toggleTodo }] as const;
}
```

これだけです。

アプリケーションの UI を変える必要はありませんでした。`App.tsx` は相変わらず `createTodos` をインポートして呼び出します。`<For>` はリストがデータベースから来るようになったことを知りません。チェックボックスは、自分のクリックがネットワークを越えることを知りません。第1回で、レイテンシはコンシューマーが気にすることなく値が持てる性質だと確立しました。ここでもまったく同じです。

ミューテーションも変わりません。すべての `setTodos` 呼び出しを見れば、以前と同一です。追加したのは API 呼び出しとデータのリフレッシュだけです。必要だった正当な新規作業です。予測を追加する必要はありませんでした。同期ミューテーション自体がすでに予測だったからです。

最後の変更は、ミューテーションを `action` で包むことです。ジェネレーター関数なので少し見慣れないかもしれません。公平に言えば、これは JavaScript の制約への対処です。今の JavaScript では `await` の後にコンテキストを保持する方法がありません。[Async Context 提案](https://github.com/tc39/proposal-async-context)はありますが、ブラウザに実装されるまで何年もかかるかもしれません。しかしジェネレーターを使えば Promise を `yield` して、非常によく似た体験を得ながら、コンテキストへのアクセスを保てます。

これは重要です。非同期の開始（と楽観的な予測）を、リフレッシュのような下流で起きるすべての処理と結びつけ、それらを同じトランザクションの一部として動かせるからです。

## ドラフトは常に投機的

これはすべて、Solid 2.0 の新しいバッチタイミング機構を拡張したものです。新しい値を書き込んでも、すぐにはコミットしません。非同期が絡まなければコミットはすぐに行われます。しかし非同期が絡むと、その解決を待ちます。システムがこれを私たちに要求します。未来を構築している間も、過去を画面に生かし続ける能力が必要なのです。独立した状態更新が、実行中の新しい処理のために急に凍結されるべきではありません。

`createOptimisticStore` や楽観的状態全般は少し異なりますが、同じレイヤリングの考え方の上に構築されています。ドラフトはミューテーションを即座に適用します。`yield` は待つべき Promise をグラフに渡します。`action` はトランザクションを開いたままにします。`refresh` はソースを再検証します。基底のストアは確定した真実と突き合わせます。差分だけがプロパティ単位の細粒度更新をトリガーします。楽観的な予測が現実と一致すれば、追加の処理は一切行われません。コンポーネントの再実行もありません。楽観的レイヤーは自ら解決します。

![楽観的オーバーレイは確定済みストアの上に重なり、トランザクションが確定すると破棄される](/blog/images/async-solid-write-sync-run-async/optimistic-overlay-diagram.png)

これがロールバックが存在しない理由です。楽観的な書き込みは状態の2つ目のコピーではなく、上に重なるレイヤーです。成功しても失敗しても、トランザクション完了時にリアクティブシステムが破棄するオーバーレイです。`api.add` が投げれば、オーバーレイは捨てられ、リストは開始時点に戻ります。

`action` は第1回で説明した非同期保持システムの一部なので、一貫性が保たれます。UI がミューテーションの半分だけを見せることはなく、速い連打が相互に入り組んで壊れたリストになることもありません。

## 少し単純化しています

はい、この例がここまでうまくいくのは、同期体験を望ましい結果として決めたからだと認めます。Trello ボードやマルチプレイヤーアプリケーションのようなものは、この方式と本当に相性が良いです。ネットワークレイテンシが急にリクエストあたり5秒になっても、クライアントは気づきません。まだ完全に承認されていない楽観的にレンダーされた UI 上で、未来のミューテーションを開始できます。楽観的に作られた新しい Todo に付いたチェックボックスでも、トグルすればリクエストを発行できます。

欠点は、実際に問題が起きたときです。一貫した UI を見せることに問題はありませんが、ユーザーが先行しすぎると結果はより衝撃的になります。ユーザーから見れば作業は成功したと認識しているのに、それが突然消えてしまうのです。失敗したアクションを集めてリプレイすることもできますが、それは設計上の検討事項であって自動化の一部ではありません。

前回の記事と同じく、現実には追加のアフォーダンスが必要になることが多いです。レコードが保存中でまだ確定していないことを示したい場合もあるでしょう。体験の即時性を変える必要はありませんが、それは正当な作業です。読み取りと同様、デザイナーがどのみちあなたにやるべきだと指摘する種類の作業です。

簡単な方法のひとつは、追加の楽観的状態を足すことです。

```ts
const [isSaving, setSaving] = createOptimistic(false);

// in an action
setSaving(true); // will revert at the end back to false
```

あるいは、私のお気に入りの、スキーマに組み込んでしまう方法です。

```ts
export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  pending?: boolean;
};

const addTodo = action(function* (title: string) {
  const todo = { id: crypto.randomUUID(), title, completed: false };

  // set the new todo with pending
  setTodos(list => { list.push({ ...todo, pending: true }); });
  yield api.add(todo);
  refresh(todos);
});
```

こうすれば新しいレコードにインジケーターが付き、サーバーが応答してすべての非同期が確定した時点で、成功でも失敗でも消えます。その値をたまたま購読している UI の一部に対する、ピンポイントの更新が1回行われるだけです。

アプリケーションがその失敗にどう対処するかは、次回の記事で詳しく話します。いま重要なのは、拒否が UI を嘘の状態に取り残さないという保証です。オーバーレイは破棄され、真実だけが残ります。

## 起こらなかった書き直し

細粒度リアクティビティを初めて世に出したとき、私が主張したのは「コンポーネントは重要ではない」ということでした。コードは好きなように再配置できます。長年の間に、UI の一部が機能を拡大し、その境界が動いて大規模なリファクタリングになるプロジェクトを見すぎてきました。

細粒度では、アプリケーション全体を1つのコンポーネントとして書いても、パフォーマンスのペナルティを払わずに済みます。同様に、アプリが成長しても、コンポーネントをどこで分割しても影響を受けません。すべてのコストはデータに結び付けられ、再レンダーには結び付けられていないので、メモ化のルールが変わったかを確認する必要もありません。ただ動きます。更新は常に分離されています。これが何かを変えるというのでしょうか。

今回の記事は、どの開発チームにとってもさらに身近な話だと思います。プロトタイプは動いた。皆は気に入った。でも今度は本物にしなければならず、それは普通は書き直しを意味します。状態はキャッシュライブラリに移され、ミューテーションはライフサイクルを持ち、コンポーネントはローディングとエラーの分岐を持ちます。検証済みのアプリは捨てられてしまいます。

ここではプロトタイプがそのまま本番アプリになります。同期の TodoMVC は単なるおもちゃではありませんでした。完成されたコンポーネント構造とミューテーションを持っていました。デモから本番への移行は追加的なものでした。ストアコンストラクターを1つ、ミューテーションごとにラッパーを1つ、そしてサーバー関数のファイルを1つ。コードレビューで一目で確認できるピンポイントの更新です。

しかし、まだ終わっていません。`api.ts` が別のマシンで動いていることを、私たちは軽く流してきました。ネットワーク固有のコードを一切書かずに、ストリーミング、シリアライズ、サーバーへの完全な往復を行っていたのです。それが次回のテーマです。

書き込みは以上です。ネットワークはもっと奇妙です。では次回。
