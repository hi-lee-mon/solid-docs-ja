*これは Solid 2.0 が非同期をどう扱うかを深掘りするシリーズの第 1 回です。第 1 回のテーマは読み取りです。*

少し付き合ってください。頭の中での実験から始めたいと思います。いや、実際に今のコードベースで試してみてください。

UI がレンダーしている値を 1 つ選んでください。ユーザーでも、リストでも、設定でも構いません。今日コンポーネントの中にある値です。そしてそれをサーバーから来るようにしてください。何も動かさないでください。再設計もしないでください。同じコンポーネント、同じ画面。値がリモートになっただけです。

*何ファイル変更しましたか？*

1 つであるべきです。非同期な値も値であることに変わりはなく、届くまで 80ms かかるだけです。しかし多くの解決策では、すぐに次のような緊張関係に直面します。

その場で fetch して await することもできますが、それは 3 つのことを意味します。ローディングのアフォーダンスをまさにそこに置く必要がある。この値が解決するまで子要素は一切表示されない。そしてウォーターフォールを引き起こしていないか、自分より下にあるすべての非同期を把握しておく必要がある。クライアントサイドのアプリが古典的に連鎖するローディングスピナー地獄に陥ってきたのも不思議ではありません。

ベストプラクティスは逆です。ウォーターフォールを防ぐために非同期の fetch をできるだけ高く持ち上げ、UI のブロックを減らすためにアフォーダンスをできるだけ低く下げます。しかしそれは、パス上のすべてのコンポーネントに触れることを意味します。props は `Promise<User>` になり、通常の合成された振る舞いに参加できなくなります。ユーザー名を一度フォーマットして 3 か所で使うことは、その場でブロックするか、そのロジックを葉の要素まで押し下げない限りできません。再利用可能なコンポーネントでは、それが選択肢にならないこともあります。

フレームワークで使われる非同期の値には、ライフサイクルに 4 つの明確な瞬間があります。生成（fetch）、消費（await）、ブロック（バウンダリ）、読み取り（JSX）です。生成と読み取りは同期の値と同じですが、消費とブロックは独自の緊張関係を生みます。これは正直なところ、JavaScript 言語自体の `async functions` と `await` にも映し出されています。2 つは溶接されてしまうのです。しかし仕える主人が違います。消費は開発者体験の決定であり、ブロックはユーザー体験の決定です。なのに選べるのは 1 つだけです。

![非同期の値における消費とブロックの緊張関係](/img/blog/async-solid-fetch-high-block-low/consume-block-tension.png)

Solid の立場はシンプルです。この緊張関係は最初から必要なかったのです。この相関を両極で断ち切れば、あの忌々しい選択をしなくて済むだけでなく、正しいことを自動的にやれます。

## たまたま非同期なメモ

本当にこれだけです。

```tsx
import { createMemo, Loading } from "solid-js";

async function fetchStory(id: number): Promise<Story> {
  const res = await fetch(`/api/stories/${id}`);
  return res.json();
}

function StoryDetail(props) {
  const story = createMemo(() => fetchStory(props.id));

  return (
    <Loading fallback={<Skeleton />}>
      <article>
        <h1>{story().title}</h1>
        <p>{story().text}</p>
      </article>
    </Loading>
  );
}
```

特別なプリミティブはありません。`loading` フラグも、`story()?.title` もありません。`story()` は `Story` であり、`Story | undefined` ではありません。型は見えるものをそのまま反映します。実行中でも、そこにあるのです。

`<Loading>` は最初の実際の値が解決するまでサブツリーを覆います。後で `props.id` が変わっても、`fallback` は戻って*きません*。新しい story が到着する間、古い story は画面に残ります。初期の準備完了と再検証は別の状況であり、フレームワークはデフォルトで異なる扱いをします。

コードが怪しいほど少なく見えたなら、それで正解です。それがここでの共通テーマです。

## props の受け渡しは読み取りではない

Solid のシグナルは一種のスーパーパワーだと私はずっと主張してきました。これほどそれが分かりやすい例もありません。非同期はすべて読み取りの話です。

*コンテンツを表示する準備はできたか？ 表示しているものは古くないか？*

読み取りはシグナルがずっと解決してきたことです。細粒度の保証とパフォーマンスをもたらしたのと同じアーキテクチャが、この問題の解決策を指し示しています。

コンポーネントは一度だけ実行されます。再レンダーはないので、非同期で suspend するコンポーネントは存在しません。コンポーネントは待つ側ではないのです。フォールバックの下でも、確定済みの仕事をやり直すことはありません。

JSX の式と props は、書かれた場所ではなく*使われた*場所で評価されるアクセサーにコンパイルされます。つまり、まだ準備できていない値が prop としてコンポーネントを通過しても、何も起きません。渡すことは読み取りではありません。実際にその値を消費する式だけが待機に参加します。

つまり、こうなります。

