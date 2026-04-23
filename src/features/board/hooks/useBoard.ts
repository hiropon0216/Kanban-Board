/**
 * ============================================================
 * useBoard.ts — Zustand による状態管理ストア
 * ============================================================
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【状態管理とは何か？】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * React アプリにおける「状態（State）」とは、
 * 「UI に影響を与えるデータ」のことです。
 *
 *   例: カードの一覧、フィルター条件、モーダルの開閉状態
 *
 * 状態管理の課題:
 *   コンポーネント A が持つ状態を、
 *   離れたコンポーネント B や C から読み書きしたい場合、
 *   「Props を上から下に渡す」だけでは限界があります（Props バケツリレー）。
 *
 *   ❌ Props バケツリレー（状態が深くなると管理が破綻する）:
 *     App → Board → Column → Card（削除ボタン）→ 状態を変えたい
 *     Card から Board まで「削除関数」を Props で伝言リレーしなければならない
 *
 *   ✅ グローバルストア（Zustand）:
 *     Card コンポーネントが直接ストアにアクセスして削除できる
 *     中間コンポーネントへの Props 伝達が不要
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【Zustand の仕組み】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Zustand は「シンプルな グローバルストア」ライブラリです。
 *
 *   // ストアの作成
 *   const useStore = create<State>()((set) => ({
 *     count: 0,
 *     increment: () => set((prev) => ({ count: prev.count + 1 })),
 *   }));
 *
 *   // コンポーネントで使う
 *   function Counter() {
 *     const count = useStore((state) => state.count);          // 読み取り
 *     const increment = useStore((state) => state.increment);  // アクション
 *     return <button onClick={increment}>{count}</button>;
 *   }
 *
 * Redux との比較:
 *   Redux  : Action → Reducer → Store の複雑な流れが必要
 *   Zustand: set() 関数で直接状態を書き換えるだけ。学習コストが低い。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【セレクタ（Selector）とは？】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * useStore((state) => state.count) の `(state) => state.count` の部分。
 *
 * セレクタの役割:
 *   1. 「ストアの一部だけ」を取り出す
 *   2. その部分が変わったときだけコンポーネントを再レンダする
 *
 *   // ❌ ストア全体を取得（board が一切変わってもカードが変わっても再レンダ）:
 *   const state = useStore();
 *
 *   // ✅ 必要な部分だけ取得（cards が変わったときだけ再レンダ）:
 *   const cards = useStore((s) => s.board.cards);
 *
 * 再レンダはパフォーマンスの敵です。セレクタを細かく書くことで、
 * 関係ない変更で再レンダが走るのを防ぎます。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【Immer vs Spread（不変更新）】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * React/Zustand では「状態を直接書き換えてはいけない」という原則があります。
 *
 *   ❌ ミュータブル（直接書き換え）:
 *     state.board.cards.push(newCard)  // React が変化を検知できない！
 *
 *   ✅ イミュータブル（新しいオブジェクトを作る）:
 *     { ...state.board, cards: [...state.board.cards, newCard] }
 *
 * スプレッド構文（...）は「浅いコピー」を作ります:
 *   { ...obj }  → オブジェクトの新しいコピー
 *   [...arr]    → 配列の新しいコピー
 *
 * React は参照（オブジェクトのメモリアドレス）が変わったかで
 * 再レンダを判断します。新しいオブジェクトを作ることで「変わった」と検知されます。
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  Board,
  Card,
  Column,
  Priority,
} from '../types/board';
import { COLUMN_IDS } from '../types/board';
import {
  loadBoardFromStorage,
  saveBoardToStorage,
} from '../utils/localStorage';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 初期データ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 3 列の定義。要件に合わせて固定。
 *
 * `Column` 型に合わせた配列。id は COLUMN_IDS 定数を参照（マジックストリング防止）。
 */
const DEFAULT_COLUMNS: Column[] = [
  { id: COLUMN_IDS.TODO, title: 'TODO' },
  { id: COLUMN_IDS.IN_PROGRESS, title: 'IN PROGRESS' },
  { id: COLUMN_IDS.DONE, title: 'DONE' },
];

/**
 * 初回アクセス時に表示するサンプルカードを生成する関数。
 *
 * なぜ「定数」ではなく「関数」にしているか？
 *   → `createdAt` に `new Date().toISOString()` を使っているため。
 *     定数（モジュール評価時）だと全カードが同じ日時になるが、
 *     呼び出し時に生成することで「アプリ起動時の日時」が入る。
 *
 * `crypto.randomUUID()`:
 *   ブラウザ標準の UUID v4 生成関数（例: "550e8400-e29b-41d4-a716-446655440000"）。
 *   Math.random() より衝突率がはるかに低く、セキュアな乱数を使用する。
 *   Node.js 19+ / 主要ブラウザで利用可能。
 */
