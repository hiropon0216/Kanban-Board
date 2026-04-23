/**
 * Tailwind CSS 設定ファイル。
 *
 * content: Tailwind がクラス名を検出するために走査するファイルの glob。
 *          ここに含まれないファイル内の Tailwind クラスは最終 CSS に出力されない。
 *          (JIT コンパイラが未使用クラスを削除するためのホワイトリスト)
 *
 * theme.extend: 既存テーマを「拡張」する領域。上書きしたい場合は extend の外に書く。
 *               今回は優先度カラーなど特別なデザイントークンは `index.css` の CSS 変数で
 *               表現してもよいが、学習目的で Tailwind に直接書いて見通しを優先する。
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
