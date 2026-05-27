import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import {
  CODE_SAFETY_CHECK_IDS,
  resolveRepositoryCheckId,
} from '../data/repositoryCheckGuides'
import {
  trackLearnMoreOpened,
  trackLearnWhyThisMattersOpened,
  trackScanCompleted,
  trackScanFailed,
  trackScanStarted,
  trackWhatsWrongOpened,
} from '../lib/analytics'
import { buildBackendUrl, normalizeApiBaseUrl } from '../utils/apiUrl'

const SCAN_CACHE_KEY = 'repoguard.scanResults.v1'
const REPOSITORY_CACHE_KEY = 'repoguard.repositories.v1'
const GENERAL_SCAN_TYPE = 'general'
const UNAUTHORIZED_SCAN_ERROR = 'unauthenticated_scan_request'
const STATUS_LABELS = {
  green: '\u2713 Green',
  yellow: '\u25B3 Yellow',
  red: '\u2715 Red',
}
const activeScanRequests = new Map()

const initialAuthState = {
  status: 'loading',
  user: null,
  error: '',
}

const initialRepositoryState = {
  status: 'idle',
  repository: null,
  error: '',
}

const initialScanState = {
  status: 'idle',
  result: null,
  completedAt: null,
  error: '',
}

function readJsonStorage(key, fallbackValue) {
  try {
    const rawValue = window.sessionStorage.getItem(key)
    if (!rawValue) {
      return fallbackValue
    }
    return JSON.parse(rawValue)
  } catch {
    return fallbackValue
  }
}

function writeJsonStorage(key, value) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage failures to avoid UI crashes.
  }
}

function normalizeScanSnapshots(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const normalizedEntries = Object.entries(value).map(([key, item]) => {
    if (!item || typeof item !== 'object') {
      return [key, null]
    }

    const result = item.result
    if (!result || typeof result !== 'object') {
      return [key, null]
    }

    return [
      key,
      {
        result,
        completedAt:
          typeof item.completedAt === 'string' ? item.completedAt : null,
      },
    ]
  })

  return Object.fromEntries(normalizedEntries.filter((entry) => entry[1]))
}

function normalizeRepositoryVisibility(repository) {
  if (repository?.private === true || repository?.isPrivate === true) {
    return 'private'
  }

  if (repository?.private === false || repository?.isPrivate === false) {
    return 'public'
  }

  if (typeof repository?.visibility !== 'string') {
    return null
  }

  const normalizedVisibility = repository.visibility.trim().toLowerCase()
  return ['public', 'private', 'internal'].includes(normalizedVisibility)
    ? normalizedVisibility
    : null
}

function parseRepositoryFullName(fullName) {
  if (typeof fullName !== 'string' || !fullName.trim()) {
    return { owner: null, name: null }
  }

  const [owner, name] = fullName.split('/').map((part) => part.trim())
  return {
    owner: owner || null,
    name: name || null,
  }
}

function buildRepositoryAnalyticsParams(repository) {
  const parsedFullName = parseRepositoryFullName(repository?.fullName)
  const repositoryOwner =
    typeof repository?.owner === 'string' && repository.owner.trim()
      ? repository.owner.trim().slice(0, 120)
      : parsedFullName.owner
        ? parsedFullName.owner.slice(0, 120)
        : null
  const repositoryName =
    typeof repository?.name === 'string' && repository.name.trim()
      ? repository.name.trim().slice(0, 120)
      : parsedFullName.name
        ? parsedFullName.name.slice(0, 120)
        : null
  const repositoryVisibility = normalizeRepositoryVisibility(repository)

  return {
    ...(repositoryOwner ? { repository_owner: repositoryOwner } : {}),
    ...(repositoryName ? { repository_name: repositoryName } : {}),
    ...(repositoryVisibility ? { repository_visibility: repositoryVisibility } : {}),
  }
}

function buildFailedCheckCounts(scanResult) {
  const didacticChecks = Array.isArray(scanResult?.didacticChecks)
    ? scanResult.didacticChecks
    : []
  let failedCheckCount = 0
  let codeSafetyFailedCount = 0
  let repositoryHealthFailedCount = 0

  for (const check of didacticChecks) {
    if (check?.status === 'green') {
      continue
    }

    failedCheckCount += 1

    const checkId = resolveRepositoryCheckId({ key: check?.checkId, label: check?.label })
    if (checkId && CODE_SAFETY_CHECK_IDS.has(checkId)) {
      codeSafetyFailedCount += 1
      continue
    }

    repositoryHealthFailedCount += 1
  }

  return {
    failed_check_count: failedCheckCount,
    code_safety_failed_count: codeSafetyFailedCount,
    repository_health_failed_count: repositoryHealthFailedCount,
  }
}

