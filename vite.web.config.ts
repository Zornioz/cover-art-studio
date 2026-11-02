import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Browser build for static hosting (GitHub Pages). Relative base so it works under /<repo>/.
export default defineConfig({
  root: resolve('src/renderer'),
  base: './',
  publicDir: false,
  build: {
    outDir: resolve('dist-web'),
    emptyOutDir: true,
    target: 'es2022'
  },
  worker: { format: 'es' },
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@shared': resolve('shared')
    }
  },
  plugins: [react()]
})
