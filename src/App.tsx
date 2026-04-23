/**
 * ============================================================
 * App.tsx — アプリケーションのルートコンポーネント
 * ============================================================
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【App.tsx の役割】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * App.tsx は「アプリ全体の入口となるコンポーネント」です。
 *
 * main.tsx が App をレンダリングし、
 * App が Board を呼び出し、Board が Column / Card ... と続きます。
 *
 *   main.tsx
 *     └─ <App>
 *           └─ <Board>
 *                 ├─ <Statistics>
 *                 ├─ <Column> (×3)
 *                 │     └─ <Card> (×N)
 *                 └─ <CardForm> (モーダル)
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【なぜ App.tsx をシンプルに保つのか？】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * App.tsx は「ページ全体のレイアウト構造」だけを持ち、
 * ビジネスロジックは features 配下に押し込みます。
 *
 *   将来ルーティングを追加する場合:
 *     import { BrowserRouter, Routes, Route } from 'react-router-dom';
 *     function App() {
 *       return (
 *         <BrowserRouter>
 *           <Routes>
 *             <Route path="/" element={<Board />} />
 *             <Route path="/settings" element={<Settings />} />
 *           </Routes>
 *         </BrowserRouter>
 *       );
 *     }
 *   App.tsx だけを書き換えれば済む。Board.tsx は一切変えなくてよい。
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 【h-full の高さチェーン】
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * CSS の h-full（height: 100%）は親要素の「確定した高さ」を基準にします。
 *
 *   index.css:  html, body, #root { height: 100%; }
 *               → ビューポートの高さを継承
 *
 *   App.tsx:    <main className="h-full">
 *               → #root（= 100vh）の高さを継承
 *
 *   Board.tsx:  <div className="h-full flex flex-col">
 *               → main（= 100vh）の高さを継承
 *               → flex-col + flex-1 で残り高さをカラム領域に渡す
 *
 *   ❌ min-h-full にするとこの継承チェーンが切れる。
 *      min-height は「最低でもこの高さ」を意味し、
 *      子の h-full が計算する基準となる「確定した高さ」にならない。
 */

import { Board } from './features/board/components/Board';

/**
 * App コンポーネント。
 *
 * `export default`:
 *   このファイルの「デフォルトエクスポート」。
 *   main.tsx で `import App from './App'` のようにインポートする。
 *
 *   export default  → import App from './App'    （名前は自由に付けられる）
 *   export function → import { Board } from './Board' （名前が固定）
 *
 * <main> タグ:
 *   ページの主要コンテンツを表すセマンティックタグ。
 *   スクリーンリーダーが「ここがメインコンテンツ」と認識する。
 *   1 ページにつき 1 つだけ使うのが原則。
 */
export default function App() {
  return (
    <main className="h-full bg-gray-50">
      <Board />
    </main>
  );
}