function buildSampleCards(): Card[] {
  const now = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      title: 'Kanban Board を触ってみる',
      description: 'カードをドラッグして別の列に移動してみよう',
      columnId: COLUMN_IDS.TODO,
      order: 0,
      priority: 'medium',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: 'Zustand の仕組みを読む',
      description: 'useBoard.ts のコメントを追いながら状態遷移を確認',
      columnId: COLUMN_IDS.IN_PROGRESS,
      order: 0,
      priority: 'high',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      title: 'README を読む',
      description: '',
      columnId: COLUMN_IDS.DONE,
      order: 0,
      priority: 'low',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * ストアの初期値を決定する関数。
 *
 * 優先順位:
 *   1. localStorage に保存済みデータがあれば → それを使う（復元）
 *   2. なければ → サンプルカード付きの初期値を使う（初回起動）
 *
 * この関数は `create()` の中で1回だけ呼ばれます（ストア初期化時）。
 */
function createInitialBoard(): Board {
  const restored = loadBoardFromStorage();
  if (restored) return restored;
  return {
    columns: DEFAULT_COLUMNS,
    cards: buildSampleCards(),
    filters: { search: '', priorities: [] },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ストアの型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * BoardState — Zustand ストアの型。
 *
 * 「状態（データ）」と「アクション（操作）」を 1 つの型にまとめます。
 * Zustand の特徴で、Redux のように Action/Reducer を分離しない設計です。
 *
 * Partial<Pick<Card, ...>>:
 *   Pick<Card, 'title' | 'description' | 'priority'>
 *     → { title: string; description: string; priority: Priority }
 *   Partial<...>
 *     → { title?: string; description?: string; priority?: Priority }  （すべて省略可能）
 *
 *   これにより「タイトルだけ更新」「優先度だけ更新」のどちらも同じ updateCard で対応できる。
 */
type BoardState = {
  board: Board;

  // ------- カード CRUD（作成・読み取り・更新・削除）-------
  addCard: (
    columnId: string,
    input: { title: string; description: string; priority: Priority },
  ) => void;
  updateCard: (
    cardId: string,
    updates: Partial<Pick<Card, 'title' | 'description' | 'priority'>>,
  ) => void;
  deleteCard: (cardId: string) => void;

  /**
   * カード移動。
   *
   * @param cardId        移動するカードの ID
   * @param targetColumnId 移動先の列 ID
   * @param targetIndex   移動先列での挿入位置（0始まり）
   *
   * 同列内での並び替えも、別列への移動も、この1つの関数で処理する。
   * 内部で「自分を一度削除してから指定位置に挿入」する手順をとる。
   */
  moveCard: (
    cardId: string,
    targetColumnId: string,
    targetIndex: number,
  ) => void;

  // ------- フィルタ操作 -------
  setSearchFilter: (search: string) => void;
  togglePriorityFilter: (priority: Priority) => void;
  resetFilters: () => void;

  // ------- その他 -------
  replaceBoard: (board: Board) => void;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ヘルパ関数（モジュールプライベート）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 指定列のカードを order 昇順で返す。
 *
 * フラット配列から「特定列のカードだけ」を取り出す頻出処理なので関数化。
 *
 * Array.filter() : 条件に一致する要素だけ残す（新しい配列を返す）
 * Array.sort()   : 配列をソートする（デフォルトは文字列順なので比較関数を渡す）
 *
 * ⚠️ sort() は元の配列を「破壊的に変更」します。
 *    filter() は新しい配列を返すので安全です。
 *    ここでは filter() 後の新しい配列に sort() をかけているので問題なし。
 */
function getColumnCards(cards: Card[], columnId: string): Card[] {
  return cards
    .filter((c) => c.columnId === columnId)
    .sort((a, b) => a.order - b.order); // order 昇順ソート
}

/**
 * 指定列のカードの order を 0, 1, 2... と振り直す。
 *
 * なぜ「振り直し（reindex）」が必要か？
 *
 *   初期状態: [card(order=0), card(order=1), card(order=2)]
 *
 *   order=1 を削除すると: [card(order=0), card(order=2)]
 *   ↑ order に「穴」が生まれる
 *
 *   次に card を order=1 の位置に追加しようとすると曖昧になる。
 *   だから削除・移動のたびに 0, 1, 2... と詰め直す。
 *
 * Array.map() : 配列の各要素を変換して新しい配列を返す。
 *   map((card, index) => ...) で「要素 + その インデックス」が使える。
 *
 * スプレッド構文 {...card, order: index} :
 *   card の全フィールドをコピーし、order だけ上書きした新しいオブジェクトを作る。
 *   元の card オブジェクトは変更しない（イミュータブル）。
 *
 * @param cards    全カード配列
 * @param columnId 振り直し対象の列 ID
 * @returns        対象列のカードを振り直した新しい全カード配列
 */
function reindexColumn(cards: Card[], columnId: string): Card[] {
  const sorted = getColumnCards(cards, columnId);
  // order を 0, 1, 2... で振り直す
  const reindexed = sorted.map((card, index) => ({ ...card, order: index }));
  // 他列のカードはそのまま残す
  const others = cards.filter((c) => c.columnId !== columnId);
  return [...others, ...reindexed];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Zustand ストア本体
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * useBoardStore — アプリのメインストア。
 *
 * `create<BoardState>()(...)` の二重括弧について:
 *   1つ目の()  : TypeScript のジェネリクス型推論を正しく効かせるためのカリー化
 *   2つ目の()  : 実際のストア作成関数を渡す場所
 *
 * `subscribeWithSelector` ミドルウェア:
 *   通常の `subscribe(listener)` では「ストア全体」の変化しか購読できません。
 *   `subscribeWithSelector` を使うと `subscribe(selector, listener)` の形式で
 *   「特定の値が変わった時だけ」コールバックを発火できます。
 *   → 下部の localStorage 保存ロジックで使用。
 */
export const useBoardStore = create<BoardState>()(
  subscribeWithSelector((set) => ({
    board: createInitialBoard(),

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // addCard: カードを追加
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    /**
     * set((state) => newState) の形式:
     *   現在の状態を受け取り、新しい状態を返す関数を渡す。
     *   Zustand が内部で状態をマージしてくれる（Redux の reducer に近い概念）。
     *
     * 追加位置: 列の末尾（order = 既存カード数）
     *   existingCount = 既にその列にあるカードの数
     *   → 新しいカードの order = existingCount（= 末尾）
     */
    addCard: (columnId, input) =>
      set((state) => {
        const now = new Date().toISOString();
        const existingCount = state.board.cards.filter(
          (c) => c.columnId === columnId,
        ).length;

        const newCard: Card = {
          id: crypto.randomUUID(),
          title: input.title.trim(), // 前後の空白を除去してから保存
          description: input.description.trim(),
          columnId,
          order: existingCount,
          priority: input.priority,
          createdAt: now,
          updatedAt: now,
        };

        return {
          // スプレッド構文でボード全体をコピーし、cards だけ新しい配列に差し替える
          board: { ...state.board, cards: [...state.board.cards, newCard] },
        };
      }),

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // updateCard: カードを更新
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    /**
     * Array.map() で「ID が一致するカードだけ更新」した新しい配列を作る。
     *
     * card.id === cardId のカード: スプレッドでコピー + updates で上書き + updatedAt 更新
     * それ以外のカード: そのまま（card 参照はそのまま → 差分レンダリングに有利）
     */
    updateCard: (cardId, updates) =>
      set((state) => {
        const cards = state.board.cards.map((card) =>
          card.id === cardId
            ? { ...card, ...updates, updatedAt: new Date().toISOString() }
            : card,
        );
        return { board: { ...state.board, cards } };
      }),

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // deleteCard: カードを削除
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    /**
     * Array.filter() で「削除するカード以外」の新しい配列を作る。
     *
     * 削除後は reindexColumn() で order の穴を詰める。
     * target が見つからない場合（ID が存在しない）は何もしない（防御的プログラミング）。
     */
    deleteCard: (cardId) =>
      set((state) => {
        const target = state.board.cards.find((c) => c.id === cardId);
        if (!target) return state; // 見つからなければ状態を変えない

        const remaining = state.board.cards.filter((c) => c.id !== cardId);
        const reindexed = reindexColumn(remaining, target.columnId);
        return { board: { ...state.board, cards: reindexed } };
      }),

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // moveCard: カードを移動（ドラッグ&ドロップの本体）
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    /**
     * アルゴリズムの概要:
     *
     *   STEP 1: 全カードから「動かすカード」を除外した配列を作る
     *   STEP 2: 移動先の列のカードを取り出す
     *   STEP 3: 指定位置に「動かすカード（columnId 更新済み）」を挿入
     *   STEP 4: 移動先列を order=0,1,2... で振り直す
     *   STEP 5: 別列移動の場合、元の列も振り直す（元の列に穴が空くため）
     *   STEP 6: 全列のカードを1つの配列に結合して返す
     *
     * 「先に自分を除外してから挿入」する理由:
     *   同列内で「order=1 を order=2 に移す」場合、
     *   先に除外しないと挿入位置の計算がズレる（自分自身が邪魔になる）。
     *
     * Math.max / Math.min による clamp（クランプ）:
     *   targetIndex が負や列長超えにならないよう範囲を制限する。
     *   clampedIndex = Math.max(0, Math.min(targetIndex, 列長))
     */
    moveCard: (cardId, targetColumnId, targetIndex) =>
      set((state) => {
        const source = state.board.cards.find((c) => c.id === cardId);
        if (!source) return state;

        const sourceColumnId = source.columnId;

        // STEP 1: 自分を除外
        const without = state.board.cards.filter((c) => c.id !== cardId);

        // STEP 2: 移動先列のカードを取得（自分を除いた状態）
        const targetColumnCards = getColumnCards(without, targetColumnId);
        const clampedIndex = Math.max(
          0,
          Math.min(targetIndex, targetColumnCards.length),
        );

        // STEP 3: 指定位置に挿入（columnId と order を更新したコピー）
        const movedCard: Card = {
          ...source,
          columnId: targetColumnId,
          order: clampedIndex,
          updatedAt: new Date().toISOString(),
        };

        // STEP 4: 移動先列を振り直す
        // Array.slice(0, n) → 先頭から n 個
        // Array.slice(n)    → n 番目以降
        const newTargetColumn = [
          ...targetColumnCards.slice(0, clampedIndex),
          movedCard,
          ...targetColumnCards.slice(clampedIndex),
        ].map((card, index) => ({ ...card, order: index }));

        // STEP 5 & 6: 全カードを組み立て
        const otherCards = without.filter(
          (c) => c.columnId !== targetColumnId,
        );
        let nextCards = [...otherCards, ...newTargetColumn];

        // 別列間移動の場合のみ、元列も振り直す
        if (sourceColumnId !== targetColumnId) {
          nextCards = reindexColumn(nextCards, sourceColumnId);
        }

        return { board: { ...state.board, cards: nextCards } };
      }),

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // フィルタ操作
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    setSearchFilter: (search) =>
      set((state) => ({
        board: {
          ...state.board,
          filters: { ...state.board.filters, search },
        },
      })),

    /**
     * togglePriorityFilter: チェックボックスのトグル。
     *
     * 既にリストにあれば除去（filter）、なければ追加（[...current, priority]）。
     * この「含んでいれば除去、含んでいなければ追加」はトグルの定石パターン。
     *
     * Array.includes(value): 配列に value が含まれていれば true を返す。
     */
    togglePriorityFilter: (priority) =>
      set((state) => {
        const current = state.board.filters.priorities;
        const next = current.includes(priority)
          ? current.filter((p) => p !== priority)  // 除去
          : [...current, priority];                // 追加
        return {
          board: {
            ...state.board,
            filters: { ...state.board.filters, priorities: next },
          },
        };
      }),

    resetFilters: () =>
      set((state) => ({
        board: {
          ...state.board,
          filters: { search: '', priorities: [] },
        },
      })),

    replaceBoard: (board) => set({ board }),
  })),
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 副作用: 状態変化を localStorage に自動保存
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * useBoardStore.subscribe(selector, listener):
 *   selector が返す値が変化するたびに listener が呼ばれる。
 *
 * ここでは「board オブジェクトの参照が変わった（= 何らかの更新があった）」
 * タイミングで localStorage に保存する。
 *
 * なぜ useEffect ではなく subscribe を使うのか？
 *   useEffect はコンポーネントのライフサイクルに紐付きます。
 *   ストアの副作用はコンポーネントと切り離して「ストアレベル」で管理すべきです。
 *   また、どのコンポーネントが mount/unmount しても常に保存される安定性があります。
 *
 * パフォーマンス:
 *   `set()` が呼ばれるたびに保存が走る。
 *   本番では lodash.debounce などで 500ms 程度遅延させてバッチ処理するのが丁寧。
 *   学習用途ではシンプルに毎回保存する実装としている。
 */
useBoardStore.subscribe(
  (state) => state.board,   // セレクタ: board が変わったら
  (board) => {              // リスナー: localStorage に保存
    saveBoardToStorage(board);
  },
);
