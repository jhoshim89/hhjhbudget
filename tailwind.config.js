/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Noto Sans KR', 'sans-serif'],
      },
      colors: {
        background: '#0F1115',
        panel: '#161920',
        border: '#2B303B',
      }
    },
  },
  plugins: [],
}