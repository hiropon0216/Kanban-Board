# Stage 2 — Props + TypeScript 型定義

> **対象ファイル**
> - `src/features/board/types/board.ts`
> - `src/features/board/components/Card.tsx`
> - `src/features/board/components/Column.tsx`
> - `src/features/board/components/CardForm.tsx`

---

## 2-0. DOM とは何か（Stage 1 の補足）

HTML ファイルはただの**テキスト**。

```html
<div id="root">
  <div class="card">タスク1</div>
  <div class="card">タスク2</div>
</div>
```

ブラウザがこのテキストを読み込んだ時、  
**「木構造のオブジェクト」としてメモリ上に保持する**。これが **DOM（Document Object Model）**。

```
document（ページ全体）
  └─ <div id="root">
        ├─ <div class="card">  .textContent = "タスク1"
        └─ <div class="card">  .textContent = "タスク2"
```

JavaScriptはこのメモリ上の木構造を読み書きできる。

```javascript
const div = document.createElement('div'); // 新しいノードを作る
div.textContent = 'タスク3';
document.getElementById('root').appendChild(div); // 木に追加 → 画面に表示される
```

「DOMを操作する = 画面を変える」はこういう意味。  
Reactはこの操作を自動でやってくれるので、自分で書かなくていい。

---

## 2-1. TypeScript とは何か — 問題から始める

JavaScriptは「どんな値でも渡せる」言語。それが問題になる。

```javascript
// JavaScript（型なし）
function showCard(card) {
  console.log(card.titel);  // typo！ 'title' のはずが 'titel'
}

showCard({ title: 'タスク1' });
// → 実行すると undefined が出力される。エラーにならない。
```

typo しても実行するまで気づけない。  
複雑なアプリだと「なぜ undefined になるのか」追いかけるのが大変。

### TypeScript の解決策

「このデータはこういう形でないといけない」という**設計図（型）** を書く。

```typescript
// TypeScript（型あり）
type Card = {
  id: string;
  title: string;   // 正しいフィールド名
};

function showCard(card: Card) {
  console.log(card.titel);
  // VSCode が即座に赤線: Property 'titel' does not exist. Did you mean 'title'?
}
```

**実行前、コードを書いている最中にエラーを教えてくれる。**  
これが TypeScript の本質。

---

## 2-2. このプロジェクトの型定義を読む

[`types/board.ts`](../src/features/board/types/board.ts) がアプリ全体のデータ設計図。  
このファイルを読むだけで「アプリが扱うデータの全体像」がわかる。

### Union 型（ユニオン型）

```typescript
// board.ts
type Priority = 'low' | 'medium' | 'high';
//              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//              | は「または」の意味
//              → この3つの文字列のどれかしか入れられない
```

`'urgent'` など定義外の値を入れようとするとエラーになる。

### オブジェクト型

```typescript
// board.ts
type Card = {
  id: string;          // "abc-123..." のような文字列
  title: string;
  description: string;
  columnId: string;    // どの列か（"todo" / "in-progress" / "done"）
  order: number;       // 列内での並び順（0, 1, 2...）
  priority: Priority;  // ← 上で定義した型を使い回す
  createdAt: string;
  updatedAt: string;
};
```

`columnId` が外部キーになっているのがポイント。  
カードを別の列に移動する時は `card.columnId` を書き換えるだけ。  
DBの正規化と同じ考え方。

### データ構造の全体像

```typescript
// board.ts
type Board = {
  columns: Column[];  // 列の配列（TODO / IN PROGRESS / DONE）
  cards: Card[];      // 全列のカードをフラットに持つ
  filters: Filters;   // 検索・絞り込み条件
};
```

ネスト構造（列の中にカードを持つ）ではなく、  
カードを**フラット（平ら）に管理**している理由:

```
❌ ネスト構造（非正規化）
columns: [
  { id: 'todo', cards: [{ id: 'c1', title: '...' }] },  ← カードが列の中に
  { id: 'done', cards: [{ id: 'c2', title: '...' }] }
]
→ カードを移動する時: 元の列から取り出して、別の列の配列に追加 → コードが複雑

✅ フラット構造（正規化）
columns: [{ id: 'todo' }, { id: 'done' }]
cards: [
  { id: 'c1', columnId: 'todo', title: '...' },  ← columnId だけ持つ
  { id: 'c2', columnId: 'done', title: '...' }
]
→ カードを移動する時: card.columnId を書き換えるだけ → シンプル
```

---

## 2-3. Props とは何か

Props = **「親コンポーネントから子コンポーネントへ渡すデータ」**

関数の引数と全く同じ考え方。

