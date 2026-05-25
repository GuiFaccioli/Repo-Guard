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

const scanModeDictionary = Object.fromEntries(scanModes.map((item) => [item.key, item]))

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

function getScanStateLabel(scanState) {
  if (scanState?.status === 'loading') {
    return 'Running'
  }
  if (scanState?.status === 'success' && scanState?.result) {
    return `${scanState.result.score}`
  }
  if (scanState?.status === 'error') {
    return 'Error'
  }
  return 'Not started'
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
  const [scanStates, setScanStates] = useState({})
  const [selectedScanType, setSelectedScanType] = useState('green')
  const [activeResultRepositoryId, setActiveResultRepositoryId] = useState(null)
  const [lastCompletedScan, setLastCompletedScan] = useState(null)

  const resetRepositoryData = useCallback(() => {
    setRepositoriesState(initialRepositoriesState)
    setScanStates({})
    setActiveResultRepositoryId(null)
    setLastCompletedScan(null)
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
            error: 'Backend API URL is not configured for this environment.',
          },
        }))
        return
      }

      setActiveResultRepositoryId(repositoryId)
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
        setLastCompletedScan({
          repositoryId,
          completedAt: new Date().toISOString(),
        })
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

  const repositories = repositoriesLoaded ? repositoriesState.repositories : []
  const repositoryCount = repositories.length

  const scannedResults = repositories.flatMap((repository) => {
    const scanState = scanStates[repository.id]
    if (scanState?.status === 'success' && scanState.result) {
      return [{ repository, result: scanState.result }]
    }
    return []
  })

  const averageScore = scannedResults.length
    ? Math.round(
        scannedResults.reduce((sum, item) => sum + item.result.score, 0) /
          scannedResults.length,
      )
    : '--'
  const highRiskCount = scannedResults.filter(
    (item) => item.result.summary.highestSeverity === 'high',
  ).length
  const scannedCount = scannedResults.length

  const lastScanLabel = lastCompletedScan
    ? (() => {
        const repository = repositories.find(
          (item) => item.id === lastCompletedScan.repositoryId,
        )
        if (!repository) {
          return 'Recently completed'
        }
        return `${repository.name} - ${formatDate(lastCompletedScan.completedAt)}`
      })()
    : 'No scan completed'

  const displayName =
    isAuthenticated && authState.user.name?.trim()
      ? authState.user.name
      : isAuthenticated
        ? authState.user.login
        : 'GitHub user'

  const profileUrl = isAuthenticated
    ? authState.user.htmlUrl || `https://github.com/${authState.user.login}`
    : ''

  const activeResultState = activeResultRepositoryId
    ? scanStates[activeResultRepositoryId]
    : null

  const activeRepository = activeResultRepositoryId
    ? repositories.find((repository) => repository.id === activeResultRepositoryId) || null
    : null

  const selectedScanMode = scanModeDictionary[selectedScanType]

  const metricCards = [
    {
      label: 'Total repositories',
      value: isAuthenticated ? repositoryCount : '--',
      helper: 'Public repositories available for analysis',
    },
    {
      label: 'Average score',
      value: isAuthenticated ? averageScore : '--',
      helper: scannedCount ? 'Based on completed scans' : 'Appears after scans',
    },
    {
      label: 'High-risk repositories',
      value: isAuthenticated ? highRiskCount : '--',
      helper: scannedCount
        ? 'Highest severity marked as high'
        : 'Calculated after completed scans',
    },
    {
      label: 'Last scan',
      value: isAuthenticated ? (scannedCount ? 'Completed' : 'Pending') : '--',
      helper: isAuthenticated ? lastScanLabel : 'Connect GitHub first',
    },
  ]

  return (
    <div className="page dashboard-page workspace-dashboard-page">
      <section className="workspace-hero">
        <div className="workspace-hero-copy">
          <p className="eyebrow">GitHub repository workspace</p>
          <h1>Repository analysis dashboard</h1>
          <p className="page-description">
            Desktop-first workspace for repository health checks, maintainability
            signals, and defensive security pattern review.
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
                  Authenticate first to load repositories and run scans.
                </p>
              </div>
            </div>
          )}

          <div className="workspace-toolbar" role="toolbar" aria-label="Repository dashboard actions">
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
            Verifying authentication before loading your repository workspace...
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
            Your current session is not authenticated. Return to the connect screen
            and continue with GitHub.
          </p>
        </Card>
      ) : null}

      <section className="dashboard-workspace" aria-label="Repository analysis workspace">
        <aside className="dashboard-left-panel">
          <Card
            title="Scan modes"
            subtitle="Select the scan depth before running repository analysis"
          >
            <div className="scan-mode-stack">
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

          <Card title="Selected scan" subtitle="Current mode for run action">
            <p className="scan-mode-title">{selectedScanMode.title}</p>
            <p className="scan-mode-description">{selectedScanMode.description}</p>
          </Card>
        </aside>

        <main className="dashboard-main-panel">
          <section className="metric-grid" aria-label="Repository health overview">
            {metricCards.map((item) => (
              <Card key={item.label} className="metric-card">
                <p className="metric-label">{item.label}</p>
                <p className="metric-value">{item.value}</p>
                <p className="metric-helper">{item.helper}</p>
              </Card>
            ))}
          </section>

          <Card
            title="Your GitHub public repositories"
            subtitle="Run Green, Yellow, or Red scans for each repository"
          >
            {isLoadingRepositories ? (
              <p className="state-note">Loading repositories from GitHub...</p>
            ) : null}

            {repositoriesError ? (
              <p className="state-note state-note-danger">{repositoriesState.error}</p>
            ) : null}

            {repositoriesEmpty ? (
              <p className="state-note">
                No public repositories were returned for this account.
              </p>
            ) : null}

            {repositoriesLoaded ? (
              <div className="repository-table-wrap">
                <table className="repository-table">
                  <thead>
                    <tr>
                      <th className="col-repository">Repository</th>
                      <th className="col-language">Language</th>
                      <th className="col-visibility">Visibility</th>
                      <th className="col-issues">Open issues</th>
                      <th className="col-push">Last push</th>
                      <th className="col-score">Scan score</th>
                      <th className="col-action">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repositories.map((repository) => {
                      const scanState = scanStates[repository.id] || {
                        status: 'idle',
                        result: null,
                        error: '',
                      }

                      const hasResult =
                        scanState.status === 'success' && scanState.result
                      const rowIsActive = activeResultRepositoryId === repository.id

                      return (
                        <tr
                          key={repository.id}
                          className={rowIsActive ? 'repository-row-active' : ''}
                        >
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
                            </div>
                          </td>
                          <td className="cell-language">{repository.language || 'Not specified'}</td>
                          <td className="cell-visibility">
                            <span className="status-pill status-pill-compact">
                              {repository.private ? 'private' : 'public'}
                            </span>
                          </td>
                          <td className="cell-issues">{repository.openIssues}</td>
                          <td className="cell-push">{formatDate(repository.pushedAt)}</td>
                          <td className="cell-score">
                            <span
                              className={
                                hasResult
                                  ? getSeverityBadgeClass(
                                      scanState.result.summary.highestSeverity,
                                    )
                                  : 'severity-pill'
                              }
                            >
                              {getScanStateLabel(scanState)}
                            </span>
                          </td>
                          <td className="cell-action">
                            <div className="repository-actions-row">
                              <Button
                                type="button"
                                onClick={() =>
                                  void runScan(repository.id, selectedScanType)
                                }
                                disabled={scanState.status === 'loading'}
                              >
                                {scanState.status === 'loading'
                                  ? 'Running...'
                                  : `Run ${getScanTypeLabel(selectedScanType)}`}
                              </Button>

                              {hasResult ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() =>
                                    setActiveResultRepositoryId(repository.id)
                                  }
                                >
                                  Open result
                                </Button>
                              ) : null}
                            </div>

                            {scanState.status === 'error' ? (
                              <p className="scan-row-error">{scanState.error}</p>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </Card>
        </main>

        <aside className="dashboard-right-panel">
          <Card title="Scan result panel" subtitle="Structured output for selected repository">
            {!activeResultState || activeResultState.status === 'idle' ? (
              <p className="state-note">
                Select a repository scan result to inspect score, checks, and
                recommendations.
              </p>
            ) : null}

            {activeResultState?.status === 'loading' ? (
              <p className="state-note">Running selected repository scan...</p>
            ) : null}

            {activeResultState?.status === 'error' ? (
              <p className="state-note state-note-danger">{activeResultState.error}</p>
            ) : null}

            {activeResultState?.status === 'success' &&
            activeResultState.result &&
            activeRepository ? (
              <div className="scan-result-panel">
                <div className="scan-result-head">
                  <div>
                    <p className="scan-score">{activeResultState.result.score}</p>
                    <p className="scan-score-label">Repository health score</p>
                  </div>
                  <span
                    className={getSeverityBadgeClass(
                      activeResultState.result.summary.highestSeverity,
                    )}
                  >
                    {activeResultState.result.summary.highestSeverity}
                  </span>
                </div>

                <div className="scan-result-facts">
                  <p className="scan-meta">
                    <span className="scan-meta-label">Repository</span>
                    <span>{activeRepository.fullName}</span>
                  </p>
                  <p className="scan-meta">
                    <span className="scan-meta-label">Scan type</span>
                    <span>{getScanTypeLabel(activeResultState.result.scanType)}</span>
                  </p>
                  <p className="scan-meta">
                    <span className="scan-meta-label">Checks</span>
                    <span>
                      Passed {activeResultState.result.summary.passed} / Failed{' '}
                      {activeResultState.result.summary.failed}
                    </span>
                  </p>
                </div>

                <div className="scan-grid">
                  <div className="scan-section-block">
                    <p className="scan-section-title">Checks</p>
                    <ul className="scan-check-list">
                      {activeResultState.result.checks.map((check) => (
                        <li key={check.key}>
                          <div className="scan-check-line">
                            <span>{check.label}</span>
                            <span className={check.passed ? 'status-ok' : 'status-failed'}>
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

                  <div className="scan-section-block">
                    <p className="scan-section-title">Recommendations</p>
                    {activeResultState.result.recommendations.length ? (
                      <ul className="scan-recommendations">
                        {activeResultState.result.recommendations.map((item, index) => (
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
          </Card>
        </aside>
      </section>
    </div>
  )
}

export default RepositoryListPage
