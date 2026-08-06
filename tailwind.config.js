/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#faf9f6',
        ink: '#2c2a26',
        accent: {
          DEFAULT: '#5b8a72',
          light: '#eaf1ec',
          dark: '#4d7a63',
          deep: '#3d614f',
        },
      },
      fontFamily: {
        sans: [
          '"Noto Sans JP"',
          '"Hiragino Sans"',
          '"Hiragino Kaku Gothic ProN"',
          '"Yu Gothic"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'system-ui',
          'sans-serif',
        ],
        serif: [
          '"Noto Serif JP"',
          '"Hiragino Mincho ProN"',
          '"Yu Mincho"',
          'serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(44, 42, 38, 0.04), 0 4px 16px rgba(44, 42, 38, 0.05)',
        lift: '0 2px 4px rgba(44, 42, 38, 0.05), 0 12px 32px rgba(44, 42, 38, 0.09)',
      },
    },
  },
  plugins: [],
}
