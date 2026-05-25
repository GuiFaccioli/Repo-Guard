import { useCallback, useEffect, useMemo, useState } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'

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

const scanModes = [
  {
    key: 'green',
    title: 'Green Scan',
    subtitle: 'Basic repository health',
    description:
      'Checks basic repository hygiene such as README, Dependabot, Actions, license and activity.',
    toneClass: 'scan-mode-green',
  },
  {
    key: 'yellow',
    title: 'Yellow Scan',
    subtitle: 'Maintainability and quality',
    description:
      'Reviews maintainability signals such as scripts, tests, documentation and project structure.',
    toneClass: 'scan-mode-yellow',
  },
  {
    key: 'red',
    title: 'Red Scan',
    subtitle: 'Security risk patterns',
    description:
      'Looks for common risky patterns such as hardcoded secrets, unsafe eval usage, permissive CORS and sensitive logs.',
    toneClass: 'scan-mode-red',
  },
]

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

function RepositoryListPage() {
  const apiBaseUrl = import.meta.env.VITE_API_URL?.trim()
  const authMeUrl = useMemo(() => {
    if (!apiBaseUrl) {
      return null
    }

    return `${apiBaseUrl.replace(/\/$/, '')}/auth/me`
  }, [apiBaseUrl])

  const repositoriesUrl = useMemo(() => {
    if (!apiBaseUrl) {
      return null
    }

    return `${apiBaseUrl.replace(/\/$/, '')}/repositories`
  }, [apiBaseUrl])

  const [authState, setAuthState] = useState(initialAuthState)
  const [repositoriesState, setRepositoriesState] = useState(initialRepositoriesState)
  const [scanStates, setScanStates] = useState({})
  const [selectedScanType, setSelectedScanType] = useState('green')

  const resetRepositoryData = useCallback(() => {
    setRepositoriesState(initialRepositoriesState)
    setScanStates({})
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
        error: 'Missing VITE_API_URL. Configure frontend/.env and reload.',
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
        return
      }

      setRepositoriesState({
        status: 'success',
        repositories,
        error: '',
      })
    } catch {
      setRepositoriesState({
        status: 'error',
        repositories: [],
        error:
          'Could not load repositories from backend. Please retry after confirming your session.',
      })
    }
  }, [repositoriesUrl, resetRepositoryData])

  const runScan = useCallback(
    async (repositoryId, scanType) => {
      if (!repositoriesUrl) {
        setScanStates((current) => ({
          ...current,
          [repositoryId]: {
            status: 'error',
            result: null,
            error: 'Missing VITE_API_URL. Configure frontend/.env and reload.',
          },
        }))
        return
      }

      setScanStates((current) => ({
        ...current,
        [repositoryId]: {
          status: 'loading',
          result: null,
          error: '',
        },
      }))

      try {
        const response = await fetch(`${repositoriesUrl}/${repositoryId}/scans`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scanType,
          }),
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
          const payload = await response
            .json()
            .catch(() => ({ message: 'Could not run repository scan.' }))
          throw new Error(payload?.message || 'Could not run repository scan.')
        }

        const scanResult = await response.json()

        setScanStates((current) => ({
          ...current,
          [repositoryId]: {
            status: 'success',
            result: scanResult,
            error: '',
          },
        }))
      } catch (error) {
        setScanStates((current) => ({
          ...current,
          [repositoryId]: {
            status: 'error',
            result: null,
            error:
              error instanceof Error
                ? error.message
                : 'Could not run repository scan.',
          },
        }))
      }
    },
    [repositoriesUrl, resetRepositoryData],
  )

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

  const isAuthenticated = authState.status === 'authenticated' && authState.user
  const isLoadingSession = authState.status === 'loading'
  const isUnauthenticated = authState.status === 'unauthenticated'
  const isMissingConfig = authState.status === 'missing_config'
  const hasSessionError = authState.status === 'error'

  const isLoadingRepositories = repositoriesState.status === 'loading'
  const repositoriesLoaded = repositoriesState.status === 'success'
  const repositoriesEmpty = repositoriesState.status === 'empty'
  const repositoriesError = repositoriesState.status === 'error'

  const repositoryCount = repositoriesLoaded ? repositoriesState.repositories.length : 0

  const metricCards = isAuthenticated
    ? [
        {
          label: 'Total repositories',
          value: repositoryCount,
          helper: 'Public repositories available for scan',
        },
        {
          label: 'Average score',
          value: '--',
          helper: 'Appears after running scans',
        },
        {
          label: 'High-risk repositories',
          value: '--',
          helper: 'Calculated from scan severity',
        },
        {
          label: 'Last scan',
          value: 'Run a scan',
          helper: 'Select a repository and run the first health scan',
        },
      ]
    : [
        { label: 'Total repositories', value: '--', helper: 'Connect GitHub first' },
        { label: 'Average score', value: '--', helper: 'Available after scan' },
        { label: 'High-risk repositories', value: '--', helper: 'Available after scan' },
        { label: 'Last scan', value: 'Not started', helper: 'Waiting for authentication' },
      ]

  const displayName =
    isAuthenticated && authState.user.name?.trim()
      ? authState.user.name
      : isAuthenticated
        ? authState.user.login
        : ''

  const profileUrl = isAuthenticated
    ? authState.user.htmlUrl || `https://github.com/${authState.user.login}`
    : ''

  return (
    <div className="page dashboard-page">
      <h1>Repository analysis dashboard</h1>
      <p className="page-description">
        RepoGuard validates your GitHub session, lists your public repositories, and
        runs live health scans for security, quality, and maintenance signals.
      </p>

      {isLoadingSession ? (
        <Card title="Checking GitHub session" subtitle="Contacting backend /auth/me">
          <p className="state-note">
            Verifying authentication before loading your repository dashboard...
          </p>
        </Card>
      ) : null}

      {isMissingConfig ? (
        <Card title="Missing API configuration" subtitle="Set VITE_API_URL in frontend/.env">
          <p className="state-note">
            The frontend cannot check authentication without the backend URL.
          </p>
          <div className="hero-actions">
            <Button to="/" variant="secondary">
              Back to connect screen
            </Button>
          </div>
        </Card>
      ) : null}

      {hasSessionError ? (
        <Card title="Could not validate session" subtitle="Backend request failed">
          <p className="state-note state-note-danger">{authState.error}</p>
          <div className="hero-actions">
            <Button type="button" onClick={() => void loadSession()} variant="secondary">
              Retry session check
            </Button>
            <Button to="/" variant="secondary">
              Back to connect screen
            </Button>
          </div>
        </Card>
      ) : null}

      {isAuthenticated ? (
        <Card title="Connected to GitHub" subtitle="Session authenticated">
          <div className="identity-preview">
            <img
              className="identity-avatar-image"
              src={authState.user.avatarUrl}
              alt={`${authState.user.login} avatar`}
              loading="lazy"
            />
            <div>
              <p className="identity-name">{displayName}</p>
              <p className="identity-meta">@{authState.user.login}</p>
              <a
                className="profile-link"
                href={profileUrl}
                target="_blank"
                rel="noreferrer"
              >
                View GitHub profile
              </a>
            </div>
            <span className="connection-badge">Connected to GitHub</span>
          </div>
        </Card>
      ) : null}

      {isUnauthenticated ? (
        <Card title="Not connected to GitHub" subtitle="Authentication required">
          <p className="state-note">
            Your current session is not authenticated. Connect your GitHub account to
            continue.
          </p>
          <div className="hero-actions">
            <Button to="/">Go to GitHub connection</Button>
          </div>
        </Card>
      ) : null}

      <section className="metric-grid" aria-label="Repository health overview">
        {metricCards.map((item) => (
          <Card key={item.label} className="metric-card">
            <p className="metric-label">{item.label}</p>
            <p className="metric-value">{item.value}</p>
            <p className="metric-helper">{item.helper}</p>
          </Card>
        ))}
      </section>

      <Card title="Choose scan mode" subtitle="Select one scan type before running">
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
      </Card>

      <Card
        title="Your GitHub public repositories"
        subtitle="Run a live scan to generate score, checks, and recommendations"
      >
        {isLoadingRepositories ? (
          <p className="state-note">Loading repositories from GitHub...</p>
        ) : null}

        {repositoriesError ? (
          <>
            <p className="state-note state-note-danger">{repositoriesState.error}</p>
            <div className="hero-actions">
              <Button type="button" onClick={() => void loadRepositories()} variant="secondary">
                Retry repository load
              </Button>
            </div>
          </>
        ) : null}

        {repositoriesEmpty ? (
          <p className="state-note">
            No public repositories were returned for this account.
          </p>
        ) : null}

        {repositoriesLoaded ? (
          <ul className="repository-list">
            {repositoriesState.repositories.map((repository) => {
              const scanState = scanStates[repository.id] || {
                status: 'idle',
                result: null,
                error: '',
              }

              return (
                <li key={repository.id} className="repository-item">
                  <div className="repository-head">
                    <div>
                      <p className="repository-name">{repository.fullName}</p>
                      <p className="repository-description">
                        {repository.description || 'No description provided.'}
                      </p>
                    </div>
                    <span className="status-pill">
                      {repository.private ? 'private' : 'public'}
                    </span>
                  </div>

                  <div className="repository-meta">
                    <span>Language: {repository.language || 'Not specified'}</span>
                    <span>Stars: {repository.stars}</span>
                    <span>Forks: {repository.forks}</span>
                    <span>Open issues: {repository.openIssues}</span>
                    <span>Last push: {formatDate(repository.pushedAt)}</span>
                  </div>

                  <div className="repository-actions">
                    <a href={repository.htmlUrl} target="_blank" rel="noreferrer">
                      Open on GitHub
                    </a>
                    <Button
                      type="button"
                      onClick={() => void runScan(repository.id, selectedScanType)}
                      disabled={scanState.status === 'loading'}
                    >
                      {scanState.status === 'loading'
                        ? 'Running scan...'
                        : `Run ${getScanTypeLabel(selectedScanType)}`}
                    </Button>
                  </div>

                  {scanState.status === 'error' ? (
                    <p className="state-note state-note-danger">{scanState.error}</p>
                  ) : null}

                  {scanState.status === 'success' && scanState.result ? (
                    <div className="scan-result">
                      <div className="scan-summary">
                        <p className="scan-score">Score: {scanState.result.score}</p>
                        <p className="scan-meta">
                          Scan type: {getScanTypeLabel(scanState.result.scanType)}
                        </p>
                        <p className="scan-meta">
                          Passed: {scanState.result.summary.passed} | Failed:{' '}
                          {scanState.result.summary.failed}
                        </p>
                        <p className="scan-meta">
                          Highest severity:{' '}
                          <span
                            className={getSeverityBadgeClass(
                              scanState.result.summary.highestSeverity,
                            )}
                          >
                            {scanState.result.summary.highestSeverity}
                          </span>
                        </p>
                      </div>

                      <div className="scan-grid">
                        <div>
                          <p className="scan-section-title">Checks</p>
                          <ul className="scan-check-list">
                            {scanState.result.checks.map((check) => (
                              <li key={check.key}>
                                <div className="scan-check-line">
                                  <span>{check.label}</span>
                                  <span
                                    className={
                                      check.passed ? 'status-ok' : 'status-failed'
                                    }
                                  >
                                    {check.passed ? 'pass' : 'fail'}
                                  </span>
                                </div>
                                <p className="scan-check-message">
                                  {check.message}{' '}
                                  <span className="scan-category">{check.category}</span>{' '}
                                  <span className={getSeverityBadgeClass(check.severity)}>
                                    {check.severity}
                                  </span>
                                </p>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="scan-section-title">Recommendations</p>
                          {scanState.result.recommendations.length ? (
                            <ul className="scan-recommendations">
                              {scanState.result.recommendations.map((item, index) => (
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
                            </ul>
                          ) : (
                            <p className="scan-check-message">
                              No recommendations. This repository passed all current checks.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : null}
      </Card>
    </div>
  )
}

export default RepositoryListPage
