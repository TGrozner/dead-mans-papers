const minimumMajor = 23
const minimumMinor = 8
const maximumMajor = 24
const { major, minor } = parseVersion(process.versions.node)

if (major < minimumMajor || (major === minimumMajor && minor < minimumMinor) || major >= maximumMajor) {
  console.error(
    `Node ${process.versions.node} is not supported. Run project commands through npm scripts or run "nvm use" / "fnm use"; this project targets Node >=23.8.0 <24.`,
  )
  process.exit(1)
}

function parseVersion(version) {
  const [major = 0, minor = 0] = version.split('.').map((part) => Number.parseInt(part, 10))
  return { major, minor }
}
