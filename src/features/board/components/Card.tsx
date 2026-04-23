/**
 * ============================================================
 * Card.tsx — カード 1 枚を描画するコンポーネント
 * ============================================================
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【React コンポーネントとは？】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * React コンポーネントは「UI の部品」です。
 * 関数として書き（関数コンポーネント）、JSX を返します。
 *
 *   function MyComponent(props: Props) {
 *     return <div className="...">{props.text}</div>;
 *   }
 *
 * JSX（JavaScript XML）:
 *   HTML に似た記法で UI を記述する JavaScript の拡張構文。
 *   Vite（Babel/esbuild）がビルド時に React.createElement() 呼び出しに変換する。
 *
 *   JSX:             <h1 className="title">Hello</h1>
 *   変換後(概念):    React.createElement('h1', { className: 'title' }, 'Hello')
 *
 *   HTML との主な違い:
 *   - class → className（JavaScript の予約語と衝突を避けるため）
 *   - for   → htmlFor （同上）
 *   - イベント: onclick → onClick（キャメルケース）
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【Props（プロパティ）とは？】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Props は「親コンポーネントから子コンポーネントへ渡すデータ」です。
 * HTML の属性（attribute）に相当します。
 *
 *   親: <Card card={cardData} onEdit={handleEdit} />
 *   子: function Card({ card, onEdit }: Props) { ... }
 *
 * Props のルール:
 *   - 読み取り専用（子が変更してはいけない）
 *   - 親から子への一方通行（子から親へは関数 callback で通知する）
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【dnd-kit の useSortable フック】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * useSortable は「このコンポーネントをドラッグ可能にする」フックです。
 *
 * 返り値の主要プロパティ:
 *   attributes  - アクセシビリティ属性（aria-* など）。DOM に展開する。
 *   listeners   - マウス/タッチのイベントハンドラ。DOM に展開する。
 *   setNodeRef  - dnd-kit が「このDOM要素がドラッグ対象」と認識するための ref。
 *   transform   - ドラッグ中の移動量を表すオブジェクト（{x, y, scaleX, scaleY}）。
 *   transition  - ドロップ後のアニメーション用 CSS transition 文字列。
 *   isDragging  - このカードが現在ドラッグ中かどうかの真偽値。
 *
 * スプレッド構文で DOM に展開:
 *   {...attributes} {...listeners} を JSX の要素に書くと、
 *   それぞれのオブジェクトのキーが DOM props として展開される。
 *   例: { 'aria-roledescription': 'sortable' } → aria-roledescription="sortable"
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【CSS.Transform.toString() とは？】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * dnd-kit の transform は { x: 100, y: 50, scaleX: 1, scaleY: 1 } のようなオブジェクト。
 * これを CSS の `transform: translate3d(100px, 50px, 0) scaleX(1) scaleY(1)` に変換する。
 *
 * なぜ translate3d か？
 *   translateX/translateY より translate3d の方がブラウザのハードウェアアクセラレーション
 *   （GPU レンダリング）が効くため、アニメーションがスムーズになる。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【イベントの伝播（Event Propagation）】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * DOM イベントは「バブリング」します。
 * 子要素のクリックが、親要素のクリックハンドラにも伝わります。
 *
 *   <div onClick={開く}>           ← カード全体クリック → 編集モーダルを開く
 *     <button onClick={削除}>      ← X ボタンクリック → 削除したい
 *     </button>
 *   </div>
 *
 *   X ボタンをクリックすると:
 *   1. button の onClick（削除）が発火
 *   2. イベントがバブリングして div の onClick（開く）も発火 ← 困る！
 *
 * `e.stopPropagation()` で親への伝播を止める。
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card as CardType, Priority } from '../types/board';
import { useBoardStore } from '../hooks/useBoard';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Props 型。
 *
 * 「Card」という名前が types/board.ts の Card 型と衝突するため、
 * import 時に `Card as CardType` とエイリアスを付けている。
 * このように同名の型と コンポーネントが共存する場合のパターン。
 */
