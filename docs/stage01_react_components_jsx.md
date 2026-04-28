# Stage 1 — React コンポーネント + JSX

> **対象ファイル**
> - `src/main.tsx`
> - `src/App.tsx`
> - `src/features/board/components/Board.tsx`
> - `src/features/board/components/Column.tsx`
> - `src/features/board/components/Card.tsx`

---

## 1-1. まず「Reactがない世界」から考える

カンバンボードをReactなしで作るとしたら、こういうコードになる。

```html
<!-- index.html -->
<div class="card">タスク1</div>
<div class="card">タスク2</div>
<button onclick="addCard()">+ 追加</button>
```

```javascript
// script.js
let cards = ['タスク1', 'タスク2'];  // ← アプリのデータ

function addCard() {
  // データを更新
  cards.push('タスク3');

  // 画面も手動で更新しないといけない ← これが問題
  const div = document.createElement('div');
  div.className = 'card';
  div.textContent = 'タスク3';
  document.body.appendChild(div);
}
```

### 何が問題か

データ（`cards`配列）と画面（DOM）が**別物**として存在している。

| 操作 | データ操作 | DOM操作 |
|------|------------|---------|
| カード追加 | `cards.push(...)` | `createElement` して `appendChild` |
| カード削除 | `cards.splice(...)` | 該当の `<div>` を `removeChild` |
| フィルタ   | `cards.filter(...)` | 全カードを消して作り直し |

コードが増えるほど「データと画面がズレる」バグが生まれる。  
→ これがフロントエンド開発が長年抱えていた問題。

---

## 1-2. React が解決すること

Reactの核心は1行で言える:

> **「データ（State）だけ変えれば、画面は自動で追いついてくる」**

```tsx
// React で書くと
const [cards, setCards] = useState(['タスク1', 'タスク2']);

function addCard() {
  setCards([...cards, 'タスク3']); // ← データを変えるだけ
  // DOM操作は一切書かない。Reactが自動でやる。
}
```

`setCards` を呼ぶと何が起きるか、順番に追うと:

```
1. setCards(['タスク1', 'タスク2', 'タスク3']) を呼ぶ
      ↓
2. Reactが「データが変わった」と検知する
      ↓
3. Reactがコンポーネント（レシピ）を再実行する
      ↓
4. 新しいHTMLと前のHTMLの差分を計算する（Virtual DOM）
      ↓
5. 差分がある部分だけDOMを更新する（タスク3のdivが追加される）
```

**自分でDOMを触らない。データだけ管理する。これがReactの本質。**

---

## 1-3. コンポーネントとは何か

コンポーネント = **「今のデータをHTMLに変換するレシピ」**

```tsx
// Card.tsx（シンプルにした版）
function Card({ title, priority }) {
  return (
    <div className="card">
      <h3>{title}</h3>         {/* データをHTMLに変換 */}
      <span>{priority}</span>
    </div>
  );
}
```

`cards = ['タスク1', 'タスク2', 'タスク3']` というデータがある時:

```tsx
// Column.tsx で実際に使われているコード
{cards.map((card) => (
  <Card key={card.id} card={card} onEdit={onEditCard} />
))}
```

Reactはこのレシピ（`Card`関数）をデータの個数分だけ実行して、  
その結果のHTMLをつなぎ合わせてDOMに出力する。

**React = 料理人。コンポーネント = レシピ。データ = 食材。DOM = できた料理。**  
レシピと食材を渡せば、料理人が料理を作ってくれる。食材が変われば、自動的に作り直してくれる。

---

## 1-4. JSXとは何か

コンポーネントが返している `<div className="card">` はHTMLではない。  
**JavaScriptの拡張構文（JSX）** で、ビルド時に以下に変換される:

```tsx
// 書いたコード（JSX）
<div className="card">
  <h3>{title}</h3>
</div>

// ビルド後の実態（JavaScript）
React.createElement(
  'div',
  { className: 'card' },
  React.createElement('h3', null, title)
)
```

`React.createElement` は「このDOM要素を作って」という命令。  
毎回これを書くのは辛いので、HTMLっぽく書ける記法（JSX）が生まれた。

### HTMLとの主な違い

```tsx
// HTML                    JSX
class="card"         →   className="card"    // 'class'はJSの予約語
for="name"           →   htmlFor="name"      // 'for'はJSの予約語
onclick="fn()"       →   onClick={fn}        // JSの慣習（キャメルケース）
style="color: red"   →   style={{ color: 'red' }}  // JSオブジェクトで渡す
```

### JSXの中にJavaScriptを埋め込む

`{ }` で囲めばJavaScript式を書ける:

