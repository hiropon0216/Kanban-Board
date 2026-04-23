/**
 * ============================================================
 * Board.tsx — ボードの最上位コンポーネント（全体の司令塔）
 * ============================================================
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【このコンポーネントの役割】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Board は以下をまとめて管理する「コンテナコンポーネント」です。
 *
 *   1. DndContext     — ドラッグ&ドロップの親コンテキスト（全列をまたぐ）
 *   2. モーダル状態   — CardForm（追加/編集）の開閉を useState で管理
 *   3. フィルタ UI    — 検索ボックス、優先度チェックボックス、リセットボタン
 *   4. Statistics     — 統計表示
 *   5. 列レイアウト   — 3 列を横並びに配置
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【Discriminated Union（判別可能な共用体型）】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ModalState 型は「状態の種類」を表す Union 型です。
 *
 *   type ModalState =
 *     | { kind: 'closed' }
 *     | { kind: 'create'; columnId: string }
 *     | { kind: 'edit'; card: CardType };
 *
 *   なぜ boolean（isOpen）にしないのか？
 *     boolean では「追加モードか編集モードか」「どの列か」が表現できない。
 *
 *   なぜ 3 つの状態を 1 つの型にまとめるのか？
 *     互いに排他的（同時には成立しない）な状態は 1 つの型で表すと
 *     「ありえない状態」（追加かつ編集 など）をコンパイル時に防げる。
 *
 *   `kind` フィールドで TypeScript が型を絞り込む（型ガード）:
 *     if (modal.kind === 'edit') {
 *       modal.card // ← TypeScript が card フィールドの存在を認識する
 *     }
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【dnd-kit の DndContext と Sensor】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * DndContext はドラッグ&ドロップの「親コンテキスト」です。
 * この中にある useSortable / useDroppable が DndContext と通信します。
 *
 * Sensor（センサー）:
 *   「何がドラッグの開始トリガーか」を定義します。
 *
 *   PointerSensor: マウス・タッチ・ペンを統一的に扱う汎用センサー。
 *
 *   activationConstraint: { distance: 8 }
 *     「8px 動いてからドラッグ開始」という閾値。
 *     これがないと「クリック = ドラッグ開始」になり、
 *     カードをクリックして編集モーダルを開く操作ができなくなる。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【collisionDetection（衝突検出アルゴリズム）】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ドラッグ中のアイテムと「どのドロップ領域が最も近いか」を計算するアルゴリズム。
 *
 *   closestCorners: ドラッグアイテムの 4 隅と、各ドロップ領域の 4 隅の
 *                   最近傍距離で判定。カード間を自然に動く感覚になる。
 *   closestCenter : ドラッグアイテムの中心と、各ドロップ領域の中心距離で判定。
 *   rectIntersection: 矩形の重なり面積で判定（デフォルト）。
 *
 *   カンバンボードには closestCorners が最も自然な動作になる。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【DragOverlay（ドラッグオーバーレイ）】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * DragOverlay を使わない場合:
 *   ドラッグ中のカードは元の位置に transform: translate3d() で動く。
 *   列の境界を越えて動かすと、見た目がその列の範囲に制限されクリッピングされる。
 *
 * DragOverlay を使う場合:
 *   React のポータル（DOM ツリーの最上位）にドラッグ中のカードを描画する。
 *   どこにでも自由に追従し、列の境界を気にしない滑らかなドラッグ体験になる。
 *   元の位置には「穴（空のスペース）」が残り、どこに入るか視覚的にわかる。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【ドラッグ終了時の計算ロジック】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * handleDragEnd(event) の event.over.id は 2 パターン:
 *
 *   a) 他のカードの上にドロップ → over.id = "card-uuid-..."
 *   b) 列の空白にドロップ       → over.id = "column:todo"（Column.tsx で設定）
 *
 * このどちらかで targetColumnId と targetIndex を決め、
 * useBoardStore の moveCard アクションを呼ぶ。
 */

