---
title: "enableExternalSource"
category: "高度なトピック / 相互運用と非同期"
use_cases: "高度な相互運用と非同期 api、enableexternalsource の使い方"
tags:
  - "enable"
  - "external"
  - "source"
  - "advanced"
  - "interop"
  - "async"
  - "reference"
  - "api"
  - "v2"
version: "2.0"
description: "MobX や Vue のリアクティビティなど、Solid 以外のリアクティブシステムからの読み取りを、Solid の計算内で追跡できるようにするアダプターを登録します。"
source_repo: "solidjs/solid"
source_ref: "next"
source_path: "packages/signals/src/core/external.ts"
---

{/* scripts/extract-solid-ref.mjs によって生成。ソースの JSDoc または disposition マップを編集してから再生成してください。 */}

MobX や Vue のリアクティビティなど、Solid 以外のリアクティブシステムからの読み取りを、Solid の計算内で追跡できるようにするアダプターを登録します。

## インポート

```ts
import { enableExternalSource } from "solid-js";
```

## 型シグネチャ

```ts
function enableExternalSource(config: ExternalSourceConfig): void;
```

## パラメーター

### `config`

- **型:** `ExternalSourceConfig`

## 関連項目

- [外部ソースをグラフに流し込む](/docs/guides/integrate-non-solid-code.md#feed-an-outside-source-into-the-graph)
- [非同期リアクティビティ](/docs/concepts/async-reactivity.md)
- [非 Solid コードの統合](/docs/guides/integrate-non-solid-code.md)

## 関連する型

### `ExternalSource`

```ts
interface ExternalSource {
  track: (prev: any) => any;
  dispose: () => void;
};
```

#### `track`

- **型:** `(prev: any) => any`

#### `dispose`

- **型:** `() => void`

### `ExternalSourceConfig`

```ts
interface ExternalSourceConfig {
  factory: ExternalSourceFactory;
  untrack?: <T>(fn: () => T) => T;
};
```

#### `factory`

- **型:** `ExternalSourceFactory`

#### `untrack`

- **型:** `<T>(fn: () => T) => T`

### `ExternalSourceFactory`

```ts
type ExternalSourceFactory = (fn: (prev: any) => any, trigger: () => void) => ExternalSource;
```
