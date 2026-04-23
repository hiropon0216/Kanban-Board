# Kanban Board — フロントエンド学習プロジェクト

> **目的**: バックエンド経験者がフロントエンドの基礎を「一気通貫」で習得するための学習用アプリケーション。
> React / TypeScript / Zustand / dnd-kit / Tailwind CSS を使った実践的な実装を通じて、
> 現代フロントエンド開発の思想・設計・ツールを体感する。

---

## 📋 目次

1. [機能一覧](#機能一覧)
2. [起動方法](#起動方法)
3. [技術スタック](#技術スタック)
4. [ファイル構成](#ファイル構成)
5. [アーキテクチャ解説](#アーキテクチャ解説)
6. [フロントエンド必須概念](#フロントエンド必須概念)
7. [状態管理の詳細](#状態管理の詳細)
8. [ドラッグ&ドロップの仕組み](#ドラッグドロップの仕組み)
9. [スタイリング Tailwind CSS](#スタイリング-tailwind-css)
10. [型システム TypeScript](#型システム-typescript)
11. [永続化 localStorage](#永続化-localstorage)
12. [学習ロードマップ](#学習ロードマップ)

---

## 機能一覧

| 機能 | 説明 |
|---|---|
| ✅ カード追加 | 各列の「+ カードを追加」ボタン → モーダルフォームで入力 |
| ✅ カード編集 | カードをクリック → 内容を編集して保存 |
| ✅ カード削除 | カードの × ボタン → 確認ダイアログ後に削除 |
| ✅ 優先度管理 | Low / Medium / High の 3 段階（左サイドの色ラインで視認） |
| ✅ ドラッグ&ドロップ | カードを掴んで別の列・別の位置に移動 |
| ✅ キーワード検索 | タイトル・説明文のキーワード検索（リアルタイム） |
| ✅ 優先度フィルタ | チェックボックスで複数選択絞り込み |
| ✅ 統計表示 | 総カード数・完了数・完了率・列ごとのカード数 |
| ✅ 自動保存 | ブラウザの localStorage にリアルタイム保存 |
| ✅ 状態復元 | ページリロード後も状態が復元される |

---

## 起動方法

### 前提条件

| ツール | バージョン | 確認コマンド |
|---|---|---|
| Node.js | 18 以上 | `node --version` |
| npm | 9 以上 | `npm --version` |

### セットアップ手順

```bash
# 1. リポジトリのクローン
git clone <repository-url>
cd Kanban-Board

# 2. 依存パッケージのインストール
#    package.json に書かれた全ライブラリを node_modules/ に展開する
npm install

# 3. 開発サーバの起動
npm run dev
# → http://localhost:5173 でアクセス可能
# → ファイルを保存すると自動でブラウザが更新される（HMR: Hot Module Replacement）
```

### その他のコマンド

```bash
# 型チェックのみ実行（コンパイルはしない）
npm run type-check

# 本番ビルド（dist/ に最適化済みファイルが生成される）
npm run build

# ビルド結果のプレビュー
npm run preview
# → http://localhost:4173 でアクセス
```

### npm スクリプト一覧

| コマンド | 実行内容 | 用途 |
|---|---|---|
| `npm run dev` | Vite 開発サーバ起動（HMR 有効） | 日常の開発 |
| `npm run build` | TypeScript コンパイル + Vite バンドル | デプロイ前 |
| `npm run preview` | ビルド結果の確認サーバ | 本番確認 |
| `npm run type-check` | `tsc --noEmit` で型チェックのみ | CI や事前確認 |

---

## 技術スタック

| 役割 | ライブラリ | バージョン | 選定理由 |
|---|---|---|---|
| UI フレームワーク | **React** | 18 | 最も普及しているコンポーネントベース UI ライブラリ |
| 型システム | **TypeScript** | 5 | 静的型付けによるコンパイル時エラー検出 |
| ビルドツール | **Vite** | 5 | 高速 HMR（Hot Module Replacement）、設定が少ない |
| 状態管理 | **Zustand** | 4 | Redux より遥かにシンプル、学習コストが低い |
| DnD | **dnd-kit** | 6/8 | モダン・アクセシブル・React 18 完全対応 |
| スタイリング | **Tailwind CSS** | 3 | ユーティリティクラスで CSS を書かずに完結 |

---

## ファイル構成

```
Kanban-Board/
├── index.html                      # エントリ HTML（<div id="root"> だけ）
├── vite.config.ts                  # Vite の設定
├── tailwind.config.js              # Tailwind CSS の設定（content の glob など）
├── postcss.config.js               # PostCSS（Tailwind の変換エンジン）の設定
├── tsconfig.json                   # TypeScript の設定（参照用ルート）
├── tsconfig.app.json               # src/ 配下の TypeScript 設定
├── tsconfig.node.json              # vite.config.ts の TypeScript 設定
├── package.json                    # 依存関係・スクリプト定義
├── docs/
│   └── learning-notes.md          # 学習メモ（設計の「なぜ」を記録）
└── src/
    ├── main.tsx                    # ★ エントリポイント（ReactDOM.createRoot）
    ├── App.tsx                     # ★ ルートコンポーネント
    ├── index.css                   # Tailwind ディレクティブ + グローバルスタイル
    ├── vite-env.d.ts               # Vite の型定義
    └── features/
        └── board/                  # ★ ボード機能の全コード（Feature-based 設計）
            ├── types/
            │   └── board.ts        # ★ 型定義（Card, Column, Board, Priority）
            ├── utils/
            │   ├── localStorage.ts # ★ 保存・復元ロジック
            │   └── validation.ts   # ★ バリデーション関数
            ├── hooks/
            │   ├── useBoard.ts     # ★ Zustand ストア（状態管理の中核）
            │   └── useFilter.ts    # ★ フィルタ・派生状態のカスタムフック
            └── components/
                ├── Board.tsx       # ★ ボード全体（DnD コンテキスト・フィルタ UI）
                ├── Column.tsx      # ★ 1 列（SortableContext・ドロップ領域）
                ├── Card.tsx        # ★ 1 枚のカード（ドラッグ可能）
                ├── CardForm.tsx    # ★ 追加・編集フォーム（モーダル）
                └── Statistics.tsx  # ★ 統計表示
```

`★` マークのファイルが主要な学習対象です。

---

## アーキテクチャ解説

### データの流れ（一方向データフロー）

React + Zustand では「状態は上から下へ流れ、イベントは下から上へ伝わる」原則を守ります。

```
ユーザー操作（クリック・ドラッグ・入力）
         ↓
  コンポーネント（イベントハンドラで検知）
         ↓
  Zustand アクション呼び出し（addCard, moveCard...）
         ↓
  ストアの board 状態が更新される（イミュータブルに）
         ↓
  セレクタを持つコンポーネントが再レンダされる
         ↓
  新しい UI が画面に表示される
         ↓ （副作用として）
  localStorage に自動保存（subscribe で監視）
```

### コンポーネント階層

```
App
└── Board（全体の司令塔）
    ├── Statistics（統計バー）
    ├── フィルタバー（検索ボックス + 優先度チェックボックス）
    ├── DndContext（DnD の親コンテキスト）
    │   ├── Column × 3
    │   │   └── SortableContext
    │   │       └── Card × N
    │   └── DragOverlay（ドラッグ中の浮動カード）
    └── CardForm（追加/編集モーダル）
```

### 状態の分類

| 状態 | 管理場所 | 理由 |
|---|---|---|
| カード一覧・列情報・フィルタ条件 | **Zustand（グローバル）** | 複数コンポーネントが読み書きする |
| モーダルの開閉・編集対象カード | **useState（Board ローカル）** | Board の中だけで完結する |
| フォームの入力値・バリデーション | **useState（CardForm ローカル）** | フォームが開いている間だけ存在する |

---

## フロントエンド必須概念

### 1. React コンポーネントと JSX

React の UI は「コンポーネント」という再利用可能な部品で構成されます。

```tsx
// 関数コンポーネントの基本形
// Props 型をインラインで定義（小さな場合はこれでも OK）
function MyButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    // JSX: HTML に似た記法。Vite がビルド時に React.createElement() に変換する。
    // class → className（JavaScript の予約語を避けるため）
    <button type="button" className="bg-blue-500 text-white" onClick={onClick}>
      {label}  {/* {} の中は JavaScript 式を書ける */}
    </button>
  );
}

// 使う側（HTML タグのように書く）
<MyButton label="クリック" onClick={() => console.log('clicked')} />
```

**Props のルール**:
- 読み取り専用（子が Props を変更してはいけない）
- 親 → 子への一方通行
- 子から親への通知はコールバック関数（`onClick` など）で行う

---

### 2. useState — コンポーネントのローカル状態

```tsx
import { useState } from 'react';

function Counter() {
  // [現在の値, 更新関数] = useState(初期値)
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>カウント: {count}</p>
      {/* setCount を呼ぶ → React が再レンダをスケジュール → 新しい count が表示 */}
      <button onClick={() => setCount((prev) => prev + 1)}>+1</button>
    </div>
  );
}
```

**重要**: `count = count + 1` と直接書いても React は変化を検知しません。
必ず `setCount` を使って更新します（イミュータブル更新の原則）。

---

### 3. useEffect — 副作用の処理

「描画後に実行したい処理」を書く場所です。

```tsx
import { useEffect } from 'react';

function Component() {
  useEffect(() => {
    // DOM 操作、API 呼び出し、イベント登録など
    const handler = (e: KeyboardEvent) => { /* ... */ };
    window.addEventListener('keydown', handler);

    // クリーンアップ関数: コンポーネントが消えるとき（unmount）に実行
    // これを忘れるとイベントリスナーが残り続ける「メモリリーク」になる！
    return () => window.removeEventListener('keydown', handler);
  }, []); // [] = マウント時のみ実行（省略すると毎回、[a,b] なら a か b が変化時）
}
```

---

### 4. useMemo — 計算結果のキャッシュ

依存値が変わった時だけ計算し、それ以外はキャッシュした結果を返します。

```tsx
import { useMemo } from 'react';

function FilteredList({ items, keyword }: { items: string[]; keyword: string }) {
  // keyword か items が変わった時だけフィルタリング計算が走る
  const filtered = useMemo(
    () => items.filter((item) => item.includes(keyword)),
    [items, keyword], // ← 依存配列: ここに書いた値が変化した時だけ再計算
  );

  return <ul>{filtered.map((item) => <li key={item}>{item}</li>)}</ul>;
}
```

---

### 5. useRef — DOM 参照

DOM 要素への参照を持つためのフックです（値が変わっても再レンダしない）。

```tsx
import { useRef, useEffect } from 'react';

function AutoFocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // マウント後に input にフォーカスを当てる
    inputRef.current?.focus(); // ?. はオプショナルチェーン（null でも例外にならない）
  }, []);

  return <input ref={inputRef} type="text" />;
}
```

---

### 6. カスタムフック — ロジックの再利用

`use` で始まる関数でフックをラップし、複数のコンポーネントから共通ロジックを使えます。

```tsx
// カスタムフックの定義（features/board/hooks/useFilter.ts がこのパターン）
function useFilteredCards() {
  const cards = useBoardStore((s) => s.board.cards);
  const filters = useBoardStore((s) => s.board.filters);

  return useMemo(() => {
    return cards.filter(/* フィルタリング処理 */);
  }, [cards, filters]);
}

// 使う側（どのコンポーネントからでも呼べる）
function Column() {
  const filteredCards = useFilteredCards();
  // ...
}
```

---

## 状態管理の詳細

### Props Drilling 問題と Zustand による解決

コンポーネントが深くネストすると、Props のバケツリレー（Props Drilling）が発生します。

```
App
└── Board              ← cards を管理
    └── Column         ← cards を使わないのに受け取る（バケツリレー）
        └── Card       ← deleteCard を呼びたい
```

Zustand を使うと Card が直接ストアにアクセスできます。

```tsx
// Card コンポーネント: Props 不要で deleteCard にアクセスできる
function Card({ card }: { card: CardType }) {
  // Zustand のセレクタ: deleteCard アクションだけを取り出す
  const deleteCard = useBoardStore((s) => s.deleteCard);
  return <button onClick={() => deleteCard(card.id)}>削除</button>;
}
```

### セレクタで再レンダを最小化

Zustand のセレクタは「参照等価（===）」で変化を検知します。

```tsx
// ❌ board 全体を取得 → board の何かが変わるたびに再レンダ
const board = useBoardStore((s) => s.board);

// ✅ 必要な部分だけ → cards が変わったときだけ再レンダ
const cards = useBoardStore((s) => s.board.cards);
```

### イミュータブルな状態更新

```tsx
// ❌ 直接変更（React・Zustand が変化を検知できない）
state.board.cards.push(newCard);

// ✅ 新しいオブジェクトを返す（スプレッド構文で浅いコピー）
set((state) => ({
  board: {
    ...state.board,                          // board の全フィールドをコピー
    cards: [...state.board.cards, newCard],  // cards だけ新しい配列に差し替え
  },
}));
```

### localStorage との連携（subscribe パターン）

```typescript
// ストアの board が変わるたびに localStorage に自動保存
useBoardStore.subscribe(
  (state) => state.board,          // セレクタ: board の変化を監視
  (board) => saveBoardToStorage(board), // リスナー: 保存処理を実行
);
```

---

## ドラッグ&ドロップの仕組み

### dnd-kit の 3 層構造

```
DndContext（Board.tsx）
│  ← 全体の調整役。onDragStart / onDragEnd などのイベントを受け取る
│
├── SortableContext（Column.tsx × 3）
│   │  ← 同じ列内の並び替えアルゴリズムを提供する
│   └── useSortable（Card.tsx × N）
│       ← 各カードをドラッグ可能にするフック
│
└── useDroppable（Column.tsx × 3）
    ← 列全体を「ドロップ受付エリア」にする（空列対応のため）
```

### なぜ `activationConstraint: { distance: 8 }` が必要か

```typescript
// これがないと...
useSensor(PointerSensor)
// ポインタを押した瞬間にドラッグ開始 → カードのクリック（編集モーダル）が無効になる

// これで解決
useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
// 8px 動かしてから初めてドラッグ開始 → クリックは距離 0 なので通過
```

### ドラッグ終了時の処理フロー

```
onDragEnd(event)
     ↓
event.over.id を確認
  ├─ "column:todo" → 列の空白エリアにドロップ
  │    targetColumnId = "todo", targetIndex = 列の末尾
  └─ "card-uuid"  → 別のカードの上にドロップ
       targetColumnId = そのカードの列, targetIndex = そのカードのインデックス
     ↓
moveCard(activeId, targetColumnId, targetIndex) を呼ぶ
     ↓
Zustand で状態更新（useBoard.ts の moveCard）:
  1. 移動するカードを全カードから除外（filter）
  2. 移動先列のカードを取得（filter + sort）
  3. 指定位置にカードを挿入（slice + spread）
  4. 移動先列を order = 0, 1, 2... で振り直す（map）
  5. 元の列も振り直す（別列移動の場合）
```

### DragOverlay が必要な理由

```
DragOverlay なし:
  ドラッグ中のカードは元の位置に transform で動く
  → 列の境界でクリッピングされ、見た目が不自然

DragOverlay あり:
  React ポータルで <body> 直下に描画される浮動カード
  → 列の境界を気にせず画面全体を自由に動ける
  → 元の位置には「穴（ゴースト）」が残り、挿入位置がわかる
```

---

## スタイリング Tailwind CSS

### ユーティリティクラスの読み方

| クラス | 意味 | 相当する CSS |
|---|---|---|
| `p-4` | padding 全方向 | `padding: 1rem` |
| `px-3 py-2` | 横 / 縦の padding | `padding: 0.5rem 0.75rem` |
| `m-auto` | margin auto | `margin: auto` |
| `w-full` / `h-full` | 幅 / 高さ 100% | `width/height: 100%` |
| `flex` | フレックスボックス | `display: flex` |
| `flex-col` | 縦方向に並べる | `flex-direction: column` |
| `flex-1` | 残り空間を埋める | `flex: 1 1 0%` |
| `items-center` | 交差軸を中央揃え | `align-items: center` |
| `justify-between` | 両端に配置 | `justify-content: space-between` |
| `gap-4` | 子要素間のすき間 | `gap: 1rem` |
| `bg-blue-500` | 背景色（青） | `background-color: #3b82f6` |
| `text-gray-900` | テキスト色（ほぼ黒） | `color: #111827` |
| `rounded-md` | 角丸（中） | `border-radius: 0.375rem` |
| `shadow-sm` | 小さい影 | `box-shadow: ...` |
| `text-sm` | 小さいフォント | `font-size: 0.875rem` |
| `font-semibold` | セミボールド | `font-weight: 600` |
| `hover:bg-blue-600` | ホバー時に色変更 | `:hover { background-color: ... }` |
| `opacity-0` | 非表示 | `opacity: 0` |
| `group-hover:opacity-100` | 親 .group ホバー時に表示 | （Tailwind 独自の group 機能） |
| `transition` | CSS トランジション | `transition-property: all; ...` |
| `cursor-pointer` | ポインターカーソル | `cursor: pointer` |
| `z-50` | z-index 高め | `z-index: 50` |
| `inset-0` | 上下左右 0 | `top:0; right:0; bottom:0; left:0` |
| `overflow-y-auto` | 縦スクロール | `overflow-y: auto` |

### JIT コンパイラの注意点

Tailwind はソースコードを静的解析して使用クラスのみを CSS に出力します。

```tsx
// ❌ 検出されない（テンプレートリテラルで動的生成）
const cls = `bg-${color}-500`; // Tailwind は "bg-" + 変数の結合を解析できない

// ✅ 検出される（完全なクラス名を記述）
const cls = color === 'blue' ? 'bg-blue-500' : 'bg-red-500';
```

この理由から、本プロジェクトの `PRIORITY_STYLE` 定数には完全なクラス名を書いています。

---

## 型システム TypeScript

### 型定義がなぜ重要か

```typescript
// JavaScript: 実行時まで typo に気づけない
function addCard(card) {
  return card.titel; // typo だがエラーにならない
}

// TypeScript: コンパイル時に検出
function addCard(card: Card) {
  return card.titel;
  // ↑ エラー: Property 'titel' does not exist. Did you mean 'title'?
}
```

### 本プロジェクトで使われる主要パターン

#### Union 型（共用体型）

```typescript
type Priority = 'low' | 'medium' | 'high';

const p: Priority = 'low';    // OK
const q: Priority = 'urgent'; // コンパイルエラー
```

#### Discriminated Union（判別可能な共用体型）

```typescript
type ModalState =
  | { kind: 'closed' }
  | { kind: 'create'; columnId: string }
  | { kind: 'edit'; card: Card };

// TypeScript が kind の値で型を絞り込む（型ガード）
if (modal.kind === 'edit') {
  modal.card;     // ← card プロパティの存在を TypeScript が認識
  modal.columnId; // ← エラー: 'edit' の場合 columnId は存在しない
}
```

#### Partial / Pick（ユーティリティ型）

```typescript
// Pick: 特定フィールドだけを取り出す
type EditableFields = Pick<Card, 'title' | 'description' | 'priority'>;
// → { title: string; description: string; priority: Priority }

// Partial: すべてのフィールドを省略可能にする
type OptionalEdits = Partial<EditableFields>;
// → { title?: string; description?: string; priority?: Priority }

// 組み合わせて「更新用の型」を作る（updateCard で使用）
function updateCard(id: string, updates: Partial<Pick<Card, 'title' | 'description' | 'priority'>>) {
  // title だけ更新、description だけ更新、など柔軟に対応できる
}
```

#### as const（定数アサーション）

```typescript
// as const なし: 値が string 型になる → typo が入り込む
const IDS = { TODO: 'todo', DONE: 'done' };
IDS.TODO // string 型

// as const あり: 値がリテラル型になる → typo はコンパイルエラー
const COLUMN_IDS = { TODO: 'todo', DONE: 'done' } as const;
COLUMN_IDS.TODO // 'todo' 型（リテラル型）

// 値の Union 型を自動生成（手動で書く必要なし）
type ColumnId = (typeof COLUMN_IDS)[keyof typeof COLUMN_IDS];
// → 'todo' | 'done'
```

---

## 永続化 localStorage

### ブラウザストレージの比較

| 種類 | 容量 | 有効期限 | 用途 |
|---|---|---|---|
| **localStorage** | ~5MB | 永続 | ユーザー設定・アプリ状態 |
| sessionStorage | ~5MB | タブを閉じると消える | 一時的なフォーム入力 |
| Cookie | ~4KB | 設定可能 | 認証トークン（HTTP にも送られる） |
| IndexedDB | 数百MB | 永続 | 大量データ・バイナリ |

### localStorage の API

```typescript
// 保存（値は必ず文字列 → オブジェクトは JSON 化が必要）
localStorage.setItem('key', JSON.stringify({ a: 1 }));

// 読み込み（存在しなければ null）
const raw = localStorage.getItem('key'); // string | null
const obj = raw ? JSON.parse(raw) : null;

// 削除
localStorage.removeItem('key');
```

### スキーマバージョン管理

データ構造が変わっても古いデータで壊れないようにバージョンを付けます。

```typescript
type PersistedBoard = {
  version: 1;   // バージョン番号（将来 2, 3 と増やす）
  board: Board;
};

// 読み込み時にバージョンをチェック
const parsed = JSON.parse(raw) as PersistedBoard;
if (parsed.version !== 1) return null; // 古いデータは無視して初期値を使う
```

### try/catch が必須な理由

```typescript
try {
  localStorage.setItem(KEY, JSON.stringify(data));
} catch (err) {
  // 以下のケースで例外が発生する:
  //   - QuotaExceededError: 5MB 上限を超えた
  //   - Safari プライベートモード: localStorage が使えない
  //   - 企業のセキュリティ設定でブロックされている
  // → 保存に失敗してもアプリを止めない（ログを残すだけ）
  console.warn('保存に失敗:', err);
}
```

---

## 学習ロードマップ

### この実装（V1）で習得できること

- [x] React コンポーネント・Props・JSX の基礎
- [x] useState / useEffect / useRef / useMemo の実践的な使い方
- [x] カスタムフック（`useFilteredCards` など）によるロジックの分離
- [x] Zustand によるグローバル状態管理
- [x] TypeScript の型設計（Union 型, Discriminated Union, Utility Types）
- [x] Tailwind CSS によるユーティリティファーストなスタイリング
- [x] dnd-kit によるドラッグ&ドロップ（SortableContext / useDroppable / DragOverlay）
- [x] localStorage による永続化とスキーマバージョン管理

### 次のステップ（V2 候補）

| テーマ | 内容 | 難易度 |
|---|---|---|
| テスト | Vitest + React Testing Library でユニット・統合テスト | ★★☆ |
| アニメーション | Framer Motion でカード移動にトランジション | ★★☆ |
| URL 同期 | React Router + `useSearchParams` でフィルタを URL に反映 | ★★☆ |
| Undo/Redo | アクション履歴管理で Ctrl+Z に対応 | ★★★ |
| パフォーマンス | React.memo・useCallback・仮想スクロール（react-virtual） | ★★★ |
| バックエンド連携 | REST API / WebSocket でリアルタイム同期 | ★★★ |

### pick up 復習のすすめ

実装後に以下を深掘りすると理解がより固まります。

1. **`moveCard` のアルゴリズム**（`useBoard.ts`）
   - なぜ「先に自分を除外してから挿入」するのか？
   - 同列内移動と別列移動の処理の違いを図で書いてみる

2. **`useFilteredCards` の `useMemo`**（`useFilter.ts`）
   - 依存配列から `cards` を抜いてみる → 何が起きるか？
   - React DevTools の Profiler でレンダ回数を計測する

3. **`DragOverlay` の必要性**（`Board.tsx`）
   - `<DragOverlay>` をコメントアウトして体感する

4. **Zustand セレクタの粒度**（各コンポーネント）
   - `useBoardStore((s) => s.board)` にまとめたら何が起きるか？
   - なぜ `addCard` と `cards` を別々のセレクタで取るのか？

5. **localStorage のマイグレーション**（`localStorage.ts`）
   - `Card` 型に `tags: string[]` を追加した場合、古いデータはどうなるか？

---

## 参考資料

| ドキュメント | URL |
|---|---|
| React 公式 | https://react.dev |
| TypeScript 公式 | https://www.typescriptlang.org/docs/ |
| Vite 公式 | https://vite.dev |
| Zustand | https://zustand.docs.pmnd.rs |
| dnd-kit | https://docs.dndkit.com |
| Tailwind CSS | https://tailwindcss.com/docs |

---

*このアプリは学習目的で作成されています。バックエンド連携なし・ルーティングなし・単一ページで完結。*