type Props = {
  card: CardType;
  onEdit: (card: CardType) => void; // コールバック型: CardType を受け取り void を返す関数
  isSomeoneDragging?: boolean;      // ? は「省略可能」を意味する（Optional property）
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 定数（スタイルマッピング）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 優先度ごとの Tailwind CSS クラスとラベルテキスト。
 *
 * Record<Priority, {...}> は「Priority のすべての値をキーに持つ」ことを型で保証する。
 *   Record<'low' | 'medium' | 'high', ...> と書いてもよいが、
 *   Priority 型を参照することで「Priority に値を追加し忘れた」場合にコンパイルエラーになる。
 *
 * Tailwind のクラスを動的に組み立てる場合の注意:
 *   ❌ `bg-${color}-400` → JIT エンジンがクラス名を検出できずビルドに含まれない
 *   ✅ 完全なクラス名 `bg-amber-400` をここに書いておく → ビルドに含まれる
 *   Tailwind の JIT（Just-In-Time）コンパイラはソースコードを静的解析するため、
 *   テンプレートリテラルで動的生成したクラス名は認識されない。
 */
const PRIORITY_STYLE: Record<
  Priority,
  { bar: string; label: string; text: string }
> = {
  low: {
    bar: 'bg-gray-300',
    label: 'bg-gray-100 text-gray-700 border-gray-300',
    text: 'Low',
  },
  medium: {
    bar: 'bg-amber-400',
    label: 'bg-amber-50 text-amber-800 border-amber-300',
    text: 'Medium',
  },
  high: {
    bar: 'bg-red-500',
    label: 'bg-red-50 text-red-700 border-red-300',
    text: 'High',
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// コンポーネント
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Card コンポーネント。
 *
 * 「分割代入（Destructuring）」でProps を受け取る:
 *   function Card({ card, onEdit }: Props) { ... }
 *   ↑ props オブジェクトから card と onEdit を取り出す糖衣構文
 *   function Card(props: Props) { const { card, onEdit } = props; ... } と同じ
 */
export function Card({ card, onEdit }: Props) {
  // Zustand からアクションだけ取得（最小セレクタ）
  const deleteCard = useBoardStore((s) => s.deleteCard);

  // ──────────────────────────────────────────
  // dnd-kit の useSortable フック
  // ──────────────────────────────────────────
  // id: ドラッグ可能要素の一意識別子。card.id を使う。
  // SortableContext（Column.tsx）に渡した items 配列と対応する必要がある。
  const {
    attributes,  // aria-* などアクセシビリティ属性
    listeners,   // pointer/mouse/touch イベントハンドラ
    setNodeRef,  // この DOM 要素が「ドラッグ対象」だと dnd-kit に伝える ref
    transform,   // ドラッグ中の移動量 {x, y, scaleX, scaleY}
    transition,  // ドロップ後のアニメーション用 transition 文字列
    isDragging,  // このカードが現在ドラッグされているか
  } = useSortable({ id: card.id });

  // React.CSSProperties 型の style オブジェクトを作る。
  // インラインスタイルは通常 Tailwind より避けるが、
  // ドラッグ中の座標は動的な数値なので style 属性で適用するしかない。
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform), // オブジェクト → CSS 文字列
    transition,
    opacity: isDragging ? 0.4 : 1, // ドラッグ中は半透明（元の位置に「残像」として表示）
  };

  const priorityStyle = PRIORITY_STYLE[card.priority];

  // ──────────────────────────────────────────
  // イベントハンドラ
  // ──────────────────────────────────────────

  /**
   * 削除ボタンのクリックハンドラ。
   *
   * e.stopPropagation():
   *   カード全体（親 div）にも onClick があり、クリックすると編集モーダルが開く。
   *   削除ボタンをクリックした時に親の onClick も発火しないよう伝播を止める。
   *
   * window.confirm():
   *   ブラウザの確認ダイアログを表示する。
   *   OK → true、キャンセル → false を返す。
   *   シンプルだが、スタイルをカスタムできない（ブラウザのデフォルト見た目になる）。
   *   本番ではカスタムモーダルにすることが多い。
   *
   * eslint-disable-next-line no-alert:
   *   ESLint の `no-alert` ルールは window.alert/confirm/prompt の使用を禁止する。
   *   学習用途なので一行だけ無効化するコメントを入れる。
   */
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // 親への伝播を止める
    // eslint-disable-next-line no-alert
    const ok = window.confirm(`「${card.title}」を削除しますか？`);
    if (ok) deleteCard(card.id);
  };

  // ──────────────────────────────────────────
  // JSX（描画）
  // ──────────────────────────────────────────

  return (
    <div
      // ref={setNodeRef}: dnd-kit がこの DOM 要素を「ドラッグ対象」として認識する
      ref={setNodeRef}
      style={style}
      // {...attributes}: aria-roledescription="sortable" などが展開される
      {...attributes}
      // {...listeners}: onPointerDown などドラッグ開始を検知するイベントが展開される
      {...listeners}
      // カード全体クリック → 編集モーダルを開く
      onClick={() => onEdit(card)}
      className={
        // Tailwind クラスを条件で切り替える。条件が複雑になれば clsx などのライブラリを使う。
        'group relative flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-3 pl-4 shadow-sm ' +
        'cursor-pointer transition hover:border-gray-300 hover:shadow-md ' +
        (isDragging ? 'ring-2 ring-blue-400' : '')
      }
    >
      {/* 左側の優先度カラーライン。`aria-hidden` でスクリーンリーダーには読まれない装飾的要素。 */}
      <span
        aria-hidden
        className={
          'absolute left-0 top-0 h-full w-1 rounded-l-md ' + priorityStyle.bar
        }
      />

      <div className="flex items-start justify-between gap-2">
        {/* カードタイトル */}
        <h3 className="text-sm font-semibold text-gray-900 leading-snug">
          {card.title}
        </h3>

        {/*
         * 削除ボタン。
         * `group` クラスを親 div に付けることで、`group-hover:` プレフィックスが有効になる。
         * 親にホバーした時だけ `opacity-100` にすることで、
         * 通常は非表示（opacity-0）、ホバー時だけ表示するインタラクションを実現。
         */}
        <button
          type="button"
          onClick={handleDelete}
          aria-label="カードを削除"
          className={
            'shrink-0 rounded px-1 text-xs text-gray-400 ' +
            'opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100'
          }
        >
          ×
        </button>
      </div>

      {/*
       * 条件付きレンダリング（Conditional Rendering）。
       * `{condition && <JSX>}` の形式。condition が falsy なら何も描画しない。
       * description が空文字（falsy）なら <p> タグを出さない。
       */}
      {card.description && (
        <p className="whitespace-pre-wrap text-xs text-gray-600">
          {card.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        {/* 優先度バッジ */}
        <span
          className={
            'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ' +
            priorityStyle.label
          }
        >
          {priorityStyle.text}
        </span>
      </div>
    </div>
  );
}