function RepositoryCheckLearnMoreLink({ repositoryId, checkId, state, onClick }) {
  return (
    <Link
      className="report-line-action"
      to={`/repositories/${repositoryId}/checks/${checkId}`}
      target="_blank"
      rel="noopener noreferrer"
      state={state}
      onClick={onClick}
    >
      Learn more {'\u2197'}
    </Link>
  )
}

async function requestGeneralScan(repositoriesUrl, repositoryId) {
  const requestKey = `${repositoriesUrl}|${repositoryId}|${GENERAL_SCAN_TYPE}`
  const activeRequest = activeScanRequests.get(requestKey)
  if (activeRequest) {
    return activeRequest
  }

  const requestPromise = (async () => {
    const response = await fetch(`${repositoriesUrl}/${repositoryId}/scans`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    if (response.status === 401) {
      const unauthorizedError = new Error(UNAUTHORIZED_SCAN_ERROR)
      unauthorizedError.name = UNAUTHORIZED_SCAN_ERROR
      throw unauthorizedError
    }

    if (!response.ok) {
      const payload = await response
        .json()
        .catch(() => ({ message: 'Could not run repository scan.' }))
      throw new Error(payload?.message || 'Could not run repository scan.')
    }

    return response.json()
  })()

  activeScanRequests.set(requestKey, requestPromise)

  try {
    return await requestPromise
  } finally {
    activeScanRequests.delete(requestKey)
  }
}

function RepositoryDetailPage() {
  const { id } = useParams()
  const repositoryId = Number(id)
  const hasValidRepositoryId =
    Number.isFinite(repositoryId) && repositoryId > 0

  const rawApiBaseUrl = import.meta.env.VITE_API_URL
  const apiBaseUrl = useMemo(
    () => normalizeApiBaseUrl(rawApiBaseUrl),
    [rawApiBaseUrl],
  )

  const authMeUrl = useMemo(() => {
    if (!apiBaseUrl) {
      return null
    }
    return buildBackendUrl(apiBaseUrl, '/auth/me')
  }, [apiBaseUrl])

  const repositoriesUrl = useMemo(() => {
    if (!apiBaseUrl) {
      return null
    }
    return buildBackendUrl(apiBaseUrl, '/repositories')
  }, [apiBaseUrl])

  const [authState, setAuthState] = useState(initialAuthState)
  const [repositoryState, setRepositoryState] = useState(initialRepositoryState)
  const [scanState, setScanState] = useState(initialScanState)
  const autoScanRepositoryRef = useRef(null)
  const latestScanRequestRef = useRef(0)

  const loadSession = useCallback(async () => {
    if (!authMeUrl) {
      setAuthState({
        status: 'missing_config',
        user: null,
        error: '',
      })
      setRepositoryState(initialRepositoryState)
      setScanState(initialScanState)
      return
    }

    setAuthState({
      status: 'loading',
      user: null,
      error: '',
    })

    try {
      const response = await fetch(authMeUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`auth_me_http_${response.status}`)
      }

      const payload = await response.json()
      if (payload?.authenticated && payload.user) {
        setAuthState({
          status: 'authenticated',
          user: payload.user,
          error: '',
        })
        return
      }

      setAuthState({
        status: 'unauthenticated',
        user: null,
        error: '',
      })
      setRepositoryState(initialRepositoryState)
      setScanState(initialScanState)
    } catch {
      setAuthState({
        status: 'error',
        user: null,
        error:
          'Could not verify your GitHub session. Check backend availability and try again.',
      })
      setRepositoryState(initialRepositoryState)
      setScanState(initialScanState)
    }
  }, [authMeUrl])

  const resolveRepository = useCallback(async () => {
    if (!hasValidRepositoryId) {
      setRepositoryState({
        status: 'error',
        repository: null,
        error: 'Invalid repository id in route.',
      })
      return
    }

    if (!repositoriesUrl) {
      setRepositoryState({
        status: 'error',
        repository: null,
        error: 'Backend API URL is not configured for this environment.',
      })
      return
    }

    setRepositoryState({
      status: 'loading',
      repository: null,
      error: '',
    })

    try {
      const response = await fetch(repositoriesUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      })

      if (response.status === 401) {
        setAuthState({
          status: 'unauthenticated',
          user: null,
          error: '',
        })
        setRepositoryState(initialRepositoryState)
        return
      }

      if (!response.ok) {
        throw new Error(`repositories_http_${response.status}`)
      }

      const payload = await response.json()
      const repositories = Array.isArray(payload?.repositories)
        ? payload.repositories
        : []
      writeJsonStorage(REPOSITORY_CACHE_KEY, repositories)

      const selectedRepository = repositories.find(
        (repository) => Number(repository.id) === repositoryId,
      )

      if (!selectedRepository) {
        setRepositoryState({
          status: 'not_found',
          repository: null,
          error: '',
        })
        return
      }

      setRepositoryState({
        status: 'success',
        repository: selectedRepository,
        error: '',
      })
    } catch {
      const cachedRepositories = readJsonStorage(REPOSITORY_CACHE_KEY, [])
      const selectedRepository = Array.isArray(cachedRepositories)
        ? cachedRepositories.find((repository) => Number(repository.id) === repositoryId)
        : null

      if (selectedRepository) {
        setRepositoryState({
          status: 'success',
          repository: selectedRepository,
          error: '',
        })
        return
      }

      setRepositoryState({
        status: 'error',
        repository: null,
        error:
          'Could not load repository details. Refresh your session and try again.',
      })
    }
  }, [hasValidRepositoryId, repositoriesUrl, repositoryId])

  const runGeneralScan = useCallback(async () => {
    const repositoryAnalyticsParams = buildRepositoryAnalyticsParams(
      repositoryState.repository,
    )

    if (!hasValidRepositoryId) {
      setScanState({
        status: 'error',
        result: null,
        completedAt: null,
        error: 'invalid_repository_id',
      })
      trackScanFailed({
        ...repositoryAnalyticsParams,
        scan_type: GENERAL_SCAN_TYPE,
        error_reason: 'invalid_repository_id',
      })
      return
    }

    if (!repositoriesUrl) {
      setScanState({
        status: 'error',
        result: null,
        completedAt: null,
        error: 'missing_api_configuration',
      })
      trackScanFailed({
        ...repositoryAnalyticsParams,
        scan_type: GENERAL_SCAN_TYPE,
        error_reason: 'missing_api_configuration',
      })
      return
    }

    const requestId = latestScanRequestRef.current + 1
    latestScanRequestRef.current = requestId

    setScanState({
      status: 'loading',
      result: null,
      completedAt: null,
      error: '',
    })
    trackScanStarted({
      ...repositoryAnalyticsParams,
      scan_type: GENERAL_SCAN_TYPE,
    })

    try {
      const scanResult = await requestGeneralScan(repositoriesUrl, repositoryId)
      if (latestScanRequestRef.current !== requestId) {
        return
      }

      const completedAt = new Date().toISOString()
      setScanState({
        status: 'success',
        result: scanResult,
        completedAt,
        error: '',
      })
      trackScanCompleted({
        ...repositoryAnalyticsParams,
        scan_type: GENERAL_SCAN_TYPE,
        ...buildFailedCheckCounts(scanResult),
      })

      const existingSnapshots = normalizeScanSnapshots(readJsonStorage(SCAN_CACHE_KEY, {}))
      const nextSnapshots = {
        ...existingSnapshots,
        [String(repositoryId)]: {
          result: scanResult,
          completedAt,
        },
      }
      writeJsonStorage(SCAN_CACHE_KEY, nextSnapshots)
    } catch (error) {
      if (latestScanRequestRef.current !== requestId) {
        return
      }

      if (error instanceof Error && error.name === UNAUTHORIZED_SCAN_ERROR) {
        trackScanFailed({
          ...repositoryAnalyticsParams,
          scan_type: GENERAL_SCAN_TYPE,
          error_reason: 'unauthenticated',
        })
        setAuthState({
          status: 'unauthenticated',
          user: null,
          error: '',
        })
        setRepositoryState(initialRepositoryState)
        setScanState(initialScanState)
        return
      }

      setScanState({
        status: 'error',
        result: null,
        completedAt: null,
        error: 'general_scan_failed',
      })
      trackScanFailed({
        ...repositoryAnalyticsParams,
        scan_type: GENERAL_SCAN_TYPE,
        error_reason: error instanceof TypeError ? 'network_error' : 'request_failed',
      })
    }
  }, [
    hasValidRepositoryId,
    repositoriesUrl,
    repositoryId,
    repositoryState.repository,
  ])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadSession()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [loadSession])

  useEffect(() => {
    if (authState.status !== 'authenticated') {
      autoScanRepositoryRef.current = null
      latestScanRequestRef.current += 1
      return
    }

    const timerId = window.setTimeout(() => {
      void resolveRepository()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [authState.status, resolveRepository])

  useEffect(() => {
    autoScanRepositoryRef.current = null
    latestScanRequestRef.current += 1
  }, [repositoryId])

  useEffect(() => {
    if (authState.status !== 'authenticated') {
      return
    }

    if (repositoryState.status !== 'success') {
      return
    }

    const routeRepositoryKey = String(repositoryId)
    if (autoScanRepositoryRef.current === routeRepositoryKey) {
      return
    }

    autoScanRepositoryRef.current = routeRepositoryKey
    void runGeneralScan()
  }, [authState.status, repositoryState.status, repositoryId, runGeneralScan])

  const isLoadingSession = authState.status === 'loading'
  const isMissingConfig = authState.status === 'missing_config'
  const hasSessionError = authState.status === 'error'
  const isUnauthenticated = authState.status === 'unauthenticated'
  const isAuthenticated = authState.status === 'authenticated' && authState.user
  const hasRepository = isAuthenticated && repositoryState.status === 'success'

  useEffect(() => {
    if (repositoryState.repository?.fullName) {
      document.title = `RepoGuard · ${repositoryState.repository.fullName}`
      return
    }
    document.title = 'RepoGuard · Repository report'
  }, [repositoryState.repository])

  const activeResult = scanState.result
  const hasScanResult = scanState.status === 'success' && Boolean(activeResult)
  const didacticChecks = Array.isArray(activeResult?.didacticChecks)
    ? activeResult.didacticChecks
    : []
  const greenChecks = didacticChecks.filter((check) => check.status === 'green')
  const attentionChecks = didacticChecks.filter((check) => check.status !== 'green')

  const learnMoreState = hasRepository
    ? {
        repositoryFullName: repositoryState.repository.fullName,
        connectedLogin: authState.user.login,
      }
    : {}

  const handleCheckLearnMoreClick = useCallback(
    (check) => {
      const resolvedCheckId =
        resolveRepositoryCheckId({ key: check.checkId, label: check.label }) || check.checkId
      const checkCategory =
        resolvedCheckId && CODE_SAFETY_CHECK_IDS.has(resolvedCheckId)
          ? 'code_safety'
          : 'repository_health'
      const eventParams = {
        ...buildRepositoryAnalyticsParams(repositoryState.repository),
        check_id: check.checkId,
        check_category: checkCategory,
      }

      if (checkCategory === 'code_safety' && check.status !== 'green') {
        trackWhatsWrongOpened(eventParams)
        return
      }

      if (check.status === 'green') {
        trackLearnWhyThisMattersOpened(eventParams)
        return
      }

      trackLearnMoreOpened(eventParams)
    },
    [repositoryState.repository],
  )

  return (
    <div className="page repository-detail-page">
      {isAuthenticated ? (
        <div className="page-topbar">
          <p className="page-topbar-brand">RepoGuard</p>
          <p className="page-topbar-user">@{authState.user.login} connected</p>
        </div>
      ) : null}

      {!isAuthenticated ? (
        <Card>
          <h1>Repository analysis</h1>
          <p className="page-description">
            Connect with GitHub to open a focused repository diagnosis page.
          </p>
        </Card>
      ) : null}

      {isLoadingSession ? (
        <Card title="Checking GitHub session" subtitle="Contacting backend /auth/me">
          <p className="state-note">
            Verifying authentication before loading repository analysis...
          </p>
        </Card>
      ) : null}

      {isMissingConfig ? (
        <Card title="Missing API configuration" subtitle="Set VITE_API_URL for this environment">
          <p className="state-note state-note-danger">
            Backend API URL is not configured for this environment.
          </p>
        </Card>
      ) : null}

      {hasSessionError ? (
        <Card title="Could not validate session" subtitle="Backend request failed">
          <p className="state-note state-note-danger">{authState.error}</p>
        </Card>
      ) : null}

      {isUnauthenticated ? (
        <Card title="Not connected to GitHub" subtitle="Authentication required">
          <p className="state-note">
            Your current session is not authenticated. Return to onboarding and try
            connecting with GitHub again.
          </p>
          <div className="hero-actions">
            <Button to="/">Back to onboarding</Button>
          </div>
        </Card>
      ) : null}

      {isAuthenticated && repositoryState.status === 'loading' ? (
        <Card>
          <p className="state-note">Loading selected repository details...</p>
        </Card>
      ) : null}

      {isAuthenticated && repositoryState.status === 'error' ? (
        <Card>
          <p className="state-note state-note-danger">{repositoryState.error}</p>
        </Card>
      ) : null}

      {isAuthenticated && repositoryState.status === 'not_found' ? (
        <Card>
          <p className="state-note state-note-danger">
            The selected repository was not found in your current public repository list.
          </p>
        </Card>
      ) : null}

      {hasRepository ? (
        <Card className="detail-repository-card">
          <div className="detail-repository-header">
            <Button to="/repositories" variant="secondary">
              {'\u2190'} Back
            </Button>
          </div>
          <p className="detail-repository-meta detail-repository-eyebrow">Project report</p>
          <h1>{repositoryState.repository.fullName}</h1>
          <p className="detail-repository-meta">Minimal repository diagnosis</p>
        </Card>
      ) : null}

      {hasRepository && (scanState.status === 'idle' || scanState.status === 'loading') ? (
        <Card className="scan-state-card">
          <h2 className="scan-state-title">Scanning repository</h2>
          <p className="state-note scan-state-message">
            RepoGuard is checking repository health signals.
          </p>
        </Card>
      ) : null}

      {hasRepository && scanState.status === 'error' ? (
        <Card className="scan-state-card">
          <h2 className="scan-state-title">Scan could not be completed</h2>
          <p className="state-note scan-state-message">
            RepoGuard could not finish the repository scan for this project.
          </p>
          <p className="state-note scan-state-message">You can try again.</p>
          <div className="hero-actions scan-state-actions">
            <Button type="button" onClick={() => void runGeneralScan()}>
              Retry scan
            </Button>
          </div>
        </Card>
      ) : null}

      {hasRepository && hasScanResult ? (
        <>
          <Card title="Scan summary">
            <p className="scan-check-message">
              This report shows one contextual scan with didactic checks and clear next actions.
            </p>
            <ul className="report-line-list">
              <li>Green: {greenChecks.length}</li>
              <li>Needs attention (Yellow/Red): {attentionChecks.length}</li>
            </ul>
          </Card>

          <Card title="Didactic checks">
            {didacticChecks.length ? (
              <div className="report-line-list">
                {didacticChecks.map((check) => {
                  const resolvedCheckId =
                    resolveRepositoryCheckId({ key: check.checkId, label: check.label }) ||
                    'readme'

                  return (
                    <div key={`didactic-${check.checkId}`} className="report-line-row">
                      <div className="report-line-copy">
                        <p className="report-line-label">
                          {check.label} — {STATUS_LABELS[check.status] || check.status}
                        </p>
                        <p className="scan-check-message">
                          <strong>What was checked:</strong> {check.whatChecked}
                        </p>
                        <p className="scan-check-message">
                          <strong>Why it matters:</strong> {check.whyItMatters}
                        </p>
                        <p className="scan-check-message">
                          <strong>What RepoGuard found:</strong> {check.whatFound}
                        </p>
                        <p className="scan-check-message">
                          <strong>Suggested action:</strong> {check.suggestedAction}
                        </p>
                        <p className="scan-check-message">
                          <strong>Confidence:</strong> {check.confidence}
                        </p>
                        {check.uncertaintyNote ? (
                          <p className="scan-check-message">
                            <strong>Uncertainty:</strong> {check.uncertaintyNote}
                          </p>
                        ) : null}
                        <p className="scan-check-message">
                          <strong>Sources:</strong>
                        </p>
                        <ul className="report-line-list">
                          {(check.sources || []).map((source) => (
                            <li key={`${check.checkId}-${source.url}`}>
                              <a href={source.url} target="_blank" rel="noopener noreferrer">
                                {source.title}
                              </a>{' '}
                              ({source.sourceType})
                            </li>
                          ))}
                        </ul>
                      </div>
                      <RepositoryCheckLearnMoreLink
                        repositoryId={repositoryId}
                        checkId={resolvedCheckId}
                        state={learnMoreState}
                        onClick={() => handleCheckLearnMoreClick(check)}
                      />
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="scan-check-message">No didactic checks were returned by this scan.</p>
            )}
          </Card>
        </>
      ) : null}
    </div>
  )
}

export default RepositoryDetailPage
