import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { buildBackendUrl, normalizeApiBaseUrl } from '../utils/apiUrl'

const SCAN_CACHE_KEY = 'repoguard.scanResults.v1'
const REPOSITORY_CACHE_KEY = 'repoguard.repositories.v1'
const GREEN_SCAN_TYPE = 'green'
const UNAUTHORIZED_SCAN_ERROR = 'unauthenticated_scan_request'
const INSPECTED_SEPARATOR = ' \u00B7 '
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

function formatDate(value) {
  if (!value) {
    return 'Unknown'
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Unknown'
  }

  return parsedDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getSeverityBadgeClass(severity) {
  if (severity === 'high') return 'severity-pill severity-high'
  if (severity === 'medium') return 'severity-pill severity-medium'
  if (severity === 'low') return 'severity-pill severity-low'
  return 'severity-pill'
}

function sortChecksBySeverity(checks) {
  const weight = {
    high: 3,
    medium: 2,
    low: 1,
  }

  return checks
    .slice()
    .sort((a, b) => (weight[b.severity] || 0) - (weight[a.severity] || 0))
}

function getReportStatusLabel(failedCount) {
  return failedCount > 0 ? 'Needs attention' : 'Healthy'
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
    if (!hasValidRepositoryId) {
      setScanState({
        status: 'error',
        result: null,
        completedAt: null,
        error: 'invalid_repository_id',
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
    }
  }, [hasValidRepositoryId, repositoriesUrl, repositoryId])

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

  const activeResult = scanState.result
  const hasScanResult = scanState.status === 'success' && Boolean(activeResult)

  const activeChecks = Array.isArray(activeResult?.checks) ? activeResult.checks : []
  const activeRecommendations = Array.isArray(activeResult?.recommendations)
    ? activeResult.recommendations
    : []
  const activeSummary =
    activeResult && activeResult.summary && typeof activeResult.summary === 'object'
      ? activeResult.summary
      : null

  const failedChecks = hasScanResult
    ? sortChecksBySeverity(activeChecks.filter((check) => !check.passed))
    : []

  const passedCount =
    typeof activeSummary?.passed === 'number'
      ? activeSummary.passed
      : activeChecks.filter((check) => check.passed).length

  const failedCount =
    typeof activeSummary?.failed === 'number'
      ? activeSummary.failed
      : activeChecks.filter((check) => !check.passed).length

  const inspectedLabels = activeChecks.map((check) => check.label)
  const reportStatusLabel = getReportStatusLabel(failedCount)
  const findingsMessage = failedCount
    ? 'This repository has checks that need attention.'
    : 'This repository passed the current Green Scan checks.'

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
              Back to repositories
            </Button>
          </div>

          <h1>{repositoryState.repository.fullName}</h1>

          {scanState.status === 'loading' || scanState.status === 'idle' ? (
            <>
              <p className="detail-repository-meta">
                {repositoryState.repository.description || 'No repository description provided.'}
              </p>
              <p className="detail-repository-meta">
                {repositoryState.repository.language || 'Language not specified'}{' '}
                {'\u00B7'} {repositoryState.repository.private ? 'private' : 'public'} {'\u00B7'} last push{' '}
                {formatDate(repositoryState.repository.pushedAt)} {'\u00B7'}{' '}
                <a
                  className="profile-link"
                  href={repositoryState.repository.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open on GitHub
                </a>
              </p>
            </>
          ) : (
            <>
              <p className="detail-repository-meta">Repository health report</p>
              {hasScanResult ? (
                <p className="report-summary-line">
                  Score: {activeResult.score ?? '--'} {'\u00A0\u00A0\u00A0'} Status: {reportStatusLabel}{' '}
                  {'\u00A0\u00A0\u00A0'} Green Scan
                </p>
              ) : null}
            </>
          )}
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
            <p className="scan-inline-list">
              {inspectedLabels.length
                ? inspectedLabels.join(INSPECTED_SEPARATOR)
                : 'No checks were returned by this scan.'}
            </p>
          </Card>

          <Card title="What RepoGuard found">
            <p className="scan-check-message">
              {passedCount} checks passed. {failedCount} checks need attention.
            </p>
            <p className="scan-check-message">{findingsMessage}</p>
          </Card>

          <Card title="What needs attention">
            {failedChecks.length ? (
              <ol className="scan-recommendations scan-numbered-list">
                {failedChecks.map((check) => (
                  <li key={`attention-${check.key}`}>
                    <p className="scan-check-message">{check.message}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="scan-check-message">No failed checks in this scan.</p>
            )}
          </Card>

          <Card title="How to fix">
            {activeRecommendations.length ? (
              <ol className="scan-recommendations scan-numbered-list">
                {activeRecommendations.map((item, index) => (
                  <li key={`${item.title}-${index}`}>
                    <p className="scan-check-message scan-check-message-strong">{item.title}</p>
                    <p className="scan-check-message">{item.description}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="scan-check-message">
                No recommendations. This repository passed all checks for this scan.
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
                    <th>Severity</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {activeChecks.map((check) => (
                    <tr key={`detail-${check.key}`}>
                      <td>{check.label}</td>
                      <td>{check.passed ? 'pass' : 'fail'}</td>
                      <td>
                        <span className={getSeverityBadgeClass(check.severity)}>
                          {check.severity}
                        </span>
                      </td>
                      <td>{check.message}</td>
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
