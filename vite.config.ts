import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: '/',
  build: {
    rollupOptions: {
      // Each page is its own HTML entry; GitHub Pages serves dist/lab/index.html at /lab/.
      input: {
        main: path.resolve(__dirname, 'index.html'),
        lab: path.resolve(__dirname, 'lab/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
