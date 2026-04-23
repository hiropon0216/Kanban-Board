/**
 * ============================================================
 * CardForm.tsx — カード追加・編集フォーム（モーダルダイアログ）
 * ============================================================
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【Controlled Components（制御コンポーネント）とは？】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * フォームの入力値を React の状態（useState）で管理する手法。
 *
 *   // Controlled Component:
 *   const [value, setValue] = useState('');
 *   <input value={value} onChange={e => setValue(e.target.value)} />
 *
 *   // Uncontrolled Component（非推奨）:
 *   const ref = useRef<HTMLInputElement>(null);
 *   <input ref={ref} />
 *   // → ref.current.value で読み取る（React が管理しない）
 *
 * Controlled が推奨される理由:
 *   - 「React の状態 = UI の見た目」が常に一致する（One Source of Truth）
 *   - バリデーション・整形（trim など）をリアルタイムに適用できる
 *   - フォームのリセットが setState だけで済む
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【useState とは？】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * コンポーネントのローカル状態を管理するフック。
 *
 *   const [value, setValue] = useState<string>('初期値');
 *   //    ^^^^^ 現在の値     ^^^^^^^^ 更新関数   ^^^^^^^^ 初期値
 *
 * 「配列の分割代入」を使っている。useState は [状態, 更新関数] の tuple を返す。
 *
 * setValue を呼ぶと React が「再レンダ」をスケジュールし、
 * 次の描画では `value` が新しい値になる。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【useEffect とは？】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * コンポーネントの「副作用」を処理するフック。
 * 「描画後に何かする」処理を書く場所。
 *
 *   useEffect(() => {
 *     // 副作用の処理（DOM 操作、API 呼び出し、イベント登録など）
 *     input.focus();
 *     window.addEventListener('keydown', handler);
 *
 *     // クリーンアップ関数: unmount 時 or 依存値変更前に実行
 *     return () => {
 *       window.removeEventListener('keydown', handler);
 *     };
 *   }, [依存配列]);
 *
 * 依存配列:
 *   []      → マウント時のみ1回実行
 *   [a, b]  → a か b が変化するたびに実行
 *   省略    → 毎回レンダ後に実行（ほぼ使わない）
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【useRef とは？】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * DOM 要素への参照（リファレンス）を持つためのフック。
 *
 *   const inputRef = useRef<HTMLInputElement>(null);
 *   <input ref={inputRef} />
 *   // → inputRef.current が <input> DOM 要素を指す
 *   // → inputRef.current.focus() で input にフォーカスできる
 *
 * useState との違い:
 *   useRef は値を変更しても再レンダを引き起こさない。
 *   DOM 参照など「描画に影響しないミュータブルな値」の保持に使う。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【モーダルダイアログの設計】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * モーダルは以下の要素で構成される:
 *   - オーバーレイ（背景）: 画面全体を覆う半透明の暗い背景
 *   - ダイアログボックス : フォームを含む中央のカード
 *
 * アクセシビリティ（a11y）対応:
 *   - role="dialog"   : スクリーンリーダーに「これはダイアログ」と伝える
 *   - aria-modal="true" : ダイアログ外の要素を読み上げないよう指示
 *   - aria-label      : ダイアログのタイトルをテキストで伝える
 *
 * 背景クリックで閉じる判定:
 *   e.target === e.currentTarget
 *     e.target        : クリックが発生した要素（最も内側）
 *     e.currentTarget : このハンドラが登録された要素（オーバーレイ div）
 *   フォーム内部をクリックしたとき → e.target ≠ e.currentTarget → 閉じない
 *   オーバーレイ自体をクリックしたとき → e.target = e.currentTarget → 閉じる
 */

import { useEffect, useRef, useState } from 'react';
import type { Card, Priority } from '../types/board';
import {
  validateCardDescription,
  validateCardTitle,
} from '../utils/validation';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** フォームの送信値型。Board.tsx でも参照するため export する。 */
export type CardFormValues = {
  title: string;
  description: string;
  priority: Priority;
};

