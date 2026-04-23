/**
 * ============================================================
 * localStorage.ts — ブラウザ永続化ユーティリティ
 * ============================================================
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【ブラウザのストレージ種類】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ブラウザにはデータを保存する場所が複数あります:
 *
 *   ┌──────────────┬──────────┬────────────┬──────────────────────────────┐
 *   │ 種類         │ 容量     │ 有効期限   │ 用途                         │
 *   ├──────────────┼──────────┼────────────┼──────────────────────────────┤
 *   │ localStorage │ ~5MB     │ 永続       │ ユーザー設定・アプリ状態      │
 *   │ sessionStorage│ ~5MB    │ タブを閉じると消える │ 一時的なフォーム入力など │
 *   │ Cookie       │ ~4KB     │ 設定可能   │ 認証トークン（HTTP にも送られる）│
 *   │ IndexedDB    │ ~数百MB  │ 永続       │ 大量データ・バイナリ         │
 *   └──────────────┴──────────┴────────────┴──────────────────────────────┘
 *
 * 今回は「ページを閉じても消えない」「JSON が扱いやすい」localStorage を採用。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【localStorage の API】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *   // 保存（値は必ず文字列）
 *   localStorage.setItem('key', 'value')
 *
 *   // 読み込み（存在しなければ null）
 *   localStorage.getItem('key')  // → 'value' | null
 *
 *   // 削除
 *   localStorage.removeItem('key')
 *
 *   // 全消去
 *   localStorage.clear()
 *
 * ⚠️ 値は「文字列のみ」。オブジェクトを保存するには JSON.stringify() が必要。
 *   JSON.stringify({ a: 1 })  → '{"a":1}'  （オブジェクト → 文字列）
 *   JSON.parse('{"a":1}')    → { a: 1 }   （文字列 → オブジェクト）
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【try/catch が必須な理由】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * localStorage へのアクセスは以下のケースで例外を投げます:
 *
 *   1. QuotaExceededError: 容量（5MB）を超えた書き込み
 *   2. Safari プライベートモード: localStorage が使えない
 *   3. セキュリティ設定でブロック: 一部の企業環境
 *
 * 例外をキャッチしないと、アプリ全体がクラッシュします。
 * 保存に失敗しても「アプリが動き続ける」ことが重要なので
 * try/catch で握りつぶし、警告ログだけ残します。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【スキーマバージョン管理】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * アプリを改修すると保存データの形（スキーマ）が変わることがあります。
 *
 *   v1: { columns, cards }
 *   v2: { columns, cards, tags }  ← tags フィールドを追加した場合
 *
 * バージョンなしで保存すると、古いデータを読んだときにクラッシュします。
 * そこでバージョン番号を必ず付けて保存し、読み込み時に判別します。
 * 実際のプロダクトでは「古いバージョンのデータを新しい形式に変換する」
 * マイグレーション処理が必要になります。
 */

import type { Board } from '../types/board';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 定数
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * localStorage のキー名。
 *
 * 'kanban-board::v1' のようにアプリ固有のプレフィックスを付けます。
 * 理由: localStorage はオリジン（ドメイン）単位で共有されます。
 *       複数のアプリや複数のバージョンが同じキーを使うと衝突します。
 *
 *   ❌ 'board'           ← 他のアプリと衝突する可能性
 *   ✅ 'kanban-board::v1' ← アプリ名 + バージョンで一意性を確保
 */
const STORAGE_KEY = 'kanban-board::v1';

/**
 * 保存データに付加するメタデータ型。
 *
 * board データそのものだけでなく、version を一緒に保存します。
 * これにより将来のスキーマ変更に対応できます。
 *
 * `version: 1` の型は number ではなく「リテラル型 1」。
 * これにより「version が 1 のデータ」であることを型レベルで保証できます。
 */
type PersistedBoard = {
  version: 1;
  board: Board;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 関数
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * ボード状態を localStorage に保存する。
 *
 * 処理の流れ:
 *   Board オブジェクト
 *     → PersistedBoard にラップ（version を付加）
 *     → JSON.stringify() で文字列化
 *     → localStorage.setItem() で保存
 *
 * @param board - 保存する Board オブジェクト
 *
 * 失敗しても例外を投げない（アプリの動作を止めないため）。
 * ただし console.warn でログを残す（デバッグ時に気づけるように）。
 */
export function saveBoardToStorage(board: Board): void {
  try {
    const payload: PersistedBoard = { version: 1, board };
    // JSON.stringify: JavaScript オブジェクト → JSON 文字列
    // Date オブジェクトがあれば ISO 8601 文字列に変換される。
    // undefined の値は JSON に含まれない点に注意。
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    // QuotaExceededError やプライベートモードでの失敗を想定。
    // console.warn は console.error より軽度な警告。DevTools に黄色で表示される。
    console.warn('[kanban] localStorage への保存に失敗しました:', err);
  }
}

/**
 * localStorage からボード状態を読み出す。
 *
 * 処理の流れ:
 *   localStorage.getItem() → JSON 文字列 | null
 *     → JSON.parse() でオブジェクトに変換
 *     → version チェック（最低限のバリデーション）
 *     → Board オブジェクトを返す
 *
 * @returns 復元された Board オブジェクト、または null（データなし・壊れている場合）
 *
 * 呼び出し側は null を受け取ったら「初期値を使う」と判断します。
 * これにより「初回アクセス」と「データが壊れた」を同じように扱えます。
 *
 * 型アサーション（as PersistedBoard）について:
 *   JSON.parse() の戻り値は any 型（TypeScript は中身を知らない）。
 *   `as PersistedBoard` で「この値は PersistedBoard 型である」と宣言します。
 *   ⚠️ これはコンパイル時チェックのみ。実際に型通りかは保証されません。
 *   本番では zod などのバリデーションライブラリで実行時検証を加えるべきです。
 */
export function loadBoardFromStorage(): Board | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null; // データが存在しない（初回アクセス）

    // JSON.parse: JSON 文字列 → JavaScript オブジェクト
    // 不正な JSON 文字列の場合 SyntaxError を投げる → catch で null を返す
    const parsed = JSON.parse(raw) as PersistedBoard;

    // 最低限のサニティチェック（正気確認）
    // version が一致しない = 古いスキーマのデータ → 使わない
    if (!parsed || parsed.version !== 1 || !parsed.board) return null;

    return parsed.board;
  } catch (err) {
    // JSON.parse が失敗した（データが壊れている）場合も null を返す。
    console.warn('[kanban] localStorage からの読み込みに失敗しました:', err);
    return null;
  }
}
