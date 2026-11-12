import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: '/',
  // The footer's copyright year as of the build, so the prerendered HTML and the
  // client agree on first render.
  define: {
    __BUILD_YEAR__: JSON.stringify(new Date().getFullYear()),
  },
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
