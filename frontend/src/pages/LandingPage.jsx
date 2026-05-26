import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { buildBackendUrl, normalizeApiBaseUrl } from '../utils/apiUrl'

const checks = [
  'README',
  'Dependabot',
  'GitHub Actions',
  'License',
  'Last activity',
  'Open issues / PRs',
]

function LandingPage() {
  const navigate = useNavigate()
  const rawApiBaseUrl = import.meta.env.VITE_API_URL
  const apiBaseUrl = useMemo(
    () => normalizeApiBaseUrl(rawApiBaseUrl),
    [rawApiBaseUrl],
  )
  const authMeUrl = useMemo(
    () => buildBackendUrl(rawApiBaseUrl, '/auth/me'),
    [rawApiBaseUrl],
  )
  const oauthStartUrl = buildBackendUrl(rawApiBaseUrl, '/auth/github/start')
  const [authFlowState, setAuthFlowState] = useState('checking')
  const [authFlowError, setAuthFlowError] = useState('')
  const hasCheckedSessionRef = useRef(false)
  const hasStartedOAuthRef = useRef(false)

  const hasValidApiConfig = Boolean(apiBaseUrl && authMeUrl && oauthStartUrl)

  const startOAuth = useCallback(
    (origin = 'auto') => {
      if (!oauthStartUrl) {
        setAuthFlowState('missing_config')
        return
      }

      if (origin === 'auto' && hasStartedOAuthRef.current) {
        return
      }

      if (origin === 'auto') {
        hasStartedOAuthRef.current = true
      }

      setAuthFlowError('')
      setAuthFlowState('redirecting_github')
      window.location.assign(oauthStartUrl)
    },
    [oauthStartUrl],
  )

  useEffect(() => {
    if (!hasValidApiConfig) {
      setAuthFlowState('missing_config')
      setAuthFlowError('')
      return
    }

    if (hasCheckedSessionRef.current) {
      return
    }

    hasCheckedSessionRef.current = true
    let isCancelled = false

    const runSessionCheck = async () => {
      setAuthFlowState('checking')
      setAuthFlowError('')

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
        if (isCancelled) {
          return
        }

        if (payload?.authenticated) {
          setAuthFlowState('redirecting_dashboard')
          navigate('/repositories', { replace: true })
          return
        }

        setAuthFlowState('redirecting_github')
        startOAuth('auto')
      } catch {
        if (isCancelled) {
          return
        }

        setAuthFlowState('error')
        setAuthFlowError(
          'Could not verify your GitHub session. Check backend availability and try again.',
        )
      }
    }

    void runSessionCheck()

    return () => {
      isCancelled = true
    }
  }, [authMeUrl, hasValidApiConfig, navigate, startOAuth])

  return (
    <div className="page onboarding-page">
      <Card className="connect-card">
        <p className="eyebrow">GitHub-first onboarding</p>
        <h1>Connect GitHub to start repository health analysis</h1>
        <p className="page-description">
          RepoGuard analyzes repositories for security, quality, and maintenance
          signals, then organizes results into a clear health score and prioritized
          recommendations.
        </p>

        <div className="connect-panel">
          <div className="github-mark" aria-hidden="true">
            GH
          </div>
          <div>
            <p className="identity-name">GitHub connection required</p>
            <p className="identity-meta">
              RepoGuard starts GitHub OAuth through the configured backend API.
            </p>
          </div>
        </div>

        {authFlowState === 'checking' || authFlowState === 'redirecting_github' ? (
          <p className="state-note">
            Preparing GitHub connection... You will be redirected to GitHub to authorize
            repository analysis.
          </p>
        ) : null}

        {authFlowState === 'redirecting_dashboard' ? (
          <p className="state-note">
            Active session detected. Redirecting to your repository workspace...
          </p>
        ) : null}

        {authFlowState === 'error' ? (
          <p className="state-note state-note-danger">{authFlowError}</p>
        ) : null}

        <div className="hero-actions">
          {oauthStartUrl && apiBaseUrl ? (
            <Button href={oauthStartUrl}>Continue with GitHub</Button>
          ) : (
            <Button disabled>Continue with GitHub</Button>
          )}
          {authFlowState === 'error' ? (
            <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
              Retry session check
            </Button>
          ) : null}
          <Button to="/repositories" variant="secondary">
            Preview dashboard
          </Button>
        </div>
        {authFlowState === 'missing_config' ? (
          <p className="state-note state-note-danger">
            Backend API URL is not configured for this environment.
          </p>
        ) : null}

        <ul className="trust-notes">
          <li>GitHub tokens will never be exposed to the frontend.</li>
          <li>Repository analysis starts after authentication.</li>
        </ul>
      </Card>

      <Card title="Planned checks preview" subtitle="Initial repository signals">
        <div className="checks-row">
          {checks.map((check) => (
            <span className="check-chip" key={check}>
              {check}
            </span>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default LandingPage