```tsx
function StoryPage(props) {
  const story = createMemo(() => fetchStory(props.id));
  return <StoryLayout story={story()} />;
}

function StoryLayout(props) {
  return (
    <div class="layout">
      <Sidebar />
      <main>
        <StoryDetail story={props.story} />
      </main>
    </div>
  );
}
```

`StoryLayout` はすぐにレンダーされます。サイドバーもすぐにレンダーされます。`story={story()}` は爆発しそうに見えます——データが存在する前にアクセサーを呼んでいるのですから——でも、この式は遅延評価です。`StoryDetail` が最終的に `props.story.title` を読み取るときに評価され、待機が起きるのはそこだけです。

派生も同じように動きます。

```tsx
function StoryDetail(props) {
  // A memo over an async value — no await, no .then
  const byline = createMemo(() => `${props.story.author} · ${props.story.points} points`);

  return (
    <header>
      <h1>{props.story.title}</h1>
      <p>{byline()}</p>
    </header>
  );
}
```

`byline` は `story` が非同期だとは知りません。コンポーネントをブロックもしません。自分自身が非同期になるのです。内部では、準備未了の値を読み取ると `NotReadyError` が投げられ、グラフがそれをキャッチして解決時に再試行します。自分でこれを処理することはありません。これらのシグネチャに Promise 型が一切ないのはこのためです。Promise は、それを生成した `createMemo` の時点であなたの問題ではなくなっています。

これはすべて読み取りの話なので、非同期は同じグラフの平坦化と分離——子は事実上兄弟になる——に乗ります。それが Solid の明確な実行モデルと卓越したパフォーマンスをもたらしているのです。

## 高く fetch し、低くブロックする

では、冒頭で「できない」と思っていた 2 つの動きをやってみましょう。fetch を `StoryDetail` からアプリの最上部まで持ち上げ、ローディングのバウンダリを詳細ペインだけを包む位置まで押し下げます。

```tsx
function App() {
  const [selectedId, setSelectedId] = createSignal(1);
  const story = createMemo(() => fetchStory(selectedId()));

  return <StoryPage story={story()} onSelect={setSelectedId} />;
}

function StoryPage(props) {
  return (
    <div class="layout">
      <StoryList onSelect={props.onSelect} />
      <main>
        <Loading fallback={<DetailSkeleton />}>
          <StoryDetail story={props.story} />
        </Loading>
      </main>
    </div>
  );
}
```

fetch は最上部、できるだけ早いタイミングで始まります。スケルトンは実際に待つペインだけを覆います。リストはちらつきません。

気づきましたか？ *ハードコードされた story オブジェクト*——子から親に持ち上げた単なる同期定数——で同じリファクタをしてみてください。完全に同じです。同じコンポーネント構造、同じ props。非同期版のコストは同期版とまったく同じで、デザインがスケルトンを求める場所に `<Loading>` を 1 つ置くだけです。それはどのみち常に必要な妥協です。

値をどこで生成するかはパフォーマンスの決定です。どこでブロックするかはデザインの決定です。もはやどちらもアーキテクチャの決定ではありません。どちらも間にあるコンポーネントに触れないからです。

## ネストはウォーターフォールではない

冒頭ではもう 1 つの懸念も挙げました。ブロックするときは、自分より下にあるすべての `await` を把握しておかなければならない、というものです。それに挑戦しましょう。

```tsx
function StoryDetail(props) {
  const story = createMemo(() => fetchStory(props.storyId));

  return (
    <article>
      <h1>{story().title}</h1>
      <p>{story().text}</p>
      <Comments storyId={props.storyId} />
    </article>
  );
}

function Comments(props) {
  const comments = createMemo(() => fetchComments(props.storyId));

  return (
    <ul>
      <For each={comments()}>{comment => <CommentRow comment={comment} />}</For>
    </ul>
  );
}
```

`Comments` は `story()` を読み取る JSX の下にあります。await ベース（または `use`）のモデルでは、構造上これはウォーターフォールです。親のデータが解決するまで子は存在できません。しかしここでは、2 つのリクエストは並列に実行されます。

仕組みは先ほどと同じです。コンポーネントは一度だけ、即座に実行されます。ツリー全体が最初にマウントされ、非同期の値を読み取る式だけが待ちます。`Comments` は `story()` を読みません。読むのは `props.storyId` で、これはすぐに使えます。リクエストの順序はデータの依存関係で決まり、UI デザインでコンポーネントがどこに置かれているかでは決まりません。

ウォーターフォールが不可能になったわけではありません。本物のウォーターフォールがコードを見れば分かるものになったということです。

```tsx
const story = createMemo(() => fetchStory(props.storyId));
const author = createMemo(() => fetchAuthor(story().authorId));
```

`author` は `story` が解決するまで開始できません。id がレスポンスから来るからです。データが逐次的なので、これは逐次です。しかし同じ入力から派生するものは、どれだけ深くネストされていても並列に実行されます。

