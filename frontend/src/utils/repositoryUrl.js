const SUPPORTED_HOSTNAMES = new Set(['github.com', 'gitlab.com', 'bitbucket.org'])

const RESERVED_SEGMENTS = new Set([
  '-',
  'tree',
  'blob',
  'src',
  'raw',
  'issues',
  'merge_requests',
  'merge-requests',
  'pullrequests',
  'pull-requests',
])

function stripGitSuffix(value) {
  return value.replace(/\.git$/i, '')
}

function extractRepositorySegments(pathname) {
  const segments = []

  for (const segment of pathname.split('/').filter(Boolean)) {
    const decodedSegment = decodeURIComponent(segment)
    if (RESERVED_SEGMENTS.has(decodedSegment.toLowerCase())) {
      break
    }

    segments.push(decodedSegment)
  }

  return segments
}

function parseSshRepositoryUrl(rawValue) {
  const sshMatch = rawValue.match(/^git@([^:]+):(.+?)(?:\.git)?(?:\/.*)?$/)
  if (!sshMatch) {
    return null
  }

  const [, host, path] = sshMatch

  try {
    return new URL(`https://${host}/${path}`)
  } catch {
    return null
  }
}

export function normalizeRepositoryUrl(rawValue) {
  if (typeof rawValue !== 'string') {
    return null
  }

  const trimmedValue = rawValue.trim()
  if (!trimmedValue) {
    return null
  }

  let parsedUrl
  try {
    parsedUrl = new URL(trimmedValue)
  } catch {
    parsedUrl = parseSshRepositoryUrl(trimmedValue)
  }

  if (!parsedUrl) {
    return null
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return null
  }

  const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, '')
  if (!SUPPORTED_HOSTNAMES.has(host)) {
    return null
  }

  const repositorySegments = extractRepositorySegments(parsedUrl.pathname)

  if (host === 'gitlab.com') {
    if (repositorySegments.length < 2) {
      return null
    }

    const name = stripGitSuffix(repositorySegments[repositorySegments.length - 1])
    const owner = repositorySegments.slice(0, -1).join('/')

    if (!owner || !name) {
      return null
    }

    return {
      provider: 'gitlab',
      owner,
      name,
      url: `https://gitlab.com/${owner}/${name}`,
    }
  }

  if (repositorySegments.length < 2) {
    return null
  }

  const owner = repositorySegments[0]
  const name = stripGitSuffix(repositorySegments[1])

  if (!owner || !name) {
    return null
  }

  return {
    provider: host === 'github.com' ? 'github' : 'bitbucket',
    owner,
    name,
    url: `${host === 'github.com' ? 'https://github.com' : 'https://bitbucket.org'}/${owner}/${name}`,
  }
}

