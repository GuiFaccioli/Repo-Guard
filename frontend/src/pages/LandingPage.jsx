import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { buildBackendUrl, normalizeApiBaseUrl } from '../utils/apiUrl'

function LandingPage() {
  const navigate = useNavigate()
  const rawApiBaseUrl = import.meta.env.VITE_API_URL
  const apiBaseUrl = useMemo(
    () => normalizeApiBaseUrl(rawApiBaseUrl),
    [rawApiBaseUrl],
  )
  const authMeUrl = useMemo(
    () => buildBackendUrl(apiBaseUrl, '/auth/me'),
    [apiBaseUrl],
  )
  const oauthStartUrl = useMemo(
    () => buildBackendUrl(apiBaseUrl, '/auth/github/start'),
    [apiBaseUrl],
  )

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
    document.title = 'RepoGuard · Connecting GitHub'
  }, [])

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
          setAuthFlowState('redirecting_repositories')
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
      <Card className="connect-card connect-card-minimal">
        <p className="onboarding-brand">RepoGuard</p>
        <h1>Preparing GitHub connection...</h1>
        <p className="page-description">
          You will be redirected to GitHub to authorize repository analysis.
        </p>

        {authFlowState === 'checking' || authFlowState === 'redirecting_github' ? (
          <p className="state-note">
            Starting the GitHub authentication flow.
          </p>
        ) : null}

        {authFlowState === 'redirecting_repositories' ? (
          <p className="state-note">
            Active session detected. Redirecting to repositories...
          </p>
        ) : null}

        {authFlowState === 'error' ? (
          <p className="state-note state-note-danger">{authFlowError}</p>
        ) : null}

        {authFlowState === 'missing_config' ? (
          <p className="state-note state-note-danger">
            Backend API URL is not configured for this environment.
          </p>
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
        </div>
      </Card>
    </div>
  )
}

export default LandingPage