## 保留中は状態ではなく質問

初期ロードは簡単なほうです。より面白いのは、すでに持っている値が変わり始めるときです。

検索を追加してみましょう。

```tsx
import { createSignal, createMemo, isPending, For } from "solid-js";

function Search() {
  const [query, setQuery] = createSignal("");
  const results = createMemo(() => searchStories(query()));

  return (
    <>
      <input onInput={e => setQuery(e.target.value)} />
      <ul class={{ stale: isPending(results) }}>
        <For each={results()}>{story => <ResultRow story={story} />}</For>
      </ul>
    </>
  );
}
```

1 文字タイプすると `query` が変わり、`results` が再計算され、リクエストが飛びます。古い結果は画面に残ります。フォールバックなし。アンマウントなし。スケルトンのちらつきなし。特別なロジックなし。

代わりに `isPending(results)` があります。「これは到着途中か？」に答える新しい方法です。これはグローバルではありません。アプリ全体であちこちにスピナーを出すトリガーではありません。シグナルごとの質問で、どこからでも聞けます。非同期ソース上で。その下で。派生 prop 上で。非同期ソースより上、変化の源より下でも。

ここでは古いリストを暗くしています。別のページでは送信ボタンを無効化するかもしれません。

それが状態と質問の違いです。状態はどこかに置かなければなりません。質問はどこでも答えられます。

## API のいらないトランジション

ではリストの story をクリックします。`selectedId` が変わり、`story` メモが保留中になり、詳細ペインは新しい story が準備できるまでそのまま古い story を表示し続けます。そして丸ごと入れ替わります。古い内容と飛行中の内容を混ぜて UI が自分と矛盾する瞬間はありません。

React や Solid を使ったことがあれば、この振る舞いを「トランジション」として知っているかもしれません。2.0 ではその API は完全に消えました。グラフは不整合な状態を表示*できない*のです。保留中のシグナルは前の値を保持し、そこから派生するすべても保持します。更新全体が一緒に着地できるようになるまで。

以前はオプトインだったものが、今はデフォルトです。ユーザーにナビゲーションを感じさせたいなら、そのための `isPending` があります。

```tsx
function App() {
  const [selectedId, setSelectedId] = createSignal(1);

  return (
    <>
      <StoryList selectedId={selectedId()} onSelect={setSelectedId} />
      <main class={{ pending: isPending(selectedId) }}>
        <StoryPage storyId={selectedId()} />
      </main>
    </>
  );
}
```

今回は fetch は `StoryPage` の中にあります。実際のルーターが置く場所、それを所有するページと一緒です。

`App` は fetch について何も知りません。しかし `isPending(selectedId)` は気にしません。変化は書き込みから始まり、すべてが確定するまで保持されます。非同期がどこにあろうと、ソースのシグナルが最初に知るのです。

story をクリックしても、ハイライトは動きません。他のすべてと同様に古い値を保持します。もし早く動いたら、新しい選択が古いコンテンツを指すことになります。保留中クラスに短い CSS トランジションのディレイを組み合わせれば、スワップが気づくほど遅いときだけペインがグレーになります。

デザインがクリックでハイライトを動かしたい場合は？ そのためのプリミティブがあります。`latest(selectedId)` はグラフがまだ向かっている途中の値を渡します。2 つの質問です。「何か来ているか？」には `isPending`、「それは何か？」には `latest`。それぞれ、デザインが答えを必要とするまさにその場所で聞きます。

```tsx
function App() {
  const [selectedId, setSelectedId] = createSignal(1);

  return (
    <>
      <StoryList selectedId={latest(selectedId)} onSelect={setSelectedId} />
      <main class={{ pending: isPending(selectedId) }}>
        <StoryPage storyId={selectedId()} />
      </main>
    </>
  );
}
```

あなたはトランジションを開始しませんでした。シグナルをセットしただけです。あとはリアクティビティがやりました。

## グラフは常に知っている

ここまで読んできたなら、fetch はこのアプリのあらゆる階層に置かれてきたことになります。詳細コンポーネント、ページ、ルート、そしてまたページへ。どれもほとんど影響なく、コード変更もわずかです。

レイテンシは今や値の属性であり、問い合わせ可能です。真に Solid らしいやり方で、コンポーネントは消えます。それらはたまたま一度呼ばれた関数です。速いから高く fetch し、良いデザインだから低くブロックする。初めて、それらが自由になりました。

不要なウォーターフォールがデザインの帰結として消えていくのはパフォーマンス上の勝利ですが、本当の勝利は、非同期も、アフォーダンスも、コンポーネントも、コードも、あなたにとって意味のあるように配置できる自由です。フレームワークの構造に規定されません。それは同期の Solid のシグナルが提供してきたのと同じ約束であり、今それが非同期の物語全体をも完成させます。

読み取りは以上です。書き込みはもっとすごいですよ。また来週。
