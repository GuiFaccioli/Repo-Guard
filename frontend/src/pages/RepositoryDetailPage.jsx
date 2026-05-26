import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { buildBackendUrl, normalizeApiBaseUrl } from '../utils/apiUrl'

const SCAN_CACHE_KEY = 'repoguard.scanResults.v1'
const REPOSITORY_CACHE_KEY = 'repoguard.repositories.v1'
const PREFERRED_SCAN_KEY = 'repoguard.preferredScan.v1'

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

const initialScanActionState = {
  status: 'idle',
  error: '',
}

const scanModes = [
  {
    key: 'green',
    label: 'Green Scan',
  },
  {
    key: 'yellow',
    label: 'Yellow Scan',
  },
  {
    key: 'red',
    label: 'Red Scan',
  },
]

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

function getScanTypeLabel(scanType) {
  if (scanType === 'green') return 'Green Scan'
  if (scanType === 'yellow') return 'Yellow Scan'
  if (scanType === 'red') return 'Red Scan'
  return 'Scan'
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
  const [scanActionState, setScanActionState] = useState(initialScanActionState)
  const [selectedScanType, setSelectedScanType] = useState(() => {
    const savedMode = readJsonStorage(PREFERRED_SCAN_KEY, 'green')
    return savedMode === 'green' || savedMode === 'yellow' || savedMode === 'red'
      ? savedMode
      : 'green'
  })
  const [scanSnapshots, setScanSnapshots] = useState(() =>
    normalizeScanSnapshots(readJsonStorage(SCAN_CACHE_KEY, {})),
  )

  const loadSession = useCallback(async () => {
    if (!authMeUrl) {
      setAuthState({
        status: 'missing_config',
        user: null,
        error: '',
      })
      setRepositoryState(initialRepositoryState)
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
    } catch {
      setAuthState({
        status: 'error',
        user: null,
        error:
          'Could not verify your GitHub session. Check backend availability and try again.',
      })
      setRepositoryState(initialRepositoryState)
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
        (repository) => repository.id === repositoryId,
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
        ? cachedRepositories.find((repository) => repository.id === repositoryId)
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

  const runScan = useCallback(async () => {
    if (!hasValidRepositoryId) {
      setScanActionState({
        status: 'error',
        error: 'Invalid repository id in route.',
      })
      return
    }

    if (!repositoriesUrl) {
      setScanActionState({
        status: 'error',
        error: 'Backend API URL is not configured for this environment.',
      })
      return
    }

    setScanActionState({
      status: 'loading',
      error: '',
    })

    try {
      const response = await fetch(`${repositoriesUrl}/${repositoryId}/scans`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scanType: selectedScanType,
        }),
      })

      if (response.status === 401) {
        setAuthState({
          status: 'unauthenticated',
          user: null,
          error: '',
        })
        setRepositoryState(initialRepositoryState)
        setScanActionState(initialScanActionState)
        return
      }

      if (!response.ok) {
        const payload = await response
          .json()
          .catch(() => ({ message: 'Could not run repository scan.' }))
        throw new Error(payload?.message || 'Could not run repository scan.')
      }

      const scanResult = await response.json()
      const nextSnapshots = {
        ...scanSnapshots,
        [String(repositoryId)]: {
          result: scanResult,
          completedAt: new Date().toISOString(),
        },
      }

      setScanSnapshots(nextSnapshots)
      writeJsonStorage(SCAN_CACHE_KEY, nextSnapshots)

      setScanActionState({
        status: 'success',
        error: '',
      })
    } catch (error) {
      setScanActionState({
        status: 'error',
        error:
          error instanceof Error ? error.message : 'Could not run repository scan.',
      })
    }
  }, [hasValidRepositoryId, repositoriesUrl, repositoryId, scanSnapshots, selectedScanType])

  useEffect(() => {
    void loadSession()
  }, [loadSession])

  useEffect(() => {
    if (authState.status !== 'authenticated') {
      setRepositoryState(initialRepositoryState)
      return
    }

    void resolveRepository()
  }, [authState.status, resolveRepository])

  useEffect(() => {
    writeJsonStorage(PREFERRED_SCAN_KEY, selectedScanType)
  }, [selectedScanType])

  const isLoadingSession = authState.status === 'loading'
  const isMissingConfig = authState.status === 'missing_config'
  const hasSessionError = authState.status === 'error'
  const isUnauthenticated = authState.status === 'unauthenticated'
  const isAuthenticated = authState.status === 'authenticated' && authState.user

  const activeSnapshot = scanSnapshots[String(repositoryId)] || null
  const activeResult = activeSnapshot?.result || null
  const hasScanResult = Boolean(activeResult)

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

  const highestSeverity =
    typeof activeSummary?.highestSeverity === 'string'
      ? activeSummary.highestSeverity
      : failedChecks[0]?.severity || 'low'

  return (
    <div className="page repository-detail-page">
      <Card className="detail-repository-card">
        {!isAuthenticated ? (
          <>
            <h1>Repository analysis</h1>
            <p className="page-description">
              Connect with GitHub to open a focused repository diagnosis page.
            </p>
          </>
        ) : null}

        {isLoadingSession ? (
          <p className="state-note">
            Verifying authentication before loading repository analysis...
          </p>
        ) : null}

        {isMissingConfig ? (
          <p className="state-note state-note-danger">
            Backend API URL is not configured for this environment.
          </p>
        ) : null}

        {hasSessionError ? (
          <p className="state-note state-note-danger">{authState.error}</p>
        ) : null}

        {isUnauthenticated ? (
          <div className="state-grid">
            <p className="state-note">
              Your session is not authenticated. Return to onboarding and connect
              with GitHub again.
            </p>
            <div className="hero-actions">
              <Button to="/">Back to onboarding</Button>
            </div>
          </div>
        ) : null}

        {isAuthenticated && repositoryState.status === 'loading' ? (
          <p className="state-note">Loading selected repository details...</p>
        ) : null}

        {isAuthenticated && repositoryState.status === 'error' ? (
          <p className="state-note state-note-danger">{repositoryState.error}</p>
        ) : null}

        {isAuthenticated && repositoryState.status === 'not_found' ? (
          <p className="state-note state-note-danger">
            The selected repository was not found in your current public repository
            list.
          </p>
        ) : null}

        {isAuthenticated && repositoryState.status === 'success' ? (
          <>
            {!hasScanResult ? (
              <>
                <p className="eyebrow">Selected project</p>
                <h1>{repositoryState.repository.fullName}</h1>
                <p className="page-description">
                  {repositoryState.repository.description ||
                    'No repository description provided.'}
                </p>

                <p className="detail-repository-meta">
                  {repositoryState.repository.language || 'Language not specified'} |{' '}
                  {repositoryState.repository.private ? 'private' : 'public'} | Last push:{' '}
                  {formatDate(repositoryState.repository.pushedAt)} |{' '}
                  <a
                    className="profile-link"
                    href={repositoryState.repository.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open on GitHub
                  </a>
                </p>

                <div className="scan-controls-row">
                  <label className="scan-select-label" htmlFor="scan-mode-pre">
                    Scan mode
                  </label>
                  <select
                    id="scan-mode-pre"
                    className="scan-select"
                    value={selectedScanType}
                    onChange={(event) => setSelectedScanType(event.target.value)}
                    disabled={scanActionState.status === 'loading'}
                  >
                    {scanModes.map((mode) => (
                      <option key={mode.key} value={mode.key}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="hero-actions">
                  <Button
                    type="button"
                    onClick={() => void runScan()}
                    disabled={scanActionState.status === 'loading'}
                  >
                    {scanActionState.status === 'loading'
                      ? 'Running scan...'
                      : 'Scan project'}
                  </Button>
                  <Button to="/repositories" variant="secondary">
                    Choose another project
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="eyebrow">Project report</p>
                <h1>{repositoryState.repository.fullName}</h1>
                <p className="report-summary-line">
                  Score: {activeResult.score ?? '--'} | Status:{' '}
                  <span className={getSeverityBadgeClass(highestSeverity)}>
                    {highestSeverity}
                  </span>{' '}
                  | {getScanTypeLabel(activeResult.scanType)}
                </p>

                <p className="detail-repository-meta">
                  {repositoryState.repository.description ||
                    'No repository description provided.'}
                </p>

                <p className="detail-repository-meta">
                  Last push: {formatDate(repositoryState.repository.pushedAt)} | Last scan:{' '}
                  {activeSnapshot?.completedAt
                    ? formatDate(activeSnapshot.completedAt)
                    : 'Unknown'}
                </p>

                <div className="scan-controls-row">
                  <label className="scan-select-label" htmlFor="scan-mode-post">
                    Scan mode
                  </label>
                  <select
                    id="scan-mode-post"
                    className="scan-select"
                    value={selectedScanType}
                    onChange={(event) => setSelectedScanType(event.target.value)}
                    disabled={scanActionState.status === 'loading'}
                  >
                    {scanModes.map((mode) => (
                      <option key={mode.key} value={mode.key}>
                        {mode.label}
                      </option>
                    ))}
                  </select>

                  <Button
                    type="button"
                    onClick={() => void runScan()}
                    disabled={scanActionState.status === 'loading'}
                  >
                    {scanActionState.status === 'loading'
                      ? 'Running scan...'
                      : `Run ${getScanTypeLabel(selectedScanType)}`}
                  </Button>

                  <Button to="/repositories" variant="secondary">
                    Choose another project
                  </Button>
                </div>
              </>
            )}

            {scanActionState.status === 'error' ? (
              <p className="state-note state-note-danger">{scanActionState.error}</p>
            ) : null}
          </>
        ) : null}
      </Card>

      {isAuthenticated && repositoryState.status === 'success' && hasScanResult ? (
        <Card className="report-sections-card">
          <section className="report-section">
            <h2 className="report-section-title">What RepoGuard inspected</h2>
            {activeChecks.length ? (
              <ul className="scan-check-list">
                {activeChecks.map((check) => (
                  <li key={`inspected-${check.key}`}>
                    <div className="scan-check-line">
                      <span>{check.label}</span>
                      <span className={check.passed ? 'status-ok' : 'status-failed'}>
                        {check.passed ? 'pass' : 'fail'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="scan-check-message">No checks were returned by this scan.</p>
            )}
          </section>

          <section className="report-section">
            <h2 className="report-section-title">What RepoGuard found</h2>
            <p className="scan-check-message">
              RepoGuard ran {getScanTypeLabel(activeResult.scanType)} and produced score{' '}
              {activeResult.score ?? '--'}.
            </p>
            <p className="scan-meta">
              <span className="scan-meta-label">Checks</span>
              <span>
                Passed {passedCount} / Failed {failedCount}
              </span>
            </p>
            <p className="scan-meta">
              <span className="scan-meta-label">Highest severity</span>
              <span className={getSeverityBadgeClass(highestSeverity)}>{highestSeverity}</span>
            </p>
          </section>

          <section className="report-section">
            <h2 className="report-section-title">What needs attention</h2>
            {failedChecks.length ? (
              <ul className="scan-check-list">
                {failedChecks.map((check) => (
                  <li key={`attention-${check.key}`}>
                    <div className="scan-check-line">
                      <span>{check.label}</span>
                      <span className={getSeverityBadgeClass(check.severity)}>
                        {check.severity}
                      </span>
                    </div>
                    <p className="scan-check-message">{check.message}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="scan-check-message">No failed checks in this scan.</p>
            )}
          </section>

          <section className="report-section">
            <h2 className="report-section-title">How to fix</h2>
            {activeRecommendations.length ? (
              <ol className="scan-recommendations">
                {activeRecommendations.map((item, index) => (
                  <li key={`${item.title}-${index}`}>
                    <p className="scan-recommendation-title">
                      <span className={getSeverityBadgeClass(item.priority)}>
                        {item.priority}
                      </span>{' '}
                      {item.title}
                    </p>
                    <p className="scan-check-message">{item.description}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="scan-check-message">
                No recommendations. This repository passed all checks for this scan.
              </p>
            )}
          </section>

          <section className="report-section">
            <h2 className="report-section-title">Detailed checks</h2>
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
          </section>
        </Card>
      ) : null}
    </div>
  )
}

export default RepositoryDetailPage
