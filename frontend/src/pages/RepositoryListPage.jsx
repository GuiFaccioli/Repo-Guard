import { useCallback, useEffect, useMemo, useState } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'
import { buildBackendUrl, normalizeApiBaseUrl } from '../utils/apiUrl'

const initialAuthState = {
  status: 'loading',
  user: null,
  error: '',
}

const initialRepositoriesState = {
  status: 'idle',
  repositories: [],
  error: '',
}

const SCAN_CACHE_KEY = 'repoguard.scanResults.v1'
const REPOSITORY_CACHE_KEY = 'repoguard.repositories.v1'

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
    // Ignore storage failures to keep runtime resilient.
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

function getScanStatus(snapshot) {
  if (!snapshot?.result) {
    return {
      scoreLabel: '--',
      severityLabel: 'Not scanned',
      severityClass: 'severity-pill',
      topIssue: 'No diagnosis yet.',
    }
  }

  const failedChecks = snapshot.result.checks.filter((check) => !check.passed)
  const highestSeverity = snapshot.result.summary.highestSeverity
  const topIssue = failedChecks.length
    ? failedChecks[0].message
    : 'No issues found in the latest scan.'

  return {
    scoreLabel: `${snapshot.result.score}`,
    severityLabel: highestSeverity === 'none' ? 'none' : highestSeverity,
    severityClass: getSeverityBadgeClass(highestSeverity),
    topIssue,
  }
}

