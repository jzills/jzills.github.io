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
      output: {
        // The code both pages share would otherwise be named after whichever of its
        // modules the bundler picks (it was PartyLayer), along with its stylesheet.
        chunkFileNames: (chunk) =>
          !chunk.isEntry && !chunk.isDynamicEntry && chunk.moduleIds.some((id) => id.includes('/src/components/layout/'))
            ? 'assets/shared-[hash].js'
            : 'assets/[name]-[hash].js',
        // The site has one stylesheet (Tailwind and index.css), shared by both pages.
        assetFileNames: (asset) =>
          asset.names.some((name) => name.endsWith('.css')) ? 'assets/styles-[hash][extname]' : 'assets/[name]-[hash][extname]',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
