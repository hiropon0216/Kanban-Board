import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 設定ファイル。
// - React プラグインを有効化して JSX/TSX を変換
// - 開発サーバの既定ポートは 5173
// 参考: https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
});
