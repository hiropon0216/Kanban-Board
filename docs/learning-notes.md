# Kanban Board - 学習メモ

このドキュメントは、本プロジェクトを通じて**フロントエンド初学者がピックアップして復習すべき項目**を章立てで整理したものです。ソースコードのコメントと相互参照しながら読むことを想定しています。

---

## 0. 全体像

```
UI (React Components)  ─┐
                         │  read/write
状態管理 (Zustand Store) ◀┤
                         │  subscribe
永続化 (localStorage)   ◀┘
```

- **UI**: `src/features/board/components/` 配下。見た目とユーザー操作の受付に集中。
- **状態管理**: `src/features/board/hooks/useBoard.ts`。アプリの "真実の情報源 (Single Source of Truth)"。
- **永続化**: `src/features/board/utils/localStorage.ts`。ストア変更に紐付けて自動保存。

この 3 層を「読む側 → 書く側」の両方で辿ると全体がつながります。

---

## 1. 型設計 (types/board.ts)

### 1.1 なぜフラット配列で持つのか

カードを `Column.cards[]` のようなネスト構造ではなく、`Board.cards[]` というフラットな配列で持っています。

- **利点**
  - ドラッグで列移動するとき、カード 1 件の `columnId` を書き換えるだけで済む
  - 検索や統計などの横断処理が `cards.filter(...)` だけで書ける
  - React の再レンダ最小化に有利 (ネストだと親オブジェクトの参照が連鎖的に変わる)
- **欠点**
  - 「列ごとのカード」を表示するには毎回 `filter + sort` が必要 → `useColumnsWithCards` で `useMemo` 化して解決
- **キーワード**: state normalization (状態の正規化)

### 1.2 `order` フィールドの重要性

- 列内の並び順を表す数値。昇順ソートして描画する。
- ドラッグで並びが変わるたびに 0 始まりで振り直す (`reindexColumn`)。
- 振り直さないと「削除したら穴が空く」「挿入で小数を使う羽目になる」などの罠がある。

---

## 2. Zustand (hooks/useBoard.ts)

### 2.1 Zustand の最小モデル

```ts
const useStore = create<State>()((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));

// コンポーネントで使う
const count = useStore((s) => s.count);
```

- **`create` の返り値**がカスタムフック (`useStore`) になる。
- **`set`** は Redux の `dispatch + reducer` を合体させたような API。
- **セレクタ** (`(s) => s.count`) を渡すと、その値が変わったときだけコンポーネントが再レンダされる。

### 2.2 `subscribeWithSelector` で副作用を繋ぐ

`useBoardStore.subscribe((s) => s.board, (board) => saveBoardToStorage(board))` で
**ストア変更 → localStorage 保存**を接続しています。

- React の外から状態を購読できるのが Zustand の強み。
- `subscribeWithSelector` ミドルウェアを使わないと、セレクタを渡せない (全体購読になる)。

### 2.3 なぜセレクタを store に生やさないのか

```ts
// ❌ こう書きたくなるが...
getFilteredCards: () => state.cards.filter(...)
```

これを `useStore((s) => s.getFilteredCards())` で呼ぶと、毎回新しい配列が返るため、
浅い等価比較で「変わった」と判定されて React が無駄に再レンダします。

本プロジェクトでは
1. 生データを selector で取り出す (`s.board.cards`, `s.board.filters`)
2. `useMemo` で派生計算する (`useFilteredCards`)
の 2 段階方式を採用。**「selector は純粋な参照取得のみ」「派生は useMemo」**のルールを覚えておくと安全。

---

## 3. dnd-kit (Board.tsx / Column.tsx / Card.tsx)

### 3.1 API の 3 層構造

| 層 | 役割 | 本プロジェクトでの使用箇所 |
|---|---|---|
| `DndContext` | ドラッグ全体の司令塔。イベントと sensor を束ねる | `Board.tsx` |
| `SortableContext` | 同じコンテキスト内の並び替えアルゴリズムを提供 | `Column.tsx` |
| `useSortable` / `useDroppable` | 個別要素をドラッグ可能/ドロップ可能にするフック | `Card.tsx` / `Column.tsx` |

### 3.2 `activationConstraint` の罠

```ts
useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
```

これを入れないと、**「クリックで編集」ができなくなる**。
ポインタダウン時点でドラッグが始まってしまうため、「8px 動かすまではクリック扱い」という閾値を入れて回避している。
タッチ端末なら `delay` (長押し) を組み合わせるとより自然。

### 3.3 `DragOverlay` で追従カードを描く理由

DragOverlay を使わないと、ドラッグ中のカードは **元の位置に transform で留まった状態**になる。
別列にドロップする場合、元の列枠の外には出ないので視覚的に違和感がある。

`DragOverlay` は **画面最前面のポータル**で、自由に動く。ここに「ドラッグ中の見た目」を描くと、
どこにでも追従するゴースト表示になり UX が格段に良くなる。

### 3.4 ドロップ先が「カード上」か「列の空白」かで分岐

