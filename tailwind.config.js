/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#0b0b0f',
          panel: '#15151c',
          border: '#262630',
          accent: '#ff3b3b'
        }
      }
    }
  },
  plugins: []
}