type Props = {
  mode: 'create' | 'edit';
  initialCard?: Card;   // 編集モード時の初期値。? = 省略可能（undefined になりうる）
  onClose: () => void;
  onSubmit: (values: CardFormValues) => void;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 定数
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// コンポーネント
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function CardForm({ mode, initialCard, onClose, onSubmit }: Props) {
  // ──────────────────────────────────────────
  // ローカル状態（フォームの入力値）
  //
  // ?? は「Nullish Coalescing（ヌル合体演算子）」。
  // initialCard?.title が null / undefined のとき '' を使う。
  // || との違い: 0 や false などの "falsy だが有効な値" は ?? では通過する。
  // ──────────────────────────────────────────
  const [title, setTitle] = useState(initialCard?.title ?? '');
  const [description, setDescription] = useState(initialCard?.description ?? '');
  const [priority, setPriority] = useState<Priority>(initialCard?.priority ?? 'medium');
  const [error, setError] = useState<string | null>(null); // null = エラーなし

  // DOM 参照。タイトル input に自動フォーカスするために使う。
  const titleInputRef = useRef<HTMLInputElement>(null);

  // ──────────────────────────────────────────
  // 副作用: 初期フォーカス & ESC キーで閉じる
  // ──────────────────────────────────────────
  useEffect(() => {
    // モーダルが開いた直後にタイトル input にフォーカス。
    // ?. （Optional Chaining）: ref が null でも例外にならない。
    titleInputRef.current?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);

    // クリーンアップ関数: コンポーネント unmount（モーダルが閉じる）時に
    // イベントリスナーを解除する。これを忘れると「メモリリーク」になる。
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]); // onClose が親で再生成される可能性があるため依存配列に含める

  // ──────────────────────────────────────────
  // フォーム送信ハンドラ
  //
  // e.preventDefault():
  //   HTML フォームのデフォルト動作（ページリロード or GETリクエスト）を防ぐ。
  //   React の SPA（シングルページアプリ）ではほぼ常に呼ぶ。
  // ──────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const titleError = validateCardTitle(title);
    if (titleError) return setError(titleError); // エラーがあれば表示して中断

    const descError = validateCardDescription(description);
    if (descError) return setError(descError);

    setError(null);
    onSubmit({ title: title.trim(), description: description.trim(), priority });
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // ──────────────────────────────────────────
  // JSX（描画）
  //
  // JSX のコメントは {/* ... */} の形式。
  // 通常の // や /* */ は JSX タグの外（JavaScript 部分）でのみ使える。
  // ──────────────────────────────────────────
  return (
    // オーバーレイ: fixed で画面全体に重なる半透明背景
    // bg-black/40: bg-black（黒）に /40（40% の不透明度）を組み合わせた Tailwind v3 記法
    // z-50: z-index=50 で他の要素の前面に表示
    // inset-0: top/right/bottom/left = 0 で画面いっぱいに広げる
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'create' ? 'カードを追加' : 'カードを編集'}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      {/* ダイアログ本体 */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
      >
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          {mode === 'create' ? 'カードを追加' : 'カードを編集'}
        </h2>

        {/* タイトル入力 */}
        <div className="mb-3">
          {/*
           * <label htmlFor="card-title"> と <input id="card-title"> を紐付けることで
           * ラベルをクリックしても input にフォーカスが当たる（アクセシビリティ向上）。
           */}
          <label
            htmlFor="card-title"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            タイトル
          </label>
          {/*
           * Controlled input:
           *   value={title}            → state が表示値を決める（表示 = 状態）
           *   onChange={...setTitle}   → 入力のたびに state を更新
           *   maxLength={100}          → HTML レベルでも文字数を制限（二重防衛）
           */}
          <input
            id="card-title"
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            maxLength={100}
          />
        </div>

        {/* 説明入力（任意） */}
        <div className="mb-3">
          <label
            htmlFor="card-description"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            説明 (任意)
          </label>
          <textarea
            id="card-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full resize-y rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            maxLength={500}
          />
        </div>

        {/* 優先度セレクト */}
        <div className="mb-4">
          <label
            htmlFor="card-priority"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            優先度
          </label>
          {/*
           * select の onChange: e.target.value は string 型。
           * Priority 型に `as Priority` でキャストする（型アサーション）。
           * PRIORITY_OPTIONS の value のみが渡ってくるため実行時は安全。
           */}
          <select
            id="card-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            {/*
             * Array.map() で選択肢を動的生成。
             * key={opt.value}: React がリストを効率的に更新するための一意キー。
             * index を key にするのは非推奨（並び替え時に誤動作する）。
             */}
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* エラーメッセージ（エラーがある時だけ表示） */}
        {error && (
          <p className="mb-3 text-xs text-red-600" role="alert">
            {/* role="alert": スクリーンリーダーにこのメッセージが重要と伝える */}
            {error}
          </p>
        )}

        {/* ボタン群 */}
        <div className="flex justify-end gap-2">
          {/*
           * type="button" を明示しないと、フォーム内のボタンは
           * デフォルトで type="submit" になり、クリック時にフォームが送信される。
           */}
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            {mode === 'create' ? '追加' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}