`over.id` は
- 他のカード上 → そのカードの `id`
- 列の空白領域 → `useDroppable` で付けた `column:<columnId>`

なので Board の `handleDragEnd` ではプレフィックスで判定している。
空列へのドロップに対応するため、`Column` 側でも `useDroppable` を別途呼んでいるのがポイント。

---

## 4. React の基礎概念 (全体)

### 4.1 一方向データフロー

- 状態は **Zustand にだけ存在**し、コンポーネントは「読み取る」「アクションを呼ぶ」だけ。
- コンポーネントは状態を **直接書き換えない** (props も含め immutable として扱う)。
- これにより「なぜこの値になった？」を追うのがストアのアクションを見るだけで済む。

### 4.2 カスタムフック

- `use` で始まる関数は「React のルール (フックをトップレベルで呼ぶ等) に従う」契約。
- ロジックの再利用単位として関数化することで、複数コンポーネントで同じ計算を共有できる。
- 本プロジェクトでは `useFilteredCards`, `useColumnsWithCards`, `useBoardStatistics` を提供。

### 4.3 Controlled Components

- 入力フォームは `value` と `onChange` を両方 React 側が持つ = Controlled。
- `CardForm.tsx` の `<input value={title} onChange={...}>` が典型例。
- 「状態 = UI」の一貫性が保てるので、バリデーションや値の整形がしやすい。

### 4.4 `useState` vs Zustand の使い分け

| 目的 | 推奨 |
|---|---|
| モーダルの開閉、入力中の値、展開状態など UI ローカルの一時状態 | `useState` |
| カードデータ、フィルタ条件、設定など複数画面で共有する状態 | Zustand (グローバル) |

本プロジェクトの `CardForm` のフォーム状態は `useState`、ボードデータは Zustand、と明確に分けている。

---

## 5. TypeScript のポイント

### 5.1 Discriminated Union (判別可能共用体)

`Board.tsx` の `ModalState`:

```ts
type ModalState =
  | { kind: 'closed' }
  | { kind: 'create'; columnId: string }
  | { kind: 'edit'; card: CardType };
```

`kind` で分岐させると、TypeScript が各分岐内で型を絞ってくれる。`if (modal.kind === 'edit') modal.card` が補完される。

### 5.2 `Partial<Pick<...>>`

```ts
updateCard: (cardId, updates: Partial<Pick<Card, 'title' | 'description' | 'priority'>>)
```

`Pick` で更新可能なフィールドを限定し、`Partial` で任意指定にする。
「id や createdAt は絶対書き換えさせない」を型で表明できる。

---

## 6. Tailwind CSS

### 6.1 ユーティリティクラス派の考え方

- `p-4` `bg-gray-50` のような短いクラスを組み合わせてスタイルする。
- 「CSS を別ファイルに書かない」のでコンポーネントと見た目の対応が 1 箇所で完結。
- 欠点: クラス名が長くなりがち。複数行になる場合は文字列結合を変数に切り出すと可読性が上がる。

### 6.2 `@layer base` でグローバルスタイル

`src/index.css` で

```css
@layer base {
  body { @apply bg-gray-50 text-gray-900; }
}
```

のように書くと、Tailwind の仕組みの中でグローバル設定できる。

### 6.3 `content` 設定の重要性

`tailwind.config.js` の `content` に含まれないファイル内のクラスは **最終 CSS に出力されない**。
コンポーネントを動的に組み立てる場合 (`'text-' + color` 等) は、フルクラス名を残すか safelist を使う。

---

## 7. ピックアップ復習候補

1. **`moveCard` の実装** (`useBoard.ts`)
   - 同列 / 別列で分岐しない統一的な書き方。なぜ先に「自分を除外」してから挿入するのか？
2. **`useFilteredCards` の `useMemo`**
   - 依存配列を間違えると何が起きるか？ 試しに `cards` を抜いて動きを観察。
3. **`DragOverlay` の必要性**
   - コメントアウトして違いを体感。
4. **Zustand のセレクタ細分化**
   - `useBoardStore((s) => s.board)` にまとめると何が起きるか？ 再レンダ回数を React DevTools Profiler で確認。
5. **localStorage の version フィールド**
   - 後からスキーマ変更するときのマイグレーション戦略を考えてみる。

---

## 8. 次のステップ (v2 アイデア)

- **React Testing Library** で Card 追加/削除のユニットテスト
- **Framer Motion** でカード入れ替えアニメーション
- **URL 同期**: フィルタ条件を `?search=...&priority=high` のように URL に反映
- **Undo/Redo**: `moveCard` など破壊的操作を履歴に積む
- **バックエンド連携**: REST API または WebSocket でリアルタイム同期 (学習コスト大)

---

## 付録: 開発フロー

```bash
# 依存インストール (初回のみ)
npm install

# 開発サーバ
npm run dev        # → http://localhost:5173

# 型チェック
npm run type-check

# 本番ビルド + プレビュー
npm run build
npm run preview
```
