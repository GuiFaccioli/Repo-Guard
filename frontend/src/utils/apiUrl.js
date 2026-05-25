const PLACEHOLDER_MARKERS = [
  'x1x2x3x4',
  'placeholder',
  'your-backend',
  'your-api',
  'your-domain',
  'change-me',
  'changeme',
  'example.com',
]

function isPlaceholderValue(value) {
  const normalized = value.toLowerCase()
  return PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker))
}

export function normalizeApiBaseUrl(rawValue) {
  if (typeof rawValue !== 'string') {
    return null
  }

  const trimmed = rawValue.trim()
  if (!trimmed || isPlaceholderValue(trimmed)) {
    return null
  }

  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null
  }

  parsed.search = ''
  parsed.hash = ''
  parsed.pathname = parsed.pathname.replace(/\/+$/, '')

  return parsed.toString().replace(/\/$/, '')
}

export function buildBackendUrl(rawValue, endpointPath) {
  const baseUrl = normalizeApiBaseUrl(rawValue)
  if (!baseUrl) {
    return null
  }

  const normalizedPath = endpointPath.startsWith('/')
    ? endpointPath
    : `/${endpointPath}`

  return `${baseUrl}${normalizedPath}`
}
