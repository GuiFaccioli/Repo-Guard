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
    title: 'Green Scan',
    subtitle: 'Basic hygiene',
    description:
      'Checks README, Dependabot, Actions, license and repository activity.',
    toneClass: 'scan-mode-green',
  },
  {
    key: 'yellow',
    title: 'Yellow Scan',
    subtitle: 'Quality and maintenance',
    description:
      'Reviews scripts, tests, documentation and maintainability signals.',
    toneClass: 'scan-mode-yellow',
  },
  {
    key: 'red',
    title: 'Red Scan',
    subtitle: 'Defensive security patterns',
    description:
      'Flags potential secret exposure and unsafe implementation patterns.',
    toneClass: 'scan-mode-red',
  },
]

const scanChecksPreview = {
  green: [
    'README',
    '.gitignore',
    'package.json',
    'Dependabot',
    'GitHub Actions',
    'License',
    'Recent activity',
    'Open issues and PRs',
  ],
  yellow: [
    'Scripts (test/build/lint)',
    'Environment template files',
    'docs/ and src/ structure',
    'Tests folder or test files',
    'Lockfile and setup guidance',
  ],
  red: [
    'Committed .env file patterns',
    'Hardcoded secret-like values',
    'Unsafe eval usage',
    'Potential SQL string concatenation',
    'Sensitive logs and permissive CORS patterns',
  ],
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

  const failedChecks = activeResult
    ? sortChecksBySeverity(activeResult.checks.filter((check) => !check.passed))
    : []

  const plannedChecks = scanChecksPreview[selectedScanType] || []

  return (
    <div className="page repository-detail-page">
      <Card className="detail-repository-card">
        <div className="detail-repository-header">
          <Button to="/repositories" variant="secondary">
            Back to repositories
          </Button>
        </div>

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
            <h1>{repositoryState.repository.fullName}</h1>
            <p className="page-description">
              {repositoryState.repository.description ||
                'No repository description provided.'}
            </p>

            <p className="detail-repository-meta">
              {repositoryState.repository.language || 'Language not specified'} ·{' '}
              {repositoryState.repository.private ? 'private' : 'public'} · last push:{' '}
              {formatDate(repositoryState.repository.pushedAt)} ·{' '}
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
        ) : null}
      </Card>

      {isAuthenticated && repositoryState.status === 'success' ? (
        <>
          <section className="metric-grid" aria-label="Repository score summary">
            <Card className="metric-card">
              <p className="metric-label">Repository score</p>
              <p className="metric-value">{activeResult ? activeResult.score : '--'}</p>
              <p className="metric-helper">
                {activeResult
                  ? `Based on ${getScanTypeLabel(activeResult.scanType)}`
                  : 'Run a scan to generate score'}
              </p>
            </Card>

            <Card className="metric-card">
              <p className="metric-label">Current status</p>
              <p className="metric-value metric-value-compact">
                {activeResult ? activeResult.summary.highestSeverity : 'Not scanned'}
              </p>
              <p className="metric-helper">
                {activeResult
                  ? `Passed ${activeResult.summary.passed} / Failed ${activeResult.summary.failed}`
                  : 'No diagnosis generated yet'}
              </p>
            </Card>

            <Card className="metric-card">
              <p className="metric-label">Last scan</p>
              <p className="metric-value metric-value-compact">
                {activeResult ? getScanTypeLabel(activeResult.scanType) : 'None'}
              </p>
              <p className="metric-helper">
                {activeSnapshot?.completedAt
                  ? formatDate(activeSnapshot.completedAt)
                  : 'Run Green Scan to start diagnosis'}
              </p>
            </Card>
          </section>

          <Card
            title="Choose analysis depth"
            subtitle="Select a mode and run the next repository diagnosis"
          >
            <div className="scan-mode-grid">
              {scanModes.map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  className={`scan-mode-card ${mode.toneClass} ${selectedScanType === mode.key ? 'scan-mode-card-active' : ''}`.trim()}
                  onClick={() => setSelectedScanType(mode.key)}
                >
                  <p className="scan-mode-title">{mode.title}</p>
                  <p className="scan-mode-subtitle">{mode.subtitle}</p>
                  <p className="scan-mode-description">{mode.description}</p>
                </button>
              ))}
            </div>

            <div className="hero-actions">
              <Button
                type="button"
                onClick={() => void runScan()}
                disabled={scanActionState.status === 'loading'}
              >
                {scanActionState.status === 'loading'
                  ? 'Running scan...'
                  : `Run ${getScanTypeLabel(selectedScanType)}`}
              </Button>
            </div>

            {scanActionState.status === 'error' ? (
              <p className="state-note state-note-danger">{scanActionState.error}</p>
            ) : null}
          </Card>

          {!activeResult ? (
            <Card title="Diagnosis" subtitle="No scan result available yet">
              <p className="state-note">
                Run a Green Scan to generate the first diagnosis.
              </p>
              <div className="checks-row">
                {plannedChecks.map((item) => (
                  <span className="check-chip" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </Card>
          ) : (
            <section className="detail-analysis-sections">
              <div className="detail-analysis-grid">
                <Card title="What RepoGuard inspected" className="scan-section-card">
                  <ul className="scan-check-list">
                    {activeResult.checks.map((check) => (
                      <li key={check.key}>
                        <div className="scan-check-line">
                          <span>{check.label}</span>
                          <span className={check.passed ? 'status-ok' : 'status-failed'}>
                            {check.passed ? 'pass' : 'fail'}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card title="What RepoGuard found" className="scan-section-card">
                  <p className="scan-meta">
                    <span className="scan-meta-label">Scan type</span>
                    <span>{getScanTypeLabel(activeResult.scanType)}</span>
                  </p>
                  <p className="scan-meta">
                    <span className="scan-meta-label">Score</span>
                    <span>{activeResult.score}</span>
                  </p>
                  <p className="scan-meta">
                    <span className="scan-meta-label">Checks</span>
                    <span>
                      Passed {activeResult.summary.passed} / Failed {activeResult.summary.failed}
                    </span>
                  </p>
                  <p className="scan-meta">
                    <span className="scan-meta-label">Highest severity</span>
                    <span className={getSeverityBadgeClass(activeResult.summary.highestSeverity)}>
                      {activeResult.summary.highestSeverity}
                    </span>
                  </p>
                </Card>

                <Card title="What needs attention" className="scan-section-card">
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
                    <p className="scan-check-message">
                      No failed checks in this scan.
                    </p>
                  )}
                </Card>
              </div>

              <Card title="How to fix" className="scan-section-card">
                {activeResult.recommendations.length ? (
                  <ol className="scan-recommendations">
                    {activeResult.recommendations.map((item, index) => (
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
              </Card>

              <Card title="Detailed checks" className="scan-section-card">
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
                      {activeResult.checks.map((check) => (
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
            </section>
          )}
        </>
      ) : null}
    </div>
  )
}

export default RepositoryDetailPage
