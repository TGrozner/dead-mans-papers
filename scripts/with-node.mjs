import { execFileSync, spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const expectedVersion = readExpectedVersion()
const nodePath = findNode(expectedVersion)

if (!nodePath) {
  console.error(
    [
      `Node ${formatVersion(expectedVersion)} from .nvmrc is not installed or not discoverable.`,
      'Install it with `nvm install` or `fnm install` in this repo, then retry.',
    ].join(' '),
  )
  process.exit(1)
}

const command = process.argv[2]
const commandArgs = process.argv.slice(3)

if (!command) {
  console.error('Usage: node scripts/with-node.mjs <command> [...args]')
  process.exit(2)
}

const nodeBinDir = path.dirname(nodePath)
const env = {
  ...process.env,
  PATH: prependPath(nodeBinDir, process.env.PATH ?? ''),
}

if (env.FORCE_COLOR && env.NO_COLOR !== undefined) {
  delete env.NO_COLOR
}

const child = spawn(command, commandArgs, {
  cwd: rootDir,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})

child.on('error', (error) => {
  console.error(`Failed to run ${command}: ${error.message}`)
  process.exit(1)
})

function readExpectedVersion() {
  const nvmrcPath = path.join(rootDir, '.nvmrc')
  const rawVersion = readFileSync(nvmrcPath, 'utf8').trim()
  const version = rawVersion.replace(/^v/, '')

  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.error(`Unsupported .nvmrc version: ${rawVersion}`)
    process.exit(1)
  }

  return version
}

function findNode(version) {
  const candidates = [
    currentNodeMatches(version) ? process.execPath : '',
    process.env.NVM_DIR ? path.join(process.env.NVM_DIR, 'versions', 'node', formatVersion(version), 'bin', 'node') : '',
    process.env.HOME ? path.join(process.env.HOME, '.nvm', 'versions', 'node', formatVersion(version), 'bin', 'node') : '',
    process.env.FNM_DIR ? path.join(process.env.FNM_DIR, 'node-versions', formatVersion(version), 'installation', 'bin', 'node') : '',
    process.env.HOME
      ? path.join(process.env.HOME, '.local', 'share', 'fnm', 'node-versions', formatVersion(version), 'installation', 'bin', 'node')
      : '',
    ...pathNodeCandidates(process.env.PATH ?? ''),
  ]

  const seen = new Set()

  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) {
      continue
    }

    seen.add(candidate)

    if (candidateMatches(candidate, version)) {
      return candidate
    }
  }

  return undefined
}

function currentNodeMatches(version) {
  return process.versions.node === version
}

function pathNodeCandidates(pathValue) {
  return pathValue
    .split(path.delimiter)
    .filter(Boolean)
    .map((binDir) => path.join(binDir, process.platform === 'win32' ? 'node.exe' : 'node'))
}

function candidateMatches(candidate, version) {
  if (!existsSync(candidate)) {
    return false
  }

  try {
    return execFileSync(candidate, ['--version'], { encoding: 'utf8' }).trim().replace(/^v/, '') === version
  } catch {
    return false
  }
}

function formatVersion(version) {
  return `v${version}`
}

function prependPath(binDir, pathValue) {
  return [binDir, ...pathValue.split(path.delimiter).filter((entry) => entry && entry !== binDir)].join(path.delimiter)
}
