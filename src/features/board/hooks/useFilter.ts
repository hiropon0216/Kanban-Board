/**
 * ============================================================
 * useFilter.ts — フィルタ・派生状態のカスタムフック
 * ============================================================
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【カスタムフックとは？】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * React には `useState`, `useEffect`, `useMemo` などの「フック」があります。
 * これらを組み合わせて「use〇〇」という名前で関数化したものが「カスタムフック」です。
 *
 * カスタムフックのルール（React の規約）:
 *   1. 関数名は必ず `use` で始める
 *   2. トップレベルで呼ぶ（if / for / 関数の中で呼んではいけない）
 *   3. React コンポーネントまたは他のカスタムフックからのみ呼べる
 *
 * カスタムフックのメリット:
 *   - ロジックをコンポーネントから切り出して再利用できる
 *   - テストがしやすい
 *   - コンポーネントが「何を表示するか」に集中できる（ロジックの分離）
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【useMemo とは？】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * `useMemo(計算関数, [依存配列])`:
 *   依存配列の値が前回から変わった場合のみ計算関数を実行し、
 *   それ以外はキャッシュした結果を返す。
 *
 *   // 毎回再計算（非効率）:
 *   function useFilteredCards() {
 *     const cards = useBoardStore(s => s.board.cards);
 *     const filters = useBoardStore(s => s.board.filters);
 *     return cards.filter(...);  // コンポーネントが再レンダするたびに走る
 *   }
 *
 *   // useMemo でキャッシュ（効率的）:
 *   return useMemo(() => {
 *     return cards.filter(...);  // cards か filters が変わった時だけ走る
 *   }, [cards, filters]);
 *
 * なぜこれが重要か？
 *   React コンポーネントは「状態が変わるたびに」再レンダします。
 *   再レンダのたびに重い計算が走ると、ユーザーが感じるほど遅くなります。
 *   useMemo でキャッシュすることで、不要な再計算を避けます。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【派生状態（Derived State）とは？】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ストアに保存した「生データ」から計算で求められる値のことです。
 *
 *   生データ（ストア）: cards（全カードのフラット配列）
 *   派生状態（計算）  : columnsWithCards（列ごとにカードを整理した構造）
 *
 * 派生状態はストアには保存しません。
 * 理由: 保存すると「生データ」と「派生値」の二重管理になりズレが生じるため。
 *       いつでも計算で求められるものはその都度計算する（Single Source of Truth）。
 */

import { useMemo } from 'react';
import { useBoardStore } from './useBoard';
import type { Card, Column, Priority } from '../types/board';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * ColumnWithCards — 列とその列のカードをまとめた型。
 *
 * `Column & { cards: Card[] }` は「交差型（Intersection Type）」。
 *   Column の全フィールド + cards フィールド を合わせた型になります。
 *
 *   Column:          { id: string; title: string }
 *   { cards: Card[] }: { cards: Card[] }
 *   Column & { cards: Card[] }: { id: string; title: string; cards: Card[] }
 *
 * UI 側がこの型を受け取ることで、列とカードを一度に扱えます。
 */
export type ColumnWithCards = Column & { cards: Card[] };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// カスタムフック
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * useFilteredCards — フィルタ条件を適用したカード配列を返す。
 *
 * 処理の流れ:
 *   1. Zustand から「全カード」と「フィルタ条件」を取得
 *   2. useMemo でフィルタリング計算をキャッシュ
 *   3. 絞り込まれたカード配列を返す
 *
 * セレクタを 2 回に分けている理由:
 *   `useBoardStore(s => s.board)` とまとめると、
 *   board 内の何かが変わるたびに（filters が変わっても cards が変わっても）
 *   このフックが再計算されます。
 *
 *   `cards` と `filters` を個別に取ることで、
 *   cards が変わった → useFilteredCards が再計算
 *   filters が変わった → useFilteredCards が再計算
 *   columns が変わった → useFilteredCards は再計算しない（無関係）
 *
 * という細かい制御ができます（パフォーマンス最適化）。
 */
export function useFilteredCards(): Card[] {
  const cards = useBoardStore((s) => s.board.cards);
  const filters = useBoardStore((s) => s.board.filters);

  return useMemo(() => {
    const keyword = filters.search.trim().toLowerCase();

    return cards.filter((card) => {
      // ── 優先度フィルタ ──────────────────────────────
      // priorities が空配列 → 全件通す（フィルタなし状態）
      // priorities に要素あり → そのどれかに一致するカードのみ通す
      if (
        filters.priorities.length > 0 &&
        !filters.priorities.includes(card.priority)
      ) {
        return false; // このカードを除外
      }

      // ── 検索フィルタ ────────────────────────────────
      // キーワードが空文字 → 全件通す
      // キーワードあり → タイトルか説明に含まれるカードのみ通す
      if (keyword) {
        // toLowerCase(): 大文字小文字を区別しない比較のため小文字に統一
        // includes(): 部分一致検索（"kanban" で "Kanban Board" に一致）
        const haystack = `${card.title} ${card.description}`.toLowerCase();
        if (!haystack.includes(keyword)) {
          return false; // このカードを除外
        }
      }

      return true; // 全条件を通過 → 表示する
    });
  }, [cards, filters]); // cards か filters が変わった時のみ再計算
}

