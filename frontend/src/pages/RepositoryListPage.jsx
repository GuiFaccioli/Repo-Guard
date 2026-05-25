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

  const loadSession = useCallback(async () => {
    if (!authMeUrl) {
      setAuthState({
        status: 'missing_config',
        user: null,
        error: '',
      })
      setRepositoriesState(initialRepositoriesState)
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
      setRepositoriesState(initialRepositoriesState)
    } catch {
      setAuthState({
        status: 'error',
        user: null,
        error:
          'Could not verify your GitHub session. Check backend availability and try again.',
      })
      setRepositoriesState(initialRepositoriesState)
    }
  }, [authMeUrl])

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
        setRepositoriesState(initialRepositoriesState)
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
  }, [repositoriesUrl])

  useEffect(() => {
    void loadSession()
  }, [loadSession])

  useEffect(() => {
    if (authState.status !== 'authenticated') {
      setRepositoriesState(initialRepositoriesState)
      return
    }

    void loadRepositories()
  }, [authState.status, loadRepositories])

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
          helper: 'Public repositories available for next scan step',
        },
        {
          label: 'Average score',
          value: '--',
          helper: 'Repository health score comes in the next milestone',
        },
        {
          label: 'High-risk repositories',
          value: '--',
          helper: 'Depends on scan checks not implemented yet',
        },
        {
          label: 'Last scan',
          value: 'Not started',
          helper: 'Repository scanning is the next implementation step',
        },
      ]
    : [
        { label: 'Total repositories', value: '--', helper: 'Connect GitHub first' },
        { label: 'Average score', value: '--', helper: 'Available after connection' },
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
        prepares the scan workflow for security, quality, and maintenance checks.
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

      <Card
        title="Your GitHub public repositories"
        subtitle="Repository health checks and scoring come next"
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
            {repositoriesState.repositories.map((repository) => (
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
                  <span className="state-note">
                    Scan and score for this repository are coming next.
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </div>
  )
}

export default RepositoryListPage
