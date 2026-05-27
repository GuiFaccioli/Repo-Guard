import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import {
  CODE_SAFETY_CHECK_IDS,
  buildOrderedRepositoryChecks,
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
const GREEN_SCAN_TYPE = 'green'
const UNAUTHORIZED_SCAN_ERROR = 'unauthenticated_scan_request'
const STATUS_OK_LABEL = '\u2713 OK'
const STATUS_MISSING_LABEL = '\u2715 Missing'
const STATUS_OK_PREFIX = '\u2713'
const STATUS_MISSING_PREFIX = '\u2715'
const GREEN_SCAN_ANALYTICS_TYPE = 'green'
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
  const scanChecks = Array.isArray(scanResult?.checks) ? scanResult.checks : []
  let failedCheckCount = 0
  let codeSafetyFailedCount = 0
  let repositoryHealthFailedCount = 0

  for (const check of scanChecks) {
    if (check?.passed === true) {
      continue
    }

    failedCheckCount += 1

    const checkId = resolveRepositoryCheckId(check)
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

function RepositoryCheckRow({
  prefix,
  label,
  repositoryId,
  checkId,
  state,
  onLearnMoreClick,
}) {
  return (
    <li className="report-line-row">
      <span className="report-line-copy">
        {prefix ? <span className="report-line-prefix">{prefix}</span> : null}
        <span className="report-line-label">{label}</span>
      </span>
      <RepositoryCheckLearnMoreLink
        repositoryId={repositoryId}
        checkId={checkId}
        state={state}
        onClick={onLearnMoreClick}
      />
    </li>
  )
}

async function requestGreenScan(repositoriesUrl, repositoryId) {
  const requestKey = `${repositoriesUrl}|${repositoryId}|${GREEN_SCAN_TYPE}`
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
      body: JSON.stringify({
        scanType: GREEN_SCAN_TYPE,
      }),
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

  const runGreenScan = useCallback(async () => {
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
        scan_type: GREEN_SCAN_ANALYTICS_TYPE,
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
        scan_type: GREEN_SCAN_ANALYTICS_TYPE,
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
      scan_type: GREEN_SCAN_ANALYTICS_TYPE,
    })

    try {
      const scanResult = await requestGreenScan(repositoriesUrl, repositoryId)
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
        scan_type: GREEN_SCAN_ANALYTICS_TYPE,
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
          scan_type: GREEN_SCAN_ANALYTICS_TYPE,
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
        error: 'green_scan_failed',
      })
      trackScanFailed({
        ...repositoryAnalyticsParams,
        scan_type: GREEN_SCAN_ANALYTICS_TYPE,
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
    void loadSession()
  }, [loadSession])

  useEffect(() => {
    if (authState.status !== 'authenticated') {
      setRepositoryState(initialRepositoryState)
      setScanState(initialScanState)
      autoScanRepositoryRef.current = null
      latestScanRequestRef.current += 1
      return
    }

    void resolveRepository()
  }, [authState.status, resolveRepository])

  useEffect(() => {
    autoScanRepositoryRef.current = null
    latestScanRequestRef.current += 1
    setScanState(initialScanState)
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
    void runGreenScan()
  }, [authState.status, repositoryState.status, repositoryId, runGreenScan])

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
  const activeChecks = Array.isArray(activeResult?.checks) ? activeResult.checks : []

  const orderedChecks = hasScanResult ? buildOrderedRepositoryChecks(activeChecks) : []
  const correctlyConfiguredChecks = orderedChecks.filter((check) => check.passed)
  const needsAttentionChecks = orderedChecks.filter((check) => !check.passed)

  const improveItems = []
  for (const check of needsAttentionChecks) {
    if (!improveItems.includes(check.fixTitle)) {
      improveItems.push(check.fixTitle)
    }
  }

  const learnMoreState = hasRepository
    ? {
        repositoryFullName: repositoryState.repository.fullName,
        connectedLogin: authState.user.login,
      }
    : {}

  const handleCheckLearnMoreClick = useCallback(
    (check) => {
      const checkCategory = CODE_SAFETY_CHECK_IDS.has(check.id)
        ? 'code_safety'
        : 'repository_health'
      const eventParams = {
        ...buildRepositoryAnalyticsParams(repositoryState.repository),
        check_id: check.id,
        check_category: checkCategory,
      }

      if (checkCategory === 'code_safety' && !check.passed) {
        trackWhatsWrongOpened(eventParams)
        return
      }

      if (check.passed) {
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
            RepoGuard could not finish the Green Scan for this repository.
          </p>
          <p className="state-note scan-state-message">You can try again.</p>
          <div className="hero-actions scan-state-actions">
            <Button type="button" onClick={() => void runGreenScan()}>
              Retry Green Scan
            </Button>
          </div>
        </Card>
      ) : null}

      {hasRepository && hasScanResult ? (
        <>
          <Card title="What RepoGuard inspected">
            <ul className="report-line-list">
              {orderedChecks.map((check) => (
                <RepositoryCheckRow
                  key={`inspected-${check.id}`}
                  label={check.label}
                  repositoryId={repositoryId}
                  checkId={check.id}
                  state={learnMoreState}
                  onLearnMoreClick={() => handleCheckLearnMoreClick(check)}
                />
              ))}
            </ul>
          </Card>

          <Card title="What is correctly configured">
            {correctlyConfiguredChecks.length ? (
              <ul className="report-line-list report-line-list-status-ok">
                {correctlyConfiguredChecks.map((check) => (
                  <RepositoryCheckRow
                    key={`ok-${check.id}`}
                    prefix={STATUS_OK_PREFIX}
                    label={check.label}
                    repositoryId={repositoryId}
                    checkId={check.id}
                    state={learnMoreState}
                    onLearnMoreClick={() => handleCheckLearnMoreClick(check)}
                  />
                ))}
              </ul>
            ) : (
              <p className="scan-check-message">No checks are currently marked as configured.</p>
            )}
          </Card>

          <Card title="What needs attention">
            {needsAttentionChecks.length ? (
              <ul className="report-line-list report-line-list-status-missing">
                {needsAttentionChecks.map((check) => (
                  <RepositoryCheckRow
                    key={`missing-${check.id}`}
                    prefix={STATUS_MISSING_PREFIX}
                    label={check.label}
                    repositoryId={repositoryId}
                    checkId={check.id}
                    state={learnMoreState}
                    onLearnMoreClick={() => handleCheckLearnMoreClick(check)}
                  />
                ))}
              </ul>
            ) : (
              <p className="scan-check-message">No checks need attention right now.</p>
            )}
          </Card>

          <Card title="How to improve">
            {improveItems.length ? (
              <ul className="report-line-list">
                {improveItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="scan-check-message">
                No improvements required for the current Green Scan baseline.
              </p>
            )}
          </Card>

          <Card title="Detailed checks">
            <div className="repository-table-wrap">
              <table className="repository-table repository-check-table">
                <thead>
                  <tr>
                    <th>Check</th>
                    <th>Status</th>
                    <th>Learn more</th>
                    <th>How to fix</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedChecks.map((check) => (
                    <tr key={`detail-${check.id}`}>
                      <td>{check.label}</td>
                      <td className={check.passed ? 'check-status-ok' : 'check-status-missing'}>
                        {check.passed ? STATUS_OK_LABEL : STATUS_MISSING_LABEL}
                      </td>
                      <td>
                        <Link
                          className="table-action-link"
                          to={`/repositories/${repositoryId}/checks/${check.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          state={learnMoreState}
                          onClick={() => handleCheckLearnMoreClick(check)}
                        >
                          Learn more ↗
                        </Link>
                      </td>
                      <td>
                        <Link
                          className="table-action-link"
                          to={{
                            pathname: `/repositories/${repositoryId}/checks/${check.id}`,
                            hash: '#how-to-fix',
                          }}
                          state={learnMoreState}
                        >
                          {check.passed ? '[View]' : '[Fix]'}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  )
}

export default RepositoryDetailPage