/**
 * useColumnsWithCards — 列ごとにカードを整理した配列を返す。
 *
 * UI 描画（Board → Column → Card の順に渡す）で使いやすい形に変換します。
 *
 * 処理の流れ:
 *   columns: [{ id: 'todo', title: 'TODO' }, ...]
 *   filteredCards: [{ columnId: 'todo', ... }, { columnId: 'done', ... }, ...]
 *   ↓
 *   [
 *     { id: 'todo', title: 'TODO', cards: [TODO のカード群（order 順）] },
 *     { id: 'in-progress', title: 'IN PROGRESS', cards: [...] },
 *     { id: 'done', title: 'DONE', cards: [...] },
 *   ]
 *
 * useFilteredCards() を呼んでいるため、
 * フィルタ変更 → useFilteredCards 再計算 → useColumnsWithCards 再計算
 * の連鎖が自動的に起きる。
 */
export function useColumnsWithCards(): ColumnWithCards[] {
  const columns = useBoardStore((s) => s.board.columns);
  const filtered = useFilteredCards(); // フィルタ済みカードを利用

  return useMemo(() => {
    return columns.map((column) => ({
      ...column,
      cards: filtered
        .filter((c) => c.columnId === column.id)
        .sort((a, b) => a.order - b.order), // 表示順に並べる
    }));
  }, [columns, filtered]);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 統計フック
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * BoardStatistics — 統計情報の型。
 *
 * コンポーネントが受け取る「統計の形」を明示するための型。
 * ここで型を定義しておくと、Statistics コンポーネントの実装時に
 * どんな値が来るか補完が効く。
 */
export type BoardStatistics = {
  total: number;
  completed: number;
  completionRate: number; // 0〜100 の整数（%）
  perColumn: { columnId: string; title: string; count: number }[];
};

/**
 * useBoardStatistics — ボード全体と列ごとの統計を返す。
 *
 * 設計上の注意:
 *   統計はフィルタ「前」の全カード数で計算します。
 *   理由: 「High フィルタ中に完了率が変わる」のは直感に反するため。
 *         統計はボード全体の状況を把握するための数字なのでフィルタを無視する。
 *
 * Math.round():
 *   小数を四捨五入して整数にする。
 *   2 / 3 = 0.666... → Math.round(0.666... * 100) = 67 (%)
 *
 * ゼロ除算の防止:
 *   total が 0 のとき `completed / total` は NaN（Not a Number）になる。
 *   `total === 0 ? 0 : Math.round(...)` の三項演算子で防止する。
 */
export function useBoardStatistics(): BoardStatistics {
  const columns = useBoardStore((s) => s.board.columns);
  // フィルタ「前」の全カードで統計を計算する
  const cards = useBoardStore((s) => s.board.cards);

  return useMemo(() => {
    const total = cards.length;

    // 「完了」= 最後の列（DONE）に入っているカード数
    // columns[columns.length - 1] で最後の要素を取得
    // ?. (Optional Chaining): columns が空配列の場合でも例外が出ない
    const doneColumnId = columns[columns.length - 1]?.id;
    const completed = doneColumnId
      ? cards.filter((c) => c.columnId === doneColumnId).length
      : 0;

    // 完了率（%）を計算。total=0 のゼロ除算を三項演算子で回避。
    const completionRate =
      total === 0 ? 0 : Math.round((completed / total) * 100);

    // 列ごとのカード数
    const perColumn = columns.map((col) => ({
      columnId: col.id,
      title: col.title,
      count: cards.filter((c) => c.columnId === col.id).length,
    }));

    return { total, completed, completionRate, perColumn };
  }, [columns, cards]);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 定数エクスポート
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * ALL_PRIORITIES — 優先度の全一覧。
 *
 * UI（フィルタチェックボックスの生成など）で使う定数。
 * types/board.ts から型を参照しているため、Priority 型に合わせた配列になる。
 * Priority に新しい値を追加したら、ここも更新する必要がある点に注意。
 */
export const ALL_PRIORITIES: Priority[] = ['low', 'medium', 'high'];