```tsx
// Card.tsx より（実際のコード）
<h3>{card.title}</h3>                    // 変数を表示

{card.description && (                   // 条件付き表示（descriptionが空なら何も出さない）
  <p>{card.description}</p>
)}

{cards.map((card) => (                   // 配列を展開してリスト表示
  <Card key={card.id} card={card} />
))}
```

**`{ }` の中は「式」しか書けない**（`if`文や`for`文は使えない）。  
条件分岐は `&&` や三項演算子 `? :` を使う。

---

## 1-5. このプロジェクトが起動するまでの流れ

ブラウザで `http://localhost:5173` を開いた時、何が起きているか:

```
1. ブラウザが index.html を読む
      ↓
2. index.html の中身はほぼ空
   <div id="root"></div>  ← ここに全部入る
   <script src="/src/main.tsx">
      ↓
3. main.tsx が実行される
   createRoot( document.getElementById('root') ).render( <App /> )
      ↓
4. Reactが <App> 関数を実行 → <Board /> を返す
      ↓
5. Reactが <Board> 関数を実行 → <Column /> × 3 + <Statistics /> を返す
      ↓
6. Reactが <Column> 関数を3回実行 → それぞれ <Card /> × N を返す
      ↓
7. 全部つなぎ合わせて #root の中に入れる
      ↓
8. 画面に表示される
```

最終的にブラウザが見ているのは普通のHTMLだが、  
そのHTMLをJavaScriptが組み立てている。

### main.tsx の実際のコード

```tsx
// main.tsx
const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root 要素が見つかりません');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

`StrictMode` は開発時のみ有効な「バグ検出モード」。  
コンポーネントを意図的に2回実行して、隠れたバグを早期発見する。  
本番ビルドでは無効になる。

---

## 1-6. コンポーネントツリー — 親が子を呼ぶ木構造

```
App.tsx
  └─ Board.tsx        ← ボード全体の司令塔
        ├─ Statistics.tsx      統計表示（カード数、完了率）
        ├─ Column.tsx × 3      TODO / IN PROGRESS / DONE
        │     └─ Card.tsx × N  カード1枚ずつ
        └─ CardForm.tsx        追加・編集モーダル
```

各コンポーネントの責任は明確に分かれている:

| コンポーネント | 責任 |
|----------------|------|
| `App.tsx` | ページ全体のレイアウト。ロジックは持たない |
| `Board.tsx` | モーダルの開閉・フィルタ・ドラッグ制御 |
| `Column.tsx` | 列のレイアウト・追加ボタン |
| `Card.tsx` | カード1枚の表示・削除 |

---

## 1-7. `key` prop — リストで絶対に必要なルール

```tsx
// Column.tsx より（実際のコード）
{cards.map((card) => (
  <Card key={card.id} card={card} onEdit={onEditCard} />
))}
```

`key` はReactが「どのコンポーネントがどのデータか」を識別するための特別な属性。

```tsx
// ❌ 悪い例
<Card key={0} ... />   // index=0 のカードを削除すると、
<Card key={1} ... />   // 次のカードが key=0 になってしまう → Reactが誤認
<Card key={2} ... />

// ✅ 正しい例
<Card key="uuid-abc-123" ... />   // UUID = 削除・並び替えをしても変わらない
<Card key="uuid-def-456" ... />
<Card key="uuid-ghi-789" ... />
```

**ルール: `key` には「そのデータを一意に表す不変のID」を使う。**  
このプロジェクトでは `card.id` が UUID（`uuid-abc-123...` のような一意の文字列）なので安全。

---

## まとめ

| 概念 | 具体的に言うと |
|------|---------------|
| **Reactの本質** | データ（State）だけ変えれば、画面は自動で追いついてくる |
| **コンポーネント** | 「今のデータをHTMLに変換するレシピ」= データを受け取りHTMLを返す関数 |
| **JSX** | `React.createElement()` を毎回書かなくていいようにしたHTMLっぽい記法。中身はJavaScript |
| **コンポーネントツリー** | 親が子を呼ぶ木構造。起動時に上から順に実行されてDOMが組み立てられる |
| **`key` prop** | リスト表示の時にReactがコンポーネントを識別するための不変ID |

---

## 疑問ログ

> 読みながら疑問に思ったことをここに記録する。
> 次の会話で「Stage 1 の疑問ログに〇〇と書いた」と伝えれば深掘りできる。

- [ ] （疑問をここに書く）

---

## 次のステップ

**Stage 2 — Props + TypeScript 型定義**  
コンポーネントにデータを渡す方法と、TypeScriptで「どんなデータを渡せるか」を型で定義する方法を学ぶ。