import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { Card as CardType, Priority } from '../types/board';
import { useBoardStore } from '../hooks/useBoard';
import {
  ALL_PRIORITIES,
  useColumnsWithCards,
} from '../hooks/useFilter';
import { Column } from './Column';
import { Card } from './Card';
import { CardForm, type CardFormValues } from './CardForm';
import { Statistics } from './Statistics';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * ModalState — モーダルの開閉状態を表す Discriminated Union。
 *
 * kind フィールドで状態を判別する:
 *   'closed' → モーダルは閉じている
 *   'create' → カード追加モーダルが開いている（columnId が必要）
 *   'edit'   → カード編集モーダルが開いている（card が必要）
 */
type ModalState =
  | { kind: 'closed' }
  | { kind: 'create'; columnId: string }
  | { kind: 'edit'; card: CardType };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// コンポーネント
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function Board() {
  // ──────────────────────────────────────────
  // Zustand からアクションを取得
  //
  // セレクタは「1 つの値または関数」に絞る。
  // まとめて `const { addCard, ... } = useBoardStore()` にすると
  // board の全変化で再レンダが起きるため避ける。
  // ──────────────────────────────────────────
  const addCard           = useBoardStore((s) => s.addCard);
  const updateCard        = useBoardStore((s) => s.updateCard);
  const moveCard          = useBoardStore((s) => s.moveCard);
  const filters           = useBoardStore((s) => s.board.filters);
  const setSearchFilter   = useBoardStore((s) => s.setSearchFilter);
  const togglePriority    = useBoardStore((s) => s.togglePriorityFilter);
  const resetFilters      = useBoardStore((s) => s.resetFilters);

  // フィルタ済みの列 + カード（描画に使う派生データ）
  const columnsWithCards  = useColumnsWithCards();

  // ──────────────────────────────────────────
  // ローカル状態
  // ──────────────────────────────────────────

  // モーダルの状態。'closed' で始まる。
  const [modal, setModal]           = useState<ModalState>({ kind: 'closed' });
  // ドラッグ中のカード（DragOverlay 用）。null = ドラッグしていない。
  const [activeCard, setActiveCard] = useState<CardType | null>(null);

  // ──────────────────────────────────────────
  // dnd-kit のセンサー設定
  //
  // useSensors: 複数のセンサーをまとめる。
  // useSensor(PointerSensor, options): センサーと設定をペアにする。
  //
  // activationConstraint.distance: 8
  //   ポインタが 8px 以上動いてからドラッグを開始する。
  //   これがないとカードのクリック（編集）がドラッグとして誤検知される。
  // ──────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  // ──────────────────────────────────────────
  // DnD イベントハンドラ
  // ──────────────────────────────────────────

  /**
   * onDragStart: ドラッグ開始時。
   *
   * active.id: ドラッグ開始したアイテムの id（= card.id）。
   * DragOverlay に表示するためにアクティブカードを探して保持する。
   */
  const handleDragStart = (event: DragStartEvent) => {
    const card = findCardById(columnsWithCards, String(event.active.id));
    setActiveCard(card);
  };

  /**
   * onDragEnd: ドロップ確定時。最も重要な処理。
   *
   * event.active.id: ドラッグしたカードの id
   * event.over     : ドロップ先の情報（null = 無効な場所にドロップ）
   * event.over.id  : ドロップ先の id
   *
   * ドロップ先の判定:
   *   over.id が "column:" で始まる → 列の空白エリア
   *   それ以外                      → 別のカードの上
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null); // オーバーレイを消す

    if (!over) return; // 無効な場所にドロップ → 何もしない

    const activeId = String(active.id);
    const overId   = String(over.id);

    const activeCardData = findCardById(columnsWithCards, activeId);
    if (!activeCardData) return;

    let targetColumnId: string;
    let targetIndex: number;

    if (overId.startsWith('column:')) {
      // ─ パターン A: 列の空白エリアにドロップ ─
      // 'column:todo' → 'todo' を取り出す
      targetColumnId = overId.slice('column:'.length);
      // 末尾に追加（その列のカード数がインデックスになる）
      const column = columnsWithCards.find((c) => c.id === targetColumnId);
      targetIndex  = column?.cards.length ?? 0;
    } else {
      // ─ パターン B: 別のカードの上にドロップ ─
      const overCard = findCardById(columnsWithCards, overId);
      if (!overCard) return;
      targetColumnId = overCard.columnId;
      const column   = columnsWithCards.find((c) => c.id === targetColumnId);
      // over カードの現在インデックス = 挿入位置
      // (moveCard 内で「自分を先に除外してから挿入」するため、
      //  呼び出し側は over カードの現在位置をそのまま渡せばよい)
      targetIndex = column?.cards.findIndex((c) => c.id === overCard.id) ?? 0;
    }

    // 位置が変わっていなければ何もしない（不要な状態更新を防ぐ）
    if (
      activeCardData.columnId === targetColumnId &&
      activeCardData.order === targetIndex
    ) {
      return;
    }

    moveCard(activeId, targetColumnId, targetIndex);
  };

  const handleDragCancel = () => setActiveCard(null);

  // ──────────────────────────────────────────
  // モーダル開閉ハンドラ
  // ──────────────────────────────────────────
  const openCreate = (columnId: string) => setModal({ kind: 'create', columnId });
  const openEdit   = (card: CardType)    => setModal({ kind: 'edit', card });
  const closeModal = ()                  => setModal({ kind: 'closed' });

  /**
   * フォーム送信ハンドラ。
   *
   * modal.kind で Discriminated Union の型を絞り込み、
   * 追加か編集かに応じて適切なアクションを呼ぶ。
   */
  const handleFormSubmit = (values: CardFormValues) => {
    if (modal.kind === 'create') {
      addCard(modal.columnId, values);
    } else if (modal.kind === 'edit') {
      updateCard(modal.card.id, values);
    }
  };

  // ──────────────────────────────────────────
  // フィルタが有効か（リセットボタンの活性制御）
  //
  // useMemo: filters が変わったときだけ再計算する。
  // ||: search が空文字でない OR priorities に 1 件以上ある → フィルタ有効
  // ──────────────────────────────────────────
  const hasActiveFilter = useMemo(
    () => filters.search.length > 0 || filters.priorities.length > 0,
    [filters],
  );

  // ──────────────────────────────────────────
  // JSX（描画）
  // ──────────────────────────────────────────
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <h1 className="text-xl font-bold text-gray-900">Kanban Board</h1>

      {/* 統計バー */}
      <Statistics />

      {/* 検索 + フィルタバー */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
        {/*
         * Controlled input: value={filters.search} で Zustand の状態と紐付ける。
         * onChange で setSearchFilter を呼ぶと Zustand → UI が同期する。
         */}
        <input
          type="text"
          value={filters.search}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="タイトル・説明で検索..."
          className="min-w-52 flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">優先度:</span>
          {/*
           * ALL_PRIORITIES.map() で優先度チェックボックスを動的生成。
           * PriorityCheckbox コンポーネントに分割することで
           * Board の JSX がすっきりし、個別のロジックが分離される。
           */}
          {ALL_PRIORITIES.map((p) => (
            <PriorityCheckbox
              key={p}
              priority={p}
              checked={filters.priorities.includes(p)}
              onToggle={() => togglePriority(p)}
            />
          ))}
        </div>

        {/*
         * disabled 属性: フィルタがかかっていない時はボタンを非活性にする。
         * disabled={!hasActiveFilter}: フィルタなし → disabled=true（クリック不可）
         */}
        <button
          type="button"
          onClick={resetFilters}
          disabled={!hasActiveFilter}
          className={
            'rounded border px-3 py-1.5 text-xs ' +
            (hasActiveFilter
              ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
              : 'cursor-not-allowed border-gray-200 text-gray-400')
          }
        >
          リセット
        </button>
      </div>

      {/*
       * DndContext: この中にある SortableContext / useDroppable がイベントを受け取る。
       *
       * sensors:             ドラッグ開始トリガー（PointerSensor + 8px 閾値）
       * collisionDetection:  どのドロップ領域に「当たっているか」の計算方法
       * onDragStart:         ドラッグ開始 → activeCard をセット
       * onDragEnd:           ドロップ確定 → moveCard を呼ぶ
       * onDragCancel:        ESC 等でキャンセル → activeCard をクリア
       */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* 列の横並びレイアウト。overflow-x-auto で 3 列が収まらない時に横スクロール。 */}
        <div className="flex flex-1 gap-4 overflow-x-auto">
          {columnsWithCards.map((column) => (
            <Column
              key={column.id}
              column={column}
              cards={column.cards}
              onAddCard={openCreate}
              onEditCard={openEdit}
              isDragging={activeCard !== null}
            />
          ))}
        </div>

        {/*
         * DragOverlay:
         *   ドラッグ中に「画面最前面でポインタに追従するカード」を描画する。
         *   Portal で <body> 直下に描画されるため、列のクリッピングを受けない。
         *   activeCard が null のとき（ドラッグしていない）は何も描画しない。
         *
         *   rotate-1: 少し傾けてドラッグ中感を演出。
         *   w-72: 列幅（w-80）より少し小さくして「取り出した」感を出す。
         */}
        <DragOverlay>
          {activeCard ? (
            <div className="w-72 rotate-1">
              <Card card={activeCard} onEdit={() => undefined} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/*
       * モーダルのレンダリング。
       * modal.kind !== 'closed' の時だけ CardForm を描画することで
       * 「閉じている時は DOM に存在しない」状態にする。
       *
       * このやり方（マウント/アンマウントで制御）のメリット:
       *   - モーダルが開くたびに useState が初期値にリセットされる
       *   - 前回の入力が残らない（追加後に再度開いても空になる）
       *
       * デメリット: 毎回マウントのコストがかかる（今回は軽微なので問題なし）。
       */}
      {modal.kind !== 'closed' && (
        <CardForm
          mode={modal.kind}
          initialCard={modal.kind === 'edit' ? modal.card : undefined}
          onClose={closeModal}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ローカルコンポーネント・ヘルパ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * PriorityCheckbox — 優先度フィルタの 1 つのチェックボックス。
 *
 * Board 内でのみ使う小さなコンポーネント。
 * 同じ構造が 3 回繰り返されるため関数として抽出（DRY 原則）。
 */
function PriorityCheckbox({
  priority,
  checked,
  onToggle,
}: {
  priority: Priority;
  checked: boolean;
  onToggle: () => void;
}) {
  const label: Record<Priority, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  };
  return (
    // <label> で <input> をラップすることで、テキスト部分をクリックしても
    // チェックボックスが反応する（UX の向上）。
    <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      {label[priority]}
    </label>
  );
}

/**
 * findCardById — 列配列から特定 ID のカードを線形探索する。
 *
 * @param columns - ColumnWithCards の配列（フィルタ済み）
 * @param id      - 探したいカードの id
 * @returns カードオブジェクト or null（見つからない場合）
 *
 * 計算量: O(N)（全カード数 N）。カード数が数千を超えるなら Map で O(1) に最適化できる。
 * 今回の用途（ドラッグ開始時 + 終了時の 2 回）では十分。
 */
function findCardById(
  columns: { cards: CardType[] }[],
  id: string,
): CardType | null {
  for (const col of columns) {
    const found = col.cards.find((c) => c.id === id);
    if (found) return found;
  }
  return null;
}