```tsx
// 親（Column.tsx）が子（Card）を呼ぶ
<Card card={cardData} onEdit={handleEdit} />
//    ^^^^ 引数名      ^^^^ 引数名
//         ^^^^^^^^         ^^^^^^^^^^ 渡す値
```

```tsx
// 子（Card.tsx）が受け取る
function Card({ card, onEdit }: Props) {
//             ^^^^  ^^^^^^ 受け取ったProps（関数の引数と同じ）
  return <div>{card.title}</div>;
}
```

### TypeScript で Props の型を定義する

```typescript
// Card.tsx の実際のコード
type Props = {
  card: CardType;                    // CardType 型のオブジェクト（必須）
  onEdit: (card: CardType) => void;  // 関数型: CardTypeを受け取ってvoidを返す
  isSomeoneDragging?: boolean;       // ? = 省略してもいい（Optional）
};
//                    ↑
// (card: CardType) => void は「CardType を引数に受け取り、戻り値なしの関数」
// バックエンドで言うと: void handleEdit(Card card) のようなシグネチャ
```

この型定義があると、Card を使う側で間違えた時にすぐわかる:

```tsx
// ❌ これはエラーになる（必須の card を渡していない）
<Card onEdit={handleEdit} />
// エラー: Property 'card' is missing in type '{}' but required in type 'Props'.

// ✅ これは正しい
<Card card={cardData} onEdit={handleEdit} />
```

---

## 2-4. Props のデータフロー — 一方通行のルール

Reactのデータは**上から下へしか流れない**。

```
Board（親）
  ↓ column={...} cards={...} onAddCard={fn} onEditCard={fn} isDragging={bool}
Column（子）
  ↓ card={...} onEdit={fn}
Card（孫）
  └─ card の中身を読んで表示するだけ
```

**子はPropsを「読むだけ」。書き換えてはいけない。**

「カードを削除したい」時はどうするか？

```tsx
// Card.tsx
// ❌ これはダメ: 直接 card を書き換える
function handleDelete() {
  card.title = '';  // Propsを書き換えてもReactは検知しない
}

// ✅ これが正しい: 親から受け取った関数を呼ぶ
const deleteCard = useBoardStore((s) => s.deleteCard);
function handleDelete() {
  deleteCard(card.id);  // Zustand（グローバル状態）に削除を依頼する
}
```

データの流れをまとめると:

```
データは上から下へ（Props）
イベント（変更通知）は下から上へ（コールバック関数）
```

---

## 2-5. Column.tsx の Props を読む

```typescript
// Column.tsx の実際のコード
type Props = {
  column: ColumnType;                    // 列情報（id, title）
  cards: CardType[];                     // この列に属するカードの配列
  onAddCard: (columnId: string) => void; // 追加ボタンが押された時の通知
  onEditCard: (card: CardType) => void;  // カードがクリックされた時の通知
  isDragging: boolean;                   // ドラッグ中かどうか（ハイライト制御）
};
```

`onAddCard` と `onEditCard` が**コールバック関数**。  
Column は「追加ボタンが押された」という事実を親（Board）に通知するだけ。  
「実際に何をするか」は親（Board）が決める。

```tsx
// Column.tsx（実際のコード）
<button onClick={() => onAddCard(column.id)}>
  + カードを追加
</button>
// ↑ クリックしたら親から受け取った onAddCard を呼ぶだけ
// 「モーダルを開く」処理は Board.tsx の中にある
```

---

## まとめ

| 概念 | 具体的に言うと |
|------|---------------|
| **DOM** | ブラウザがHTMLをメモリ上に持つ木構造のオブジェクト。JavaScriptで読み書きできる |
| **TypeScript** | 「このデータはこういう形」という設計図を書ける言語。実行前にtypoを検出できる |
| **型（type）** | データの設計図。`type Card = { id: string; title: string; ... }` |
| **Union型** | 「このどれか」を表す型。`'low' \| 'medium' \| 'high'` |
| **Props** | 親から子へ渡すデータ（関数の引数と同じ）。子は読むだけ |
| **コールバック関数型** | `(card: Card) => void`。「この形の関数を渡してください」を型で表す |
| **Optional（?）** | Props の末尾に `?` を付けると省略可能になる |
| **データフロー** | データは上→下（Props）、変更通知は下→上（コールバック） |

---

## 疑問ログ

> 読みながら疑問に思ったことをここに記録する。

- [ ] （疑問をここに書く）

---

## 次のステップ

**Stage 3 — State (useState)**  
「データを変えたら画面が自動で更新される」仕組みの正体を学ぶ。  
`useState` がどう動くか、なぜ普通の変数では画面が更新されないのかを理解する。
