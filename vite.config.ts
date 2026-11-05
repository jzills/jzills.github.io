import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: '/',
  build: {
    rollupOptions: {
      // Each page is its own HTML entry; GitHub Pages serves dist/lab/index.html at /lab/.
      input: {
        main: path.resolve(import.meta.dirname, 'index.html'),
        lab: path.resolve(import.meta.dirname, 'lab/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
