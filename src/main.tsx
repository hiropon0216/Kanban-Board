/**
 * ============================================================
 * main.tsx — アプリケーションのエントリポイント（起動口）
 * ============================================================
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【エントリポイントとは？】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ブラウザがアプリを読み込む時、最初に実行されるファイルです。
 *
 * index.html の <script type="module" src="/src/main.tsx"> が参照しています。
 * Vite は main.tsx を起点に import を辿り、必要なファイルをバンドルします。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【React のマウント処理】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * React 18 では createRoot API を使います（React 17 以前の ReactDOM.render は廃止）。
 *
 *   const root = createRoot(domElement);
 *   root.render(<App />);
 *
 * createRoot(domElement):
 *   指定した DOM 要素を「React の管理下」に置く。
 *   この要素の中身は React が完全に制御する。
 *
 * root.render(<App />):
 *   React ツリーを描画する。
 *   以降は状態変化のたびに React が差分描画（Virtual DOM）を行う。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【Virtual DOM（仮想 DOM）とは？】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * DOM（Document Object Model）は「ブラウザが HTML を解析した結果のツリー構造」です。
 * DOM の操作は実際の画面描画を伴うため、コストが高い処理です。
 *
 * Virtual DOM は「React がメモリ上に持つ DOM のコピー」です。
 *
 *   処理の流れ:
 *   1. 状態変化 → React が新しい Virtual DOM ツリーを作る
 *   2. 前回の Virtual DOM と diff（差分）を計算する
 *   3. 差分がある部分だけ実際の DOM を更新する（最小限の操作）
 *
 *   メリット: DOM 操作を最小化 → パフォーマンス向上
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【StrictMode とは？】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * React.StrictMode は「開発時のみ有効」な追加チェックモードです。
 *
 * 主な効果:
 *   1. コンポーネントを「意図的に 2 回レンダする」
 *      → 副作用が 1 回目と 2 回目で異なる結果を返す「非冪等な副作用」を検出
 *      → useEffect のクリーンアップが正しく実装されているか確認
 *
 *   2. 廃止予定 API の使用を警告する
 *      → 将来の React バージョンへの移行準備
 *
 *   3. ref の安全性チェック
 *
 * 「2 回レンダ」について:
 *   本番ビルド（npm run build）では StrictMode の 2 回レンダは起きない。
 *   開発時だけの動作なので、パフォーマンスへの影響は本番環境にはない。
 *
 *   もし useEffect が 2 回実行されておかしな動作をする場合は、
 *   クリーンアップ関数（return () => { ... }）が正しく書かれていない可能性がある。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【import './index.css' とは？】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Vite では CSS ファイルを JavaScript で直接 import できます。
 *
 * `import './index.css'` すると:
 *   - Vite がビルド時に CSS をバンドルに取り込む
 *   - 開発時は <style> タグとして動的に挿入される
 *   - 本番ビルドでは別の .css ファイルとして出力され、
 *     index.html に <link> タグが自動で挿入される
 *
 * Tailwind の @tailwind base/components/utilities は
 * この import を通じてアプリ全体に適用されます。
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css'; // Tailwind CSS（グローバルスタイル）の読み込み

// document.getElementById('root'): index.html の <div id="root"> を取得
// もし存在しなければ throw でアプリの起動を止める（沈黙のバグを防ぐ）
const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root 要素が見つかりません（index.html を確認してください）');

/**
 * React ツリーのマウント。
 *
 * createRoot(rootEl): rootEl を React の管理下に置く
 * .render(<StrictMode><App /></StrictMode>):
 *   StrictMode で App 全体をラップして描画開始
 *
 * <StrictMode> は「ラッパー」なので、実際の DOM 要素は出力しない。
 * 開発チェックの仕組みを子コンポーネント全体に適用するための宣言。
 */
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
