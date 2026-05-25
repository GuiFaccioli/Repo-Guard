import { useCallback, useEffect, useMemo, useState } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'

const initialAuthState = {
  status: 'loading',
  user: null,
  error: '',
}

function RepositoryListPage() {
  const apiBaseUrl = import.meta.env.VITE_API_URL?.trim()
  const authMeUrl = useMemo(() => {
    if (!apiBaseUrl) {
      return null
    }

    return `${apiBaseUrl.replace(/\/$/, '')}/auth/me`
  }, [apiBaseUrl])

  const [authState, setAuthState] = useState(initialAuthState)

  const loadSession = useCallback(async () => {
    if (!authMeUrl) {
      setAuthState({
        status: 'missing_config',
        user: null,
        error: '',
      })
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
    } catch {
      setAuthState({
        status: 'error',
        user: null,
        error:
          'Could not verify your GitHub session. Check backend availability and try again.',
      })
    }
  }, [authMeUrl])

  useEffect(() => {
    void loadSession()
  }, [loadSession])

  const isAuthenticated = authState.status === 'authenticated' && authState.user
  const isLoading = authState.status === 'loading'
  const isUnauthenticated = authState.status === 'unauthenticated'
  const isMissingConfig = authState.status === 'missing_config'
  const hasRequestError = authState.status === 'error'

  const metricCards = isAuthenticated
    ? [
        {
          label: 'Total repositories',
          value: '--',
          helper: 'Will load from GitHub in the next milestone',
        },
        {
          label: 'Average score',
          value: '--',
          helper: 'Calculated after first scan',
        },
        {
          label: 'High-risk repositories',
          value: '--',
          helper: 'Based on failed checks',
        },
        {
          label: 'Last scan',
          value: 'Not started',
          helper: 'No scan executed yet',
        },
      ]
    : [
        { label: 'Total repositories', value: '--', helper: 'Connect GitHub first' },
        { label: 'Average score', value: '--', helper: 'Available after connection' },
        { label: 'High-risk repositories', value: '--', helper: 'Available after connection' },
        { label: 'Last scan', value: 'Not started', helper: 'Waiting for authentication' },
      ]

  const tableRows = isAuthenticated
    ? [
        {
          name: `${authState.user.login}/repository-placeholder`,
          status: 'Ready to scan',
          score: '--',
        },
      ]
    : [{ name: 'repository-placeholder', status: 'Pending auth', score: '--' }]

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
        RepoGuard validates your GitHub session first, then prepares repository health
        analysis for security, quality, and maintenance checks.
      </p>

      {isLoading ? (
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

      {hasRequestError ? (
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
        title="Repositories placeholder list"
        subtitle={
          isAuthenticated
            ? 'Authenticated view ready for repository hydration'
            : 'Connect GitHub to load repositories'
        }
      >
        <div className="table-head">
          <span>Name</span>
          <span>Status</span>
          <span>Score</span>
        </div>
        <ul className="repo-table">
          {tableRows.map((row) => (
            <li key={row.name}>
              <span>{row.name}</span>
              <span className="status-pill">{row.status}</span>
              <span>{row.score}</span>
            </li>
          ))}
        </ul>
        <div className="table-actions">
          <Button to="/repositories/1" variant="secondary">
            Open repository details placeholder
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default RepositoryListPage
