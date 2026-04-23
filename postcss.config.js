/**
 * PostCSS 設定。
 * - tailwindcss: Tailwind のクラス名を解析して実 CSS を生成する
 * - autoprefixer: ベンダープレフィックスを自動付与する
 *
 * Vite は postcss.config.js を自動で読み込むため、明示的な import は不要。
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
