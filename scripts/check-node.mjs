const minimumMajor = 22
const minimumMinor = 12
const { major, minor } = parseVersion(process.versions.node)

if (major < minimumMajor || (major === minimumMajor && minor < minimumMinor)) {
  console.error(
    `Node ${process.versions.node} is not supported. Run "nvm use" in this repo; Vite 8 needs Node >=22.12.0 here.`,
  )
  process.exit(1)
}

function parseVersion(version) {
  const [major = 0, minor = 0] = version.split('.').map((part) => Number.parseInt(part, 10))
  return { major, minor }
}
