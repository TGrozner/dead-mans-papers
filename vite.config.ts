import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/dead-mans-papers/' : '/',
  build: {
    chunkSizeWarningLimit: 1300,
  },
})
