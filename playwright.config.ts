import { defineConfig, devices } from '@playwright/test'

const minimumNodeMajor = 23
const minimumNodeMinor = 8
const maximumNodeMajor = 24
const rootPort = 4173
const pagesPort = 4174
const rootBaseURL = `http://127.0.0.1:${rootPort}`
const pagesBaseURL = `http://127.0.0.1:${pagesPort}/dead-mans-papers/`
const focusedProjectTests = /@(pages|responsive)/
const { major: nodeMajor, minor: nodeMinor } = parseNodeVersion(process.versions.node)

if (
  nodeMajor < minimumNodeMajor ||
  (nodeMajor === minimumNodeMajor && nodeMinor < minimumNodeMinor) ||
  nodeMajor >= maximumNodeMajor
) {
  throw new Error(
    `Node ${process.versions.node} is not supported. Run "nvm use" or "fnm use"; this project targets Node >=23.8.0 <24.`,
  )
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: rootBaseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop-chromium',
      grepInvert: focusedProjectTests,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: 'minimum-width-chromium',
      grep: /@responsive/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 900, height: 700 },
      },
    },
    {
      name: 'pages-chromium',
      grep: /@pages/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: pagesBaseURL,
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
  webServer: [
    {
      command: `npm run build -- --outDir dist-e2e && npm run preview -- --host 127.0.0.1 --port ${rootPort} --strictPort --outDir dist-e2e`,
      url: rootBaseURL,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `GITHUB_PAGES=true npm run build -- --outDir dist-pages && npm run preview:pages -- --host 127.0.0.1 --port ${pagesPort} --strictPort --outDir dist-pages`,
      url: pagesBaseURL,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})

function parseNodeVersion(version: string): { major: number; minor: number } {
  const [major = 0, minor = 0] = version.split('.').map((part) => Number.parseInt(part, 10))
  return { major, minor }
}