function RepositoryListPage() {
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
  const [repositoriesState, setRepositoriesState] = useState(initialRepositoriesState)
  const [scanSnapshots, setScanSnapshots] = useState(() =>
    normalizeScanSnapshots(readJsonStorage(SCAN_CACHE_KEY, {})),
  )

  const resetRepositoryData = useCallback(() => {
    setRepositoriesState(initialRepositoriesState)
  }, [])

  const loadSession = useCallback(async () => {
    if (!authMeUrl) {
      setAuthState({
        status: 'missing_config',
        user: null,
        error: '',
      })
      resetRepositoryData()
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
      resetRepositoryData()
    } catch {
      setAuthState({
        status: 'error',
        user: null,
        error:
          'Could not verify your GitHub session. Check backend availability and try again.',
      })
      resetRepositoryData()
    }
  }, [authMeUrl, resetRepositoryData])

  const loadRepositories = useCallback(async () => {
    if (!repositoriesUrl) {
      setRepositoriesState({
        status: 'error',
        repositories: [],
        error: 'Backend API URL is not configured for this environment.',
      })
      return
    }

    setRepositoriesState({
      status: 'loading',
      repositories: [],
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
        resetRepositoryData()
        return
      }

      if (!response.ok) {
        throw new Error(`repositories_http_${response.status}`)
      }

      const payload = await response.json()
      const repositories = Array.isArray(payload?.repositories)
        ? payload.repositories
        : []

      if (!repositories.length) {
        setRepositoriesState({
          status: 'empty',
          repositories: [],
          error: '',
        })
        writeJsonStorage(REPOSITORY_CACHE_KEY, [])
        return
      }

      setRepositoriesState({
        status: 'success',
        repositories,
        error: '',
      })
      writeJsonStorage(REPOSITORY_CACHE_KEY, repositories)
    } catch {
      setRepositoriesState({
        status: 'error',
        repositories: [],
        error:
          'Could not load repositories from backend. Confirm your backend session and retry.',
      })
    }
  }, [repositoriesUrl, resetRepositoryData])

  useEffect(() => {
    void loadSession()
  }, [loadSession])

  useEffect(() => {
    if (authState.status !== 'authenticated') {
      resetRepositoryData()
      return
    }
    void loadRepositories()
  }, [authState.status, loadRepositories, resetRepositoryData])

  useEffect(() => {
    setScanSnapshots(normalizeScanSnapshots(readJsonStorage(SCAN_CACHE_KEY, {})))
  }, [])

  const isAuthenticated = authState.status === 'authenticated' && authState.user
  const isLoadingSession = authState.status === 'loading'
  const isUnauthenticated = authState.status === 'unauthenticated'
  const isMissingConfig = authState.status === 'missing_config'
  const hasSessionError = authState.status === 'error'

  const isLoadingRepositories = repositoriesState.status === 'loading'
  const repositoriesLoaded = repositoriesState.status === 'success'
  const repositoriesEmpty = repositoriesState.status === 'empty'
  const repositoriesError = repositoriesState.status === 'error'

  const repositories = repositoriesLoaded ? repositoriesState.repositories : []
  const repositoryCount = repositories.length

  const scannedSnapshots = repositories.flatMap((repository) => {
    const snapshot = scanSnapshots[String(repository.id)]
    if (!snapshot?.result) {
      return []
    }
    return [{ repository, snapshot }]
  })

  const averageScore = scannedSnapshots.length
    ? Math.round(
        scannedSnapshots.reduce((sum, item) => sum + item.snapshot.result.score, 0) /
          scannedSnapshots.length,
      )
    : '--'

  const needsAttentionCount = scannedSnapshots.filter(
    (item) => item.snapshot.result.summary.failed > 0,
  ).length

  const highRiskCount = scannedSnapshots.filter(
    (item) => item.snapshot.result.summary.highestSeverity === 'high',
  ).length

  const displayName =
    isAuthenticated && authState.user.name?.trim()
      ? authState.user.name
      : isAuthenticated
        ? authState.user.login
        : 'GitHub user'

  const profileUrl = isAuthenticated
    ? authState.user.htmlUrl || `https://github.com/${authState.user.login}`
    : ''

  return (
    <div className="page dashboard-page repositories-overview-page">
      <section className="workspace-hero repositories-hero-compact">
        <div className="workspace-hero-copy">
          <p className="eyebrow">Repository selection workspace</p>
          <h1>Choose a repository to inspect</h1>
          <p className="page-description">
            Select one repository to open a focused diagnosis page with checks and
            recommendations.
          </p>
        </div>

        <div className="workspace-hero-side">
          {isAuthenticated ? (
            <div className="workspace-topbar-user">
              <img
                className="identity-avatar-image"
                src={authState.user.avatarUrl}
                alt={`${authState.user.login} avatar`}
                loading="lazy"
              />
              <div>
                <p className="identity-name">{displayName}</p>
                <p className="identity-meta">@{authState.user.login}</p>
                <a className="profile-link" href={profileUrl} target="_blank" rel="noreferrer">
                  View GitHub profile
                </a>
              </div>
              <span className="connection-badge">Connected</span>
            </div>
          ) : (
            <div className="workspace-topbar-user">
              <div className="github-mark" aria-hidden="true">
                GH
              </div>
              <div>
                <p className="identity-name">GitHub connection required</p>
                <p className="identity-meta">
                  Authenticate first to load repositories and open analysis pages.
                </p>
              </div>
            </div>
          )}

          <div className="workspace-toolbar" role="toolbar" aria-label="Repository page actions">
            <Button type="button" onClick={() => void loadSession()} variant="secondary">
              Refresh session
            </Button>
            <Button
              type="button"
              onClick={() => void loadRepositories()}
              disabled={!isAuthenticated || isLoadingRepositories}
            >
              {isLoadingRepositories ? 'Refreshing...' : 'Refresh repositories'}
            </Button>
            <Button to="/" variant="secondary">
              Back to connect
            </Button>
          </div>
        </div>
      </section>

      {isLoadingSession ? (
        <Card title="Checking GitHub session" subtitle="Contacting backend /auth/me">
          <p className="state-note">
            Verifying authentication before loading your repositories...
          </p>
        </Card>
      ) : null}

      {isMissingConfig ? (
        <Card
          title="Missing API configuration"
          subtitle="Set a valid VITE_API_URL for this environment"
        >
          <p className="state-note">
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
        </Card>
      ) : null}

      <section className="metric-grid repository-overview-metrics" aria-label="Repository overview">
        <Card className="metric-card metric-card-compact">
          <p className="metric-label">Total repositories</p>
          <p className="metric-value">{isAuthenticated ? repositoryCount : '--'}</p>
          <p className="metric-helper">Public repositories available for analysis</p>
        </Card>
        <Card className="metric-card metric-card-compact">
          <p className="metric-label">Average score</p>
          <p className="metric-value">{isAuthenticated ? averageScore : '--'}</p>
          <p className="metric-helper">
            {scannedSnapshots.length ? 'Based on completed scans' : 'Available after first scan'}
          </p>
        </Card>
        <Card className="metric-card metric-card-compact">
          <p className="metric-label">Need attention</p>
          <p className="metric-value">{isAuthenticated ? needsAttentionCount : '--'}</p>
          <p className="metric-helper">Repositories with failed checks in latest diagnosis</p>
        </Card>
        <Card className="metric-card metric-card-compact">
          <p className="metric-label">High-risk repositories</p>
          <p className="metric-value">{isAuthenticated ? highRiskCount : '--'}</p>
          <p className="metric-helper">Repositories with highest severity marked as high</p>
        </Card>
      </section>

      <Card
        title="Your GitHub public repositories"
        subtitle="Select a repository to open a focused analysis page"
      >
        {isLoadingRepositories ? (
          <p className="state-note">Loading repositories from GitHub...</p>
        ) : null}

        {repositoriesError ? (
          <p className="state-note state-note-danger">{repositoriesState.error}</p>
        ) : null}

        {repositoriesEmpty ? (
          <p className="state-note">No public repositories were returned for this account.</p>
        ) : null}

        {repositoriesLoaded ? (
          <div className="repository-table-wrap">
            <table className="repository-table repository-table-overview">
              <thead>
                <tr>
                  <th className="col-repository">Repository</th>
                  <th className="col-language">Language</th>
                  <th className="col-push">Last push</th>
                  <th className="col-score">Score</th>
                  <th className="col-issues">Status</th>
                  <th className="col-action">Primary action</th>
                </tr>
              </thead>
              <tbody>
                {repositories.map((repository) => {
                  const snapshot = scanSnapshots[String(repository.id)]
                  const status = getScanStatus(snapshot)

                  return (
                    <tr key={repository.id}>
                      <td className="cell-repository">
                        <div className="repo-name-cell">
                          <p className="repository-name">{repository.fullName}</p>
                          <p className="repository-description">
                            {repository.description || 'No description provided.'}
                          </p>
                          <a
                            href={repository.htmlUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="repository-link"
                          >
                            Open on GitHub
                          </a>
                          <p className="scan-row-hint">{status.topIssue}</p>
                        </div>
                      </td>
                      <td className="cell-language">{repository.language || 'Not specified'}</td>
                      <td className="cell-push">{formatDate(repository.pushedAt)}</td>
                      <td className="cell-score">
                        <span className={snapshot?.result ? status.severityClass : 'severity-pill'}>
                          {status.scoreLabel}
                        </span>
                      </td>
                      <td className="cell-issues">
                        <span className={status.severityClass}>{status.severityLabel}</span>
                      </td>
                      <td className="cell-action">
                        <Button to={`/repositories/${repository.id}`}>
                          Inspect repository
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  )
}

export default RepositoryListPage
