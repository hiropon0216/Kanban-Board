/**
 * ============================================================
 * Statistics.tsx — ボード統計表示コンポーネント
 * ============================================================
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【「薄い」コンポーネントの設計思想】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * このコンポーネントは「どう表示するか」だけを担当し、
 * 「何を計算するか」は useBoardStatistics フックに完全に委譲しています。
 *
 *   ❌ 太いコンポーネント（アンチパターン）:
 *     function Statistics() {
 *       const cards = useBoardStore(...);
 *       const total = cards.length;
 *       const completed = cards.filter(...).length;
 *       // ← ビジネスロジックがコンポーネントに混在
 *       return <div>...</div>;
 *     }
 *
 *   ✅ 薄いコンポーネント（推奨）:
 *     function Statistics() {
 *       const stats = useBoardStatistics(); // ロジックはフックへ
 *       return <div>...</div>;              // 表示だけに集中
 *     }
 *
 * この分離により:
 *   - Statistics コンポーネントのテストは「正しい値が表示されるか」だけ
 *   - useBoardStatistics のテストは「計算が正しいか」だけ
 *   - デザイン変更のとき Statistics だけ触ればよい
 *   - 統計ロジックを変更するとき useBoardStatistics だけ触ればよい
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【コンポーネント分割の基準「単一責任の原則」】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * このファイルには 3 つのコンポーネントが定義されています。
 *   - Statistics : 統計全体のレイアウト
 *   - Metric     : 「ラベル + 数値」1 セット
 *   - Divider    : 区切り線
 *
 * Metric と Divider を分けた理由:
 *   - コードの重複を排除（DRY 原則: Don't Repeat Yourself）
 *   - 「1 つのコンポーネントが変更される理由は 1 つ」にする（単一責任）
 *
 * ただし Metric / Divider はこのファイル内でしか使わないため
 * export していない（モジュールプライベート）。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【リアルタイム更新の仕組み】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Statistics は「カードが追加・削除・移動されるたびに」自動で再描画されます。
 * なぜ「自動」か？
 *
 *   useBoardStatistics() の内部で
 *   useBoardStore((s) => s.board.cards) を呼んでいます。
 *
 *   Zustand のセレクタは「参照等価（===）」で比較します。
 *   addCard / deleteCard / moveCard のたびに cards の参照が変わるため
 *   → useBoardStatistics が再実行される
 *   → Statistics が再レンダされる
 *   → 新しい数値が表示される
 *
 * これが React + Zustand における「リアクティブな UI」の仕組みです。
 */

import { useBoardStatistics } from '../hooks/useFilter';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// メインコンポーネント
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function Statistics() {
  // useBoardStatistics はフィルタ「前」の全カードで統計を計算する。
  // 検索中でもボード全体の数が見えることで「今どんな状態か」が把握できる。
  const stats = useBoardStatistics();

  return (
    <aside
      aria-label="ボード統計"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
    >
      {/* 全体統計: 総カード数 | 完了 | 完了率 */}
      <Metric label="総カード数" value={stats.total} />
      <Divider />
      <Metric label="完了" value={stats.completed} />
      <Divider />
      <Metric label="完了率" value={`${stats.completionRate}%`} />

      {/*
       * ml-auto: margin-left: auto でこれより前の要素を左、後の要素を右に寄せる。
       * flex-wrap: 幅が足りなければ折り返す（レスポンシブ対応）。
       */}
      <div className="ml-auto flex flex-wrap gap-2">
        {/* 列ごとのカード数バッジ */}
        {stats.perColumn.map((c) => (
          <span
            key={c.columnId}
            className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
          >
            <span className="font-medium">{c.title}</span>
            {/* tabular-nums: 数字の幅を揃えるフォント設定（桁数が変わっても揺れない） */}
            <span className="tabular-nums text-gray-500">{c.count}</span>
          </span>
        ))}
      </div>
    </aside>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ローカルコンポーネント（このファイル内でのみ使用）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Metric — 「ラベル + 数値」を縦に並べた 1 つの統計単位。
 *
 * Props 型をインラインで定義している（小さな Props は別名不要）。
 * `string | number`: ラベルは string、値は数値でも文字列（"33%"）でもよい。
 */
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      {/* uppercase: 大文字変換、tracking-wide: 文字間隔を広く */}
      <span className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <span className="text-lg font-semibold text-gray-900 tabular-nums">
        {value}
      </span>
    </div>
  );
}

/**
 * Divider — 統計項目間の縦の区切り線。
 *
 * aria-hidden: スクリーンリーダーには無意味な装飾要素なので読み飛ばしてもらう。
 * h-8 w-px: 高さ 2rem（32px）、幅 1px の細い縦線。
 */
function Divider() {
  return <span className="h-8 w-px bg-gray-200" aria-hidden />;
}
