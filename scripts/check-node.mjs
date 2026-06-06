const minimumMajor = 23
const minimumMinor = 8
const { major, minor } = parseVersion(process.versions.node)

if (major < minimumMajor || (major === minimumMajor && minor < minimumMinor)) {
  console.error(
    `Node ${process.versions.node} is not supported. Run "nvm use" or "fnm use" in this repo; this project targets Node >=23.8.0 <24.`,
  )
  process.exit(1)
}

function parseVersion(version) {
  const [major = 0, minor = 0] = version.split('.').map((part) => Number.parseInt(part, 10))
  return { major, minor }
}
