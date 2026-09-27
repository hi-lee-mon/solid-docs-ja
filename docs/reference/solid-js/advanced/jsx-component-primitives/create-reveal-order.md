---
title: "createRevealOrder"
category: "高度なトピック / JSX コンポーネントプリミティブ"
use_cases: "高度な jsx コンポーネントプリミティブ api、createrevealorder の使い方"
tags:
  - "create"
  - "reveal"
  - "order"
  - "advanced"
  - "jsx"
  - "component"
  - "primitives"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "兄弟のローディングバウンダリの表示タイミングを調整します。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/boundaries.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

兄弟のローディングバウンダリの表示（リビール）タイミングを調整します。

リアクティブなアクセサーを受け取ります:
- `order`: `"sequential"`（デフォルト） | `"together"` | `"natural"`。
  - `"sequential"` — 従来のフロンティア型の表示。各兄弟は解決され次第、
    登録順に表示され、後続の兄弟は先行するものが完了するまで非表示のままです。
  - `"together"` — グループ全体が「最小限の準備完了」（すべての直接スロットが
    自身の順序のもとで最初の可視コンテンツを生成済み）になるまで、すべての
    直接スロットがフォールバックのままとなり、その後グループ全体が一度に
    解放されます。
  - `"natural"` — 子要素はそれぞれ独立に（各々が解決し次第）表示されます。
    トップレベルでは `createRevealOrder` を使わない場合と比べて no-op です。
    このモードはネストのために存在し、グループはそれを囲む
    `createRevealOrder` に対して単一の複合スロットとして登録されます。
- `collapsed`: `order === "sequential"` のときにのみ意味を持ちます。設定すると、
  フロンティアより後にある末尾の兄弟は自身のフォールバック出力を抑制します。
  `"together"` と `"natural"` では無視されます — これらの順序にはフロンティアが
  ありません。

ネストされた `createRevealOrder` グループは合成されます。内側のコントローラーは
外側のコントローラーに単一のスロットとして登録され、外側がそのスロットを解放する
までフォールバック状態に保持されます。解放されると、内側のコントローラーは
まだ保留中のものに対してローカルに自身の順序を実行します。外側による保持からの
オプトアウトはありません。

「最小限の準備完了」とは、各順序が最初の可視コンテンツとみなす状態です:
- `sequential` — フロンティア 0 が最小限の準備完了（リーフ: 解決時。ネスト:
  自身の最小シグナル経由）です。
- `together` — すべての直接スロットが最小限の準備完了です。
- `natural` — いずれかの直接スロットが可視コンテンツを持つこと（リーフは
  解決時、ネストした複合は自身の最小シグナル経由）です。

## インポート

```ts
import { createRevealOrder } from "@solidjs/signals";
```

## 型シグネチャ

```ts
function createRevealOrder<T>(
  fn: () => T,
  options?: { order?: OrderAccessor; collapsed?: BoolAccessor }
): T;
```

## パラメータ

### `fn`

- **型:** `() => T`

### `options`

- **型:** `{ order?: OrderAccessor; collapsed?: BoolAccessor }`
- 省略可能

## 例

```ts
// Primitive form of `<Reveal>` — coordinate sibling loading boundaries
// programmatically. App code uses the JSX `<Reveal>` component instead.
// Both options are accessors so they can react to state changes.
createRevealOrder(
  () => renderSiblings(),
  { order: () => mode(), collapsed: () => true }
);
```

## 関連項目

- [プリミティブ形式](/docs/concepts/boundaries.md#primitive-forms)
