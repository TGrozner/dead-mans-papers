import { defineConfig } from 'vite'

const githubBuildVersion = [
  process.env.GITHUB_SHA,
  process.env.GITHUB_RUN_ID,
  process.env.GITHUB_RUN_ATTEMPT,
]
  .filter(Boolean)
  .join('-')
const staticAssetVersion = process.env.VITE_ASSET_VERSION || githubBuildVersion || `local-${Date.now()}`

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/dead-mans-papers/' : '/',
  define: {
    __STATIC_ASSET_VERSION__: JSON.stringify(staticAssetVersion),
  },
  build: {
    chunkSizeWarningLimit: 1300,
  },
})
