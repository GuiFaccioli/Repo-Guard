const GA_SCRIPT_ID = 'repoguard-ga4-script'
const GA_SCRIPT_BASE_URL = 'https://www.googletagmanager.com/gtag/js'

const SUPPORTED_EVENT_NAMES = new Set([
  'page_view',
  'scan_started',
  'scan_completed',
  'scan_failed',
  'whats_wrong_opened',
  'learn_more_opened',
  'learn_why_this_matters_opened',
])

const ALLOWED_PARAM_KEYS = new Set([
  'page_path',
  'page_title',
  'repository_owner',
  'repository_name',
  'repository_visibility',
  'scan_status',
  'scan_type',
  'failed_check_count',
  'code_safety_failed_count',
  'repository_health_failed_count',
  'check_id',
  'check_category',
  'link_type',
  'guide_type',
  'error_reason',
])

const SAFE_ERROR_REASONS = new Set([
  'invalid_repository_id',
  'missing_api_configuration',
  'unauthenticated',
  'request_failed',
  'network_error',
  'unknown',
])

const rawMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID
const measurementId =
  typeof rawMeasurementId === 'string' ? rawMeasurementId.trim() : ''

let analyticsInitialized = false
let lastPageViewKey = ''

function isBrowserRuntime() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function isAnalyticsEnabled() {
  return Boolean(measurementId)
}

function ensureGlobalGtagShim() {
  window.dataLayer = window.dataLayer || []

  if (typeof window.gtag !== 'function') {
    window.gtag = function gtagShim() {
      window.dataLayer.push(arguments)
    }
  }
}

function ensureAnalyticsScript() {
  if (!isBrowserRuntime()) {
    return
  }

  const existingScript = document.getElementById(GA_SCRIPT_ID)
  if (existingScript) {
    return
  }

  const script = document.createElement('script')
  script.id = GA_SCRIPT_ID
  script.async = true
  script.src = `${GA_SCRIPT_BASE_URL}?id=${encodeURIComponent(measurementId)}`
  document.head.appendChild(script)
}

function sanitizePath(path) {
  if (typeof path !== 'string') {
    return '/'
  }

  const trimmedPath = path.trim()
  if (!trimmedPath) {
    return '/'
  }

  return trimmedPath.slice(0, 300)
}

function sanitizeText(value, maxLength = 160) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return null
  }

  return trimmedValue.slice(0, maxLength)
}

function sanitizeNonNegativeInteger(value) {
  if (!Number.isFinite(value)) {
    return null
  }

  const normalizedValue = Math.floor(Number(value))
  return normalizedValue >= 0 ? normalizedValue : null
}

function sanitizeErrorReason(value) {
  const normalizedValue = sanitizeText(value, 64)
  if (!normalizedValue) {
    return 'unknown'
  }

  return SAFE_ERROR_REASONS.has(normalizedValue) ? normalizedValue : 'unknown'
}

function sanitizeEventParams(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return {}
  }

  const sanitizedEntries = Object.entries(params)
    .filter(([key]) => ALLOWED_PARAM_KEYS.has(key))
    .map(([key, value]) => {
      if (value === null || value === undefined) {
        return null
      }

      if (key === 'error_reason') {
        return [key, sanitizeErrorReason(value)]
      }

      if (
        key === 'failed_check_count' ||
        key === 'code_safety_failed_count' ||
        key === 'repository_health_failed_count'
      ) {
        const numericValue = sanitizeNonNegativeInteger(value)
        return numericValue === null ? null : [key, numericValue]
      }

      const textValue = sanitizeText(value)
      return textValue ? [key, textValue] : null
    })
    .filter(Boolean)

  return Object.fromEntries(sanitizedEntries)
}

function emitEvent(eventName, params = {}) {
  if (!SUPPORTED_EVENT_NAMES.has(eventName)) {
    return
  }

  if (!isBrowserRuntime() || !isAnalyticsEnabled()) {
    return
  }

  if (!analyticsInitialized) {
    initAnalytics()
  }

  if (typeof window.gtag !== 'function') {
    return
  }

  const safeParams = sanitizeEventParams(params)

  try {
    window.gtag('event', eventName, safeParams)
  } catch {
    // Never break user flow because of analytics failures.
  }
}

export function initAnalytics() {
  if (!isBrowserRuntime() || !isAnalyticsEnabled() || analyticsInitialized) {
    return
  }

  try {
    ensureGlobalGtagShim()
    ensureAnalyticsScript()
    window.gtag('js', new Date())
    window.gtag('config', measurementId, { send_page_view: false })
    analyticsInitialized = true
  } catch {
    // Keep analytics disabled when initialization fails.
  }
}

export function trackEvent(eventName, params = {}) {
  emitEvent(eventName, params)
}

export function trackPageView(path, title) {
  const pagePath = sanitizePath(path)
  const pageTitle = sanitizeText(title) || 'RepoGuard'
  const pageViewKey = `${pagePath}|${pageTitle}`

  if (pageViewKey === lastPageViewKey) {
    return
  }

  lastPageViewKey = pageViewKey
  emitEvent('page_view', {
    page_path: pagePath,
    page_title: pageTitle,
  })
}

export function trackScanStarted(params = {}) {
  emitEvent('scan_started', {
    scan_status: 'started',
    scan_type: 'green',
    ...params,
  })
}

export function trackScanCompleted(params = {}) {
  emitEvent('scan_completed', {
    scan_status: 'completed',
    scan_type: 'green',
    ...params,
  })
}

export function trackScanFailed(params = {}) {
  emitEvent('scan_failed', {
    scan_status: 'failed',
    scan_type: 'green',
    error_reason: 'unknown',
    ...params,
  })
}

export function trackWhatsWrongOpened(params = {}) {
  emitEvent('whats_wrong_opened', {
    link_type: 'whats_wrong',
    ...params,
  })
}

export function trackLearnMoreOpened(params = {}) {
  emitEvent('learn_more_opened', {
    link_type: 'learn_more',
    ...params,
  })
}

export function trackLearnWhyThisMattersOpened(params = {}) {
  emitEvent('learn_why_this_matters_opened', {
    link_type: 'learn_why_this_matters',
    ...params,
  })
}

