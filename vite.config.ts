import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: { content: 'src/content-script.ts' },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'content') return 'content.js'
          return '[name].js'
        },
        assetFileNames: '[name][extname]'
      }
    }
  }
})
