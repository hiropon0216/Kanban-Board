/**
 * ============================================================
 * board.ts — ボードドメインの型定義
 * ============================================================
 *
 * このファイルはアプリ全体で使われる「データの形（型）」を一元管理します。
 * TypeScript を学ぶ上で最初に理解すべき概念が詰まっています。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【TypeScript の型とは？】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * JavaScript は実行時まで型エラーに気づけない「動的型付け言語」です。
 * TypeScript は JavaScript に「静的型付け」を追加します。
 *
 *   JavaScript (危険):
 *     function addCard(card) { return card.titel; }  // typo でも実行時まで気づかない
 *
 *   TypeScript (安全):
 *     function addCard(card: Card) { return card.titel; }  // コンパイル時にエラー
 *       // → Property 'titel' does not exist on type 'Card'. Did you mean 'title'?
 *
 * 型定義は「コードの設計図」です。チームの全員が同じ期待値を持てます。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【type vs interface】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * TypeScript には型を定義する方法が 2 つあります。
 *
 *   type Card = { ... }       ← type alias（型エイリアス）
 *   interface Card { ... }   ← interface
 *
 * どちらも似ていますが、本プロジェクトでは `type` を統一して使います。
 * 理由: Union型（後述）や交差型など `type` でしかできない表現があるため。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【State Normalization（状態の正規化）とは？】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * データベース設計の「正規化」と同じ考え方です。
 *
 *   ❌ ネスト構造（非正規化）:
 *     {
 *       columns: [
 *         { id: "todo", cards: [ {id: "c1", title: "..."}, ... ] },
 *         { id: "done", cards: [ ... ] }
 *       ]
 *     }
 *
 *   ✅ フラット構造（正規化）:
 *     {
 *       columns: [ {id: "todo"}, {id: "done"} ],
 *       cards: [
 *         {id: "c1", columnId: "todo", title: "..."},
 *         {id: "c2", columnId: "done", title: "..."}
 *       ]
 *     }
 *
 *   フラット化の利点:
 *   1. カードを別列に移動 → card.columnId を書き換えるだけ
 *   2. 全カード検索 → cards.filter() だけ (深いネストを辿る必要なし)
 *   3. React の再レンダ最適化に有利 (参照の連鎖変化が起きにくい)
 *   4. Redux/Zustand との相性が良い（単純な配列操作）
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Union 型（ユニオン型）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Priority（優先度）型。
 *
 * Union 型は「この値はこれらの文字列のどれかである」を表します。
 *   'low' | 'medium' | 'high'
 *       ↑ このパイプ | が「または」の意味
 *
 * enum（列挙型）でも書けますが、Union 型の方が軽量で JSON との親和性が高いです。
 *
 *   // enum で書いた場合（非推奨）:
 *   enum Priority { Low = 'low', Medium = 'medium', High = 'high' }
 *   // → 出力 JavaScript が複雑になり、JSON.stringify でも別途処理が必要
 *
 *   // Union 型で書いた場合（推奨）:
 *   type Priority = 'low' | 'medium' | 'high'
 *   // → JSON そのままで扱える。型チェックも効く。
 */
export type Priority = 'low' | 'medium' | 'high';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// オブジェクト型
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Card（カード）型。
 *
 * Kanban ボードの最小単位。「何をするか」を表す 1 タスク。
 *
 * 各フィールドの設計意図:
 *   id         - ユニーク識別子。crypto.randomUUID() で生成するため UUID 形式。
 *                配列の index ではなく ID で識別することで、
 *                並び替え・削除後も参照が壊れない。
 *   columnId   - どの列に属するかの外部キー（DB のリレーションと同じ考え方）。
 *                ここを変えるだけでカードを別列に移動できる。
 *   order      - 列内での表示順（昇順で小さいほど上）。
 *                ドラッグ後に 0, 1, 2... と振り直す（reindex）ことで常に整合を保つ。
 *   createdAt  - ISO 8601 形式の文字列（例: "2024-01-15T10:30:00.000Z"）。
 *                Date オブジェクトのまま JSON に入れると "2024-01-15T..." に変換されるが、
 *                復元時は文字列に戻る（Date に自動変換はされない）。
 *                そのため最初から string として持ち、必要なときだけ new Date() に変換する。
 */
export type Card = {
  id: string;
  title: string;
  description: string;
  columnId: string;
  order: number;
  priority: Priority;
  createdAt: string; // ISO 8601 文字列。localStorage との往復で型が壊れないようにするため。
  updatedAt: string;
};

/**
 * Column（列）型。
 *
 * シンプルに ID とタイトルだけを持つ。
 * カードは持たない（正規化のため）。
 * 将来「列の色」「WIP 制限数」などを追加するときはここに足す。
 */
export type Column = {
  id: string;
  title: string;
};

/**
 * Filters（フィルタ条件）型。
 *
 * 検索・絞り込み条件をまとめた型。
 * UI の「見た目」ではなく「意図」を持った状態として管理する。
 *
 *   priorities: Priority[]
 *     配列が空 → フィルタなし（全件表示）
 *     配列に要素 → その優先度のカードのみ表示
 *     ※ 複数選択対応のためチェックボックスでトグルする
 */
export type Filters = {
  search: string;
  priorities: Priority[];
};

/**
 * Board（ボード）型。
 *
 * アプリ全体の状態（Single Source of Truth）。
 * Zustand ストアの board フィールドがこの型になる。
 *
 * 「アプリの状態」＝「この型の値がどう変化するか」と読み替えると、
 * 機能要件が型から読み取れる設計になっている。
 */
export type Board = {
  columns: Column[];
  cards: Card[]; // 全列のカードをフラットに持つ
  filters: Filters;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 定数と Const Assertion（as const）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * COLUMN_IDS — 列 ID の定数オブジェクト。
 *
 * 文字列リテラルをコード中に直接書く（マジックストリング）のは危険です。
 *
 *   // ❌ マジックストリング（タイポに気づけない）:
 *   if (card.columnId === 'doen') { ... }  // typo!
 *
 *   // ✅ 定数参照（タイポすればコンパイルエラー）:
 *   if (card.columnId === COLUMN_IDS.DONE) { ... }
 *
 * `as const` の効果:
 *   通常: { TODO: string, IN_PROGRESS: string, DONE: string }
 *         ↑ どんな文字列でも代入できてしまう
 *
 *   as const 付き: { readonly TODO: 'todo', readonly IN_PROGRESS: 'in-progress', ... }
 *                  ↑ 値が「リテラル型」として確定する。変更も不可。
 */
export const COLUMN_IDS = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  DONE: 'done',
} as const;

/**
 * ColumnId 型 — COLUMN_IDS の値の Union 型を自動生成。
 *
 * typeof + keyof + Mapped Type を組み合わせた慣用句です。
 *
 *   typeof COLUMN_IDS          → オブジェクト型 { TODO: 'todo', ... }
 *   keyof typeof COLUMN_IDS    → 'TODO' | 'IN_PROGRESS' | 'DONE'
 *   (typeof COLUMN_IDS)[keyof] → 'todo' | 'in-progress' | 'done'
 *
 * COLUMN_IDS に新しいキーを追加すると ColumnId も自動的に更新される。
 * 型と定数を二重管理しなくて済む。
 */
export type ColumnId = (typeof COLUMN_IDS)[keyof typeof COLUMN_IDS];
