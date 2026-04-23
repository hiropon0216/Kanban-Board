/**
 * ============================================================
 * Column.tsx — カンバンボードの 1 列コンポーネント
 * ============================================================
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【dnd-kit の 2 層構造（SortableContext + useDroppable）】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * dnd-kit でカンバンを実装するには 2 種類のドロップ受付が必要です。
 *
 *   層 1: SortableContext — 同列内の並び替え
 *     useSortable フック（各 Card が使う）に「並び替えアルゴリズム」を提供する。
 *     SortableContext の items にカード ID 配列を渡すと、
 *     ドラッグ中に他のカードが「よける」アニメーションが自動で付く。
 *
 *   層 2: useDroppable — 列自体へのドロップ
 *     カードが 0 枚の空列や、カードの下部の空白エリアへのドロップを受け付ける。
 *     SortableContext だけでは「カードのない領域」にドロップできないため、
 *     列全体を別途 droppable にする。
 *
 *   なぜ両方必要か？
 *     - SortableContext: カード同士の間に「割り込む」挿入を扱う
 *     - useDroppable  : カードがない空の列や末尾にドロップする際に使う
 *     Board.tsx の handleDragEnd で `column:` プレフィックスの有無で判定する。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【Component Composition（コンポーネント合成）】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Column コンポーネントは Column → [Card, Card, ...] という階層を持つ。
 * 「Column がカードのレイアウト責任を持ち、カード自体の描画は Card に委譲する」
 * という責任分担が設計のポイント。
 *
 *   Column の責任:
 *     - 列のレイアウト（ヘッダ、スクロール領域、フッタ）
 *     - SortableContext の提供
 *     - ドロップ領域のハイライト
 *
 *   Card の責任:
 *     - 1 枚分の表示（タイトル、優先度、削除ボタン）
 *     - ドラッグ可能にする（useSortable）
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【Tailwind の section/header/footer タグ】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * HTML5 のセマンティックタグを使うことで、画面構造をより明確に表現できます。
 *   <section>: ドキュメントの独立したセクション（ここでは 1 列）
 *   <header> : セクションのヘッダ（列タイトル）
 *   <footer> : セクションのフッタ（追加ボタン）
 *
 * div で代替しても動作しますが、スクリーンリーダーや検索エンジンが
 * コンテンツの意味を理解しやすくなります（アクセシビリティ / SEO の向上）。
 */

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card } from './Card';
import type {
  Card as CardType,
  Column as ColumnType,
} from '../types/board';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type Props = {
  column: ColumnType;
  cards: CardType[];
  onAddCard: (columnId: string) => void;  // 追加ボタン押下時のコールバック
  onEditCard: (card: CardType) => void;   // カードクリック時のコールバック
  isDragging: boolean;                    // Board のどこかでドラッグが発生中か
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// コンポーネント
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function Column({
  column,
  cards,
  onAddCard,
  onEditCard,
  isDragging,
}: Props) {
  // ──────────────────────────────────────────
  // useDroppable: 列自体を「ドロップ受付エリア」として登録する
  //
  // id: `column:${column.id}` のようにプレフィックスを付けることで
  //     カードの id（UUID 形式）と区別できる。
  //     Board.tsx の handleDragEnd では over.id が 'column:' で始まるかで判定する。
  //
  // data: ドラッグイベントのコールバックに渡されるメタデータ。
  //       今回は Board.tsx で over.data を使っていないが、
  //       複雑な DnD では「どの列か」をここから判定するケースがある。
  //
  // isOver: このエリアの上にドラッグアイテムが乗っているか（ハイライトに使う）。
  // ──────────────────────────────────────────
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${column.id}`,
    data: { type: 'column', columnId: column.id },
  });

  return (
    <section
      aria-label={column.title}
      className="flex h-full w-80 shrink-0 flex-col rounded-lg bg-gray-100"
    >
      {/* ── ヘッダ: 列タイトル + カード数 ── */}
      <header className="flex items-center justify-between rounded-t-lg border-b border-gray-200 bg-white px-3 py-2">
        <h2 className="text-sm font-semibold tracking-wide text-gray-700">
          {column.title}
        </h2>
        {/* カード数バッジ。min-w-6 で最小幅を確保して、1桁でも円形に見える。 */}
        <span className="inline-flex min-w-6 justify-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {cards.length}
        </span>
      </header>

      {/*
       * ── カード一覧エリア ──
       *
       * ref={setNodeRef}: useDroppable がこの DOM 要素をドロップ領域として認識する
       * flex-1: 親の flex-col コンテナの残り高さをすべて埋める
       * overflow-y-auto: カードが多くなったとき縦スクロールを有効にする
       * transition-colors: ドロップホバー時の色変化をアニメーションで補完
       */}
      <div
        ref={setNodeRef}
        className={
          'flex flex-1 flex-col gap-2 overflow-y-auto p-3 transition-colors ' +
          (isDragging && isOver ? 'bg-blue-50' : '') // ドロップ可能なとき青くハイライト
        }
      >
        {/*
         * SortableContext: この中の useSortable 要素が「同じグループ」であることを宣言する。
         *
         * items={cards.map((c) => c.id)}:
         *   ソート対象のアイテム ID 配列。card.id の配列を渡す。
         *   dnd-kit はこの配列の順序から「現在の並び順」を認識する。
         *
         * strategy={verticalListSortingStrategy}:
         *   縦方向リスト用の並び替えアルゴリズム。
         *   ドラッグ中に他のカードが「上下によける」動きをするアルゴリズム。
         *   横並びなら horizontalListSortingStrategy を使う。
         */}
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            // key prop: React がリストの差分更新を効率的に行うための一意キー
            <Card key={card.id} card={card} onEdit={onEditCard} />
          ))}
        </SortableContext>

        {/* 空列の場合のプレースホルダ */}
        {cards.length === 0 && (
          <p className="select-none text-center text-xs text-gray-400">
            ここにカードをドロップ
          </p>
        )}
      </div>

      {/* ── フッタ: カード追加ボタン ── */}
      <footer className="rounded-b-lg border-t border-gray-200 bg-white p-2">
        <button
          type="button"
          onClick={() => onAddCard(column.id)}
          className="w-full rounded px-2 py-1.5 text-left text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          + カードを追加
        </button>
      </footer>
    </section>
  );
}
